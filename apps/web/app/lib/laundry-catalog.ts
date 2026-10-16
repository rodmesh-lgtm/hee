/** Starter names, not a price list. Each tenant explicitly prices its own services. */
export const LAUNDRY_CATALOG = [
  {id:"vest",name:"فنيلة داخلية",category:"ملابس رجالية"},
  {id:"underpants",name:"سروال داخلي",category:"ملابس رجالية"},
  {id:"thobe",name:"ثوب",category:"ملابس رجالية"},
  {id:"shemagh",name:"شماغ",category:"ملابس رجالية"},
  {id:"ghutra",name:"غترة",category:"ملابس رجالية"},
  {id:"taqiyah",name:"طاقية",category:"ملابس رجالية"},
  {id:"bisht",name:"بشت",category:"ملابس رجالية"},
  {id:"shirt",name:"قميص",category:"ملابس يومية"},
  {id:"tshirt",name:"تيشيرت",category:"ملابس يومية"},
  {id:"trousers",name:"بنطلون",category:"ملابس يومية"},
  {id:"jeans",name:"بنطلون جينز",category:"ملابس يومية"},
  {id:"shorts",name:"شورت",category:"ملابس يومية"},
  {id:"pajamas",name:"بيجامة",category:"ملابس يومية"},
  {id:"socks",name:"جوارب — زوج",category:"ملابس يومية"},
  {id:"sports",name:"طقم رياضي",category:"ملابس يومية"},
  {id:"hoodie",name:"هودي",category:"ملابس شتوية"},
  {id:"sweater",name:"كنزة",category:"ملابس شتوية"},
  {id:"jacket",name:"جاكيت",category:"ملابس شتوية"},
  {id:"coat",name:"معطف",category:"ملابس شتوية"},
  {id:"suit",name:"بدلة — قطعتان",category:"ملابس رسمية"},
  {id:"blazer",name:"جاكيت بدلة",category:"ملابس رسمية"},
  {id:"tie",name:"ربطة عنق",category:"ملابس رسمية"},
  {id:"uniform",name:"زي عمل",category:"ملابس رسمية"},
  {id:"abaya",name:"عباية",category:"ملابس نسائية"},
  {id:"shayla",name:"شيلة",category:"ملابس نسائية"},
  {id:"dress",name:"فستان",category:"ملابس نسائية"},
  {id:"evening",name:"فستان سهرة",category:"ملابس نسائية"},
  {id:"blouse",name:"بلوزة",category:"ملابس نسائية"},
  {id:"skirt",name:"تنورة",category:"ملابس نسائية"},
  {id:"jalabiya",name:"جلابية",category:"ملابس نسائية"},
  {id:"child-thobe",name:"ثوب أطفال",category:"ملابس أطفال"},
  {id:"child-set",name:"طقم أطفال",category:"ملابس أطفال"},
  {id:"child-dress",name:"فستان أطفال",category:"ملابس أطفال"},
  {id:"school",name:"زي مدرسي",category:"ملابس أطفال"},
  {id:"sheet-single",name:"شرشف سرير مفرد",category:"مفروشات"},
  {id:"sheet-double",name:"شرشف سرير مزدوج",category:"مفروشات"},
  {id:"duvet-single",name:"لحاف مفرد",category:"مفروشات"},
  {id:"duvet-double",name:"لحاف مزدوج",category:"مفروشات"},
  {id:"duvet-cover",name:"غطاء لحاف",category:"مفروشات"},
  {id:"blanket",name:"بطانية",category:"مفروشات"},
  {id:"pillowcase",name:"كيس مخدة",category:"مفروشات"},
  {id:"pillow",name:"مخدة",category:"مفروشات"},
  {id:"towel-small",name:"منشفة صغيرة",category:"مفروشات"},
  {id:"towel-large",name:"منشفة حمام",category:"مفروشات"},
  {id:"bathrobe",name:"روب حمام",category:"مفروشات"},
  {id:"tablecloth",name:"مفرش طاولة",category:"مفروشات"},
  {id:"curtain",name:"ستارة — قطعة",category:"مفروشات"},
  {id:"prayer-mat",name:"سجادة صلاة",category:"مفروشات"},
] as const;
export const LAUNDRY_OPERATIONS = {wash:"غسيل",iron:"كوي",wash_iron:"غسيل وكوي",dry:"تنظيف جاف"} as const;
export function resolveLaundryPreset(id:string,operation:string) {
  const item=LAUNDRY_CATALOG.find(item=>item.id===id);
  if(!item||!Object.hasOwn(LAUNDRY_OPERATIONS,operation))return null;
  return {name:`${item.name} — ${LAUNDRY_OPERATIONS[operation as keyof typeof LAUNDRY_OPERATIONS]}`,category:item.category};
}

export const LAUNDRY_PRIMARY_OPERATIONS = {wash_iron:"غسيل وكوي",iron:"كوي فقط"} as const;
/** Preserve each persisted service ID and price; group only recognized suffixes. */
export function groupLaundryServices<T extends {id:string;name:string;category:string}>(services:T[]) {
  const groups=new Map<string,{key:string;name:string;category:string;options:Array<{label:string;service:T}>}>();
  for(const service of services){
    const operation=(Object.keys(LAUNDRY_OPERATIONS) as Array<keyof typeof LAUNDRY_OPERATIONS>).find(key=>service.name.endsWith(` — ${LAUNDRY_OPERATIONS[key]}`));
    const name=operation?service.name.slice(0,-(` — ${LAUNDRY_OPERATIONS[operation]}`.length)):service.name;
    const key=JSON.stringify([service.category,name,operation?"group":service.id]);
    const group=groups.get(key)??{key,name,category:service.category,options:[]};
    group.options.push({label:operation==="iron"?"كوي فقط":operation?LAUNDRY_OPERATIONS[operation]:"إضافة",service});
    groups.set(key,group);
  }
  return [...groups.values()].map(group=>({...group,options:group.options.sort((a,b)=>["غسيل وكوي","كوي فقط","غسيل","تنظيف جاف","إضافة"].indexOf(a.label)-["غسيل وكوي","كوي فقط","غسيل","تنظيف جاف","إضافة"].indexOf(b.label))}));
}
