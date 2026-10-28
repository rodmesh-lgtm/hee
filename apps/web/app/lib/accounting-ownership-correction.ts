import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { postLaundryJournal } from "./laundry-ledger";
import type { LedgerLine } from "./laundry-ledger-domain";
import { accountingCorrectionPreflightQuery, type AccountingCorrectionPreflight } from "./accounting-correction-preflight";

// Incident-specific authority: the platform owner explicitly confirmed these four
// invoices belong to the destination. This is NOT an arbitrary tenant-transfer API.
export const OWNERSHIP_CORRECTION = {
 id: "2026-10-28-sada-layla",
 sourceId: "f1af4381-a911-41f3-9018-fc1f73a2192a",
 targetId: "4fb96802-0aa1-48f4-80bb-4418c7969131",
 ticketIds: ["859a0772-60f1-4e2e-bf43-004cd3768d62", "20b8fac3-2fa7-4798-8b2f-0ca3a0672e14", "2a5aead3-c3a3-4d60-b4b6-6d2ecb95d8c6", "e2b09f31-580a-4d5d-aa75-da76f5b93b6a"],
} as const;
type Tx = Prisma.TransactionClient;
type Row = Record<string, unknown> & { id: string; businessId: string };
type Ticket = Row & { number: number; requestId: string; customerId: string|null; items: Array<{serviceId:string;name:string;quantity:number;unitPrice:number}>; total:number; paid:number; status:string; createdAt:string; updatedAt:string };
type Customer = Row & { name:string;phone:string;notes:string;address:string };
type Service = Row & {name:string;category:string;price:number;active:boolean};
type Payment = Row & {ticketId:string;amount:number;method:string;requestId:string};
type Audit = Row & {targetId:string;action:string};
type Journal = Row & {sourceKey:string;effectiveAt:string;lines:LedgerLine[]};
type Move = {id:string;number:number;customerId:string|null;items:unknown;updatedAt:string};
type Snapshot = {
 version:1;tickets:Ticket[];customers:Customer[];payments:Payment[];audits:Audit[];
 sourceJournals:Journal[];sourceServices:Service[];
 createdCustomers:Customer[];createdServices:Service[];moves:Move[];
 afterTickets:Ticket[];afterPayments:Payment[];afterAudits:Audit[];
 sourceReversals:string[];targetPostings:string[];createdAudits:string[];
};
function canonical(value:unknown):unknown {
 if(Array.isArray(value))return value.map(canonical);
 if(value && typeof value==="object")return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)]));
 return value;
}
const fingerprint = (value:unknown) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
export async function ensureOwnershipCorrectionSchema(tx:Tx){
 await tx.$executeRaw`CREATE TABLE IF NOT EXISTS "AccountingOwnershipCorrection" (
 id TEXT PRIMARY KEY, "sourceBusinessId" TEXT NOT NULL REFERENCES "Business"(id) ON DELETE RESTRICT,
 "targetBusinessId" TEXT NOT NULL REFERENCES "Business"(id) ON DELETE RESTRICT,
 "actorId" TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('applied','rolled_back')),
 snapshot JSONB NOT NULL, "snapshotHash" TEXT NOT NULL,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "rolledBackAt" TIMESTAMPTZ)`;
}
async function lockedBusinesses(tx:Tx){
 for(const id of [OWNERSHIP_CORRECTION.sourceId,OWNERSHIP_CORRECTION.targetId].sort()){
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`laundry:${id}`}))`;
 }
 const businesses=await tx.business.findMany({where:{id:{in:[OWNERSHIP_CORRECTION.sourceId,OWNERSHIP_CORRECTION.targetId]},deletedAt:null},select:{id:true}});
 if(businesses.length!==2)throw Error("CORRECTION_BUSINESS_MISSING");
}
async function readJson<T>(tx:Tx,query:Prisma.Sql):Promise<T[]>{
 const rows=await tx.$queryRaw<Array<{row:T}>>(query);return rows.map(r=>r.row);
}
async function correctionRecord(tx:Tx){
 return (await tx.$queryRaw<Array<{state:string;snapshot:Snapshot;snapshotHash:string}>>`SELECT state,snapshot,"snapshotHash" FROM "AccountingOwnershipCorrection" WHERE id=${OWNERSHIP_CORRECTION.id} FOR UPDATE`)[0];
}
async function auditCorrection(tx:Tx,businessId:string,actorId:string,action:string){
 const id=randomUUID();await tx.$executeRaw`INSERT INTO "LaundryAudit" (id,"businessId","actorId",action,"targetId") VALUES (${id},${businessId},${actorId},${action},${OWNERSHIP_CORRECTION.id})`;return id;
}
function requireSimpleDependencies(p:AccountingCorrectionPreflight){
 if(p.tickets!==OWNERSHIP_CORRECTION.ticketIds.length || p.prepaid || p.prepaidMovements || p.deliveries || p.reconciliations || p.contracts || p.liveOrderLinks || p.noticeEvents || p.targetInitializedBooks!==1)throw Error("CORRECTION_DEPENDENCIES_CHANGED");
}

/** Caller MUST have independently required administrative authentication and a
 * serializable transaction. All snapshots stay in a private server-only table. */
export async function applyConfirmedOwnershipCorrection(tx:Tx,actorId:string){
 await lockedBusinesses(tx);
 const prior=await correctionRecord(tx);
 if(prior){if(prior.state==="applied")return {state:"applied",replayed:true};throw Error("CORRECTION_ALREADY_ROLLED_BACK");}
 const source=OWNERSHIP_CORRECTION.sourceId,target=OWNERSHIP_CORRECTION.targetId;
 const ids=Prisma.join([...OWNERSHIP_CORRECTION.ticketIds]);
 const preflight=(await tx.$queryRaw<AccountingCorrectionPreflight[]>(accountingCorrectionPreflightQuery(source,target)))[0];requireSimpleDependencies(preflight);
 const tickets=await readJson<Ticket>(tx,Prisma.sql`SELECT to_jsonb(t) AS row FROM "LaundryTicket" t WHERE t."businessId"=${source} AND t.id IN (${ids}) ORDER BY t.number FOR UPDATE`);
 if(tickets.length!==4 || tickets.some(t=>!Array.isArray(t.items)))throw Error("CORRECTION_TICKETS_CHANGED");
 const payments=await readJson<Payment>(tx,Prisma.sql`SELECT to_jsonb(p) AS row FROM "LaundryPayment" p WHERE p."businessId"=${source} AND p."ticketId" IN (${ids}) ORDER BY p.id FOR UPDATE`);
 if(payments.length!==preflight.payments || payments.some(p=>p.method==="prepaid"))throw Error("CORRECTION_PAYMENTS_CHANGED");
 for(const t of tickets){if(payments.filter(p=>p.ticketId===t.id).reduce((a,p)=>a+p.amount,0)!==t.paid)throw Error("CORRECTION_PAYMENT_MISMATCH");}
 const customerIds=[...new Set(tickets.flatMap(t=>t.customerId?[t.customerId]:[]))];
 const customers=customerIds.length?await readJson<Customer>(tx,Prisma.sql`SELECT to_jsonb(c) AS row FROM "LaundryCustomer" c WHERE c."businessId"=${source} AND c.id IN (${Prisma.join(customerIds)}) FOR UPDATE`):[];
 if(customers.length!==customerIds.length || customers.length!==preflight.customers)throw Error("CORRECTION_CUSTOMER_SCOPE_CHANGED");
 const serviceIds=[...new Set(tickets.flatMap(t=>t.items.map(l=>l.serviceId)))];
 const services=serviceIds.length?await readJson<Service>(tx,Prisma.sql`SELECT to_jsonb(s) AS row FROM "LaundryService" s WHERE s."businessId"=${source} AND s.id IN (${Prisma.join(serviceIds)}) FOR UPDATE`):[];
 if(services.length!==serviceIds.length)throw Error("CORRECTION_SERVICE_SCOPE_CHANGED");
 const targetIds=[...OWNERSHIP_CORRECTION.ticketIds,...payments.map(p=>p.id)];
 const audits=await readJson<Audit>(tx,Prisma.sql`SELECT to_jsonb(a) AS row FROM "LaundryAudit" a WHERE a."businessId"=${source} AND a."targetId" IN (${Prisma.join(targetIds)}) ORDER BY a.id FOR UPDATE`);
 const keys=[...tickets.map(t=>`order:${t.id}`),...tickets.filter(t=>t.status==="delivered").map(t=>`delivery:${t.id}`),...payments.map(p=>`payment:${p.id}`)];
 const journals=await readJson<Journal>(tx,Prisma.sql`SELECT to_jsonb(j)||jsonb_build_object('lines',(SELECT jsonb_agg(jsonb_build_object('accountCode',l."accountCode",'debit',l.debit,'credit',l.credit) ORDER BY l.id) FROM "LaundryJournalLine" l WHERE l."businessId"=j."businessId" AND l."journalId"=j.id)) AS row FROM "LaundryJournal" j WHERE j."businessId"=${source} AND j."sourceKey" IN (${Prisma.join(keys)}) ORDER BY j.number`);
 if(journals.length!==keys.length || journals.length!==preflight.journals)throw Error("CORRECTION_LEDGER_REQUIRES_REVIEW");
 const existingReversals=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "LaundryJournal" WHERE "businessId"=${source} AND "reversalOf" IN (${Prisma.join(journals.map(j=>j.id))})`;
 if(existingReversals.length)throw Error("CORRECTION_LEDGER_ALREADY_REVERSED");
 const conflicts=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "LaundryJournal" WHERE "businessId"=${target} AND "sourceKey" IN (${Prisma.join(keys)})`;
 if(conflicts.length)throw Error("CORRECTION_TARGET_POSTING_CONFLICT");
 for(const t of tickets){
  const normalized=t.items.map(line=>({name:String(line.name??""),quantity:Number(line.quantity),unitPrice:Number(line.unitPrice)})).sort((a,b)=>a.name.localeCompare(b.name));
  const candidates=await tx.$queryRaw<Array<{id:string;items:Array<{name:string;quantity:number;unitPrice:number}>}>>`SELECT id,items FROM "LaundryTicket" WHERE "businessId"=${target} AND phone=${String(t.phone)} AND total=${t.total} AND ("createdAt" AT TIME ZONE 'Asia/Riyadh')::date=(${t.createdAt}::timestamptz AT TIME ZONE 'Asia/Riyadh')::date`;
  if(candidates.some(c=>fingerprint(c.items.map(line=>({name:line.name,quantity:line.quantity,unitPrice:line.unitPrice})).sort((a,b)=>a.name.localeCompare(b.name)))===fingerprint(normalized)))throw Error("CORRECTION_DUPLICATE_CANDIDATE");
 }
 const snapshot:Snapshot={version:1,tickets,customers,payments,audits,sourceJournals:journals,sourceServices:services,createdCustomers:[],createdServices:[],moves:[],afterTickets:[],afterPayments:[],afterAudits:[],sourceReversals:[],targetPostings:[],createdAudits:[]};
 const customerMap=new Map<string,string>();
 for(const c of customers){
  const match=await readJson<Customer>(tx,Prisma.sql`SELECT to_jsonb(c) AS row FROM "LaundryCustomer" c WHERE c."businessId"=${target} AND c.phone=${c.phone} FOR UPDATE`);
  if(match[0]){
   if((c.notes && c.notes!==match[0].notes)||(c.address && c.address!==match[0].address))throw Error("CORRECTION_CUSTOMER_MERGE_REQUIRES_REVIEW");
   customerMap.set(c.id,match[0].id);
  }
  else{
   const next={...c,id:randomUUID(),businessId:target};
   await tx.$executeRaw`INSERT INTO "LaundryCustomer" SELECT * FROM jsonb_populate_record(NULL::"LaundryCustomer",${JSON.stringify(next)}::jsonb)`;
   customerMap.set(c.id,next.id);snapshot.createdCustomers.push(next);
  }
 }
 const serviceMap=new Map<string,string>();
 for(const s of services){
  const match=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "LaundryService" WHERE "businessId"=${target} AND name=${s.name} AND category=${s.category} AND price=${s.price} ORDER BY active DESC,id LIMIT 1`;
  if(match[0])serviceMap.set(s.id,match[0].id);
  else{
   const next={...s,id:randomUUID(),businessId:target};
   await tx.$executeRaw`INSERT INTO "LaundryService" SELECT * FROM jsonb_populate_record(NULL::"LaundryService",${JSON.stringify(next)}::jsonb)`;
   serviceMap.set(s.id,next.id);snapshot.createdServices.push(next);
  }
 }
 let nextNumber=(await tx.$queryRaw<Array<{n:number}>>`SELECT COALESCE(MAX(number),0)::int AS n FROM "LaundryTicket" WHERE "businessId"=${target}`)[0].n;
 let stageNumber=(await tx.$queryRaw<Array<{n:number}>>`SELECT COALESCE(MAX(number),0)::int AS n FROM "LaundryTicket" WHERE "businessId"=${source}`)[0].n;
 for(const t of tickets){
  const stageId=randomUUID(),stage={...t,id:stageId,requestId:randomUUID(),number:++stageNumber};
  // Temporary parent preserves validated composite foreign keys without disabling
  // or altering a constraint. It is invisible outside this atomic transaction.
  await tx.$executeRaw`INSERT INTO "LaundryTicket" SELECT * FROM jsonb_populate_record(NULL::"LaundryTicket",${JSON.stringify(stage)}::jsonb)`;
  await tx.$executeRaw`UPDATE "LaundryPayment" SET "ticketId"=${stageId} WHERE "businessId"=${source} AND "ticketId"=${t.id}`;
  const items=t.items.map(line=>({...line,serviceId:serviceMap.get(line.serviceId)!}));
  const customerId=t.customerId?customerMap.get(t.customerId)!:null;
  const number=++nextNumber;
  const updated=await tx.$queryRaw<Array<{updatedAt:Date}>>`UPDATE "LaundryTicket" SET "businessId"=${target},number=${number},"customerId"=${customerId},items=${JSON.stringify(items)}::jsonb,"readyNotifyConsentAt"=NULL,"updatedAt"=now() WHERE "businessId"=${source} AND id=${t.id} RETURNING "updatedAt"`;
  if(updated.length!==1)throw Error("CORRECTION_TICKET_DISAPPEARED");
  await tx.$executeRaw`UPDATE "LaundryPayment" SET "businessId"=${target},"ticketId"=${t.id} WHERE "businessId"=${source} AND "ticketId"=${stageId}`;
  await tx.$executeRaw`DELETE FROM "LaundryTicket" WHERE "businessId"=${source} AND id=${stageId}`;
  snapshot.moves.push({id:t.id,number,customerId,items,updatedAt:updated[0].updatedAt.toISOString()});
 }
 // Preserve the real creator identity and timestamp. Old messaging consent is
 // archived as evidence, not treated as consent for another business.
 for(const a of audits){
  const action=a.action.endsWith("-consent")?`ownership-prior:${a.action}`:a.action;
  await tx.$executeRaw`UPDATE "LaundryAudit" SET "businessId"=${target},action=${action} WHERE "businessId"=${source} AND id=${a.id}`;
 }
 for(const j of journals){
  const reversal=await postLaundryJournal(tx,{businessId:source,actorId,sourceKey:`ownership-reversal:${OWNERSHIP_CORRECTION.id}:${j.id}`,description:`تصحيح ملكية سجل محاسبي — ${OWNERSHIP_CORRECTION.id}`,effectiveAt:new Date(),reversalOf:j.id,lines:j.lines.map(l=>({accountCode:l.accountCode,debit:l.credit,credit:l.debit}))});
  const repost=await postLaundryJournal(tx,{businessId:target,actorId,sourceKey:j.sourceKey,description:`تصحيح ملكية سجل محاسبي — ${OWNERSHIP_CORRECTION.id}`,effectiveAt:new Date(j.effectiveAt),lines:j.lines});
  if(!reversal||!repost)throw Error("CORRECTION_LEDGER_BOOK_MISSING");snapshot.sourceReversals.push(reversal);snapshot.targetPostings.push(repost);
 }
 // Only the confirmed customer rows, now detached from all source invoices, are
 // consolidated. Their complete originals are recoverable via the admin undo.
 for(const c of customers)await tx.$executeRaw`DELETE FROM "LaundryCustomer" WHERE "businessId"=${source} AND id=${c.id}`;
 for(const s of services)await tx.$executeRaw`UPDATE "LaundryService" SET active=FALSE WHERE "businessId"=${source} AND id=${s.id}`;
 for(const ticket of tickets){
  const id=randomUUID();
  await tx.$executeRaw`INSERT INTO "LaundryAudit" (id,"businessId","actorId",action,"targetId") VALUES (${id},${target},${actorId},'ownership-confirmed',${ticket.id})`;
  snapshot.createdAudits.push(id);
 }
 for(const id of [source,target])snapshot.createdAudits.push(await auditCorrection(tx,id,actorId,"ownership-correction-applied"));
 snapshot.afterTickets=await readJson<Ticket>(tx,Prisma.sql`SELECT to_jsonb(t) AS row FROM "LaundryTicket" t WHERE t."businessId"=${target} AND t.id IN (${ids}) ORDER BY t.number`);
 snapshot.afterPayments=await readJson<Payment>(tx,Prisma.sql`SELECT to_jsonb(p) AS row FROM "LaundryPayment" p WHERE p."businessId"=${target} AND p."ticketId" IN (${ids}) ORDER BY p.id`);
 snapshot.afterAudits=await readJson<Audit>(tx,Prisma.sql`SELECT to_jsonb(a) AS row FROM "LaundryAudit" a WHERE a."businessId"=${target} AND a."targetId" IN (${Prisma.join(targetIds)}) ORDER BY a.id`);
 const raw=JSON.stringify(snapshot);
 await tx.$executeRaw`INSERT INTO "AccountingOwnershipCorrection" (id,"sourceBusinessId","targetBusinessId","actorId",state,snapshot,"snapshotHash") VALUES (${OWNERSHIP_CORRECTION.id},${source},${target},${actorId},'applied',${raw}::jsonb,${fingerprint(snapshot)})`;
 const check=await tx.$queryRaw<Array<{n:number;total:number;paid:number}>>`SELECT COUNT(*)::int AS n,COALESCE(SUM(total),0)::int AS total,COALESCE(SUM(paid),0)::int AS paid FROM "LaundryTicket" WHERE "businessId"=${target} AND id IN (${ids})`;
 if(check[0].n!==4||check[0].total!==tickets.reduce((a,t)=>a+t.total,0)||check[0].paid!==tickets.reduce((a,t)=>a+t.paid,0))throw Error("CORRECTION_CONSERVATION_FAILED");
 return {state:"applied",replayed:false};
}

