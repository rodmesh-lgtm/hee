import test from "node:test";
import assert from "node:assert/strict";
import { laundryCsv,laundryReportRange } from "../app/lib/laundry-report";
test("report dates include the entire Riyadh day with an exclusive end",()=>{
 const r=laundryReportRange("2026-10-16","2026-10-16");
 assert.equal(r.start.toISOString(),"2026-10-15T21:00:00.000Z");
 assert.equal(r.end.toISOString(),"2026-10-16T21:00:00.000Z");
});
test("report rejects invalid, reversed and unbounded ranges",()=>{
 for(const [a,b] of [["2026-02-30","2026-03-01"],["2026-10-16","2026-10-15"],["2024-01-01","2026-01-01"],["bad","bad"]])assert.throws(()=>laundryReportRange(a,b));
});
test("CSV quotes descriptions and neutralizes spreadsheet formulas",()=>{
 const csv=laundryCsv([["=1+1"," @SUM(A1)",'text,"quoted"',"سطر\nجديد",100]]);
 assert.ok(csv.startsWith('\uFEFF"\'=1+1"'));assert.ok(csv.includes('"\' @SUM(A1)"'));assert.ok(csv.includes('"text,""quoted"""'));assert.ok(csv.endsWith('"100"'));
});
