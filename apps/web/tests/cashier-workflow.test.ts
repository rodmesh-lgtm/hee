import {accountingAccountName} from "../app/lib/laundry-ledger-domain";
import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
import ts from "typescript";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import {renderToStaticMarkup} from "react-dom/server";
import {cashierWorkflow,cashierOrderNotes} from "../app/lib/cashier-workflow";
import {cashierActivityProfile} from "../app/lib/cashier-activity";
import {cashierUrgentEnabled} from "../app/lib/cashier-settings";
import * as dates from "../app/lib/accounting-dates";
import * as packages from "../app/lib/accounting-packages";

test("laundry urgency has one/two/four hour shortcuts while workshops get vehicle readiness choices",()=>{
 const laundry=cashierActivityProfile({businessType:'خدمات'},true),workshop=cashierActivityProfile({businessType:'WORKSHOP'},true);
 assert.deepEqual(cashierWorkflow(laundry.id,'urgent').shortcuts.map(p=>p.hours),[1,2,4]);
 assert.deepEqual(cashierWorkflow(laundry.id,'normal').shortcuts.map(p=>p.hours),[4,24,48]);
 assert.deepEqual(cashierWorkflow(workshop.id).shortcuts.map(p=>p.hours),[24,48,72]);
 assert.equal(cashierUrgentEnabled(null,{businessType:'WORKSHOP'},true),false);
 assert.equal(cashierUrgentEnabled(null,{businessType:'خدمات'},true),true);
 assert.equal(cashierWorkflow(workshop.id).vehicleFields,true);assert.equal(cashierWorkflow(laundry.id).vehicleFields,false);
});
test("other activities use preparation, vehicle care or service times without laundry wording",()=>{
 for(const id of ['restaurant','retail','grocery','salon','clinic','car_wash','general'] as const){
 const flow=cashierWorkflow(id);assert.doesNotMatch(flow.scheduleTitle+flow.notesPlaceholder,/ملابس|كوي|مغسلة/);
 assert.ok(flow.shortcuts.every(p=>p.hours>0));
 }
 assert.deepEqual(cashierWorkflow('restaurant').shortcuts.map(p=>p.hours),[0.25,0.5,1]);
});
test("vehicle fields are stored in invoice notes only for vehicle activities with validation and length limits",()=>{
 assert.equal(cashierOrderNotes('workshop',{notes:'فحص الفرامل',vehicleModel:'كامري 2024',vehiclePlate:'أ ب ج 123',vehicleMileage:'45000'}),'المركبة: كامري 2024\nاللوحة: أ ب ج 123\nقراءة العداد: 45000 كم\nفحص الفرامل');
 assert.equal(cashierOrderNotes('laundry',{notes:'  بقعة  '}),'بقعة');
 assert.match(cashierOrderNotes('workshop',{notes:'',vehicleMileage:'٤٥٠٠٠'}),/45000/);
 for(const id of ['laundry','retail','restaurant'] as const)assert.throws(()=>cashierOrderNotes(id,{notes:'',vehiclePlate:'123'}),/المركبات فقط/);
 assert.throws(()=>cashierOrderNotes('workshop',{notes:'',vehicleMileage:'-1'}),/راجع/);
 assert.throws(()=>cashierOrderNotes('workshop',{notes:'أ'.repeat(1000),vehicleModel:'كامري'}),/اختصر/);
});
test("actual schedule render uses contextual labels and keeps subscription controls separate",async()=>{
 const source=await readFile(new URL('../app/Laundromat/schedule-fields.tsx',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{fileName:'schedule-fields.tsx',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports:Record<string,unknown>={};
 const deps:Record<string,unknown>={'react':React,'react/jsx-runtime':jsxRuntime,'../../components/i18n/locale-provider':{useI18n:()=>({t:(s:string)=>s,intlLocale:'ar-SA'})},'../lib/cashier-workflow':{cashierWorkflow},'../lib/accounting-dates':dates,'../lib/accounting-packages':packages};
 runInNewContext(code,{exports,Date,Number,Array,Intl,require:(id:string)=>deps[id]??{}});
 const Component=exports.DeliverySchedule as React.ComponentType<{activityId:'laundry'|'workshop';speed?:'urgent'}>;
 const laundry=renderToStaticMarkup(React.createElement(Component,{activityId:'laundry',speed:'urgent'}));
 const workshop=renderToStaticMarkup(React.createElement(Component,{activityId:'workshop'}));
 assert.match(laundry,/بعد ساعة/);assert.match(laundry,/بعد ساعتين/);assert.match(laundry,/موعد استلام الملابس/);
 assert.match(workshop,/موعد جاهزية المركبة المتوقع/);assert.doesNotMatch(workshop,/بعد ساعة|بعد ساعتين|ملابس/);
 assert.match(workshop,/name="dueAt"/);assert.doesNotMatch(workshop,/durationMonths/);
 const action=await readFile(new URL('../app/Laundromat/actions.ts',import.meta.url),'utf8');assert.ok(action.startsWith('"use server";'));assert.match(action,/cashierOrderNotes\(cashierActivityProfile\(current/);assert.match(action,/\$\{notes\}/);
});


test("shared accounting uses business labels while preserving custom account names",()=>{
 assert.equal(accountingAccountName("مصروفات تشغيل المغسلة"),"مصروفات تشغيل المنشأة");
 assert.equal(accountingAccountName("استهلاك مواد المغسلة"),"استهلاك مواد المنشأة");
 assert.equal(accountingAccountName("مصروفات فحص المحركات"),"مصروفات فحص المحركات");
});
