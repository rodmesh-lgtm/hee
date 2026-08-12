import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "../../../lib/db";
import { getCurrentUser } from "../../../lib/auth";
import { businessSchema } from "../../../lib/validation";

async function ensureBusinessPlan(code: "FREE" | "BUSINESS" | "PRO") {
  const planNameMap: Record<typeof code, string> = {
    FREE: "Free",
    BUSINESS: "Business",
    PRO: "Pro",
  };

  const planPriceMap: Record<typeof code, number> = {
    FREE: 0,
    BUSINESS: 199,
    PRO: 399,
  };

  const planLimitMap: Record<typeof code, number> = {
    FREE: 3,
    BUSINESS: 10,
    PRO: 30,
  };

  const existing = await db.businessPlan.findUnique({ where: { code } });
  if (existing) {
    return existing;
  }

  return db.businessPlan.create({
    data: {
      code,
      name: planNameMap[code],
      monthlyPrice: planPriceMap[code],
      productLimit: planLimitMap[code],
      aiEnabled: code !== "FREE",
      onlinePay: code !== "FREE",
      isActive: true,
    },
  });
}

type CreateBusinessPayload = {
  name?: string;
  slug?: string;
  businessType?: string;
  description?: string;
  city?: string;
  whatsapp?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  primaryColor?: string;
};

function normalize(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول" }, { status: 401 });
  }

  let body: CreateBusinessPayload;
  try {
    body = (await request.json()) as CreateBusinessPayload;
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const payload = {
    name: normalize(body.name),
    slug: normalize(body.slug),
    businessType: normalize(body.businessType),
    description: normalize(body.description),
    city: normalize(body.city),
    whatsapp: normalize(body.whatsapp),
    phone: normalize(body.phone),
    address: normalize(body.address),
    logoUrl: normalize(body.logoUrl),
    primaryColor: normalize(body.primaryColor, "#6366f1"),
  };

  const parsed = businessSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "بيانات النشاط غير صالحة";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const slugTaken = await db.business.findUnique({ where: { slug: parsed.data.slug } });
  if (slugTaken) {
    return NextResponse.json({ error: "اسم الرابط مستخدم مسبقاً" }, { status: 409 });
  }

  const freePlan = await ensureBusinessPlan("FREE");

  const business = await db.business.create({
    data: {
      ownerId: user.id,
      ...parsed.data,
      isVerified: false,
      isPublished: true,
      planId: freePlan.id,
    },
  });

  revalidatePath("/dashboard");

  return NextResponse.json({ redirectTo: `/b/${business.slug}` }, { status: 201 });
}
