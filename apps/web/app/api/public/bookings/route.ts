import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../../../lib/db";

const bookingSchema = z.object({
  slug: z.string().min(2),
  serviceId: z.string().optional().default(""),
  bookingDate: z.string().min(1),
  bookingTime: z.string().min(1),
  customerName: z.string().min(2),
  customerPhone: z.string().min(4),
  notes: z.string().optional().default(""),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات الحجز غير صالحة" }, { status: 400 });
  }

  const business = await db.business.findUnique({ where: { slug: parsed.data.slug } });
  if (!business || !business.isPublished) {
    return NextResponse.json({ error: "النشاط غير متاح" }, { status: 404 });
  }

  if (!business.bookingAvailable) {
    return NextResponse.json({ error: "الحجوزات غير مفعلة حالياً" }, { status: 403 });
  }

  if (parsed.data.serviceId) {
    const service = await db.service.findFirst({
      where: {
        id: parsed.data.serviceId,
        businessId: business.id,
        bookingEnabled: true,
        isActive: true,
      },
    });

    if (!service) {
      return NextResponse.json({ error: "الخدمة المختارة غير متاحة" }, { status: 400 });
    }
  }

  const customer = await db.customer.create({
    data: {
      businessId: business.id,
      name: parsed.data.customerName,
      phone: parsed.data.customerPhone,
      notes: parsed.data.notes,
    },
  });

  const booking = await db.booking.create({
    data: {
      businessId: business.id,
      customerId: customer.id,
      serviceId: parsed.data.serviceId || null,
      bookingDate: parsed.data.bookingDate,
      bookingTime: parsed.data.bookingTime,
      notes: parsed.data.notes,
      status: "pending",
    },
  });

  revalidatePath("/dashboard/bookings");

  return NextResponse.json({ success: true, bookingId: booking.id });
}
