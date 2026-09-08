import test from "node:test";
import assert from "node:assert/strict";
import { prioritizeWork, rankWorkItem, workBucket } from "../app/lib/business-execution/work-priority";

const now = new Date("2026-09-08T02:00:00.000Z");

function item(id:string, overrides:Record<string,unknown>={}) {
  return {
    id,
    kind:"note" as const,
    workHealth:"on_track",
    priority:"normal",
    progressPercent:0,
    responsiblePerson:null,
    businessDueAt:null,
    scheduledAt:null,
    nextAction:null,
    updatedAt:new Date("2026-09-08T01:00:00.000Z"),
    status:null,
    timezone:"Asia/Riyadh",
    ...overrides,
  };
}

test("execution priority follows the operational attention contract", () => {
  const ranked=prioritizeWork([
    item("next",{nextAction:"اتصل بالعميل"}),
    item("assigned",{responsiblePerson:"رائد",businessDueAt:new Date("2026-09-09T02:00:00.000Z")}),
    item("risk",{workHealth:"at_risk"}),
    item("blocked",{workHealth:"blocked"}),
    item("overdue",{kind:"reminder",scheduledAt:new Date("2026-09-08T01:00:00.000Z")}),
  ],now);
  assert.deepEqual(ranked.map(x=>x.id),["overdue","blocked","risk","assigned","next"]);
});

test("overdue business due work outranks ordinary urgent work", () => {
  const ranked=prioritizeWork([
    item("urgent",{priority:"urgent"}),
    item("due",{businessDueAt:new Date("2026-09-07T02:00:00.000Z")}),
  ],now);
  assert.deepEqual(ranked.map(x=>x.id),["due","urgent"]);
  assert.equal(ranked[0]?.reason,"business_due");
});

test("completed work is not escalated by stale dates or health", () => {
  const ranked=rankWorkItem(item("done",{
    kind:"reminder",
    progressPercent:100,
    scheduledAt:new Date("2026-09-01T02:00:00.000Z"),
    businessDueAt:new Date("2026-09-01T02:00:00.000Z"),
    workHealth:"blocked",
  }),now);
  assert.equal(ranked.rank,100);
  assert.equal(ranked.reason,"recent_note");
});

test("ties are deterministic and prefer the earliest operational date", () => {
  const ranked=prioritizeWork([
    item("later",{nextAction:"ب",businessDueAt:new Date("2026-09-10T02:00:00.000Z")}),
    item("earlier",{nextAction:"أ",businessDueAt:new Date("2026-09-09T02:00:00.000Z")}),
  ],now);
  assert.deepEqual(ranked.map(x=>x.id),["earlier","later"]);
});

test("daily execution buckets separate today next and waiting using real state", () => {
  assert.equal(workBucket(item("blocked",{workHealth:"blocked"}),now),"today");
  assert.equal(workBucket(item("paused",{kind:"reminder",status:"paused",scheduledAt:new Date("2026-09-07T02:00:00.000Z")}),now),"waiting");
  assert.equal(workBucket(item("later",{businessDueAt:new Date("2026-09-09T02:00:00.000Z")}),now),"next");
});

test("today bucket respects the work timezone calendar day", () => {
  const lateRiyadh=new Date("2026-09-08T20:30:00.000Z");
  assert.equal(workBucket(item("same-day",{kind:"reminder",scheduledAt:new Date("2026-09-08T20:45:00.000Z"),timezone:"Asia/Riyadh"}),lateRiyadh),"today");
  assert.equal(workBucket(item("next-day",{kind:"reminder",scheduledAt:new Date("2026-09-08T21:30:00.000Z"),timezone:"Asia/Riyadh"}),lateRiyadh),"next");
});
