import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root=process.cwd();

describe("Smart Reminder completion source invariants",()=>{
  it("closes both reminder lifecycle and work-progress state atomically",async()=>{
    const source=await readFile(path.join(root,"app/lib/reminders/operations.ts"),"utf8");
    const start=source.indexOf("export async function completeSmartReminder");
    expect(start).toBeGreaterThanOrEqual(0);
    const block=source.slice(start);
    expect(block).toContain('WHERE "id"=${input.reminderId} AND "businessId"=${input.businessId}');
    expect(block).toContain('"status"=\'completed\'');
    expect(block).toContain('"progressPercent"=100');
    expect(block).toContain('"progressUpdatedAt"=CURRENT_TIMESTAMP');
    expect(block).toContain('"workCompletedAt"=COALESCE("workCompletedAt",CURRENT_TIMESTAMP)');
    expect(block).toContain("assertNoInFlightDelivery");
    expect(block).toContain("cancelQueuedDeliveries");
    expect(block).toContain('action: "reminder.complete"');
  });
});
