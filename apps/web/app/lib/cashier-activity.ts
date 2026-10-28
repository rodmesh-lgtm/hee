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
/** Specific declared activities always win. Tenant-local evidence preserves ambiguous legacy laundry accounts. */
export function cashierActivityProfile(business:CashierBusinessActivity,hasLegacyLaundryCatalogue=false):CashierProfile {
 const category=classify(business.businessCategory||"");
 const type=classify(business.businessType);
 const generic=(id:CashierActivityId)=>id==="general"||id==="services";
 const declared=!generic(category)?category:!generic(type)?type:category!=="general"?category:type;
 const id=generic(declared)&&hasLegacyLaundryCatalogue?"laundry":declared;
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
const categoryKey=(value:string)=>normalize(value).replace(/\s+/g,"");
const laundryOnlyCategories=new Set(["غسيل وكوي","غسيل وكى","كوي","كوي فقط","تنظيف جاف","غسيل ملابس","خدمات المغسلة","Wash & Iron","Wash and Iron","Ironing","Dry cleaning","Laundry services"].map(categoryKey));
const garmentCategories=new Set(LAUNDRY_CATALOG.filter(item=>item.category!=="مفروشات").map(item=>categoryKey(item.category)));
export function isClothingPresetService(service:{name:string;category:string}):boolean {
 return clothingPresetKeys.has(JSON.stringify([service.name,service.category]))
  ||laundryOnlyCategories.has(categoryKey(service.category))
  ||(garmentCategories.has(categoryKey(service.category))&&/ — (غسيل وكوي|كوي|تنظيف جاف)$/.test(service.name));
}
export function cashierServiceAllowed(business:CashierBusinessActivity,service:{name:string;category:string},hasLegacyLaundryCatalogue=false):boolean {
 return cashierActivityProfile(business,hasLegacyLaundryCatalogue).id==="laundry"||!isClothingPresetService(service);
}