export async function rollbackConfirmedOwnershipCorrection(tx:Tx,actorId:string){
 await lockedBusinesses(tx);
 const prior=await correctionRecord(tx);
 if(!prior)throw Error("CORRECTION_NOT_FOUND");
 if(prior.state==="rolled_back")return {state:"rolled_back",replayed:true};
 const s=prior.snapshot;
 if(s.version!==1||fingerprint(s)!==prior.snapshotHash)throw Error("CORRECTION_BACKUP_INTEGRITY_FAILED");
 const source=OWNERSHIP_CORRECTION.sourceId,target=OWNERSHIP_CORRECTION.targetId;
 const ids=Prisma.join([...OWNERSHIP_CORRECTION.ticketIds]);
 const targetIds=[...OWNERSHIP_CORRECTION.ticketIds,...s.payments.map(p=>p.id)];
 const tickets=await readJson<Ticket>(tx,Prisma.sql`SELECT to_jsonb(t) AS row FROM "LaundryTicket" t WHERE t."businessId"=${target} AND t.id IN (${ids}) ORDER BY t.number FOR UPDATE`);
 const payments=await readJson<Payment>(tx,Prisma.sql`SELECT to_jsonb(p) AS row FROM "LaundryPayment" p WHERE p."businessId"=${target} AND p."ticketId" IN (${ids}) ORDER BY p.id FOR UPDATE`);
 const audits=await readJson<Audit>(tx,Prisma.sql`SELECT to_jsonb(a) AS row FROM "LaundryAudit" a WHERE a."businessId"=${target} AND a."targetId" IN (${Prisma.join(targetIds)}) ORDER BY a.id FOR UPDATE`);
 if(fingerprint(tickets)!==fingerprint(s.afterTickets)||fingerprint(payments)!==fingerprint(s.afterPayments)||fingerprint(audits)!==fingerprint(s.afterAudits))throw Error("CORRECTION_RECORDS_CHANGED_AFTER_APPLY");
 for(const c of s.customers)await tx.$executeRaw`INSERT INTO "LaundryCustomer" SELECT * FROM jsonb_populate_record(NULL::"LaundryCustomer",${JSON.stringify(c)}::jsonb)`;
 let stageNumber=(await tx.$queryRaw<Array<{n:number}>>`SELECT COALESCE(MAX(number),0)::int AS n FROM "LaundryTicket" WHERE "businessId"=${target}`)[0].n;
 for(const original of s.tickets){
  const current=tickets.find(t=>t.id===original.id)!;
  const stageId=randomUUID(),stage={...current,id:stageId,number:++stageNumber,requestId:randomUUID()};
  await tx.$executeRaw`INSERT INTO "LaundryTicket" SELECT * FROM jsonb_populate_record(NULL::"LaundryTicket",${JSON.stringify(stage)}::jsonb)`;
  await tx.$executeRaw`UPDATE "LaundryPayment" SET "ticketId"=${stageId} WHERE "businessId"=${target} AND "ticketId"=${current.id}`;
  // Business-specific source fields are restored from the sealed backup. Amounts,
  // customer snapshots and creator identity were never changed by the forward move.
  await tx.$executeRaw`UPDATE "LaundryTicket" SET "businessId"=${source},number=${original.number},"customerId"=${original.customerId},items=${JSON.stringify(original.items)}::jsonb,"readyNotifyConsentAt"=${original.readyNotifyConsentAt?String(original.readyNotifyConsentAt):null}::timestamptz,"updatedAt"=${original.updatedAt}::timestamptz WHERE "businessId"=${target} AND id=${current.id}`;
  await tx.$executeRaw`UPDATE "LaundryPayment" SET "businessId"=${source},"ticketId"=${current.id} WHERE "businessId"=${target} AND "ticketId"=${stageId}`;
  await tx.$executeRaw`DELETE FROM "LaundryTicket" WHERE "businessId"=${target} AND id=${stageId}`;
 }
 for(const a of s.audits)await tx.$executeRaw`UPDATE "LaundryAudit" SET "businessId"=${source},action=${a.action} WHERE "businessId"=${target} AND id=${a.id}`;
 await tx.$executeRaw`UPDATE "LaundryAudit" SET action='ownership-correction-rolled-back',"targetId"=${OWNERSHIP_CORRECTION.id} WHERE "businessId"=${target} AND id IN (${Prisma.join(s.createdAudits)}) AND action='ownership-confirmed'`;
 for(let i=0;i<s.sourceJournals.length;i++){
  const j=s.sourceJournals[i];
  const restored=await postLaundryJournal(tx,{businessId:source,actorId,sourceKey:`ownership-undo:${OWNERSHIP_CORRECTION.id}:${j.id}`,description:`تراجع موثق عن تصحيح ملكية — ${OWNERSHIP_CORRECTION.id}`,effectiveAt:new Date(),reversalOf:s.sourceReversals[i],lines:j.lines});
  const undone=await postLaundryJournal(tx,{businessId:target,actorId,sourceKey:`ownership-undo:${OWNERSHIP_CORRECTION.id}:${j.id}`,description:`تراجع موثق عن تصحيح ملكية — ${OWNERSHIP_CORRECTION.id}`,effectiveAt:new Date(),reversalOf:s.targetPostings[i],lines:j.lines.map(l=>({accountCode:l.accountCode,debit:l.credit,credit:l.debit}))});
  if(!restored||!undone)throw Error("CORRECTION_LEDGER_BOOK_MISSING");
 }
 for(const c of s.createdCustomers){
  const actual=await readJson<Customer>(tx,Prisma.sql`SELECT to_jsonb(c) AS row FROM "LaundryCustomer" c WHERE c."businessId"=${target} AND c.id=${c.id} FOR UPDATE`);
  if(actual.length!==1||fingerprint(actual[0])!==fingerprint(c))throw Error("CORRECTION_CREATED_CUSTOMER_CHANGED");
  await tx.$executeRaw`DELETE FROM "LaundryCustomer" WHERE "businessId"=${target} AND id=${c.id}`;
 }
 for(const row of s.sourceServices)await tx.$executeRaw`UPDATE "LaundryService" SET active=${row.active} WHERE "businessId"=${source} AND id=${row.id}`;
 // Keep a referenced service rather than deleting someone else's later work.
 for(const row of s.createdServices){
  const used=await tx.$queryRaw<Array<{id:string}>>`SELECT t.id FROM "LaundryTicket" t WHERE t."businessId"=${target} AND EXISTS(SELECT 1 FROM jsonb_array_elements(t.items) line WHERE line->>'serviceId'=${row.id}) LIMIT 1`;
  if(used.length)throw Error("CORRECTION_CREATED_SERVICE_IN_USE");
  await tx.$executeRaw`DELETE FROM "LaundryService" WHERE "businessId"=${target} AND id=${row.id}`;
 }
 for(const id of [source,target])await auditCorrection(tx,id,actorId,"ownership-correction-rolled-back");
 await tx.$executeRaw`UPDATE "AccountingOwnershipCorrection" SET state='rolled_back',"rolledBackAt"=now() WHERE id=${OWNERSHIP_CORRECTION.id} AND state='applied'`;
 return {state:"rolled_back",replayed:false};
}

export async function ownershipCorrectionSummary(tx:Pick<Tx,"$queryRaw">){
 const exists=await tx.$queryRaw<Array<{name:string|null}>>`SELECT to_regclass('"AccountingOwnershipCorrection"')::text AS name`;
 if(!exists[0]?.name)return null;
 const rows=await tx.$queryRaw<Array<{state:string;createdAt:Date;rolledBackAt:Date|null;ticketCount:number;moves:Array<{id:string;number:number}>}>>`SELECT state,"createdAt","rolledBackAt",jsonb_array_length(snapshot->'tickets') AS "ticketCount",(SELECT jsonb_agg(jsonb_build_object('id',m->>'id','number',(m->>'number')::int)) FROM jsonb_array_elements(snapshot->'moves') m) AS moves FROM "AccountingOwnershipCorrection" WHERE id=${OWNERSHIP_CORRECTION.id}`;
 return rows[0]??null;
}
