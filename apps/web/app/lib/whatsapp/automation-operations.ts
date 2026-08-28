import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "./audit";
import { normalizeAutomationTriggerType, readTemplateActionConfig, templateHasVariables } from "./automation-domain";

type AutomationOperationsDb = Pick<PrismaClient, "$transaction">;
type AutomationOperation = "activate" | "pause" | "resume";

async function lockAutomation(tx: Prisma.TransactionClient, businessId: string, automationId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id" FROM "WhatsAppAutomation"
    WHERE "id" = ${automationId} AND "businessId" = ${businessId}
    FOR UPDATE
  `);
  if (!rows[0]) throw new Error("WHATSAPP_AUTOMATION_NOT_FOUND");
}

async function assertRunnableTemplate(tx: Prisma.TransactionClient, input: {
  businessId: string; connectionId?: string; actionConfig: unknown;
}) {
  const action = readTemplateActionConfig(input.actionConfig);
  if (action.parameters?.length) throw new Error("WHATSAPP_AUTOMATION_PARAMETERS_UNSUPPORTED");
  const template = await tx.whatsAppTemplate.findFirst({
    where: {
      id: action.templateId,
      businessId: input.businessId,
      provider: "meta",
      status: "approved",
      ...(input.connectionId ? { connectionId: input.connectionId } : {}),
      connection: { businessId: input.businessId, provider: "meta", status: "connected" },
    },
    select: { id: true, connectionId: true, components: true },
  });
  if (!template || templateHasVariables(template.components)) throw new Error("WHATSAPP_AUTOMATION_TEMPLATE_NOT_RUNNABLE");
  return template;
}

export async function createWhatsAppAutomation(input: {
  businessId: string; actorUserId: string; name: string; triggerType: string;
  templateId: string; cooldownMinutes: number; database?: AutomationOperationsDb;
}) {
  const database = input.database ?? db;
  const name = input.name.trim();
  if (!name || name.length > 120) throw new Error("WHATSAPP_AUTOMATION_NAME_INVALID");
  const triggerType = normalizeAutomationTriggerType(input.triggerType);
  if (!Number.isSafeInteger(input.cooldownMinutes) || input.cooldownMinutes < 0 || input.cooldownMinutes > 525_600) {
    throw new Error("WHATSAPP_AUTOMATION_COOLDOWN_INVALID");
  }
  if (!/^[0-9a-f-]{36}$/i.test(input.templateId)) throw new Error("WHATSAPP_AUTOMATION_TEMPLATE_INVALID");

  return database.$transaction(async (tx) => {
    const template = await assertRunnableTemplate(tx, {
      businessId: input.businessId,
      actionConfig: { templateId: input.templateId },
    });
    const automation = await tx.whatsAppAutomation.create({
      data: {
        id: randomUUID(),
        businessId: input.businessId,
        connectionId: template.connectionId,
        name,
        status: "draft",
        triggerType,
        triggerConfig: { version: 1 },
        actionType: "send_template",
        actionConfig: { templateId: template.id },
        cooldownMinutes: input.cooldownMinutes,
        createdByUserId: input.actorUserId,
      },
      select: { id: true, status: true },
    });
    await writeWhatsAppAuditLog({
      businessId: input.businessId,
      actorUserId: input.actorUserId,
      action: "automation.create",
      targetType: "automation",
      targetId: automation.id,
      outcome: "success",
      metadata: { triggerType, cooldownMinutes: input.cooldownMinutes },
      database: tx,
    });
    return automation;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function operateWhatsAppAutomation(input: {
  businessId: string; actorUserId: string; automationId: string;
  operation: AutomationOperation; database?: AutomationOperationsDb; now?: Date;
}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  if (!/^[0-9a-f-]{36}$/i.test(input.automationId)) throw new Error("WHATSAPP_AUTOMATION_ID_INVALID");
  if (!["activate", "pause", "resume"].includes(input.operation)) throw new Error("WHATSAPP_AUTOMATION_OPERATION_INVALID");

  return database.$transaction(async (tx) => {
    await lockAutomation(tx, input.businessId, input.automationId);
    const automation = await tx.whatsAppAutomation.findFirst({
      where: { id: input.automationId, businessId: input.businessId },
      select: { id: true, connectionId: true, status: true, actionType: true, actionConfig: true },
    });
    if (!automation) throw new Error("WHATSAPP_AUTOMATION_NOT_FOUND");
    if (automation.actionType !== "send_template") throw new Error("WHATSAPP_AUTOMATION_ACTION_INVALID");

    let nextStatus: "active" | "paused";
    let alreadyApplied = false;
    if (input.operation === "pause") {
      if (automation.status === "paused") alreadyApplied = true;
      else if (automation.status !== "active") throw new Error("WHATSAPP_AUTOMATION_NOT_ACTIVE");
      nextStatus = "paused";
    } else {
      if (automation.status === "active") alreadyApplied = true;
      else if (input.operation === "activate" && automation.status !== "draft") throw new Error("WHATSAPP_AUTOMATION_NOT_DRAFT");
      else if (input.operation === "resume" && automation.status !== "paused") throw new Error("WHATSAPP_AUTOMATION_NOT_PAUSED");
      await assertRunnableTemplate(tx, {
        businessId: input.businessId,
        connectionId: automation.connectionId,
        actionConfig: automation.actionConfig,
      });
      nextStatus = "active";
    }

    if (!alreadyApplied) {
      const result = await tx.whatsAppAutomation.updateMany({
        where: { id: automation.id, businessId: input.businessId, status: automation.status },
        data: nextStatus === "active"
          ? { status: "active", activatedAt: now, pausedAt: null }
          : { status: "paused", pausedAt: now },
      });
      if (result.count !== 1) throw new Error("WHATSAPP_AUTOMATION_CONFLICT");
      await writeWhatsAppAuditLog({
        businessId: input.businessId,
        actorUserId: input.actorUserId,
        action: `automation.${input.operation}`,
        targetType: "automation",
        targetId: automation.id,
        outcome: "success",
        metadata: { previousStatus: automation.status, nextStatus },
        database: tx,
      });
    }
    return { automationId: automation.id, status: nextStatus, alreadyApplied };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
