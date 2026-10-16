import test from "node:test";
import assert from "node:assert/strict";
import { laundryStatements } from "../app/lib/laundry-statements";
test("statements separate period income from cumulative results and preserve contra balances",()=>{
 const account=(kind:string,opening:number,debit:number,credit:number)=>({code:"1000",name:"test",kind,opening,debit,credit,balance:opening+debit-credit});
 const s=laundryStatements([account("asset",10000,5000,2000),account("liability",-2000,0,0),account("equity",-6000,0,0),account("income",-3000,0,5000),account("expense",1000,2000,0)]);
 assert.equal(s.income,5000);assert.equal(s.expenses,2000);assert.equal(s.periodResult,3000);assert.equal(s.accumulatedResult,5000);assert.equal(s.assets,13000);assert.equal(s.difference,0);
 const contra=laundryStatements([account("asset",0,0,100),account("equity",0,100,0)]);assert.equal(contra.assets,-100);assert.equal(contra.equity,-100);assert.equal(contra.difference,0);
 assert.throws(()=>laundryStatements([account("other",0,0,0)]));
});
