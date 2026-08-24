"use server";

import { Prisma } from "@prisma/client";
import { getCurrentUserForWrites } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { getBusinessStoreCatalogItem } from "../lib/business-store-catalog";
import { db } from "../lib/db";

const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const MAX_CUSTOMIZATION_JSON_BYTES = 16 * 1024;

export type BusinessStoreDraftResult =
  | { ok: true; orderId: string; reused: boolean }
  | { ok: false; code: "BUSINESS_NOT_FOUND" | "INVALID_IDEMPOTENCY_KEY" | "INVALID_CUSTOMIZATION" };

export type BusinessStoreDraftItemResult =
  | { ok: true; orderId: string; itemId: string; subtotal: number; replaced: boolean }
  | { ok: false; code: "BUSINESS_NOT_FOUND" | "ORDER_NOT_FOUND" | "ORDER_NOT_DRAFT" | "INVALID_SKU" | "INVALID_QUANTITY" | "INVALID_CUSTOMIZATION" };

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

export async function setBusinessStoreDraftItemAction(input: {
  orderId: string;
  sku: string;
  quantity: number;
  customization?: unknown;
}): Promise<BusinessStoreDraftItemResult> {
  const user = await getCurrentUserForWrites();
  const business = await getActiveBusinessForUser(user.id);
  if (!business) return { ok: false, code: "BUSINESS_NOT_FOUND" };

  const catalogItem = getBusinessStoreCatalogItem(input?.sku);
  if (!catalogItem) return { ok: false, code: "INVALID_SKU" };
  if (!Number.isSafeInteger(input?.quantity) || input.quantity < 1 || input.quantity > catalogItem.maxQuantity) {
    return { ok: false, code: "INVALID_QUANTITY" };
  }

  const customizationSnapshot = normalizeCustomization(input?.customization);
  if (!customizationSnapshot) return { ok: false, code: "INVALID_CUSTOMIZATION" };
  if (typeof input?.orderId !== "string" || !input.orderId.trim()) return { ok: false, code: "ORDER_NOT_FOUND" };

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`business-store-order:${input.orderId}`}))`;

    const order = await tx.businessStoreOrder.findFirst({
      where: {
        id: input.orderId,
        businessId: business.id,
        business: { ownerId: user.id, deletedAt: null },
      },
      select: { id: true, status: true },
    });
    if (!order) return { ok: false as const, code: "ORDER_NOT_FOUND" as const };
    if (order.status !== "draft") return { ok: false as const, code: "ORDER_NOT_DRAFT" as const };

    const lineTotal = catalogItem.unitPrice * input.quantity;
    const existing = await tx.businessStoreOrderItem.findFirst({
      where: { orderId: order.id, sku: catalogItem.sku },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    const item = existing
      ? await tx.businessStoreOrderItem.update({
          where: { id: existing.id },
          data: {
            nameSnapshot: catalogItem.title,
            descriptionSnapshot: catalogItem.description,
            unitPrice: catalogItem.unitPrice,
            quantity: input.quantity,
            lineTotal,
            customizationSnapshot,
          },
          select: { id: true },
        })
      : await tx.businessStoreOrderItem.create({
          data: {
            orderId: order.id,
            sku: catalogItem.sku,
            nameSnapshot: catalogItem.title,
            descriptionSnapshot: catalogItem.description,
            unitPrice: catalogItem.unitPrice,
            quantity: input.quantity,
            lineTotal,
            customizationSnapshot,
          },
          select: { id: true },
        });

    // Older/manual data could contain duplicate SKU lines. Collapse extras while the
    // database trigger still guarantees the parent is an editable draft.
    if (existing) {
      await tx.businessStoreOrderItem.deleteMany({
        where: { orderId: order.id, sku: catalogItem.sku, id: { not: item.id } },
      });
    }

    const aggregate = await tx.businessStoreOrderItem.aggregate({
      where: { orderId: order.id },
      _sum: { lineTotal: true },
    });
    const subtotal = aggregate._sum.lineTotal ?? 0;

    await tx.businessStoreOrder.update({
      where: { id: order.id },
      data: {
        subtotal,
        shippingAmount: 0,
        vatAmount: 0,
        total: subtotal,
      },
    });

    return { ok: true as const, orderId: order.id, itemId: item.id, subtotal, replaced: Boolean(existing) };
  });
}
