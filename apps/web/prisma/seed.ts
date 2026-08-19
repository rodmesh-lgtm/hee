import "dotenv/config";

import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

const pool = new Pool({ connectionString: getDatabaseUrl() });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const plans = [
  { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3, aiEnabled: false, onlinePay: false },
  { code: "BUSINESS", name: "Business", monthlyPrice: 199, productLimit: 10, aiEnabled: true, onlinePay: true },
  { code: "PRO", name: "Pro", monthlyPrice: 399, productLimit: 30, aiEnabled: true, onlinePay: true },
] as const;

async function seedPlans() {
  for (const plan of plans) {
    await prisma.businessPlan.upsert({
      where: { code: plan.code },
      update: { ...plan, isActive: true },
      create: { ...plan, isActive: true },
    });
  }
}

async function seedOptionalDemo() {
  if (process.env.SEED_DEMO_BUSINESS !== "true") return;
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing to create the demo account in production");
  }

  const freePlan = await prisma.businessPlan.findUniqueOrThrow({ where: { code: "FREE" } });
  const password = process.env.SEED_DEMO_PASSWORD?.trim();
  if (!password || password.length < 12) {
    throw new Error("SEED_DEMO_PASSWORD must be at least 12 characters when SEED_DEMO_BUSINESS=true");
  }

  const email = "demo.preview@hee.local";
  const passwordHash = await hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name: "حساب HEE التجريبي", passwordHash, deletedAt: null },
    create: { name: "حساب HEE التجريبي", email, passwordHash },
  });

  await prisma.business.upsert({
    where: { slug: "sample-business" },
    update: {
      ownerId: user.id,
      planId: freePlan.id,
      name: "مطعم النخلة",
      businessType: "مطعم عائلي",
      city: "الرياض",
      district: "النخيل",
      description: "مطعم النخلة يقدم أطباقًا عربية طازجة يوميًا بجودة عالية وتجربة ضيافة دافئة.",
      whatsapp: "966500000000",
      phone: "966500000000",
      address: "حي النخيل، الرياض",
      isPublished: true,
      onboardingCompleted: true,
      onboardingStep: "published",
      publishedAt: new Date(),
      deletedAt: null,
    },
    create: {
      ownerId: user.id,
      planId: freePlan.id,
      name: "مطعم النخلة",
      slug: "sample-business",
      businessType: "مطعم عائلي",
      city: "الرياض",
      district: "النخيل",
      description: "مطعم النخلة يقدم أطباقًا عربية طازجة يوميًا بجودة عالية وتجربة ضيافة دافئة.",
      whatsapp: "966500000000",
      phone: "966500000000",
      address: "حي النخيل، الرياض",
      isPublished: true,
      onboardingCompleted: true,
      onboardingStep: "published",
      publishedAt: new Date(),
    },
  });
}

async function main() {
  await seedPlans();
  await seedOptionalDemo();
  console.log("HEE seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
