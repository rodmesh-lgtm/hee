import test from "node:test";
import assert from "node:assert/strict";
import { laundryStockQuantity,laundryStockChange } from "../app/lib/laundry-stock-domain";
test("stock uses exact thousandths, while discrete pieces cannot be fractional",()=>{
 assert.equal(laundryStockQuantity("12.345","liter"),12345);
 assert.equal(laundryStockQuantity("0.001","kg"),1);
 assert.equal(laundryStockQuantity("3.000","piece"),3000);
 for(const q of ["-1","1e3","1.2345","NaN"])assert.throws(()=>laundryStockQuantity(q,"liter"));
 assert.throws(()=>laundryStockQuantity("1.5","piece"));
});
test("receipt, issue, transfer and stocktake conserve quantities and reject negative stock",()=>{
 const received=laundryStockChange(0,10000,"receipt");
 const issued=laundryStockChange(received.after,2500,"issue");
 const from=laundryStockChange(issued.after,3000,"issue");
 const to=laundryStockChange(2000,3000,"receipt");
 assert.equal(from.after+to.after,issued.after+2000);
 assert.deepEqual(laundryStockChange(from.after,4000,"count"),{delta:-500,after:4000});
 assert.deepEqual(laundryStockChange(0,0,"count"),{delta:0,after:0});
 assert.throws(()=>laundryStockChange(1000,1001,"issue"));
 assert.throws(()=>laundryStockChange(0,0.5,"receipt"));
});
import { laundryStockCost } from "../app/lib/laundry-stock-domain";
test("weighted inventory cost preserves every halala across partial and final issues",()=>{
 let quantity=3000,value=100;
 const first=laundryStockCost(quantity,value,1000);quantity-=1000;value-=first;
 const second=laundryStockCost(quantity,value,1000);quantity-=1000;value-=second;
 const last=laundryStockCost(quantity,value,1000);
 assert.equal(first+second+last,100);
 assert.equal(laundryStockCost(20000,40000,5000),10000);
 assert.equal(laundryStockCost(1000000000000,999999999999,333333333333),333333333333);
 for(const args of [[0,100,0],[100,100,101],[100,-1,1],[1.5,100,1],[100,1.2,1]])assert.throws(()=>laundryStockCost(...args as [number,number,number]));
});
