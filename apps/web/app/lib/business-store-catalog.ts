import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";

export type BusinessStoreCatalogItem = {
  sku: string;
  title: string;
  description: string;
  unitPrice: number;
  badge: string | null;
  category: string;
  imageUrl: string | null;
  maxQuantity: number;
};

export type BusinessStoreCatalogAdminItem = BusinessStoreCatalogItem & {
  id: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

const SELECT_COLUMNS = Prisma.sql`
  "id", "sku", "title", "description", "unitPrice", "badge", "category",
  "imageUrl", "maxQuantity", "isActive", "sortOrder", "createdAt", "updatedAt"
`;

export async function listBusinessStoreCatalogItems(): Promise<BusinessStoreCatalogItem[]> {
  const rows = await db.$queryRaw<BusinessStoreCatalogAdminItem[]>(Prisma.sql`
    SELECT ${SELECT_COLUMNS}
    FROM "BusinessStoreCatalogProduct"
    WHERE "isActive" = true
    ORDER BY "sortOrder" ASC, "createdAt" ASC
  `);
  return rows.map(({ sku, title, description, unitPrice, badge, category, imageUrl, maxQuantity }) => ({
    sku,
    title,
    description,
    unitPrice,
    badge,
    category,
    imageUrl,
    maxQuantity,
  }));
}

export async function listBusinessStoreCatalogProductsForAdmin(): Promise<BusinessStoreCatalogAdminItem[]> {
  return db.$queryRaw<BusinessStoreCatalogAdminItem[]>(Prisma.sql`
    SELECT ${SELECT_COLUMNS}
    FROM "BusinessStoreCatalogProduct"
    ORDER BY "sortOrder" ASC, "createdAt" ASC
  `);
}

export async function getBusinessStoreCatalogItem(sku: unknown): Promise<BusinessStoreCatalogItem | null> {
  if (typeof sku !== "string") return null;
  const normalized = sku.trim();
  if (!normalized) return null;
  const rows = await db.$queryRaw<BusinessStoreCatalogAdminItem[]>(Prisma.sql`
    SELECT ${SELECT_COLUMNS}
    FROM "BusinessStoreCatalogProduct"
    WHERE "sku" = ${normalized} AND "isActive" = true
    LIMIT 1
  `);
  const row = rows[0];
  if (!row) return null;
  return {
    sku: row.sku,
    title: row.title,
    description: row.description,
    unitPrice: row.unitPrice,
    badge: row.badge,
    category: row.category,
    imageUrl: row.imageUrl,
    maxQuantity: row.maxQuantity,
  };
}
