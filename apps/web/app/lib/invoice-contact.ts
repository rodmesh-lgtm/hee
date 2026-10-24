import { normalizePageModules } from "./page-modules";
import { LaundryInputError } from "./laundry-domain";
export function normalizeInvoicePhone(value:string) {
 const phone=value.trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[\s()\-]/g,"");
 if(phone&&!/^\+?\d{7,15}$/.test(phone))throw new LaundryInputError("أدخل رقم تواصل صحيحًا، أو اترك الحقل فارغًا لإخفائه");
 return phone;
}
export function invoiceContactPhone(pageModules:unknown,businessType:string|null|undefined) {
 try{return normalizeInvoicePhone(normalizePageModules(pageModules,businessType).find(module=>module.id==="contact")?.config.invoicePhone??"");}catch{return "";}
}
