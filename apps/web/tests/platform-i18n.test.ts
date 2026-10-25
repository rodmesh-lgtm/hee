import { translatedUiText } from "../app/lib/i18n-presentation";
import { laundryMoney } from "../app/lib/laundry-domain";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { LOCALE_COOKIE, LEGACY_LOCALE_COOKIE, localeCookieDomain, safeLocaleReturnTo, SUPPORTED_LOCALES, LOCALE_META } from "../app/lib/i18n";
import { HOMEPAGE_TRANSLATIONS } from "../app/lib/homepage-i18n";
import { localizeUiAttributes, uiFormat, uiMessagesForLocale, uiText, UI_TRANSLATIONS } from "../app/lib/ui-i18n";
import { SERVICE_GUIDES, serviceGuide } from "../app/lib/service-guides";
import { SELLABLE_PLANS, PLAN_BILLING_NOTE } from "../app/lib/commercial-plans";

const read = (path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
test("language switching cannot redirect to an external host through slashes, backslashes or controls",()=>{
 for(const path of ["//example.com","/\\example.com","https://example.com","/\u0000foo","/a\nb",null])assert.equal(safeLocaleReturnTo(path),"/");
 for(const path of ["/dashboard","/services/live-view?from=home","/dashboard?tab=all#details"])assert.equal(safeLocaleReturnTo(path),path);
});
test("language preference is separate from session credentials and shares only on INFRO hosts",()=>{
 assert.notEqual(LOCALE_COOKIE,LEGACY_LOCALE_COOKIE);
 for(const host of ["ir.sa","hub.ir.sa","admin.ir.sa:443"])assert.equal(localeCookieDomain(host),".ir.sa");
 for(const host of ["localhost:3000","ir.sa.example.com","evil-ir.sa",null])assert.equal(localeCookieDomain(host),undefined);
 const action=read("app/actions/locale.ts");assert.match(action,/domain: localeCookieDomain/);assert.match(action,/httpOnly: true/);assert.match(action,/sameSite: "lax"/);
 const server=read("app/lib/i18n-server.ts");assert.match(server,/store.get\(LOCALE_COOKIE\).*store.get\(LEGACY_LOCALE_COOKIE\)/);
});
test("all supported languages have complete common UI and service-guide translations",()=>{
 const strings = new Set<string>(Object.keys(UI_TRANSLATIONS));
 for(const guide of SERVICE_GUIDES)for(const value of [guide.name,guide.eyebrow,guide.summary,guide.audience,guide.requirements,...guide.steps,...guide.features])strings.add(value);
 for(const guide of SERVICE_GUIDES)for(const code of guide.planCodes){const plan=SELLABLE_PLANS.find(plan=>plan.code===code);assert.ok(plan);strings.add(plan.name);strings.add(plan.description);}
 for(const text of strings)for(const locale of SUPPORTED_LOCALES){const translated=uiText(locale,text);if(locale==="ar")assert.equal(translated,text);else{assert.ok(translated.trim());assert.ok(UI_TRANSLATIONS[text]?.[locale] ?? HOMEPAGE_TRANSLATIONS[text]?.[locale], `${locale} missing: ${text}`);if(locale!=="ur")assert.doesNotMatch(translated,/[\u0600-\u06ff]/);}}
});
test("customer page translates interface copy while preserving business and contact content",()=>{
 const source=read("components/public-business-bio.tsx");assert.match(source,/useI18n\(\)/);assert.match(source,/data-public-page dir=\{dir\}/);assert.match(source,/locale !== "ar" && clean\(business.nameEn\)/);assert.match(source,/translate="no"/);
 for(const field of ["business.name","service.name","service.description","person.name","person.jobTitle","business.workingHours"])assert.ok(!source.includes(`t(${field})`),`${field} must remain business-owned`);
 assert.match(source,/setActiveDepartment\(name\)/);assert.match(source,/href=\{item.href\}/);
});
test("dashboard navigation translates labels and searches both Arabic and the selected language without changing access checks",()=>{
 const source=read("components/dashboard/dashboard-shell.tsx");assert.match(source,/staffCanOpenPath\(href,staffPermissions\)/);assert.match(source,/matchesDashboardNav\(item,navQuery\)\|\|t\(item.label\)/);assert.match(source,/dir=\{dir\}/);assert.match(source,/inset-y-0 start-0/);assert.match(source,/t\(pageTitle\)/);assert.match(source,/t\(group.label\)/);
 assert.equal(LOCALE_META.ur.dir,"rtl");assert.equal(LOCALE_META.en.dir,"ltr");
});
test("service routes are bounded, use canonical plan prices and disclose external activation requirements",()=>{
 assert.equal(serviceGuide("missing"),undefined);assert.equal(SERVICE_GUIDES.length,4);
 const page=read("app/services/[service]/page.tsx");assert.match(page,/if\(!guide\)notFound\(\)/);assert.match(page,/guide.planCodes.map\(code=>SELLABLE_PLANS.find/);assert.match(page,/plan.monthlyPrice/);assert.doesNotMatch(page,/dangerouslySetInnerHTML/);
 for(const guide of SERVICE_GUIDES)assert.ok(guide.requirements.length>80);
 assert.match(serviceGuide("whatsapp")!.requirements,/رسوم Meta منفصلة/);assert.match(serviceGuide("live-view")!.requirements,/RTSP/);
});
test("localized server copy never inserts a React component into an element attribute",()=>{
 for(const file of ["app/dashboard/page.tsx","components/dashboard/page-header.tsx","components/dashboard/empty-state.tsx","components/dashboard/stat-grid.tsx","components/dashboard/dashboard-section-page.tsx"]){const source=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);function visit(node:ts.Node){if(ts.isJsxAttribute(node)&&node.initializer)assert.ok(!node.initializer.getText(source).includes("<UiText>"),`${file}: localized component inside attribute`);ts.forEachChild(node,visit);}visit(source);}
});

test("UI attribute localization preserves form values, action references and payload identity",()=>{
 const action=()=>{};const props={name:"category",value:"العربية",title:"الحالة","aria-label":"الحالة",placeholder:"الاسم",formAction:action,onClick:action,children:"نص العميل",disabled:true};
 const localized=localizeUiAttributes("en",props);assert.equal(localized.title,"Status");assert.equal(localized["aria-label"],"Status");assert.equal(localized.placeholder,"Name");assert.equal(localized.value,props.value);assert.equal(localized.name,props.name);assert.equal(localized.children,props.children);assert.equal(localized.formAction,action);assert.equal(localized.onClick,action);assert.equal(localized.disabled,true);
 assert.equal(uiFormat("en","الرقم: {number}",{number:"<original>"}),"Number: <original>");
});

test("browser messages contain only the selected language and preserve unknown business text",()=>{
 assert.deepEqual(uiMessagesForLocale("ar"),{});
 const english=uiMessagesForLocale("en"),spanish=uiMessagesForLocale("es");
 assert.equal(english["الحالة"],"Status");assert.equal(spanish["الحالة"],"Estado");
 assert.ok(Object.values(english).every(value=>typeof value==="string"));
 assert.equal(translatedUiText(english,"اسم منشأة العميل"),"اسم منشأة العميل");
 for(const key of ["constructor","__proto__","toString"])assert.equal(translatedUiText(english,key),key);
});
test("cashier amount formatting changes notation without changing minor-unit conversion",()=>{
 assert.equal(laundryMoney(12345,"en-SA"),"123.45");
 assert.equal(laundryMoney(12345,"es-SA"),"123,45");
 assert.equal(laundryMoney(105,"en-SA"),"1.05");
 assert.equal(laundryMoney(105),laundryMoney(105,"ar-SA"));
});


test("all sellable plans and standalone terms are translated without changing amounts or codes",()=>{
 const copy=[PLAN_BILLING_NOTE,...SELLABLE_PLANS.flatMap(plan=>[plan.name,plan.description,...plan.features])];
 for(const locale of SUPPORTED_LOCALES.filter(locale=>locale!=="ar"))for(const text of copy)assert.notEqual(uiText(locale,text),text,`${locale}: ${text}`);
 for(const locale of SUPPORTED_LOCALES){const name="شركة العميل {vip} / Client";assert.ok(uiFormat(locale,"ملف {name}",{name}).includes(name));assert.ok(uiFormat(locale,"إضافة {name}",{name}).includes(name));}
});
