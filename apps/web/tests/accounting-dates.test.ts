import test from "node:test";
import assert from "node:assert/strict";
import { calendarSubscriptionPeriod,deliveryShortcut,riyadhDate } from "../app/lib/accounting-dates";
const now=new Date("2026-01-01T00:00:00Z");
test("calendar month durations clamp end of month without spilling into March",()=>{
 const period=calendarSubscriptionPeriod("2026-01-31",1,now);
 assert.equal(period.startsAt.toISOString(),"2026-01-30T21:00:00.000Z");
 assert.equal(period.expiresAt.toISOString(),"2026-02-27T21:00:00.000Z");
 assert.equal(riyadhDate(calendarSubscriptionPeriod("2028-01-31",1,new Date("2028-01-01")).expiresAt),"2028-02-29");
});
test("all month choices through a year preserve calendar anniversaries",()=>{
 for(let months=1;months<=12;months++){
  const p=calendarSubscriptionPeriod("2026-10-24",months,new Date("2026-10-24T00:00:00Z"));
  const expected=new Date(Date.UTC(2026,9+months,24));
  assert.equal(riyadhDate(p.expiresAt),expected.toISOString().slice(0,10));
 }
});
test("rejects invalid, backdated, and out of range subscription dates",()=>{
 for(const start of ["2026-02-30","2025-12-31","2028-01-01","invalid"])
  assert.throws(()=>calendarSubscriptionPeriod(start,1,now));
 for(const months of [0,13,1.5,NaN]) assert.throws(()=>calendarSubscriptionPeriod("2026-01-01",months,now));
 assert.equal(riyadhDate(new Date("2026-01-01T22:30:00Z")),"2026-01-02");
});
test("delivery presets round up to quarter hour in Riyadh across midnight",()=>{
 assert.equal(deliveryShortcut(2,new Date("2026-10-24T20:07:22Z")),"2026-10-25T01:15");
 assert.equal(deliveryShortcut(24,new Date("2026-10-24T09:00:00Z")),"2026-10-25T12:00");
});
