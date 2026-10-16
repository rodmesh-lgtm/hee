import test from "node:test";
import assert from "node:assert/strict";
import { balancedLaundryLines,laundrySourceLines,LAUNDRY_ACCOUNTS } from "../app/lib/laundry-ledger-domain";
test("laundry accounting recognizes delivery separately from invoicing and collection",()=>{
 const balances=new Map<string,number>();
 for(const [kind,amount,method] of [["order",750,""],["payment",525,"cash"],["payment",225,"card"],["delivery",750,""]] as const){
 const lines=laundrySourceLines(kind,amount,method);assert.equal(balancedLaundryLines(lines).debit,amount);for(const l of lines)balances.set(l.accountCode,(balances.get(l.accountCode)??0)+l.debit-l.credit);
 }
 assert.equal(balances.get("1200"),0);assert.equal(balances.get("2200"),0);assert.equal(balances.get("4000"),-750);assert.equal(balances.get("1100"),525);assert.equal(balances.get("1110"),225);assert.equal([...balances.values()].reduce((a,b)=>a+b,0),0);
});
test("unidentified historical expenses use explicit suspense instead of inventing cash payments",()=>{
 assert.deepEqual(laundrySourceLines("expense",100),[{accountCode:"5000",debit:100,credit:0},{accountCode:"2900",debit:0,credit:100}]);
 assert.equal(laundrySourceLines("expense",100,"cash")[1].accountCode,"1100");
});
test("journal rejects unbalanced, empty, fractional, negative and double-sided lines",()=>{
 const good=[{accountCode:"1100",debit:100,credit:0},{accountCode:"3000",debit:0,credit:100}];assert.deepEqual(balancedLaundryLines(good),{debit:100,credit:100});
 for(const bad of [[],[good[0]],[good[0],{...good[1],credit:99}],[{...good[0],debit:1.1},good[1]],[{...good[0],debit:-1},good[1]],[{...good[0],credit:100},good[1]],[{...good[0],debit:0},good[1]]])assert.throws(()=>balancedLaundryLines(bad));
 assert.throws(()=>laundrySourceLines("payment",100,"unknown"));assert.throws(()=>laundrySourceLines("order",0));
 assert.equal(new Set(LAUNDRY_ACCOUNTS.map(a=>a.code)).size,LAUNDRY_ACCOUNTS.length);
});
