import { db } from "../../../lib/db";
import { sallaOrderTemplateSupported } from "../../../lib/whatsapp/salla-order-confirmation-domain";
import { SallaOrderConfirmationForm } from "./salla-order-confirmation-form";

export async function SallaOrderConfirmationSection({ businessId }: { businessId: string }) {
  const templates = await db.whatsAppTemplate.findMany({
    where: {
      businessId, provider: "meta", category: "utility", status: "approved",
      connection: { businessId, provider: "meta", status: "connected", disabledAt: null, marketingEnabled: true },
    },
    select: {
      id: true, name: true, language: true, connectionId: true, components: true, parameterFormat: true,
      connection: { select: { displayPhoneNumber: true, verifiedName: true } },
    },
  });
  const supported = templates.filter(template => sallaOrderTemplateSupported(template.components, template.parameterFormat));
  const senders = Array.from(new Map(supported.map(template => [template.connectionId, {
    id: template.connectionId,
    label: [template.connection.displayPhoneNumber, template.connection.verifiedName].filter(Boolean).join(" · ") || "رقم واتساب متصل",
  }])).values());
  return <SallaOrderConfirmationForm senders={senders} templates={supported.map(({ id, name, language, connectionId }) => ({ id, name, language, connectionId }))} />;
}
