"use server";

import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/auth";
import { getActiveBusinessForUser } from "../lib/active-business";
import { db } from "../lib/db";
import { isBusinessNotesSchemaReady } from "../lib/business-notes/schema-readiness";
import { writeWhatsAppAuditLog } from "../lib/whatsapp/audit";

const MAX_ACTIVE_NOTES_PER_BUSINESS = 200;
const NOTE_TYPES = ["general","meeting","decision","client","supplier","finance","operations","idea","follow_up"] as const;
const text = (form: FormData, key: string, max: number) => { const value=String(form.get(key)??"").normalize("NFKC").trim(); return value&&value.length<=max?value:null; };
const optionalText = (form:FormData,key:string,max:number)=>{const value=String(form.get(key)??"").normalize("NFKC").trim();if(!value)return null;if(value.length>max)return null;return value;};
const enumValue = <T extends string>(form:FormData,key:string,allowed:readonly T[],fallback:T)=>{const value=String(form.get(key)??fallback) as T;return allowed.includes(value)?value:fallback;};
const tags=(form:FormData)=>[...new Set(String(form.get("tags")??"").split(/[،,]/).map(tag=>tag.normalize("NFKC").trim()).filter(Boolean))].slice(0,12).map(tag=>tag.slice(0,40));
async function context(){const user=await getCurrentUser();if(!user)redirect("/login");const business=await getActiveBusinessForUser(user.id);if(!business)redirect("/dashboard?business=required");if(!await isBusinessNotesSchemaReady())redirect("/dashboard/notes?schema=pending");return{userId:user.id,businessId:business.id};}
function done(action:string){revalidatePath("/dashboard/notes");revalidatePath("/dashboard/reminders");redirect(`/dashboard/notes?${action}=success`);}
async function audit(tx:Prisma.TransactionClient,input:{businessId:string;userId:string;action:string;noteId:string;metadata?:Record<string,string|number|boolean|null>}){await writeWhatsAppAuditLog({businessId:input.businessId,actorUserId:input.userId,action:input.action,targetType:"business_note",targetId:input.noteId,outcome:"success",metadata:input.metadata,database:tx});}

function structuredFields(form:FormData){
  return {
    noteType: enumValue(form,"noteType",NOTE_TYPES,"general"),
    summary: optionalText(form,"summary",1200),
    outcome: optionalText(form,"outcome",2000),
    nextAction: optionalText(form,"nextAction",1200),
    stakeholder: optionalText(form,"stakeholder",160),
    referenceCode: optionalText(form,"referenceCode",120),
  };
}

