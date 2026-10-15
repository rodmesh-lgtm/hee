import test from "node:test";
import assert from "node:assert/strict";
import {LAUNDRY_CATALOG,LAUNDRY_OPERATIONS,resolveLaundryPreset} from "../app/lib/laundry-catalog";
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
