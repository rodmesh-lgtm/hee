import test from 'node:test';
import assert from 'node:assert/strict';
import {discountedCashierLines,cashierDiscountSummary} from '../app/lib/cashier-discount';
import {quoteInvoiceReturn} from '../app/lib/cashier-return';
import {quoteSubscriberOrder,type SubscriberBalance} from '../app/lib/accounting-packages';
const lines=[{serviceId:'a',name:'Service A',quantity:3,unitPrice:1000,total:3000},{serviceId:'b',name:'Service B',quantity:2,unitPrice:1500,total:3000}];
test('fixed and percent discounts allocate exact halalas and refunds never exceed the net amount',()=>{
 for(const discount of [{kind:'fixed' as const,value:'10.01'},{kind:'percent' as const,value:'12.34'}]){
  const discounted=discountedCashierLines(lines,discount),summary=cashierDiscountSummary(discounted);
  assert.equal(summary.subtotal,6000);assert.equal(summary.amount,discount.kind==='fixed'?1001:740);
  const previous:ReturnType<typeof quoteInvoiceReturn>['lines']=[];let returned=0;
  for(let i=0;i<discounted.length;i++)for(let q=0;q<discounted[i].quantity;q++){
   const r=quoteInvoiceReturn(discounted,previous,[{index:i,quantity:1}]);previous.push(...r.lines);returned+=r.amount;
  }
  assert.equal(returned,6000-summary.amount);assert.throws(()=>quoteInvoiceReturn(discounted,previous,[{index:0,quantity:1}]));
 }
 assert.equal(lines[0].total,3000);assert.throws(()=>discountedCashierLines(lines,{kind:'percent',value:'100'}));
 assert.throws(()=>discountedCashierLines(lines,{kind:'fixed',value:'60.01'}));
 assert.throws(()=>discountedCashierLines(lines,{kind:'fixed',value:'-1'}));
});
test('discounts precede financial credit, preserve counted package value, and reject overpayment',()=>{
 const now=new Date('2026-11-08T12:00:00Z');
 const base:SubscriberBalance={id:'pieces',name:'Pieces',kind:'pieces',remaining:2000,unitsIncluded:2,unitsRemaining:2,serviceIds:['a'],startsAt:'2026-11-01',expiresAt:'2026-12-01'};
 const credit:SubscriberBalance={...base,id:'credit',kind:'credit',remaining:5000,unitsRemaining:null,unitsIncluded:null,serviceIds:[]};
 const quote=quoteSubscriberOrder([base,credit],lines,0,now,{kind:'fixed',value:'10'});
 assert.equal(quote.total,5000);assert.equal(quote.covered,5000);assert.equal(quote.outstanding,0);
 assert.equal(quote.allocations.find(a=>a.id==='pieces')?.amount,2000);assert.equal(quote.allocations.find(a=>a.id==='pieces')?.units,2);
 assert.equal(quote.allocations.find(a=>a.id==='credit')?.amount,3000);
 assert.equal(cashierDiscountSummary(quote.lines).amount,1000);
 assert.throws(()=>quoteSubscriberOrder([base],lines,4001,now,{kind:'fixed',value:'10'}));
});
