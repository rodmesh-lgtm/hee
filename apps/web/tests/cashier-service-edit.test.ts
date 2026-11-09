import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {z} from 'zod';
import {PGlite} from '@electric-sql/pglite';
import * as domain from '../app/lib/laundry-domain';

test('catalog edits preserve invoice snapshots and IDs, isolate tenants, reject staff and stale edits, and atomically validate urgent prices',async()=>{
 const pg=new PGlite(),a=randomUUID(),b=randomUUID(),id=randomUUID(),foreign=randomUUID();
 let active=a,actor='owner',transactions=0;
 try{
  await pg.exec(`CREATE TABLE "LaundryService"(id text PRIMARY KEY,"businessId" text,name text,category text,price int,active boolean DEFAULT true);CREATE TABLE "LaundryAudit"(id text PRIMARY KEY,"businessId" text,"actorId" text,action text,"targetId" text);CREATE TABLE "LaundryTicket"(items jsonb,total int);`);
  await pg.exec(readFileSync('prisma/migrations/20261109070000_cashier_measured_units/migration.sql','utf8'));
  await pg.query('INSERT INTO "LaundryService"(id,"businessId",name,category,price) VALUES($1,$2,$3,$4,500),($5,$6,$7,$4,900)',[id,a,'Original service','Services',foreign,b,'Foreign service']);
  const snapshot=JSON.stringify([{serviceId:id,name:'Original service',quantity:1,unitPrice:500,total:500}]);
  await pg.query('INSERT INTO "LaundryTicket" VALUES($1::jsonb,500)',[snapshot]);
  const sql=(parts:TemplateStringsArray)=>parts.reduce((s,p,i)=>s+(i?`$${i}`:'')+p,'');
  const tx={
   $queryRaw:async(parts:TemplateStringsArray,...values:unknown[])=>(await pg.query(sql(parts),values)).rows,
   $executeRaw:async(parts:TemplateStringsArray,...values:unknown[])=>parts.join('').includes('pg_advisory')?1:(await pg.query(sql(parts),values)).affectedRows,
  };
  const db={$transaction:async(fn:(v:typeof tx)=>Promise<unknown>)=>{transactions++;await pg.exec('BEGIN');try{const r=await fn(tx);await pg.exec('COMMIT');return r;}catch(e){await pg.exec('ROLLBACK');throw e;}}};
  const dependencies:Record<string,unknown>={'node:crypto':{randomUUID},zod:{z},'next/cache':{revalidatePath:()=>{}},'../lib/db':{db},'../lib/auth':{getCurrentUserForApiWrite:async()=>({id:actor})},'../lib/active-business':{getActiveBusinessForUser:async()=>({id:active,ownerId:'owner'})},'../lib/cashier-profile-server':{cashierProfileForBusiness:async()=>({id:'services'})},'../lib/cashier-activity':{cashierServiceAllowed:()=>true},'../lib/laundry-domain':domain};
  const exports:Record<string,unknown>={};
  runInNewContext(ts.transpileModule(readFileSync('app/Laundromat/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(path:string)=>dependencies[path]??{},Date,Set,Math,JSON,Error});
  const command=exports.laundryCommand as (value:unknown)=>Promise<{ok:boolean;error?:string}>;
  const original={name:'Original service',category:'Services',price:500,urgentPrice:null};
  const edit={type:'service-update',businessId:a,id,requestId:randomUUID(),name:'Updated service',category:'New category',price:'7.25',urgentPrice:'9.50',previous:original};
  actor='cashier';assert.equal((await command(edit)).ok,false);assert.equal(transactions,0);actor='owner';
  active=b;assert.equal((await command(edit)).ok,false);assert.equal(transactions,0);active=a;
  assert.equal((await command({...edit,id:foreign})).ok,false);
  assert.equal((await command({...edit,urgentPrice:'6'})).ok,false);
  const result=await command(edit);assert.equal(result.ok,true,JSON.stringify(result));assert.equal((await command(edit)).ok,true);
  const rows=await pg.query<{id:string;name:string;category:string;price:number}>('SELECT id,name,category,price FROM "LaundryService" WHERE "businessId"=$1 ORDER BY id',[a]);
  assert.equal(rows.rows.length,2);assert.equal(rows.rows.find(r=>r.id===id)?.price,725);assert.equal(rows.rows.find(r=>r.id===`urgent:${id}`)?.price,950);
  const after=await pg.query<{items:unknown;total:number}>('SELECT * FROM "LaundryTicket"');assert.deepEqual(after.rows[0].items,JSON.parse(snapshot));assert.equal(after.rows[0].total,500);
  assert.equal((await command({...edit,requestId:randomUUID(),price:'8'})).ok,false);
  const previous={name:edit.name,category:edit.category,price:725,urgentPrice:950};
  assert.equal((await command({...edit,requestId:randomUUID(),previous,price:'10',urgentPrice:'9.50'})).ok,false);
  assert.equal((await command({...edit,requestId:randomUUID(),previous,price:'10',urgentPrice:''})).ok,true);
  const variant=await pg.query<{active:boolean}>('SELECT active FROM "LaundryService" WHERE id=$1',[`urgent:${id}`]);assert.equal(variant.rows[0].active,false);
  assert.equal((await pg.query<{price:number}>('SELECT price FROM "LaundryService" WHERE id=$1',[foreign])).rows[0].price,900);
  assert.equal((await pg.query<{n:number}>('SELECT COUNT(*)::int AS n FROM "LaundryAudit"')).rows[0].n,2);
  await pg.exec(`CREATE TABLE "AccountingPackage"(id text,"businessId" text,kind text,"serviceIds" jsonb);CREATE TABLE "LaundryPrepaid"(id text,"businessId" text,kind text,"serviceIds" jsonb);`);
  await pg.query(`INSERT INTO "AccountingPackage" VALUES($1,$2,'pieces',$3::jsonb)`,[randomUUID(),a,JSON.stringify([id])]);
  const measuredEdit={...edit,requestId:randomUUID(),unit:'meter',price:'10',urgentPrice:'',previous:{...previous,price:1000,urgentPrice:null}};
  assert.equal((await command(measuredEdit)).ok,false);
  await pg.exec('DELETE FROM "AccountingPackage"');
  assert.equal((await command({...measuredEdit,requestId:randomUUID()})).ok,true);
  assert.equal((await pg.query<{unit:string}>('SELECT unit FROM "LaundryService" WHERE id=$1',[id])).rows[0].unit,'meter');
 }finally{await pg.close();}
});
