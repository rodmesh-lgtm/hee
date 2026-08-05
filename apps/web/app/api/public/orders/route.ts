import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../../../lib/db";

const orderSchema = z.object({
  slug: z.string().min(2),
  customerName: z.string().min(2),
  customerPhone: z.string().min(4),
  notes: z.string().optional().default(""),
  orderType: z.enum(["استلام", "توصيل"]).default("استلام"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
  }

  const business = await db.business.findUnique({ where: { slug: parsed.data.slug } });
  if (!business || !business.isPublished) {
    return NextResponse.json({ error: "النشاط غير متاح" }, { status: 404 });
  }

  if (!business.acceptOnlineOrders) {
    return NextResponse.json({ error: "استقبال الطلبات غير مفعل حالياً" }, { status: 403 });
  }

  const productIds = [...new Set(parsed.data.items.map((item) => item.productId))];
  const products = await db.product.findMany({
    where: {
      businessId: business.id,
      isActive: true,
      id: { in: productIds },
    },
  });

  const productsById = new Map(products.map((product) => [product.id, product]));
  const missingProduct = parsed.data.items.find((item) => !productsById.has(item.productId));
  if (missingProduct) {
    return NextResponse.json({ error: "بعض المنتجات غير متاحة الآن" }, { status: 400 });
  }

  const customer = await db.customer.create({
    data: {
      businessId: business.id,
      name: parsed.data.customerName,
      phone: parsed.data.customerPhone,
      notes: parsed.data.notes,
    },
  });

  const normalizedItems = parsed.data.items.map((item) => {
    const product = productsById.get(item.productId)!;
    return {
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity: item.quantity,
      total: product.price * item.quantity,
    };
  });

  const total = normalizedItems.reduce((sum, item) => sum + item.total, 0);

  const order = await db.order.create({
    data: {
      businessId: business.id,
      customerId: customer.id,
      notes: parsed.data.notes,
      orderType: parsed.data.orderType,
      total,
      status: "pending",
      items: {
        create: normalizedItems,
      },
    },
  });

  revalidatePath("/dashboard/orders");

  return NextResponse.json({ success: true, orderId: order.id });
}