export async function createBusinessNoteAction(form:FormData){
  const{businessId,userId}=await context();
  const title=text(form,"title",160),body=text(form,"body",8000);
  if(!title||!body)redirect("/dashboard/notes?create=invalid");
  const isPinned=form.get("isPinned")==="on",category=text(form,"category",64)??"عام",priority=enumValue(form,"priority",["low","normal","high","urgent"] as const,"normal"),status=enumValue(form,"status",["draft","active"] as const,"active"),noteTags=tags(form),noteId=randomUUID();
  const structured=structuredFields(form);
  const outcome=await db.$transaction(async tx=>{
    const rows=await tx.$queryRaw<Array<{count:bigint}>>(Prisma.sql`SELECT COUNT(*)::bigint AS "count" FROM "BusinessNote" WHERE "businessId"=${businessId} AND "status" <> 'archived'`);
    if(Number(rows[0]?.count??0)>=MAX_ACTIVE_NOTES_PER_BUSINESS)return"limit" as const;
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "BusinessNote" ("id","businessId","title","body","isPinned","sortOrder","category","priority","tags","status","noteType","summary","outcome","nextAction","stakeholder","referenceCode","createdAt","updatedAt")
      VALUES (${noteId},${businessId},${title},${body},${isPinned},0,${category},${priority},${noteTags},${status},${structured.noteType},${structured.summary},${structured.outcome},${structured.nextAction},${structured.stakeholder},${structured.referenceCode},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    `);
    await audit(tx,{businessId,userId,action:"business_note.create",noteId,metadata:{priority,status,pinned:isPinned,tagCount:noteTags.length,noteType:structured.noteType,hasNextAction:Boolean(structured.nextAction),hasOutcome:Boolean(structured.outcome)}});
    return"created" as const;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  if(outcome==="limit")redirect("/dashboard/notes?create=limit");done("create");
}

export async function updateBusinessNoteAction(form:FormData){
  const{businessId,userId}=await context();
  const noteId=text(form,"noteId",128),title=text(form,"title",160),body=text(form,"body",8000);
  if(!noteId||!title||!body)redirect("/dashboard/notes?update=invalid");
  const category=text(form,"category",64)??"عام",priority=enumValue(form,"priority",["low","normal","high","urgent"] as const,"normal"),status=enumValue(form,"status",["draft","active"] as const,"active"),noteTags=tags(form),structured=structuredFields(form);
  const changed=await db.$transaction(async tx=>{
    const count=await tx.$executeRaw(Prisma.sql`
      UPDATE "BusinessNote" SET "title"=${title},"body"=${body},"category"=${category},"priority"=${priority},"tags"=${noteTags},"status"=${status},
        "noteType"=${structured.noteType},"summary"=${structured.summary},"outcome"=${structured.outcome},"nextAction"=${structured.nextAction},"stakeholder"=${structured.stakeholder},"referenceCode"=${structured.referenceCode},
        "archivedAt"=NULL,"updatedAt"=CURRENT_TIMESTAMP
      WHERE "id"=${noteId} AND "businessId"=${businessId} AND "status" <> 'archived'
    `);
    if(count===1)await audit(tx,{businessId,userId,action:"business_note.update",noteId,metadata:{priority,status,tagCount:noteTags.length,noteType:structured.noteType,hasNextAction:Boolean(structured.nextAction),hasOutcome:Boolean(structured.outcome)}});
    return count;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  if(changed!==1)redirect("/dashboard/notes?update=missing");done("update");
}

export async function archiveBusinessNoteAction(form:FormData){const{businessId,userId}=await context();const noteId=text(form,"noteId",128);if(!noteId)redirect("/dashboard/notes?archive=invalid");const changed=await db.$transaction(async tx=>{const count=await tx.$executeRaw(Prisma.sql`UPDATE "BusinessNote" SET "status"='archived',"archivedAt"=CURRENT_TIMESTAMP,"isPinned"=false,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${noteId} AND "businessId"=${businessId} AND "status" <> 'archived'`);if(count===1)await audit(tx,{businessId,userId,action:"business_note.archive",noteId});return count;},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});if(changed!==1)redirect("/dashboard/notes?archive=missing");done("archive");}
export async function restoreBusinessNoteAction(form:FormData){const{businessId,userId}=await context();const noteId=text(form,"noteId",128);if(!noteId)redirect("/dashboard/notes?restore=invalid");const changed=await db.$transaction(async tx=>{const rows=await tx.$queryRaw<Array<{count:bigint}>>(Prisma.sql`SELECT COUNT(*)::bigint AS "count" FROM "BusinessNote" WHERE "businessId"=${businessId} AND "status" <> 'archived'`);if(Number(rows[0]?.count??0)>=MAX_ACTIVE_NOTES_PER_BUSINESS)return-2;const count=await tx.$executeRaw(Prisma.sql`UPDATE "BusinessNote" SET "status"='active',"archivedAt"=NULL,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${noteId} AND "businessId"=${businessId} AND "status"='archived'`);if(count===1)await audit(tx,{businessId,userId,action:"business_note.restore",noteId});return count;},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});if(changed===-2)redirect("/dashboard/notes?restore=limit");if(changed!==1)redirect("/dashboard/notes?restore=missing");done("restore");}
export async function deleteBusinessNoteAction(form:FormData){const{businessId,userId}=await context();const noteId=text(form,"noteId",128);if(!noteId)redirect("/dashboard/notes?delete=invalid");const outcome=await db.$transaction(async tx=>{const rows=await tx.$queryRaw<Array<{id:string}>>(Prisma.sql`SELECT "id" FROM "BusinessNote" WHERE "id"=${noteId} AND "businessId"=${businessId} FOR UPDATE`);if(!rows[0])return"missing" as const;const linked=await tx.$queryRaw<Array<{count:bigint}>>(Prisma.sql`SELECT COUNT(*)::bigint AS "count" FROM "SmartReminder" WHERE "businessId"=${businessId} AND "businessNoteId"=${noteId}`);if(Number(linked[0]?.count??0)>0)return"linked" as const;const count=await tx.$executeRaw(Prisma.sql`DELETE FROM "BusinessNote" WHERE "id"=${noteId} AND "businessId"=${businessId}`);if(count!==1)return"missing" as const;await audit(tx,{businessId,userId,action:"business_note.delete",noteId});return"deleted" as const;},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});if(outcome==="linked")redirect("/dashboard/notes?delete=linked-reminder");if(outcome!=="deleted")redirect("/dashboard/notes?delete=missing");done("delete");}
export async function toggleBusinessNotePinAction(form:FormData){const{businessId,userId}=await context();const noteId=text(form,"noteId",128);if(!noteId)redirect("/dashboard/notes?pin=invalid");const changed=await db.$transaction(async tx=>{const count=await tx.$executeRaw(Prisma.sql`UPDATE "BusinessNote" SET "isPinned"=NOT "isPinned","updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${noteId} AND "businessId"=${businessId} AND "status" <> 'archived'`);if(count===1)await audit(tx,{businessId,userId,action:"business_note.pin_toggle",noteId});return count;},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});if(changed!==1)redirect("/dashboard/notes?pin=missing");done("pin");}
export async function moveBusinessNoteAction(form:FormData){const{businessId,userId}=await context();const noteId=text(form,"noteId",128),direction=text(form,"direction",8);if(!noteId||!["up","down"].includes(direction??""))redirect("/dashboard/notes?move=invalid");const delta=direction==="up"?-1:1;const changed=await db.$transaction(async tx=>{const count=await tx.$executeRaw(Prisma.sql`UPDATE "BusinessNote" SET "sortOrder"=GREATEST(-100000,LEAST(100000,"sortOrder"+${delta})),"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${noteId} AND "businessId"=${businessId} AND "status" <> 'archived'`);if(count===1)await audit(tx,{businessId,userId,action:"business_note.reorder",noteId,metadata:{direction:direction!}});return count;},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});if(changed!==1)redirect("/dashboard/notes?move=missing");done("move");}
