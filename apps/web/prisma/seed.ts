import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  return url;
}

const pool = new Pool({ connectionString: getDatabaseUrl() });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@hee.sa" },
    update: { name: "حساب تجريبي" },
    create: {
      name: "حساب تجريبي",
      email: "demo@hee.sa",
      passwordHash: "seed-password-hash",
    },
  });

  await prisma.business.upsert({
    where: { slug: "demo" },
    update: {
      name: "مطعم النخلة",
      businessType: "مطعم عائلي",
      city: "الرياض",
      district: "النخيل",
      description: "مطعم النخلة يقدم أطباقًا عربية طازجة يوميًا بجودة عالية وتجربة ضيافة دافئة.",
      whatsapp: "966500000000",
      phone: "966500000000",
      address: "حي النخيل، الرياض",
      coverUrl: "/demo/restaurant-cover.jpg",
      logoUrl: "/demo/restaurant-logo.jpg",
      isPublished: true,
      isVerified: true,
    },
    create: {
      ownerId: user.id,
      name: "مطعم النخلة",
      slug: "demo",
      businessType: "مطعم عائلي",
      city: "الرياض",
      district: "النخيل",
      description: "مطعم النخلة يقدم أطباقًا عربية طازجة يوميًا بجودة عالية وتجربة ضيافة دافئة.",
      whatsapp: "966500000000",
      phone: "966500000000",
      address: "حي النخيل، الرياض",
      coverUrl: "/demo/restaurant-cover.jpg",
      logoUrl: "/demo/restaurant-logo.jpg",
      isPublished: true,
      isVerified: true,
    },
  });

  console.log("Seed completed.");
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
