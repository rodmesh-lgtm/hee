"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getOwnedBusinessWithPlanForWrite, ownsBusinessRecord } from "../lib/ownership";
import { getPlanEntitlements, limitReached } from "../lib/plan-entitlements";
import { removePersistentUrl } from "../lib/storage-lifecycle";
import { normalizeGoogleMapsUrl } from "../lib/google-maps-url";

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function bounded(formData: FormData, key: string, max: number) { const value = text(formData, key); return value.length <= max ? value : null; }
function optionalBounded(formData: FormData, key: string, max: number) { const value = bounded(formData, key, max); return value === null ? null : value || null; }
function integer(formData: FormData, key: string, fallback = 0) { const parsed = Number.parseInt(text(formData, key), 10); return Number.isFinite(parsed) ? Math.max(0, Math.min(100000, parsed)) : fallback; }
function validEmail(value: string | null) { return !value || (value.length <= 254 && /^\S+@\S+\.\S+$/.test(value)); }

function refresh(slug: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/directory");
  revalidatePath("/dashboard/my-page");
  revalidatePath(`/${slug}`);
}
function finish(slug: string, status: string) { refresh(slug); redirect(`/dashboard/directory?status=${encodeURIComponent(status)}`); }
function fail(status: string): never { redirect(`/dashboard/directory?status=${encodeURIComponent(status)}`); }

async function ownedBusinessAndPlan() {
  const business = await getOwnedBusinessWithPlanForWrite();
  if (!business) fail("error-business");
  return { business, entitlements: getPlanEntitlements(business.plan?.code) };
}

async function lockDirectoryScope(tx: Prisma.TransactionClient, businessId: string, scope: "branches" | "departments" | "contacts") {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${businessId}:${scope}`}))`;
}

function branchInput(formData: FormData) {
  const name = bounded(formData, "name", 120);
  const city = optionalBounded(formData, "city", 80);
  const district = optionalBounded(formData, "district", 80);
  const address = optionalBounded(formData, "address", 300);
  const phone = optionalBounded(formData, "phone", 40);
  const whatsapp = optionalBounded(formData, "whatsapp", 40);
  const rawMap = bounded(formData, "googleMapsLink", 500);
  if (name === null || city === null || district === null || address === null || phone === null || whatsapp === null || rawMap === null) fail("error-too-long");
  if (!name) fail("error-required");
  const googleMapsLink = normalizeGoogleMapsUrl(rawMap);
  if (rawMap && !googleMapsLink) fail("error-map");
  return { name, city, district, address, phone, whatsapp, googleMapsLink };
}

export async function createBranchAction(formData: FormData) {
  const { business, entitlements } = await ownedBusinessAndPlan();
  const input = branchInput(formData);

  const result = await db.$transaction(async (tx) => {
    await lockDirectoryScope(tx, business.id, "branches");
    const branchCount = await tx.branch.count({ where: { businessId: business.id } });
    if (limitReached(branchCount, entitlements.branchLimit)) return "limit" as const;

    const activeBranchCount = await tx.branch.count({ where: { businessId: business.id, isActive: true } });
    const isMain = activeBranchCount === 0 || formData.get("isMain") === "on";
    const nextSort = (await tx.branch.aggregate({ where: { businessId: business.id }, _max: { sortOrder: true } }))._max.sortOrder ?? -1;
    if (isMain) await tx.branch.updateMany({ where: { businessId: business.id }, data: { isMain: false } });
    await tx.branch.create({ data: { businessId: business.id, ...input, isMain, isActive: true, sortOrder: nextSort + 1 } });
    return "created" as const;
  });

  if (result === "limit") fail("error-plan-branch-limit");
  finish(business.slug, "branch-created");
}

