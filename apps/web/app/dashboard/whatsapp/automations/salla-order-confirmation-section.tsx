import { db } from "../../../lib/db";
import { sallaOrderTemplateSupported } from "../../../lib/whatsapp/salla-order-confirmation-domain";
import { readSallaOrderStatusConfig } from "../../../lib/whatsapp/salla-order-journey-domain";
import { SallaOrderConfirmationForm } from "./salla-order-confirmation-form";

export async function SallaOrderConfirmationSection({ businessId }: { businessId: string }) {
  const [templates, connections, business, integration, automations] = await Promise.all([
    db.whatsAppTemplate.findMany({
      where: { businessId, provider: "meta", category: "utility", status: "approved",
        connection: { businessId, provider: "meta", status: "connected", disabledAt: null, marketingEnabled: true } },
      select: { id: true, name: true, language: true, connectionId: true, components: true, parameterFormat: true },
      orderBy: [{ name: "asc" }, { language: "asc" }],
    }),
    db.whatsAppConnection.findMany({
      where: { businessId, provider: "meta", status: "connected", disabledAt: null, marketingEnabled: true },
      select: { id: true, displayPhoneNumber: true, verifiedName: true }, orderBy: { createdAt: "asc" },
    }),
    db.business.findUnique({ where: { id: businessId }, select: { name: true } }),
    db.whatsAppCommerceIntegration.findFirst({ where: { businessId, provider: "salla", status: "active" }, select: { id: true } }),
    db.whatsAppAutomation.findMany({ where: { businessId, status: "active", triggerType: { in: ["salla_order_confirmation", "salla_order_status"] } }, select: { triggerType: true, triggerConfig: true } }),
  ]);
  const supported = templates.filter(template => sallaOrderTemplateSupported(template.components, template.parameterFormat));
  const activeScenarios = automations.flatMap(automation => {
    if (automation.triggerType === "salla_order_confirmation") return ["paid"];
    try { return [readSallaOrderStatusConfig(automation.triggerConfig).orderStatus]; } catch { return []; }
  });
  const workerReady = (process.env.WHATSAPP_MARKETING_WORKER_ENABLED === "true" || process.env.INFRO_BOOKING_WORKER_ENABLED === "true") && process.env.WHATSAPP_OUTBOUND_ENABLED === "true";
  return <SallaOrderConfirmationForm businessName={business?.name || "منشأتك"} storeConnected={Boolean(integration)} workerReady={workerReady} activeScenarios={activeScenarios}
    senders={connections.map(connection => ({ id: connection.id, label: [connection.displayPhoneNumber, connection.verifiedName].filter(Boolean).join(" · ") || "رقم واتساب متصل" }))}
    templates={supported.map(({ id, name, language, connectionId, components }) => {
      const body = (components as Array<{ type?: string; text?: string }>).find(component => component.type?.toUpperCase() === "BODY")?.text || "";
      return { id, name, language, connectionId, body };
    })}/>;
}
