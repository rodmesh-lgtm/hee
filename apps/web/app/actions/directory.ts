"use server";

import { revalidatePath } from "next/cache";
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

async function belongsToBusiness(kind: "branch" | "department", id: string | null, businessId: string) {
  if (!id) return true;
  if (kind === "branch") return Boolean(await db.branch.findFirst({ where: { id, businessId }, select: { id: true } }));
  return Boolean(await db.department.findFirst({ where: { id, businessId }, select: { id: true } }));
}

export async function createBranchAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) return;
  const name = text(formData, "name");
  if (!name) return;
  const isMain = formData.get("isMain") === "on";
  const nextSort = (await db.branch.aggregate({ where: { businessId: business.id }, _max: { sortOrder: true } }))._max.sortOrder ?? -1;
  await db.$transaction(async (tx) => {
    if (isMain) await tx.branch.updateMany({ where: { businessId: business.id }, data: { isMain: false } });
    await tx.branch.create({ data: { businessId: business.id, name, city: optional(formData,"city"), district: optional(formData,"district"), address: optional(formData,"address"), phone: optional(formData,"phone"), whatsapp: optional(formData,"whatsapp"), googleMapsLink: optional(formData,"googleMapsLink"), isMain, sortOrder: nextSort + 1 } });
  });
  refresh(business.slug);
}

export async function updateBranchAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) return;
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!id || !name || !(await belongsToBusiness("branch", id, business.id))) return;
  const isMain = formData.get("isMain") === "on";
  await db.$transaction(async (tx) => {
    if (isMain) await tx.branch.updateMany({ where: { businessId: business.id, id: { not: id } }, data: { isMain: false } });
    await tx.branch.update({ where: { id }, data: { name, city: optional(formData,"city"), district: optional(formData,"district"), address: optional(formData,"address"), phone: optional(formData,"phone"), whatsapp: optional(formData,"whatsapp"), googleMapsLink: optional(formData,"googleMapsLink"), isMain, isActive: formData.get("isActive") === "on", sortOrder: integer(formData,"sortOrder") } });
  });
  refresh(business.slug);
}

export async function deleteBranchAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) return;
  const id = text(formData, "id");
  if (!id) return;
  await db.branch.deleteMany({ where: { id, businessId: business.id } });
  refresh(business.slug);
}

export async function createDepartmentAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) return;
  const name = text(formData, "name");
  if (!name) return;
  const nextSort = (await db.department.aggregate({ where: { businessId: business.id }, _max: { sortOrder: true } }))._max.sortOrder ?? -1;
  await db.department.create({ data: { businessId: business.id, name, description: optional(formData,"description"), sortOrder: nextSort + 1 } });
  refresh(business.slug);
}

export async function updateDepartmentAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) return;
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!id || !name || !(await belongsToBusiness("department", id, business.id))) return;
  await db.department.update({ where: { id }, data: { name, description: optional(formData,"description"), isActive: formData.get("isActive") === "on", sortOrder: integer(formData,"sortOrder") } });
  refresh(business.slug);
}

export async function deleteDepartmentAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) return;
  const id = text(formData, "id");
  if (!id) return;
  await db.department.deleteMany({ where: { id, businessId: business.id } });
  refresh(business.slug);
}

export async function createContactPersonAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) return;
  const name = text(formData, "name");
  if (!name) return;
  const departmentId = optional(formData, "departmentId");
  const branchId = optional(formData, "branchId");
  if (!(await belongsToBusiness("department", departmentId, business.id)) || !(await belongsToBusiness("branch", branchId, business.id))) return;
  const isPrimary = formData.get("isPrimary") === "on";
  const nextSort = (await db.contactPerson.aggregate({ where: { businessId: business.id }, _max: { sortOrder: true } }))._max.sortOrder ?? -1;
  await db.$transaction(async (tx) => {
    if (isPrimary) await tx.contactPerson.updateMany({ where: { businessId: business.id }, data: { isPrimary: false } });
    await tx.contactPerson.create({ data: { businessId: business.id, name, jobTitle: optional(formData,"jobTitle"), departmentId, branchId, phone: optional(formData,"phone"), whatsapp: optional(formData,"whatsapp"), email: optional(formData,"email"), imageUrl: optional(formData,"imageUrl"), isPrimary, sortOrder: nextSort + 1 } });
  });
  refresh(business.slug);
}

export async function updateContactPersonAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) return;
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!id || !name || !(await db.contactPerson.findFirst({ where: { id, businessId: business.id }, select: { id: true } }))) return;
  const departmentId = optional(formData, "departmentId");
  const branchId = optional(formData, "branchId");
  if (!(await belongsToBusiness("department", departmentId, business.id)) || !(await belongsToBusiness("branch", branchId, business.id))) return;
  const isPrimary = formData.get("isPrimary") === "on";
  await db.$transaction(async (tx) => {
    if (isPrimary) await tx.contactPerson.updateMany({ where: { businessId: business.id, id: { not: id } }, data: { isPrimary: false } });
    await tx.contactPerson.update({ where: { id }, data: { name, jobTitle: optional(formData,"jobTitle"), departmentId, branchId, phone: optional(formData,"phone"), whatsapp: optional(formData,"whatsapp"), email: optional(formData,"email"), imageUrl: optional(formData,"imageUrl"), isPrimary, isActive: formData.get("isActive") === "on", sortOrder: integer(formData,"sortOrder") } });
  });
  refresh(business.slug);
}

export async function deleteContactPersonAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) return;
  const id = text(formData, "id");
  if (!id) return;
  await db.contactPerson.deleteMany({ where: { id, businessId: business.id } });
  refresh(business.slug);
}
