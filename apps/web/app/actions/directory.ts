"use server";

import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getCurrentUserForWrites } from "../lib/auth";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
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

export async function createBranchAction(formData: FormData) {
  const business = await ownedBusiness();
  if (!business) return;
  const name = text(formData, "name");
  if (!name) return;
  const isMain = formData.get("isMain") === "on";
  await db.$transaction(async (tx) => {
    if (isMain) await tx.branch.updateMany({ where: { businessId: business.id }, data: { isMain: false } });
    await tx.branch.create({ data: { businessId: business.id, name, city: text(formData,"city") || null, district: text(formData,"district") || null, address: text(formData,"address") || null, phone: text(formData,"phone") || null, whatsapp: text(formData,"whatsapp") || null, googleMapsLink: text(formData,"googleMapsLink") || null, isMain } });
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
  await db.department.create({ data: { businessId: business.id, name, description: text(formData,"description") || null } });
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
  const departmentId = text(formData, "departmentId") || null;
  const branchId = text(formData, "branchId") || null;
  if (departmentId && !(await db.department.findFirst({ where: { id: departmentId, businessId: business.id } }))) return;
  if (branchId && !(await db.branch.findFirst({ where: { id: branchId, businessId: business.id } }))) return;
  const isPrimary = formData.get("isPrimary") === "on";
  await db.$transaction(async (tx) => {
    if (isPrimary) await tx.contactPerson.updateMany({ where: { businessId: business.id }, data: { isPrimary: false } });
    await tx.contactPerson.create({ data: { businessId: business.id, name, jobTitle: text(formData,"jobTitle") || null, departmentId, branchId, phone: text(formData,"phone") || null, whatsapp: text(formData,"whatsapp") || null, email: text(formData,"email") || null, isPrimary } });
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
