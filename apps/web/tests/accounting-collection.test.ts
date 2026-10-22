import test from "node:test";
import assert from "node:assert/strict";
import { collectionAllocations } from "../app/lib/accounting-collection";
test("mixed receipts allocate exact halalas to separate cash and card entries",()=>{
  assert.deepEqual(collectionAllocations("100.01","mixed","30"),[{method:"cash",amount:3000},{method:"card",amount:7001}]);
  assert.deepEqual(collectionAllocations("0","cash"),[]);
  assert.deepEqual(collectionAllocations("10","transfer"),[{method:"transfer",amount:1000}]);
});
test("mixed collection rejects empty legs, excess cash and invalid precision",()=>{
  for(const cash of ["0","100","101","-1","3.001","NaN"]) assert.throws(()=>collectionAllocations("100","mixed",cash));
  assert.throws(()=>collectionAllocations("0","mixed","1"));
});
