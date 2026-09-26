import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { retryCampaignFailureReceipt } from "../app/lib/whatsapp/campaign-receipt-retry";

test("failure receipt schedules once, preserves tenant scope and reopens completed processing", async () => {
  const now = new Date("2026-09-26T12:00:00Z");
  let status = "sent";
  let queued = 0;
  let reopened = 0;
  const tx = {
    $queryRaw: async () => [],
    whatsAppDeliveryJob: {
      findFirst: async ({ where }: { where: { businessId: string; providerMessageId: string } }) => {
        assert.equal(where.businessId, "tenant-a");
        if (where.providerMessageId !== "message-a") return null;
        return { status, attemptCount: 1, createdAt: new Date(now.getTime() - 60_000), recipientId: "recipient-a", campaign: { status: "completed" }, recipient: { status: "sent" } };
      },
      updateMany: async ({ where, data }: { where: { businessId: string; status: string }; data: { status: string; nextAttemptAt: Date } }) => {
        assert.equal(where.businessId, "tenant-a");
        assert.equal(where.status, "sent");
        assert.equal(data.nextAttemptAt.getTime(), now.getTime() + 30_000);
        status = data.status;
        return { count: 1 };
      },
    },
    whatsAppCampaignRecipient: { updateMany: async () => { queued++; return { count: 1 }; } },
    whatsAppCampaign: { updateMany: async () => { reopened++; return { count: 1 }; } },
  } as unknown as Prisma.TransactionClient;
  const input = { businessId: "tenant-a", campaignId: "campaign-a", jobId: "job-a", providerMessageId: "message-a", errorCode: "131016", now };
  assert.equal(await retryCampaignFailureReceipt(tx, input), true);
  assert.equal(status, "retry_scheduled");
  assert.equal(await retryCampaignFailureReceipt(tx, input), true);
  assert.equal(await retryCampaignFailureReceipt(tx, { ...input, providerMessageId: "stale-message" }), true);
  assert.equal(queued, 1);
  assert.equal(reopened, 1);
});
