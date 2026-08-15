"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getCurrentUserForWrites } from "../lib/auth";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optional(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function integer(formData: FormData, key: string, fallback = 0) {
  const parsed = Number.parseInt(text(formData, key), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function ownedBusiness() {
  const user = await getCurrentUserForWrites();
  if (!user) return null;
  return db.business.findFirst({ where: { ownerId: user.id } });
}

function refresh(slug: string) {
  revalidatePath("/dashboard/directory");
  revalidatePath("/dashboard/my-page");
  revalidatePath(`/${slug}`);
}

function finish(slug: string, status: string) {
  refresh(slug);
  redirect(`/dashboard/directory?status=${encodeURIComponent(status)}`);
}

function fail(status: string): never {
  redirect(`/dashboard/directory?status=${encodeURIComponent(status)}`);
}

async function belongsToBusiness(kind: "branch" | "department", id: string | null, businessId: string) {
  if (!id) return true;
  if (kind === "branch") return Boolean(await db.branch.findFirst({ where: { id, businessId }, select: { id: true } }));
  return Boolean(await db.department.findFirst({ where: { id, businessId }, select: { id: true } }));
}

export async function createBranchAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) fail("error-business");
  const name = text(formData, "name");
  if (!name) fail("error-required");
  const activeBranchCount = await db.branch.count({ where: { businessId: business.id, isActive: true } });
  const isMain = activeBranchCount === 0 || formData.get("isMain") === "on";
  const nextSort = (await db.branch.aggregate({ where: { businessId: business.id }, _max: { sortOrder: true } }))._max.sortOrder ?? -1;
  await db.$transaction(async (tx) => {
    if (isMain) await tx.branch.updateMany({ where: { businessId: business.id }, data: { isMain: false } });
    await tx.branch.create({ data: { businessId: business.id, name, city: optional(formData,"city"), district: optional(formData,"district"), address: optional(formData,"address"), phone: optional(formData,"phone"), whatsapp: optional(formData,"whatsapp"), googleMapsLink: optional(formData,"googleMapsLink"), isMain, isActive: true, sortOrder: nextSort + 1 } });
  });
  finish(business.slug, "branch-created");
}

export async function updateBranchAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) fail("error-business");
  const id = text(formData, "id");
  const name = text(formData, "name");
  const current = id ? await db.branch.findFirst({ where: { id, businessId: business.id } }) : null;
  if (!id || !name || !current) fail("error-not-found");
  const nextActive = formData.get("isActive") === "on";
  const requestedMain = nextActive && formData.get("isMain") === "on";
  await db.$transaction(async (tx) => {
    if (requestedMain) await tx.branch.updateMany({ where: { businessId: business.id, id: { not: id } }, data: { isMain: false } });
    await tx.branch.update({ where: { id }, data: { name, city: optional(formData,"city"), district: optional(formData,"district"), address: optional(formData,"address"), phone: optional(formData,"phone"), whatsapp: optional(formData,"whatsapp"), googleMapsLink: optional(formData,"googleMapsLink"), isMain: requestedMain || (current.isMain && nextActive), isActive: nextActive, sortOrder: integer(formData,"sortOrder") } });
    if (!nextActive) {
      await tx.contactPerson.updateMany({ where: { businessId: business.id, branchId: id }, data: { branchId: null } });
    }
    const activeMain = await tx.branch.findFirst({ where: { businessId: business.id, isActive: true, isMain: true }, select: { id: true } });
    if (!activeMain) {
      const replacement = await tx.branch.findFirst({ where: { businessId: business.id, isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
      if (replacement) await tx.branch.update({ where: { id: replacement.id }, data: { isMain: true } });
    }
  });
  finish(business.slug, "branch-updated");
}

export async function deleteBranchAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) fail("error-business");
  const id = text(formData, "id");
  const current = id ? await db.branch.findFirst({ where: { id, businessId: business.id }, select: { id: true, isMain: true } }) : null;
  if (!current) fail("error-not-found");
  await db.$transaction(async (tx) => {
    await tx.branch.delete({ where: { id: current.id } });
    if (current.isMain) {
      const replacement = await tx.branch.findFirst({ where: { businessId: business.id, isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
      if (replacement) await tx.branch.update({ where: { id: replacement.id }, data: { isMain: true } });
    }
  });
  finish(business.slug, "branch-deleted");
}

export async function createDepartmentAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) fail("error-business");
  const name = text(formData, "name");
  if (!name) fail("error-required");
  const nextSort = (await db.department.aggregate({ where: { businessId: business.id }, _max: { sortOrder: true } }))._max.sortOrder ?? -1;
  await db.department.create({ data: { businessId: business.id, name, description: optional(formData,"description"), sortOrder: nextSort + 1 } });
  finish(business.slug, "department-created");
}

export async function updateDepartmentAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) fail("error-business");
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!id || !name || !(await belongsToBusiness("department", id, business.id))) fail("error-not-found");
  await db.department.update({ where: { id }, data: { name, description: optional(formData,"description"), isActive: formData.get("isActive") === "on", sortOrder: integer(formData,"sortOrder") } });
  finish(business.slug, "department-updated");
}

