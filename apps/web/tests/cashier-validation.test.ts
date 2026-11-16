import test from 'node:test';
import assert from 'node:assert/strict';
import {cashierValidationMessage} from '../app/lib/cashier-validation';
test('cashier validation names the rejected input without exposing raw values',()=>{
 assert.match(cashierValidationMessage([{path:['customerName'],code:'too_big'}]),/اختياري/);
 assert.match(cashierValidationMessage([{path:['phone'],code:'too_small'}]),/جوال/);
 assert.match(cashierValidationMessage([{path:['commission','phone'],code:'too_small'}]),/موظف العمولة/);
 assert.match(cashierValidationMessage([{path:['dueAt'],code:'invalid_format'}]),/موعد الاستلام/);
 assert.match(cashierValidationMessage([{path:['cashPaid'],code:'invalid_type'}]),/الجزء النقدي/);
 assert.match(cashierValidationMessage([{path:['items',0,'quantity'],code:'too_small'}]),/كمياتها/);
});
