import * as paidSections from "../app/lib/paid-sections";
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { memberCanAccess, staffCanOpenPath, withinAnalyticsSeatLimit } from '../app/lib/staff-permissions';

test('financial reports require a distinct explicit permission', () => {
  assert.equal(memberCanAccess(null, 'businessAnalytics'),false);
  assert.equal(staffCanOpenPath('/dashboard/retail-analytics/shopify',['analytics']),false);
  assert.equal(staffCanOpenPath('/dashboard/retail-analytics/shopify',['businessAnalytics']),true);
});
test('expired/free or reduced plans cannot retain extra financial-report users', () => {
  const ids=['member-a','member-b'];
  assert.equal(withinAnalyticsSeatLimit(ids,'member-a',1),false);
  assert.equal(withinAnalyticsSeatLimit(ids,'member-a',2),true);
  assert.equal(withinAnalyticsSeatLimit(ids,'member-b',2),false);
  assert.equal(withinAnalyticsSeatLimit(ids,'outsider',null),false);
  assert.equal(withinAnalyticsSeatLimit(ids,'member-b',3),true);
  assert.equal(withinAnalyticsSeatLimit(ids,'member-a',NaN),false);
});
test('report endpoints recheck explicit membership and connection mutations remain owner-only', () => {
  const api=readFileSync(new URL('../app/api/retail-analytics/shopify/route.ts',import.meta.url),'utf8');
  assert.equal(api.match(/getActiveBusinessForUser\(user.id, "businessAnalytics"\)/g)?.length,2);
  assert.ok(api.includes("params.get('businessId') !== business.id"));
  const actions=readFileSync(new URL('../app/dashboard/retail-analytics/actions.ts',import.meta.url),'utf8');
  assert.ok(actions.includes('getOwnedBusinessForWrite'));
});

test('active-business resolution isolates financial readers and checks paid capacity', async () => {
  const ts = await import('typescript');
  const { runInNewContext } = await import('node:vm');
  const source = readFileSync(new URL('../app/lib/active-business.ts', import.meta.url),'utf8');
  const permissions = await import('../app/lib/staff-permissions');
  const fixtures: Record<string, {id:string;ownerId:string;members:{id:string;permissions:string[]}[]}> = {
    a:{id:'a',ownerId:'owner-a',members:[{id:'member-a',permissions:['businessAnalytics']}]},
    b:{id:'b',ownerId:'owner-b',members:[]},
  };
  let selected='a', limit=2;
  const exports: Record<string, (...args: unknown[])=>Promise<unknown>> = {};
  runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, {
    exports,
    require:(name:string)=>{
      if(name==='./paid-sections')return paidSections;
      if(name==='server-only')return {};
      if(name==='./accounting-security')return {ACCOUNTING_SECURITY_HOLD:false};
      if(name==='./commercial-access')return {commercialAccess:async()=>({staffLimit:limit})};
      if(name==='./subscription-entitlement')return {};
      if(name==='./staff-permissions')return permissions;
      if(name==='next/headers')return {cookies:async()=>({get:()=>({value:selected})})};
      if(name==='./db')return {db:{business:{findFirst:async({where}:{where:{id:string;OR:{ownerId?:string}[]}})=>{
        const row=fixtures[where.id];
        return row && (row.ownerId===where.OR[0].ownerId || row.id==='a' && where.OR[0].ownerId==='reader') ? row : null;
      }},businessMember:{findMany:async()=>[{id:'member-a'}]}}};
      throw new Error(name);
    },
  });
  assert.equal((await exports.getActiveBusinessForUser('reader','businessAnalytics') as {id:string}).id,'a');
  limit=1;
  assert.equal(await exports.getActiveBusinessForUser('reader','businessAnalytics'),null);
  limit=2;selected='b';
  assert.equal(await exports.getActiveBusinessForUser('reader','businessAnalytics'),null);
  selected='a';fixtures.a.members[0].permissions=['analytics'];
  assert.equal(await exports.getActiveBusinessForUser('reader','businessAnalytics'),null);
});
