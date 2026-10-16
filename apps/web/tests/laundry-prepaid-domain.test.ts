import test from "node:test";
import assert from "node:assert/strict";
import { prepaidCashLines,prepaidRemaining } from "../app/lib/laundry-prepaid-domain";
import { balancedLaundryLines,laundrySourceLines } from "../app/lib/laundry-ledger-domain";
test("prepaid protects balance, order balance and expiry without confiscating refunds",()=>{
 const now=new Date("2026-10-16T12:00:00Z"),expiry=new Date("2026-10-17T00:00:00Z");
 assert.equal(prepaidRemaining(10000,2500,expiry,now,"redeem",2500),7500);
 assert.throws(()=>prepaidRemaining(10000,2501,expiry,now,"redeem",2500));
 assert.throws(()=>prepaidRemaining(10000,10001,expiry,now,"refund"));
 assert.throws(()=>prepaidRemaining(10000,1,now,now,"redeem",2500));
 assert.equal(prepaidRemaining(7500,7500,now,now,"refund"),0);
 assert.throws(()=>prepaidRemaining(10000,0,expiry,now,"refund"));
});
test("purchase, redemption, refund reconcile cash and liability without duplicate revenue",()=>{
 const lines=[...prepaidCashLines("purchase",10000,"cash"),...laundrySourceLines("order",2500),...laundrySourceLines("payment",2500,"prepaid"),...prepaidCashLines("refund",7500,"cash"),...laundrySourceLines("delivery",2500)];
 balancedLaundryLines(lines);const balances:Record<string,number>={};for(const l of lines)balances[l.accountCode]=(balances[l.accountCode]??0)+l.debit-l.credit;
 assert.deepEqual(balances,{"1100":2500,"2100":0,"1200":0,"2200":0,"4000":-2500});
 assert.throws(()=>prepaidCashLines("refund",100,"card"));
});
