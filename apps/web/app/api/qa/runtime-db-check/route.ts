import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const raw = process.env.DATABASE_URL || "";

  let database: {
    protocol: string | null;
    host: string | null;
    port: string | null;
    database: string | null;
    fingerprint: string | null;
  } = {
    protocol: null,
    host: null,
    port: null,
    database: null,
    fingerprint: null,
  };

  try {
    const url = new URL(raw);
    database = {
      protocol: url.protocol,
      host: url.hostname,
      port: url.port || "default",
      database: url.pathname.replace(/^\//, ""),
      fingerprint: crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12),
    };
  } catch {
    database.fingerprint = raw
      ? crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12)
      : null;
  }

  const business = await db.business.findUnique({
    where: { slug: "khuzama-home" },
    select: {
      id: true,
      slug: true,
      name: true,
      isPublished: true,
      branches: { select: { id: true } },
      departments: {
        select: {
          id: true,
          contacts: { select: { id: true } },
        },
      },
    },
  });

  return NextResponse.json(
    {
      database,
      khuzama: business
        ? {
            id: business.id,
            slug: business.slug,
            name: business.name,
            isPublished: business.isPublished,
            branches: business.branches.length,
            departments: business.departments.length,
            contacts: business.departments.reduce((total, department) => total + department.contacts.length, 0),
          }
        : null,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
