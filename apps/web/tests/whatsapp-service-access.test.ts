import test from "node:test";
import assert from "node:assert/strict";
import {whatsappServicePolicy,serviceTemplateAllowed} from "../app/lib/whatsapp/service-policy";
import {readFileSync} from "node:fs";
test("operational plans can manage their own service notifications without gaining marketing rights",()=>{
 for(const code of ["FREE",undefined,"invented"]){const a=whatsappServicePolicy(code);assert.equal(a.allowed,false);assert.equal(serviceTemplateAllowed(a,{name:"infro_live_view_v1",category:"UTILITY"}),false);}
 const cases=[
 ["BOOKING_ONLY_35",["infro_booking_confirmation","infro_booking_verification"]],
 ["ACCOUNTING_ONLY_35",["infro_laundry_ready","infro_pickup_reminder","infro_payment_reminder","infro_order_review"]],
 ["LIVE_ONLY_35",["infro_live_view_v1"]],
 ] as const;
 const templates=[{name:"infro_booking_confirmation",category:"UTILITY"},{name:"infro_booking_verification",category:"AUTHENTICATION"},{name:"infro_laundry_ready",category:"UTILITY"},{name:"infro_pickup_reminder",category:"UTILITY"},{name:"infro_payment_reminder",category:"UTILITY"},{name:"infro_order_review",category:"MARKETING"},{name:"infro_live_view_v1",category:"UTILITY"},{name:"discount_campaign",category:"MARKETING"}];
 for(const [code,allowed] of cases){const a=whatsappServicePolicy(code);assert.equal(a.allowed,true);assert.equal(a.marketing,false);for(const t of templates)assert.equal(serviceTemplateAllowed(a,t),(allowed as readonly string[]).includes(t.name),`${code}/${t.name}`);}
 const accounting=whatsappServicePolicy("ACCOUNTING_ONLY_35");assert.equal(serviceTemplateAllowed(accounting,{name:"infro_payment_reminder",category:"MARKETING"}),false);
 for(const code of ["GROWTH_35","SCALE_35","WHATSAPP_ONLY_35","BUSINESS","PRO"]){assert.equal(whatsappServicePolicy(code).marketing,true);assert.equal(serviceTemplateAllowed(whatsappServicePolicy(code),{name:"discount_campaign",category:"MARKETING"}),true);}
 assert.equal(whatsappServicePolicy("OPERATE_35").marketing,false);assert.equal(whatsappServicePolicy("FREE",true).marketing,true);
});
test("provider writes use server-derived service policy, while campaigns retain their own marketing gate",()=>{
 const read=(path:string)=>readFileSync(path,"utf8");
 const submit=read("app/actions/whatsapp-template-editor.ts"),signup=read("app/actions/whatsapp.ts"),actions=read("app/actions/whatsapp-marketing.ts");
 assert.ok(submit.indexOf("serviceTemplateAllowed(access")<submit.indexOf("decryptWhatsAppCredential({"));
 assert.match(submit,/businessId: context.businessId[\s\S]{0,120}OR:\[\{marketingEnabled:true\},\{bookingEnabled:true\}\]/);
 assert.match(submit,/template&&!serviceTemplateAllowed\(access,template\)/);
 assert.match(actions,/async function campaignContext\(\)[\s\S]{0,330}hasActiveWhatsAppMarketingEntitlement/);
 assert.match(actions,/export async function syncWhatsAppTemplatesAction[\s\S]{0,260}whatsappManagementAccess/);
 assert.match(signup,/purpose === "marketing"\s*\? hasActiveWhatsAppMarketingEntitlement[\s\S]{0,150}whatsappManagementAccess/);
 const route=read("app/api/dashboard/whatsapp/phone-registration/route.ts");
 assert.match(route,/getOwnedBusinessForApiWrite/);assert.match(route,/whatsappManagementAccess\(business.id\)/);assert.match(route,/businessId: business.id[\s\S]{0,180}OR:\[\{bookingEnabled:true\},\{marketingEnabled:true\}\]/);
 const campaign=read("app/actions/whatsapp-campaign-launch.ts");assert.match(campaign,/hasActiveWhatsAppMarketingEntitlement/);
});
