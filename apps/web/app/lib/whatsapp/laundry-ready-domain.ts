import { sallaOrderTemplateSupported,sallaOrderTemplateParameters } from "./salla-order-confirmation-domain";
export const LAUNDRY_READY_TEMPLATE_NAME="infro_laundry_ready";
export const LAUNDRY_READY_TEMPLATE_EXAMPLE="مرحبًا {{1}}، طلبك رقم {{3}} لدى {{2}} جاهز للاستلام. نسعد بزيارتك.";
export const laundryReadyTemplateSupported=sallaOrderTemplateSupported;
export const laundryReadyParameters=sallaOrderTemplateParameters;
export function laundryReadyEvent(event:{triggerType:string;source:string;subjectType:string}){return event.triggerType==="laundry_ready"&&event.source==="laundry.ready"&&event.subjectType==="laundry.ticket.ready";}
