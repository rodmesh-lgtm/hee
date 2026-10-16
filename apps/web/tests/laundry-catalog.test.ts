import test from "node:test";
import assert from "node:assert/strict";
import {LAUNDRY_CATALOG,LAUNDRY_OPERATIONS,resolveLaundryPreset,groupLaundryServices,filterLaundryProducts} from "../app/lib/laundry-catalog";
test("starter catalog is unique and contains no invented prices",()=>{
 assert.equal(new Set(LAUNDRY_CATALOG.map(item=>item.id)).size,LAUNDRY_CATALOG.length);
 assert.equal(new Set(LAUNDRY_CATALOG.map(item=>item.name)).size,LAUNDRY_CATALOG.length);
 assert.ok(LAUNDRY_CATALOG.length>=40);
 for(const item of LAUNDRY_CATALOG){assert.ok(!Object.hasOwn(item,"price"));for(const operation of Object.keys(LAUNDRY_OPERATIONS))assert.ok(resolveLaundryPreset(item.id,operation));}
});
test("catalog names and categories are server-resolved and unknown operations rejected",()=>{
 assert.deepEqual(resolveLaundryPreset("vest","wash_iron"),{name:"فنيلة داخلية — غسيل وكوي",category:"ملابس رجالية"});
 assert.equal(resolveLaundryPreset("made-up","wash"),null);
 assert.equal(resolveLaundryPreset("thobe","__proto__"),null);
});

test("cashier groups operation variants without losing prices, IDs, or unrelated legacy services",()=>{
 const services=[{id:"iron",name:"ثوب — كوي",category:"رجالي",price:225},{id:"wash",name:"ثوب — غسيل وكوي",category:"رجالي",price:525},{id:"legacy",name:"ترقيع ثوب",category:"رجالي",price:100},{id:"other",name:"ثوب — كوي",category:"أطفال",price:150}];
 const grouped=groupLaundryServices(services);
 assert.equal(grouped.length,3);
 assert.equal(grouped[0].name,"ثوب");
 assert.deepEqual(grouped[0].options.map(x=>[x.label,x.service.id,x.service.price]),[["غسيل وكوي","wash",525],["كوي فقط","iron",225]]);
 assert.equal(grouped[1].options[0].service.id,"legacy");
 assert.equal(services[0].id,"iron");
});

test("iron-only filter hides wash-only products and never offers a washing price",()=>{
 const services=[{id:"i",name:"ثوب — كوي",category:"رجالي",price:225},{id:"w",name:"ثوب — غسيل وكوي",category:"رجالي",price:525},{id:"v",name:"فنيلة — غسيل وكوي",category:"رجالي",price:250}];
 const iron=filterLaundryProducts(services,"iron");assert.equal(iron.length,1);assert.deepEqual(iron[0].options.map(x=>x.service.id),["i"]);
 assert.equal(filterLaundryProducts(services,"wash_iron").length,2);
 assert.equal(filterLaundryProducts(services,"all")[0].options.length,2);
});
