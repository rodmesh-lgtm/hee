"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getOwnedBusinessWithPlanForWrite, ownsBusinessRecord } from "../lib/ownership";
import { getPlanEntitlements, limitReached } from "../lib/plan-entitlements";
import { removePersistentUrl, removeReplacedPersistentUrl } from "../lib/storage-lifecycle";

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function optional(formData: FormData, key: string) { const value = text(formData, key); return value || null; }
function integer(formData: FormData, key: string, fallback = 0) { const parsed = Number.parseInt(text(formData, key), 10); return Number.isFinite(parsed) ? parsed : fallback; }

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

export async function createBranchAction(formData: FormData) {
  const { business, entitlements } = await ownedBusinessAndPlan();
  const name = text(formData, "name"); if (!name) fail("error-required");

  const result = await db.$transaction(async (tx) => {
    await lockDirectoryScope(tx, business.id, "branches");
    const branchCount = await tx.branch.count({ where: { businessId: business.id } });
    if (limitReached(branchCount, entitlements.branchLimit)) return "limit" as const;

    const activeBranchCount = await tx.branch.count({ where: { businessId: business.id, isActive: true } });
    const isMain = activeBranchCount === 0 || formData.get("isMain") === "on";
    const nextSort = (await tx.branch.aggregate({ where: { businessId: business.id }, _max: { sortOrder: true } }))._max.sortOrder ?? -1;
    if (isMain) await tx.branch.updateMany({ where: { businessId: business.id }, data: { isMain: false } });
    await tx.branch.create({ data: { businessId: business.id, name, city: optional(formData,"city"), district: optional(formData,"district"), address: optional(formData,"address"), phone: optional(formData,"phone"), whatsapp: optional(formData,"whatsapp"), googleMapsLink: optional(formData,"googleMapsLink"), isMain, isActive: true, sortOrder: nextSort + 1 } });
    return "created" as const;
  });

  if (result === "limit") fail("error-plan-branch-limit");
  finish(business.slug, "branch-created");
}

