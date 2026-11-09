import test from 'node:test';
import assert from 'node:assert/strict';
import {laundryLines,laundryPricedLines,quantityTicks,cashierLineTotal,laundryPriceToken,type LaundryService} from '../app/lib/laundry-domain';
import {discountedCashierLines} from '../app/lib/cashier-discount';
import {quoteInvoiceReturn,commissionReturnDelta} from '../app/lib/cashier-return';
import {quoteSubscriberOrder,type SubscriberBalance} from '../app/lib/accounting-packages';
const service:LaundryService={id:'meter',name:'Carpet',category:'Cleaning',price:400,urgentPrice:600,active:true,unit:'meter'};
test('measured catalog uses authoritative units, exact centi-units and halalas, including urgent prices',()=>{
 assert.equal(laundryLines([{serviceId:'meter',quantity:5}],[service])[0].total,2000);
 assert.equal(laundryLines([{serviceId:'meter',quantity:2.5}],[service])[0].total,1000);
 assert.equal(laundryPricedLines([{serviceId:'meter',quantity:2.5}],[service],'urgent')[0].total,1500);
 assert.equal(laundryLines([{serviceId:'meter',quantity:2.5}],[{...service,unit:'square_meter'}])[0].unit,'square_meter');
 assert.equal(quantityTicks(0.29,'meter'),29);assert.equal(cashierLineTotal(199,0.33,'meter'),66);
 for(const quantity of [0,-1,1.001,Infinity,NaN,10000.01])assert.throws(()=>laundryLines([{serviceId:'meter',quantity}],[service]));
 assert.throws(()=>laundryLines([{serviceId:'meter',quantity:2.5}],[{...service,unit:'piece'}]));
 assert.notEqual(laundryPriceToken(laundryLines([{serviceId:'meter',quantity:5}],[service])),laundryPriceToken(laundryLines([{serviceId:'meter',quantity:5}],[{...service,unit:'square_meter'}])));
});
test('split measured returns conserve the discounted invoice and commission to the halala',()=>{
 const original=discountedCashierLines(laundryLines([{serviceId:'meter',quantity:5.25}],[service]),{kind:'fixed',value:'1.01'});
 const previous:ReturnType<typeof quoteInvoiceReturn>['lines']=[];let total=0,reversed=0;
 for(const quantity of [.1,.2,4.95]){const r=quoteInvoiceReturn(original,previous,[{index:0,quantity}]);previous.push(...r.lines);reversed+=commissionReturnDelta(199,1999,total,total+r.amount);total+=r.amount;assert.equal(r.lines[0].unit,'meter');}
 assert.equal(total,1999);assert.equal(reversed,199);
 assert.throws(()=>quoteInvoiceReturn(original,previous,[{index:0,quantity:.01}]));
 assert.throws(()=>quoteInvoiceReturn(original,[],[{index:0,quantity:.001}]));
});
test('measured quantities use financial credit without consuming piece or visit units',()=>{
 const base:SubscriberBalance={id:'pieces',name:'Pieces',kind:'pieces',remaining:2000,unitsIncluded:10,unitsRemaining:10,serviceIds:['meter'],startsAt:'2026-11-01',expiresAt:'2027-01-01'};
 const credit:SubscriberBalance={...base,id:'credit',kind:'credit',remaining:5000,unitsIncluded:null,unitsRemaining:null,serviceIds:[]};
 const q=quoteSubscriberOrder([base,credit],laundryLines([{serviceId:'meter',quantity:2.5}],[service]),0,new Date('2026-11-09'));
 assert.equal(q.total,1000);assert.equal(q.covered,1000);assert.equal(q.allocations.length,1);assert.equal(q.allocations[0].id,'credit');assert.equal(q.allocations[0].units,0);
});