export async function deleteDepartmentAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) fail("error-business");
  const id = text(formData, "id");
  const result = id ? await db.department.deleteMany({ where: { id, businessId: business.id } }) : { count: 0 };
  if (result.count === 0) fail("error-not-found");
  finish(business.slug, "department-deleted");
}

export async function createContactPersonAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) fail("error-business");
  const name = text(formData, "name");
  if (!name) fail("error-required");
  const departmentId = optional(formData, "departmentId");
  const branchId = optional(formData, "branchId");
  if (!(await belongsToBusiness("department", departmentId, business.id)) || !(await belongsToBusiness("branch", branchId, business.id))) fail("error-relation");
  const activeContactCount = await db.contactPerson.count({ where: { businessId: business.id, isActive: true } });
  const isPrimary = activeContactCount === 0 || formData.get("isPrimary") === "on";
  const nextSort = (await db.contactPerson.aggregate({ where: { businessId: business.id }, _max: { sortOrder: true } }))._max.sortOrder ?? -1;
  await db.$transaction(async (tx) => {
    if (isPrimary) await tx.contactPerson.updateMany({ where: { businessId: business.id }, data: { isPrimary: false } });
    await tx.contactPerson.create({ data: { businessId: business.id, name, jobTitle: optional(formData,"jobTitle"), departmentId, branchId, phone: optional(formData,"phone"), whatsapp: optional(formData,"whatsapp"), email: optional(formData,"email"), imageUrl: optional(formData,"imageUrl"), isPrimary, isActive: true, sortOrder: nextSort + 1 } });
  });
  finish(business.slug, "contact-created");
}

export async function updateContactPersonAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) fail("error-business");
  const id = text(formData, "id");
  const name = text(formData, "name");
  const current = id ? await db.contactPerson.findFirst({ where: { id, businessId: business.id } }) : null;
  if (!id || !name || !current) fail("error-not-found");
  const departmentId = optional(formData, "departmentId");
  const branchId = optional(formData, "branchId");
  if (!(await belongsToBusiness("department", departmentId, business.id)) || !(await belongsToBusiness("branch", branchId, business.id))) fail("error-relation");
  const nextActive = formData.get("isActive") === "on";
  const requestedPrimary = nextActive && formData.get("isPrimary") === "on";
  await db.$transaction(async (tx) => {
    if (requestedPrimary) await tx.contactPerson.updateMany({ where: { businessId: business.id, id: { not: id } }, data: { isPrimary: false } });
    await tx.contactPerson.update({ where: { id }, data: { name, jobTitle: optional(formData,"jobTitle"), departmentId, branchId, phone: optional(formData,"phone"), whatsapp: optional(formData,"whatsapp"), email: optional(formData,"email"), imageUrl: optional(formData,"imageUrl"), isPrimary: requestedPrimary || (current.isPrimary && nextActive), isActive: nextActive, sortOrder: integer(formData,"sortOrder") } });
    const activePrimary = await tx.contactPerson.findFirst({ where: { businessId: business.id, isActive: true, isPrimary: true }, select: { id: true } });
    if (!activePrimary) {
      const replacement = await tx.contactPerson.findFirst({ where: { businessId: business.id, isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
      if (replacement) await tx.contactPerson.update({ where: { id: replacement.id }, data: { isPrimary: true } });
    }
  });
  finish(business.slug, "contact-updated");
}

export async function deleteContactPersonAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) fail("error-business");
  const id = text(formData, "id");
  const current = id ? await db.contactPerson.findFirst({ where: { id, businessId: business.id }, select: { id: true, isPrimary: true } }) : null;
  if (!current) fail("error-not-found");
  await db.$transaction(async (tx) => {
    await tx.contactPerson.delete({ where: { id: current.id } });
    if (current.isPrimary) {
      const replacement = await tx.contactPerson.findFirst({ where: { businessId: business.id, isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
      if (replacement) await tx.contactPerson.update({ where: { id: replacement.id }, data: { isPrimary: true } });
    }
  });
  finish(business.slug, "contact-deleted");
}
