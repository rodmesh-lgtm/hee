import { getActivityProfile, type ActivityId } from "./activity-engine";
import { LAUNDRY_CATALOG, LAUNDRY_OPERATIONS } from "./laundry-catalog";

export type CashierBusinessActivity={businessType:string;businessCategory?:string|null};
export type CashierActivityId="laundry"|"car_wash"|Lowercase<ActivityId>;
export type CashierProfile={id:CashierActivityId;label:string;menuTitle:string;itemPlaceholder:string;categoryPlaceholder:string;categories:string[]};
const normalize=(value:string)=>value.normalize("NFKC").toLowerCase().replace(/[\u064b-\u065f\u0670\u0640]/g,"").replace(/[أإآ]/g,"ا").replace(/ة/g,"ه");
function classify(value:string):CashierActivityId {
 const text=normalize(value);
 if(/(?:غسيل|غسل|مغسل|مغاسل).*سيار|car\s*wash|auto\s*wash/.test(text))return "car_wash";
 if(/مغسل|مغاسل|laundry|laundromat/.test(text))return "laundry";
 return getActivityProfile(value).id.toLowerCase() as Lowercase<ActivityId>;
}
/** Only this tenant's declared activity selects a cashier. Catalogue contents and names are not authority. */
export function cashierActivityProfile(business:CashierBusinessActivity):CashierProfile {
 const category=classify(business.businessCategory||"");
 const id=category!=="general"?category:classify(business.businessType);
 const profiles:Partial<Record<CashierActivityId,Omit<CashierProfile,"id">>>={
  laundry:{label:"مغسلة ملابس",menuTitle:"قطع الملابس وخدمات المغسلة",itemPlaceholder:"ثوب — غسيل وكوي",categoryPlaceholder:"ملابس رجالية",categories:["ملابس رجالية","ملابس نسائية","ملابس أطفال","مفروشات"]},
  workshop:{label:"ورشة وصيانة سيارات",menuTitle:"خدمات الصيانة وقطع الغيار",itemPlaceholder:"تغيير زيت المحرك",categoryPlaceholder:"صيانة دورية",categories:["صيانة دورية","ميكانيكا","كهرباء السيارات","قطع غيار"]},
  car_wash:{label:"مغسلة سيارات",menuTitle:"خدمات غسل السيارات والعناية",itemPlaceholder:"غسيل خارجي",categoryPlaceholder:"غسيل السيارات",categories:["غسيل السيارات","تنظيف داخلي","تلميع","عناية وحماية"]},
  restaurant:{label:"مطعم أو مقهى",menuTitle:"الأصناف والمشروبات",itemPlaceholder:"قهوة عربية",categoryPlaceholder:"مشروبات",categories:["وجبات","مشروبات","حلويات","إضافات"]},
  retail:{label:"متجر وتجزئة",menuTitle:"منتجات المتجر",itemPlaceholder:"اسم المنتج",categoryPlaceholder:"منتجات",categories:["منتجات","إكسسوارات","مستلزمات"]},
  grocery:{label:"بقالة وأغذية",menuTitle:"المنتجات الغذائية",itemPlaceholder:"اسم المنتج",categoryPlaceholder:"مواد غذائية",categories:["مواد غذائية","مشروبات","خضار وفواكه"]},
  salon:{label:"صالون وتجميل",menuTitle:"خدمات العناية والتجميل",itemPlaceholder:"قص الشعر",categoryPlaceholder:"العناية بالشعر",categories:["العناية بالشعر","عناية وتجميل","منتجات"]}
 };
 const fallback=getActivityProfile(id.toUpperCase());
 return {id,...(profiles[id]||{label:fallback.labelAr,menuTitle:"خدمات ومنتجات المنشأة",itemPlaceholder:"اسم الخدمة أو المنتج",categoryPlaceholder:"تصنيف الخدمة",categories:[]})};
}
const clothingPresetKeys=new Set(LAUNDRY_CATALOG.flatMap(item=>Object.values(LAUNDRY_OPERATIONS).map(operation=>JSON.stringify([`${item.name} — ${operation}`,item.category]))));
export function isClothingPresetService(service:{name:string;category:string}):boolean {
 return clothingPresetKeys.has(JSON.stringify([service.name,service.category]));
}
export function cashierServiceAllowed(business:CashierBusinessActivity,service:{name:string;category:string}):boolean {
 return cashierActivityProfile(business).id==="laundry"||!isClothingPresetService(service);
}
