import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test('branch aggregates are tenant scoped, contain no PII, and recheck revocation',async()=>{
 const source=readFileSync(new URL('../app/api/retail-analytics/branches/route.ts',import.meta.url),'utf8');
 let user:unknown={id:'u'},business:unknown={id:'own'},revoke=false,reads=0,checks=0;
 const queries:unknown[]=[];
 const exports:{GET?:(request:Request)=>Promise<{body:{rows:{counts:{completed:number}}[];unassigned:number};status:number}>}={};
 runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports,URL,Date,Set,Object,Error,
  require:(name:string)=>{
   if(name==='next/server')return {NextResponse:{json:(body:unknown,init:{status:number;headers:unknown})=>({body,...init})}};
   if(name.endsWith('/auth'))return {getCurrentUser:async()=>user};
   if(name.endsWith('/active-business'))return {getActiveBusinessForUser:async(_id:string,permission:string)=>{assert.equal(permission,'businessAnalytics');checks++;return revoke&&checks>1?null:business;}};
   if(name.endsWith('/rate-limit'))return {consumePublicWriteLimit:async()=>({allowed:true})};
   if(name.endsWith('/shopify-report'))return {validateReportPeriod:()=>({})};
   if(name.endsWith('/db'))return {db:{$transaction:async(values:unknown[])=>Promise.all(values),branch:{findMany:async(query:unknown)=>{queries.push(query);reads++;return [{id:'branch-a',name:'Main',isActive:true}];}},booking:{groupBy:async(query:unknown)=>{queries.push(query);reads++;return [{branchId:'branch-a',status:'completed',_count:{_all:4}},{branchId:null,status:'pending',_count:{_all:2}},{branchId:'foreign-branch',status:'pending',_count:{_all:1}}];}}}};
   throw new Error(name);
  },
 });
 const request=(id='own')=>new Request(`https://ir.sa/api/retail-analytics/branches?businessId=${id}&from=2026-11-01&until=2026-11-02`);
 let response=await exports.GET!(request('foreign'));assert.equal(response.status,403);assert.equal(reads,0);
 checks=0;response=await exports.GET!(request());assert.equal(response.status,200);assert.equal(response.body.rows.length,1);assert.equal(response.body.rows[0].counts.completed,4);assert.equal(response.body.unassigned,3);
 for(const q of queries)assert.equal((q as {where:{businessId:string}}).where.businessId,'own');
 assert.doesNotMatch(JSON.stringify(response.body),/customer|phone|token|foreign-branch/);
 checks=0;revoke=true;response=await exports.GET!(request());assert.equal(response.status,403);assert.equal(response.body.rows,undefined);
 user=null;response=await exports.GET!(request());assert.equal(response.status,401);
 business=null;
});
