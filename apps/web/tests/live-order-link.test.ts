import test from "node:test";
import assert from "node:assert/strict";
import type {Prisma} from "@prisma/client";
import {endOrderLiveSessions} from "../app/lib/live-view/order-link";
import {readFileSync} from "node:fs";
test("order completion closes only linked tenant sessions, preserves isolation and cannot replay closure",async()=>{
 const sessions=[{id:"1",businessId:"a",stationId:"x",endedAt:null as Date|null},{id:"2",businessId:"a",stationId:"y",endedAt:null as Date|null},{id:"3",businessId:"b",stationId:"z",endedAt:null as Date|null}];
 const links=[{businessId:"a",ticketId:"order",targetId:"1"},{businessId:"a",ticketId:"other",targetId:"2"},{businessId:"b",ticketId:"order",targetId:"3"}];
 const cooldowns:Array<{businessId:string;id:string;until:Date}>=[],locks:string[]=[],audits:unknown[]=[];
 const tx={
 whatsAppAuditLog:{findMany:async({where}: {where:{businessId:string;metadata:{equals:string}}})=>links.filter(l=>l.businessId===where.businessId&&l.ticketId===where.metadata.equals),create:async(input:unknown)=>{audits.push(input);}},
 liveViewSession:{findMany:async({where}:{where:{businessId:string;id:{in:string[]}}})=>sessions.filter(s=>s.businessId===where.businessId&&where.id.in.includes(s.id)&&!s.endedAt),updateMany:async({where,data}:{where:{id:string;businessId:string};data:{endedAt:Date}})=>{const s=sessions.find(s=>s.id===where.id&&s.businessId===where.businessId&&!s.endedAt);if(s)s.endedAt=data.endedAt;return {count:s?1:0};}},
 liveViewStation:{updateMany:async({where,data}:{where:{businessId:string;id:string};data:{reuseAfterAt:Date}})=>{cooldowns.push({...where,until:data.reuseAfterAt});}},
 $executeRaw:async(_strings:TemplateStringsArray,key:string)=>{locks.push(key);}
 } as unknown as Prisma.TransactionClient;
 const before=Date.now();assert.equal(await endOrderLiveSessions(tx,"a","order","owner"),1);
 assert.ok(sessions[0].endedAt);assert.equal(sessions[1].endedAt,null);assert.equal(sessions[2].endedAt,null);
 assert.deepEqual(locks,["live-view:x"]);assert.equal(cooldowns[0].businessId,"a");assert.ok(cooldowns[0].until.getTime()>=before+30000);
 assert.equal(audits.length,1);assert.equal(await endOrderLiveSessions(tx,"a","order","owner"),0);assert.equal(audits.length,1);
});
test("bound creation and completion use the same business lock before the station lock, and refuse completed/cross-tenant orders",()=>{
 const source=readFileSync("app/actions/live-view.ts","utf8"),start=source.indexOf("const createdSession ="),body=source.slice(start,source.indexOf('revalidatePath("/dashboard/live-view")',start));
 assert.ok(body.indexOf('`laundry:${who.business.id}`')<body.indexOf('await stationLock'));
 assert.match(body,/"businessId"=\$\{who.business.id\} AND status IN \('received','processing'\)/);
 assert.match(body,/liveViewRecipientPhone\(text\(form,"phone"\)\)!==order.phone/);
 assert.match(body,/action:"live-view.order.linked"/);
 const action=readFileSync("app/Laundromat/actions.ts","utf8");assert.match(action,/data.status==="ready"\|\|data.status==="delivered"\)await endOrderLiveSessions/);
});
