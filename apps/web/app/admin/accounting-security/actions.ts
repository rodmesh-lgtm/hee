"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/admin";
import { db } from "../../lib/db";
import { ACCOUNTING_SECURITY_HOLD } from "../../lib/accounting-security";
import { OWNERSHIP_CORRECTION, ensureOwnershipCorrectionSchema, applyConfirmedOwnershipCorrection, rollbackConfirmedOwnershipCorrection } from "../../lib/accounting-ownership-correction";

export async function correctConfirmedInvoiceOwnership(form:FormData){
 const admin=await requireAdmin();
 const mode=String(form.get("mode")||"");
 if(!ACCOUNTING_SECURITY_HOLD || form.get("correctionId")!==OWNERSHIP_CORRECTION.id || !["apply","rollback"].includes(mode))redirect("/admin/accounting-security?correction=blocked");
 let outcome="failed";
 try{
  await db.$transaction(async tx=>{
   await ensureOwnershipCorrectionSchema(tx);
   if(mode==="apply")await applyConfirmedOwnershipCorrection(tx,admin.id);
   else await rollbackConfirmedOwnershipCorrection(tx,admin.id);
  },{isolationLevel:"Serializable",timeout:60000,maxWait:15000});
  outcome=mode==="apply"?"applied":"rolled_back";
 }catch(error){
  // Operational code only: never log snapshots, SQL parameters or contact data.
  const code=error instanceof Error&&/^CORRECTION_[A-Z_]+$/.test(error.message)?error.message:"CORRECTION_DATABASE_FAILED";
  console.error("[accounting-ownership-correction]",{code});
 }
 revalidatePath("/Accounting");revalidatePath("/Laundromat");revalidatePath("/admin/accounting-security");
 redirect(`/admin/accounting-security?businessId=${OWNERSHIP_CORRECTION.sourceId}&targetBusinessId=${OWNERSHIP_CORRECTION.targetId}&correction=${outcome}`);
}