export async function updateBranchAction(formData: FormData) {
  const { business } = await ownedBusinessAndPlan();
  const id = text(formData, "id"), name = text(formData, "name");
  if (!id || !name || !(await ownsBusinessRecord("branch", id, business.id))) fail("error-not-found");
  const nextActive = formData.get("isActive") === "on";
  const requestedMain = nextActive && formData.get("isMain") === "on";

  const result = await db.$transaction(async (tx) => {
    await lockDirectoryScope(tx, business.id, "branches");
    const current = await tx.branch.findFirst({ where: { id, businessId: business.id } });
    if (!current) return "missing" as const;
    if (requestedMain) await tx.branch.updateMany({ where: { businessId: business.id, id: { not: id } }, data: { isMain: false } });
    await tx.branch.update({ where: { id }, data: { name, city: optional(formData,"city"), district: optional(formData,"district"), address: optional(formData,"address"), phone: optional(formData,"phone"), whatsapp: optional(formData,"whatsapp"), googleMapsLink: optional(formData,"googleMapsLink"), isMain: requestedMain || (current.isMain && nextActive), isActive: nextActive, sortOrder: integer(formData,"sortOrder") } });
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
  const name = text(formData, "name"); if (!name) fail("error-required");
  const result = await db.$transaction(async (tx) => {
    await lockDirectoryScope(tx, business.id, "departments");
    const count = await tx.department.count({ where: { businessId: business.id } });
    if (limitReached(count, entitlements.departmentLimit)) return "limit" as const;
    const nextSort = (await tx.department.aggregate({ where: { businessId: business.id }, _max: { sortOrder: true } }))._max.sortOrder ?? -1;
    await tx.department.create({ data: { businessId: business.id, name, description: optional(formData,"description"), sortOrder: nextSort + 1 } });
    return "created" as const;
  });
  if (result === "limit") fail("error-plan-department-limit");
  finish(business.slug, "department-created");
}

export async function updateDepartmentAction(formData: FormData) {
  const { business } = await ownedBusinessAndPlan();
  const id = text(formData, "id"), name = text(formData, "name");
  if (!id || !name || !(await ownsBusinessRecord("department", id, business.id))) fail("error-not-found");
  const updated = await db.department.updateMany({ where: { id, businessId: business.id }, data: { name, description: optional(formData,"description"), isActive: formData.get("isActive") === "on", sortOrder: integer(formData,"sortOrder") } });
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

export async function createContactPersonAction(formData: FormData) {
  const { business, entitlements } = await ownedBusinessAndPlan();
  const name = text(formData, "name"); if (!name) fail("error-required");
  const departmentId = optional(formData, "departmentId"), branchId = optional(formData, "branchId");
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
    await tx.contactPerson.create({ data: { businessId: business.id, name, jobTitle: optional(formData,"jobTitle"), departmentId, branchId, phone: optional(formData,"phone"), whatsapp: optional(formData,"whatsapp"), email: optional(formData,"email"), imageUrl: optional(formData,"imageUrl"), isPrimary, isActive: true, sortOrder: nextSort + 1 } });
    return "created" as const;
  });

  if (result === "limit") fail("error-plan-contact-limit");
  if (result === "relation") fail("error-relation");
  finish(business.slug, "contact-created");
}

export async function updateContactPersonAction(formData: FormData) {
  const { business } = await ownedBusinessAndPlan();
  const id = text(formData, "id"), name = text(formData, "name");
  if (!id || !name || !(await ownsBusinessRecord("contactPerson", id, business.id))) fail("error-not-found");
  const departmentId = optional(formData, "departmentId"), branchId = optional(formData, "branchId");
  if ((departmentId && !(await ownsBusinessRecord("department", departmentId, business.id))) || (branchId && !(await ownsBusinessRecord("branch", branchId, business.id)))) fail("error-relation");
  const nextActive = formData.get("isActive") === "on";
  const requestedPrimary = nextActive && formData.get("isPrimary") === "on";
  const nextImageUrl = optional(formData, "imageUrl");

  const result = await db.$transaction(async (tx) => {
    await lockDirectoryScope(tx, business.id, "contacts");
    const current = await tx.contactPerson.findFirst({ where: { id, businessId: business.id } });
    if (!current) return { kind: "missing" as const, previousImageUrl: null as string | null };
    if (departmentId && !(await tx.department.findFirst({ where: { id: departmentId, businessId: business.id }, select: { id: true } }))) return { kind: "relation" as const, previousImageUrl: current.imageUrl };
    if (branchId && !(await tx.branch.findFirst({ where: { id: branchId, businessId: business.id }, select: { id: true } }))) return { kind: "relation" as const, previousImageUrl: current.imageUrl };

    if (requestedPrimary) await tx.contactPerson.updateMany({ where: { businessId: business.id, id: { not: id } }, data: { isPrimary: false } });
    await tx.contactPerson.update({ where: { id }, data: { name, jobTitle: optional(formData,"jobTitle"), departmentId, branchId, phone: optional(formData,"phone"), whatsapp: optional(formData,"whatsapp"), email: optional(formData,"email"), imageUrl: nextImageUrl, isPrimary: requestedPrimary || (current.isPrimary && nextActive), isActive: nextActive, sortOrder: integer(formData,"sortOrder") } });
    const activePrimary = await tx.contactPerson.findFirst({ where: { businessId: business.id, isActive: true, isPrimary: true }, select: { id: true } });
    if (!activePrimary) {
      const replacement = await tx.contactPerson.findFirst({ where: { businessId: business.id, isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
      if (replacement) await tx.contactPerson.update({ where: { id: replacement.id }, data: { isPrimary: true } });
    }
    return { kind: "updated" as const, previousImageUrl: current.imageUrl };
  });

  if (result.kind === "missing") fail("error-not-found");
  if (result.kind === "relation") fail("error-relation");
  try { await removeReplacedPersistentUrl(result.previousImageUrl, nextImageUrl); } catch (error) { console.error("Failed to clean replaced contact image", error); }
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
