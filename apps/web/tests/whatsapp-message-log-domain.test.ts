import test from "node:test";
import assert from "node:assert/strict";
import { messageLogFilters } from "../app/lib/whatsapp/message-log-domain";
import { campaignCsv } from "../app/lib/whatsapp/campaign-report";
test("message log filters reject inherited keys, invalid ranges and unbounded input", () => {
  assert.deepEqual(messageLogFilters({status:"constructor",direction:"foreign",days:"999",page:"-1",q:" x "}),{status:"all",direction:"all",days:30,page:1,query:"x"});
  const value=messageLogFilters({status:["failed","read"],direction:"outbound",days:"90",page:"999999",q:"a".repeat(100)});
  assert.deepEqual(value,{status:"failed",direction:"outbound",days:90,page:10000,query:"a".repeat(80)});
  assert.equal(messageLogFilters({page:"Infinity"}).page,1);
  assert.equal(messageLogFilters({page:"1.5"}).page,1);
});
test("message export CSV neutralizes spreadsheet formulas and preserves quoted message bodies",()=>{
  const csv=campaignCsv([["=HYPERLINK(1)","+966500000001",'رسالة "عميل"\nسطر ثان']]);
  assert.ok(csv.includes('"\'=HYPERLINK(1)"'));
  assert.ok(csv.includes('"\'+966500000001"'));
  assert.ok(csv.includes('رسالة ""عميل""\nسطر ثان'));
});
