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