export async function updateBranchAction(formData: FormData) {
  const { business } = await ownedBusinessAndPlan();
  const id = text(formData, "id");
  const input = branchInput(formData);
  if (!id || !(await ownsBusinessRecord("branch", id, business.id))) fail("error-not-found");
  const nextActive = formData.get("isActive") === "on";
  const requestedMain = nextActive && formData.get("isMain") === "on";

  const result = await db.$transaction(async (tx) => {
    await lockDirectoryScope(tx, business.id, "branches");
    const current = await tx.branch.findFirst({ where: { id, businessId: business.id } });
    if (!current) return "missing" as const;
    if (requestedMain) await tx.branch.updateMany({ where: { businessId: business.id, id: { not: id } }, data: { isMain: false } });
    await tx.branch.update({ where: { id }, data: { ...input, isMain: requestedMain || (current.isMain && nextActive), isActive: nextActive, sortOrder: integer(formData, "sortOrder") } });
    if (!nextActive) await tx.contactPerson.updateMany({ where: { businessId: business.id, branchId: id }, data: { branchId: null } });
    const activeMain = await tx.branch.findFirst({ where: { businessId: business.id, isActive: true, isMain: true }, select: { id: true } });
    if (!activeMain) {
      const replacement = await tx.branch.findFirst({ where: { businessId: business.id, isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
      if (replacement) await tx.branch.update({ where: { id: replacement.id }, data: { isMain: true } });
    }
    return "updated" as const;
  });
  if (result === "missing") fail("error-not-found");
  finish(business.slug, "branch-updated");
}

export async function deleteBranchAction(formData: FormData) {
  const { business } = await ownedBusinessAndPlan();
  const id = text(formData, "id");
  if (!id || !(await ownsBusinessRecord("branch", id, business.id))) fail("error-not-found");
  const result = await db.$transaction(async (tx) => {
    await lockDirectoryScope(tx, business.id, "branches");
    const deleting = await tx.branch.findFirst({ where: { id, businessId: business.id }, select: { id: true, isMain: true } });
    if (!deleting) return "missing" as const;
    await tx.branch.delete({ where: { id: deleting.id } });
    if (deleting.isMain) {
      const replacement = await tx.branch.findFirst({ where: { businessId: business.id, isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
      if (replacement) await tx.branch.update({ where: { id: replacement.id }, data: { isMain: true } });
    }
    return "deleted" as const;
  });
  if (result === "missing") fail("error-not-found");
  finish(business.slug, "branch-deleted");
}

export async function createDepartmentAction(formData: FormData) {
  const { business, entitlements } = await ownedBusinessAndPlan();
  const name = bounded(formData, "name", 120), description = optionalBounded(formData, "description", 500);
  if (name === null || description === null) fail("error-too-long");
  if (!name) fail("error-required");
  const result = await db.$transaction(async (tx) => {
    await lockDirectoryScope(tx, business.id, "departments");
    const count = await tx.department.count({ where: { businessId: business.id } });
    if (limitReached(count, entitlements.departmentLimit)) return "limit" as const;
    const nextSort = (await tx.department.aggregate({ where: { businessId: business.id }, _max: { sortOrder: true } }))._max.sortOrder ?? -1;
    await tx.department.create({ data: { businessId: business.id, name, description, sortOrder: nextSort + 1 } });
    return "created" as const;
  });
  if (result === "limit") fail("error-plan-department-limit");
  finish(business.slug, "department-created");
}

export async function updateDepartmentAction(formData: FormData) {
  const { business } = await ownedBusinessAndPlan();
  const id = text(formData, "id"), name = bounded(formData, "name", 120), description = optionalBounded(formData, "description", 500);
  if (name === null || description === null) fail("error-too-long");
  if (!id || !name || !(await ownsBusinessRecord("department", id, business.id))) fail("error-not-found");
  const updated = await db.department.updateMany({ where: { id, businessId: business.id }, data: { name, description, isActive: formData.get("isActive") === "on", sortOrder: integer(formData, "sortOrder") } });
  if (updated.count !== 1) fail("error-not-found");
  finish(business.slug, "department-updated");
}

export async function deleteDepartmentAction(formData: FormData) {
  const { business } = await ownedBusinessAndPlan();
  const id = text(formData, "id");
  if (!id || !(await ownsBusinessRecord("department", id, business.id))) fail("error-not-found");
  const result = await db.department.deleteMany({ where: { id, businessId: business.id } });
  if (result.count === 0) fail("error-not-found");
  finish(business.slug, "department-deleted");
}

function contactInput(formData: FormData) {
  const name = bounded(formData, "name", 120);
  const jobTitle = optionalBounded(formData, "jobTitle", 120);
  const phone = optionalBounded(formData, "phone", 40);
  const whatsapp = optionalBounded(formData, "whatsapp", 40);
  const email = optionalBounded(formData, "email", 254);
  if (name === null || jobTitle === null || phone === null || whatsapp === null || email === null) fail("error-too-long");
  if (!name) fail("error-required");
  if (!validEmail(email)) fail("error-email");
  return { name, jobTitle, phone, whatsapp, email };
}

export async function createContactPersonAction(formData: FormData) {
  const { business, entitlements } = await ownedBusinessAndPlan();
  const input = contactInput(formData);
  const departmentId = optionalBounded(formData, "departmentId", 80), branchId = optionalBounded(formData, "branchId", 80);
  if (departmentId === null || branchId === null) fail("error-too-long");
  if ((departmentId && !(await ownsBusinessRecord("department", departmentId, business.id))) || (branchId && !(await ownsBusinessRecord("branch", branchId, business.id)))) fail("error-relation");

  const result = await db.$transaction(async (tx) => {
    await lockDirectoryScope(tx, business.id, "contacts");
    const count = await tx.contactPerson.count({ where: { businessId: business.id } });
    if (limitReached(count, entitlements.contactLimit)) return "limit" as const;
    if (departmentId && !(await tx.department.findFirst({ where: { id: departmentId, businessId: business.id }, select: { id: true } }))) return "relation" as const;
    if (branchId && !(await tx.branch.findFirst({ where: { id: branchId, businessId: business.id }, select: { id: true } }))) return "relation" as const;

    const activeContactCount = await tx.contactPerson.count({ where: { businessId: business.id, isActive: true } });
    const isPrimary = activeContactCount === 0 || formData.get("isPrimary") === "on";
    const nextSort = (await tx.contactPerson.aggregate({ where: { businessId: business.id }, _max: { sortOrder: true } }))._max.sortOrder ?? -1;
    if (isPrimary) await tx.contactPerson.updateMany({ where: { businessId: business.id }, data: { isPrimary: false } });
    // Contact photos must be created by a dedicated validated upload flow. Never trust a hidden imageUrl field.
    await tx.contactPerson.create({ data: { businessId: business.id, ...input, departmentId, branchId, imageUrl: null, isPrimary, isActive: true, sortOrder: nextSort + 1 } });
    return "created" as const;
  });

  if (result === "limit") fail("error-plan-contact-limit");
  if (result === "relation") fail("error-relation");
  finish(business.slug, "contact-created");
}

export async function updateContactPersonAction(formData: FormData) {
  const { business } = await ownedBusinessAndPlan();
  const id = text(formData, "id"), input = contactInput(formData);
  if (!id || !(await ownsBusinessRecord("contactPerson", id, business.id))) fail("error-not-found");
  const departmentId = optionalBounded(formData, "departmentId", 80), branchId = optionalBounded(formData, "branchId", 80);
  if (departmentId === null || branchId === null) fail("error-too-long");
  if ((departmentId && !(await ownsBusinessRecord("department", departmentId, business.id))) || (branchId && !(await ownsBusinessRecord("branch", branchId, business.id)))) fail("error-relation");
  const nextActive = formData.get("isActive") === "on";
  const requestedPrimary = nextActive && formData.get("isPrimary") === "on";

  const result = await db.$transaction(async (tx) => {
    await lockDirectoryScope(tx, business.id, "contacts");
    const current = await tx.contactPerson.findFirst({ where: { id, businessId: business.id } });
    if (!current) return "missing" as const;
    if (departmentId && !(await tx.department.findFirst({ where: { id: departmentId, businessId: business.id }, select: { id: true } }))) return "relation" as const;
    if (branchId && !(await tx.branch.findFirst({ where: { id: branchId, businessId: business.id }, select: { id: true } }))) return "relation" as const;

    if (requestedPrimary) await tx.contactPerson.updateMany({ where: { businessId: business.id, id: { not: id } }, data: { isPrimary: false } });
    await tx.contactPerson.update({ where: { id }, data: { ...input, departmentId, branchId, imageUrl: current.imageUrl, isPrimary: requestedPrimary || (current.isPrimary && nextActive), isActive: nextActive, sortOrder: integer(formData, "sortOrder") } });
    const activePrimary = await tx.contactPerson.findFirst({ where: { businessId: business.id, isActive: true, isPrimary: true }, select: { id: true } });
    if (!activePrimary) {
      const replacement = await tx.contactPerson.findFirst({ where: { businessId: business.id, isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
      if (replacement) await tx.contactPerson.update({ where: { id: replacement.id }, data: { isPrimary: true } });
    }
    return "updated" as const;
  });

  if (result === "missing") fail("error-not-found");
  if (result === "relation") fail("error-relation");
  finish(business.slug, "contact-updated");
}

export async function deleteContactPersonAction(formData: FormData) {
  const { business } = await ownedBusinessAndPlan();
  const id = text(formData, "id");
  if (!id || !(await ownsBusinessRecord("contactPerson", id, business.id))) fail("error-not-found");

  const result = await db.$transaction(async (tx) => {
    await lockDirectoryScope(tx, business.id, "contacts");
    const deleting = await tx.contactPerson.findFirst({ where: { id, businessId: business.id }, select: { id: true, isPrimary: true, imageUrl: true } });
    if (!deleting) return { kind: "missing" as const, imageUrl: null as string | null };
    await tx.contactPerson.delete({ where: { id: deleting.id } });
    if (deleting.isPrimary) {
      const replacement = await tx.contactPerson.findFirst({ where: { businessId: business.id, isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
      if (replacement) await tx.contactPerson.update({ where: { id: replacement.id }, data: { isPrimary: true } });
    }
    return { kind: "deleted" as const, imageUrl: deleting.imageUrl };
  });

  if (result.kind === "missing") fail("error-not-found");
  try { await removePersistentUrl(result.imageUrl); } catch (error) { console.error("Failed to clean deleted contact image", error); }
  finish(business.slug, "contact-deleted");
}
