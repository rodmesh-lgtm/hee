import { normalizePageModules } from "./page-modules";
import { accountingActivity } from "./accounting-program";
export function cashierUrgentEnabled(pageModules:unknown,business:{businessType:string;businessCategory?:string|null},hasLaundryCatalogue=false):boolean {
 const configured=normalizePageModules(pageModules,business.businessType).find(module=>module.id==="contact")?.config.cashierUrgentEnabled;
 return typeof configured==="boolean"?configured:accountingActivity(business,hasLaundryCatalogue)==="laundry";
}
export function hasClothingCatalogue(services:Array<{name:string}>):boolean {
 return services.some(service=>/ — (غسيل وكوي|كوي|تنظيف جاف)$/.test(service.name));
}
