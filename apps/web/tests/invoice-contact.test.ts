import test from "node:test";
import assert from "node:assert/strict";
import { invoiceContactPhone,normalizeInvoicePhone } from "../app/lib/invoice-contact";
import { normalizePageModulesForPersistence,normalizePageModules } from "../app/lib/page-modules";
test("invoice contact is opt-in; no inherited personal or business phone",()=>{
 assert.equal(invoiceContactPhone(null,"LAUNDRY"),"");
 assert.equal(invoiceContactPhone([{id:"contact",enabled:true,sortOrder:0,config:{phone:"0500000000"}}],"LAUNDRY"),"");
 assert.equal(invoiceContactPhone([{id:"contact",enabled:true,sortOrder:0,config:{invoicePhone:"+966 50 000 0000"}}],"LAUNDRY"),"+966500000000");
 assert.equal(invoiceContactPhone([{id:"contact",config:{invoicePhone:"not a phone"}}],"LAUNDRY"),"");
});
test("optional contact normalizes Arabic digits, supports clearing and rejects invalid input",()=>{
 assert.equal(normalizeInvoicePhone("٠٥٠٠٠٠٠٠٠٠"),"0500000000");
 assert.equal(normalizeInvoicePhone(""),"");
 assert.equal(normalizeInvoicePhone("+966 (50) 000-0000"),"+966500000000");
 for(const s of ["abc","0500","+96650000000012345","0500/123456"])assert.throws(()=>normalizeInvoicePhone(s));
});
test("invoice contact survives public-page normalization without changing configured appearance/actions",()=>{
 const existing=normalizePageModules([{id:"contact",enabled:true,sortOrder:0,config:{title:"Call us",invoicePhone:"0500000000",bookingPlacement:"ribbon",bottomActions:[{id:"phone",enabled:true,sortOrder:0}]}}],"LAUNDRY");
 const stored=normalizePageModulesForPersistence(existing,"LAUNDRY");
 assert.deepEqual(stored.find(m=>m.id==="contact")?.config,existing.find(m=>m.id==="contact")?.config);
 assert.equal(invoiceContactPhone(stored,"LAUNDRY"),"0500000000");
});
