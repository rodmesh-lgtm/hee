import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../../../lib/db";
import { normalizePublicSlug } from "../../../lib/public-url";
import { consumePublicWriteLimit, requestClientAddress } from "../../../lib/rate-limit";

const orderSchema = z.object({
  slug: z.string().trim().min(4).max(80),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(4).max(30),
  notes: z.string().trim().max(1000).optional().default(""),
  orderType: z.enum(["استلام", "توصيل"]).default("استلام"),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1).max(120),
        quantity: z.number().int().positive().max(100),
      }),
    )
    .min(1)
    .max(50),
});

function rateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "تم إرسال عدد كبير من الطلبات خلال فترة قصيرة. حاول مرة أخرى لاحقاً." },
    { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfterSeconds)) } },
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
  }

  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
  }

  const slug = normalizePublicSlug(parsed.data.slug);
  const business = await db.business.findUnique({ where: { slug } });
  if (!business || !business.isPublished) {
    return NextResponse.json({ error: "النشاط غير متاح" }, { status: 404 });
  }

  if (!business.acceptOnlineOrders) {
    return NextResponse.json({ error: "استقبال الطلبات غير مفعل حالياً" }, { status: 403 });
  }

  // Hash-only fixed-window controls protect public write endpoints without storing raw IPs.
  // Phone remains a fallback/second signal when a reverse proxy does not expose a client IP.
  const clientAddress = requestClientAddress(request);
  if (clientAddress) {
    const ipLimit = await consumePublicWriteLimit({ scope: "public-order-ip", businessId: business.id, identity: clientAddress, limit: 20, windowSeconds: 600 });
    if (!ipLimit.allowed) return rateLimited(ipLimit.retryAfterSeconds);
  }
  const phoneLimit = await consumePublicWriteLimit({ scope: "public-order-phone", businessId: business.id, identity: parsed.data.customerPhone, limit: 6, windowSeconds: 600 });
  if (!phoneLimit.allowed) return rateLimited(phoneLimit.retryAfterSeconds);

  const aggregated = new Map<string, number>();
  for (const item of parsed.data.items) {
    const nextQuantity = (aggregated.get(item.productId) ?? 0) + item.quantity;
    if (nextQuantity > 100) {
      return NextResponse.json({ error: "كمية أحد المنتجات تتجاوز الحد المسموح" }, { status: 400 });
    }
    aggregated.set(item.productId, nextQuantity);
  }

  const productIds = [...aggregated.keys()];
  const products = await db.product.findMany({
    where: {
      businessId: business.id,
      isActive: true,
      deletedAt: null,
      id: { in: productIds },
    },
  });

  if (products.length !== productIds.length) {
    return NextResponse.json({ error: "بعض المنتجات غير متاحة الآن" }, { status: 400 });
  }

  const productsById = new Map(products.map((product) => [product.id, product]));
  const normalizedItems = productIds.map((productId) => {
    const product = productsById.get(productId)!;
    const quantity = aggregated.get(productId)!;
    return {
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity,
      total: product.price * quantity,
    };
  });

  const total = normalizedItems.reduce((sum, item) => sum + item.total, 0);
  if (!Number.isSafeInteger(total) || total < 0) {
    return NextResponse.json({ error: "تعذر احتساب إجمالي الطلب" }, { status: 400 });
  }

  const order = await db.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        businessId: business.id,
        name: parsed.data.customerName,
        phone: parsed.data.customerPhone,
        notes: parsed.data.notes || null,
      },
    });

    return tx.order.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        notes: parsed.data.notes || null,
        orderType: parsed.data.orderType,
        total,
        status: "pending",
        items: { create: normalizedItems },
      },
    });
  });

  revalidatePath("/dashboard/orders");
  return NextResponse.json({ success: true, orderId: order.id }, { status: 201 });
}
