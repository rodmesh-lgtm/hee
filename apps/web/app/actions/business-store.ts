"use server";

import { Prisma } from "@prisma/client";
import { getCurrentUserForWrites } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { db } from "../lib/db";

const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const MAX_CUSTOMIZATION_JSON_BYTES = 16 * 1024;

export type BusinessStoreDraftResult =
  | { ok: true; orderId: string; reused: boolean }
  | { ok: false; code: "BUSINESS_NOT_FOUND" | "INVALID_IDEMPOTENCY_KEY" | "INVALID_CUSTOMIZATION" };

function normalizeIdempotencyKey(value: unknown) {
  if (typeof value !== "string") return null;
  const key = value.trim();
  if (!key || key.length > MAX_IDEMPOTENCY_KEY_LENGTH) return null;
  return /^[A-Za-z0-9._:-]+$/.test(key) ? key : null;
}

function normalizeCustomization(value: unknown): Prisma.InputJsonValue | null {
  if (value === undefined || value === null) return {};
  try {
    const serialized = JSON.stringify(value);
    if (!serialized || Buffer.byteLength(serialized, "utf8") > MAX_CUSTOMIZATION_JSON_BYTES) return null;
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return null;
    return parsed as Prisma.InputJsonValue;
  } catch {
    return null;
  }
}

export async function createBusinessStoreDraftAction(input: {
  idempotencyKey: string;
  customization?: unknown;
}): Promise<BusinessStoreDraftResult> {
  const user = await getCurrentUserForWrites();
  const business = await getActiveBusinessForUser(user.id);
  if (!business) return { ok: false, code: "BUSINESS_NOT_FOUND" };

  const idempotencyKey = normalizeIdempotencyKey(input?.idempotencyKey);
  if (!idempotencyKey) return { ok: false, code: "INVALID_IDEMPOTENCY_KEY" };

  const customizationSnapshot = normalizeCustomization(input?.customization);
  if (!customizationSnapshot) return { ok: false, code: "INVALID_CUSTOMIZATION" };

  return db.$transaction(async (tx) => {
    // Serialize retries for this tenant/key. The database unique constraint remains the
    // final invariant; this lock gives concurrent callers deterministic reuse semantics.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`business-store-draft:${business.id}:${idempotencyKey}`}))`;

    const owned = await tx.business.findFirst({
      where: { id: business.id, ownerId: user.id, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        nameEn: true,
        businessType: true,
      },
    });
    if (!owned) return { ok: false as const, code: "BUSINESS_NOT_FOUND" as const };

    const existing = await tx.businessStoreOrder.findUnique({
      where: { businessId_idempotencyKey: { businessId: owned.id, idempotencyKey } },
      select: { id: true },
    });
    if (existing) return { ok: true as const, orderId: existing.id, reused: true };

    const identitySnapshot: Prisma.InputJsonValue = {
      businessId: owned.id,
      name: owned.name,
      nameEn: owned.nameEn,
      slug: owned.slug,
      businessType: owned.businessType,
      logoUrl: owned.logoUrl,
      primaryColor: owned.primaryColor,
      secondaryColor: owned.secondaryColor,
    };

    const created = await tx.businessStoreOrder.create({
      data: {
        businessId: owned.id,
        idempotencyKey,
        businessNameSnapshot: owned.name,
        businessSlugSnapshot: owned.slug,
        publicUrlSnapshot: `/${owned.slug}`,
        logoUrlSnapshot: owned.logoUrl,
        primaryColorSnapshot: owned.primaryColor,
        secondaryColorSnapshot: owned.secondaryColor,
        identitySnapshot,
        customizationSnapshot,
      },
      select: { id: true },
    });

    return { ok: true as const, orderId: created.id, reused: false };
  });
}
