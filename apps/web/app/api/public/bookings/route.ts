import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../../../lib/db";
import { normalizePublicSlug } from "../../../lib/public-url";

const bookingSchema = z.object({
  slug: z.string().trim().min(4).max(80),
  serviceId: z.string().trim().max(120).optional().default(""),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bookingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(4).max(30),
  notes: z.string().trim().max(1000).optional().default(""),
});

function isRealCalendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات الحجز غير صالحة" }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success || !isRealCalendarDate(parsed.success ? parsed.data.bookingDate : "")) {
    return NextResponse.json({ error: "بيانات الحجز غير صالحة" }, { status: 400 });
  }

  const slug = normalizePublicSlug(parsed.data.slug);
  const business = await db.business.findUnique({ where: { slug } });
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
        deletedAt: null,
      },
    });

    if (!service) {
      return NextResponse.json({ error: "الخدمة المختارة غير متاحة" }, { status: 400 });
    }
  }

  const booking = await db.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        businessId: business.id,
        name: parsed.data.customerName,
        phone: parsed.data.customerPhone,
        notes: parsed.data.notes || null,
      },
    });

    return tx.booking.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        serviceId: parsed.data.serviceId || null,
        bookingDate: parsed.data.bookingDate,
        bookingTime: parsed.data.bookingTime,
        notes: parsed.data.notes || null,
        status: "pending",
      },
    });
  });

  revalidatePath("/dashboard/bookings");
  return NextResponse.json({ success: true, bookingId: booking.id }, { status: 201 });
}
