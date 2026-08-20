import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { consumePublicWriteLimit, requestClientAddress } from "../../../lib/rate-limit";
import { normalizePublicSlug } from "../../../lib/public-url";
import { readBoundedJson, RequestBodyTooLargeError } from "../../../lib/request-body";

type OrderItemInput = { productId?: unknown; quantity?: unknown };
type OrderPayload = {
  slug?: unknown;
  name?: unknown;
  phone?: unknown;
  notes?: unknown;
  orderType?: unknown;
  items?: unknown;
  serviceRequest?: unknown;
  requestId?: unknown;
};

function text(value: unknown, max: number) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length <= max ? normalized : null;
}

function normalizedPhone(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

function requestKey(value: unknown) {
  const key = typeof value === "string" ? value.trim() : "";
  return key.length >= 16 && key.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(key) ? key : null;
}

function quantity(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100 ? parsed : null;
}

export async function POST(request: Request) {
  let body: OrderPayload;
  try {
    body = (await readBoundedJson(request, 64 * 1024)) as OrderPayload;
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof RequestBodyTooLargeError ? "حجم الطلب أكبر من المسموح" : "بيانات غير صالحة" },
      { status: error instanceof RequestBodyTooLargeError ? 413 : 400 },
    );
  }

  const slug = normalizePublicSlug(String(body.slug ?? ""));
  const name = text(body.name, 120);
  const phone = normalizedPhone(body.phone);
  const notes = text(body.notes, 1000);
  const serviceRequest = text(body.serviceRequest, 240);
  const idempotencyKey = requestKey(request.headers.get("idempotency-key") || body.requestId);
  const orderTypeRaw = String(body.orderType ?? "pickup").trim();
  const orderType = orderTypeRaw === "delivery" ? "delivery" : "pickup";

  if (!slug || !name || !phone || notes === null || serviceRequest === null || !idempotencyKey) {
    return NextResponse.json({ ok: false, error: "بيانات الطلب غير مكتملة" }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items) ? body.items as OrderItemInput[] : [];
  if (rawItems.length > 20) return NextResponse.json({ ok: false, error: "عدد عناصر الطلب كبير جداً" }, { status: 400 });

  const items = rawItems.map((item) => ({
    productId: text(item?.productId, 80),
    quantity: quantity(item?.quantity),
  }));
  if (items.some((item) => !item.productId || !item.quantity)) {
    return NextResponse.json({ ok: false, error: "عناصر الطلب غير صالحة" }, { status: 400 });
  }
  if (items.length === 0 && !serviceRequest) {
    return NextResponse.json({ ok: false, error: "حدد منتجاً أو خدمة مطلوبة" }, { status: 400 });
  }

  const business = await db.business.findFirst({
    where: { slug, deletedAt: null, isPublished: true },
    select: { id: true, acceptOnlineOrders: true },
  });
  if (!business) return NextResponse.json({ ok: false }, { status: 404 });
  if (items.length > 0 && !business.acceptOnlineOrders) {
    return NextResponse.json({ ok: false, error: "الطلبات الإلكترونية غير مفعلة لهذا النشاط" }, { status: 409 });
  }

  try {
    const address = requestClientAddress(request) || "unknown";
    const [ipRate, phoneRate] = await Promise.all([
      consumePublicWriteLimit({ scope: "public-order-ip", businessId: business.id, identity: address, limit: 12, windowSeconds: 600 }),
      consumePublicWriteLimit({ scope: "public-order-phone", businessId: business.id, identity: phone, limit: 6, windowSeconds: 600 }),
    ]);
    if (!ipRate.allowed || !phoneRate.allowed) {
      const retryAfter = Math.max(1, ipRate.retryAfterSeconds, phoneRate.retryAfterSeconds);
      return NextResponse.json({ ok: false, error: "تم إرسال طلبات كثيرة. حاول لاحقاً." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
    }
  } catch (error) {
    console.error("[public-order] rate_limit_failed", error);
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Retry-After": "30" } });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`public-order:${business.id}:${idempotencyKey}`}))`;

      const previous = await tx.$queryRaw<Array<{ targetId: string | null }>>`
        SELECT "targetId" FROM "PublicSubmission"
        WHERE "businessId" = ${business.id} AND "scope" = 'order' AND "idempotencyKey" = ${idempotencyKey}
        LIMIT 1
      `;
      if (previous[0]?.targetId) return { id: previous[0].targetId, replayed: true };

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`customer:${business.id}:${phone}`}))`;
      let customer = await tx.customer.findFirst({
        where: { businessId: business.id, phone },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true },
      });
      if (!customer) {
        customer = await tx.customer.create({ data: { businessId: business.id, name, phone }, select: { id: true, name: true } });
      } else if (customer.name !== name) {
        await tx.customer.update({ where: { id: customer.id }, data: { name } });
      }

      if (items.length === 0) {
        const order = await tx.order.create({
          data: {
            businessId: business.id,
            customerId: customer.id,
            notes: notes || null,
            orderType: "request",
            total: 0,
            status: "pending",
            items: { create: [{ name: serviceRequest!, unitPrice: 0, quantity: 1, total: 0 }] },
          },
          select: { id: true },
        });
        await tx.$executeRaw`
          INSERT INTO "PublicSubmission" ("businessId", "scope", "idempotencyKey", "targetId")
          VALUES (${business.id}, 'order', ${idempotencyKey}, ${order.id})
        `;
        return { id: order.id, replayed: false };
      }

      const productIds = items.map((item) => item.productId!);
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, businessId: business.id, isActive: true, deletedAt: null },
        select: { id: true, name: true, price: true },
      });
      const byId = new Map(products.map((product) => [product.id, product]));
      if (products.length !== new Set(productIds).size || items.some((item) => !byId.has(item.productId!))) {
        throw new Error("PUBLIC_ORDER_PRODUCT_INVALID");
      }

      const resolvedItems = items.map((item) => {
        const product = byId.get(item.productId!)!;
        const itemTotal = product.price * item.quantity!;
        return { productId: product.id, name: product.name, unitPrice: product.price, quantity: item.quantity!, total: itemTotal };
      });
      const total = resolvedItems.reduce((sum, item) => sum + item.total, 0);
      if (!Number.isSafeInteger(total) || total < 0) throw new Error("PUBLIC_ORDER_TOTAL_INVALID");

      const order = await tx.order.create({
        data: {
          businessId: business.id,
          customerId: customer.id,
          notes: notes || null,
          orderType,
          total,
          status: "pending",
          items: { create: resolvedItems },
        },
        select: { id: true },
      });
      await tx.$executeRaw`
        INSERT INTO "PublicSubmission" ("businessId", "scope", "idempotencyKey", "targetId")
        VALUES (${business.id}, 'order', ${idempotencyKey}, ${order.id})
      `;
      return { id: order.id, replayed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({ ok: true, orderId: result.id, replayed: result.replayed }, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PUBLIC_ORDER_PRODUCT_INVALID") {
      return NextResponse.json({ ok: false, error: "أحد المنتجات غير متاح" }, { status: 409 });
    }
    console.error("[public-order] write_failed", error);
    return NextResponse.json({ ok: false, error: "تعذر تسجيل الطلب الآن" }, { status: 503, headers: { "Retry-After": "30" } });
  }
}
