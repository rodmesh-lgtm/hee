"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../lib/admin";
import { db } from "../lib/db";

const SKU_RE = /^[a-z0-9][a-z0-9-]{2,63}$/;
const CATEGORY_RE = /^[a-z0-9][a-z0-9-]{1,47}$/;

function text(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function nullableText(value: FormDataEntryValue | null, max: number) {
  const result = text(value, max);
  return result || null;
}

function integer(value: FormDataEntryValue | null, min: number, max: number) {
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function sarToHalalas(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(raw)) return null;
  const [whole, fraction = ""] = raw.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(result) && result > 0 && result <= 100_000_000 ? result : null;
}

function safeImageUrl(value: FormDataEntryValue | null) {
  const raw = text(value, 2048);
  if (!raw) return null;
  if (raw.startsWith("/api/storage/") || raw.startsWith("/images/")) return raw;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function audit(tx: Prisma.TransactionClient, actorUserId: string, productId: string, action: "created" | "updated" | "activated" | "deactivated") {
  const rows = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT "id", "sku", "title", "description", "unitPrice", "badge", "category",
           "imageUrl", "maxQuantity", "isActive", "sortOrder", "createdAt", "updatedAt"
    FROM "BusinessStoreCatalogProduct" WHERE "id" = ${productId} LIMIT 1
  `);
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO "BusinessStoreCatalogAudit" ("id", "actorUserId", "productId", "action", "snapshot")
    VALUES (${randomUUID()}, ${actorUserId}, ${productId}, ${action}, ${JSON.stringify(rows[0] ?? {})}::jsonb)
  `);
}

export async function createBusinessStoreProductAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const sku = text(formData.get("sku"), 64).toLowerCase();
  const title = text(formData.get("title"), 160);
  const description = text(formData.get("description"), 1500);
  const badge = nullableText(formData.get("badge"), 80);
  const category = text(formData.get("category"), 48).toLowerCase();
  const unitPrice = sarToHalalas(formData.get("priceSar"));
  const maxQuantity = integer(formData.get("maxQuantity"), 1, 1000);
  const sortOrder = integer(formData.get("sortOrder"), 0, 100000);
  const imageUrl = safeImageUrl(formData.get("imageUrl"));

  if (!SKU_RE.test(sku) || !title || title.length < 2 || !description || description.length < 5 || !CATEGORY_RE.test(category) || unitPrice === null || maxQuantity === null || sortOrder === null) {
    redirect("/admin/store-products?result=invalid");
  }

  try {
    await db.$transaction(async (tx) => {
      const id = randomUUID();
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "BusinessStoreCatalogProduct"
          ("id","sku","title","description","unitPrice","badge","category","imageUrl","maxQuantity","isActive","sortOrder","updatedAt")
        VALUES
          (${id},${sku},${title},${description},${unitPrice},${badge},${category},${imageUrl},${maxQuantity},true,${sortOrder},CURRENT_TIMESTAMP)
      `);
      await audit(tx, admin.id, id, "created");
    });
  } catch (error) {
    const duplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (duplicate) redirect("/admin/store-products?result=duplicate-sku");
    console.error("[admin-business-store] create_failed", { adminId: admin.id, error });
    redirect("/admin/store-products?result=error");
  }

  revalidatePath("/admin/store-products");
  revalidatePath("/dashboard/business-store");
  redirect("/admin/store-products?result=created");
}

export async function updateBusinessStoreProductAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const productId = text(formData.get("productId"), 80);
  const title = text(formData.get("title"), 160);
  const description = text(formData.get("description"), 1500);
  const badge = nullableText(formData.get("badge"), 80);
  const category = text(formData.get("category"), 48).toLowerCase();
  const unitPrice = sarToHalalas(formData.get("priceSar"));
  const maxQuantity = integer(formData.get("maxQuantity"), 1, 1000);
  const sortOrder = integer(formData.get("sortOrder"), 0, 100000);
  const imageUrl = safeImageUrl(formData.get("imageUrl"));

  if (!productId || !title || title.length < 2 || !description || description.length < 5 || !CATEGORY_RE.test(category) || unitPrice === null || maxQuantity === null || sortOrder === null) {
    redirect("/admin/store-products?result=invalid");
  }

  const changed = await db.$transaction(async (tx) => {
    const count = await tx.$executeRaw(Prisma.sql`
      UPDATE "BusinessStoreCatalogProduct"
      SET "title"=${title}, "description"=${description}, "unitPrice"=${unitPrice},
          "badge"=${badge}, "category"=${category}, "imageUrl"=${imageUrl},
          "maxQuantity"=${maxQuantity}, "sortOrder"=${sortOrder}, "updatedAt"=CURRENT_TIMESTAMP
      WHERE "id"=${productId}
    `);
    if (Number(count) !== 1) return false;
    await audit(tx, admin.id, productId, "updated");
    return true;
  });
  if (!changed) redirect("/admin/store-products?result=missing");

  revalidatePath("/admin/store-products");
  revalidatePath("/dashboard/business-store");
  redirect("/admin/store-products?result=updated");
}

export async function toggleBusinessStoreProductAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const productId = text(formData.get("productId"), 80);
  const activate = String(formData.get("activate") ?? "") === "1";
  if (!productId) redirect("/admin/store-products?result=invalid");

  const changed = await db.$transaction(async (tx) => {
    const count = await tx.$executeRaw(Prisma.sql`
      UPDATE "BusinessStoreCatalogProduct"
      SET "isActive"=${activate}, "updatedAt"=CURRENT_TIMESTAMP
      WHERE "id"=${productId} AND "isActive" <> ${activate}
    `);
    if (Number(count) !== 1) return false;
    await audit(tx, admin.id, productId, activate ? "activated" : "deactivated");
    return true;
  });

  revalidatePath("/admin/store-products");
  revalidatePath("/dashboard/business-store");
  redirect(`/admin/store-products?result=${changed ? (activate ? "activated" : "deactivated") : "unchanged"}`);
}
