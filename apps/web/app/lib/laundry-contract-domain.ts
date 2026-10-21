import { z } from "zod";
import { LaundryInputError } from "./laundry-domain";
import { laundryReportRange } from "./laundry-report";
export const laundrySignatureSchema = z.array(z.array(z.tuple([z.number().finite().min(0).max(1000), z.number().finite().min(0).max(300)])).min(2).max(300)).min(1).max(30);
export type LaundrySignature = z.infer<typeof laundrySignatureSchema>;
export function validateLaundrySignature(value: unknown) {
  const parsed = laundrySignatureSchema.safeParse(value);
  if (!parsed.success) throw new LaundryInputError("اكتب توقيع العميل داخل المساحة المخصصة");
  const points = parsed.data.flat();
  if (points.length < 8 || Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0])) < 20 || Math.max(...points.map(p => p[1])) - Math.min(...points.map(p => p[1])) < 5)
    throw new LaundryInputError("التوقيع غير مكتمل؛ أعد كتابة التوقيع بوضوح");
  return parsed.data;
}
export function validateLaundryContractDates(start: string, end: string) {
  const from = laundryReportRange(start, start).start;
  const to = laundryReportRange(end, end).end;
  if (from >= to) throw new LaundryInputError("تاريخ نهاية العقد يجب ألا يسبق بدايته");
  return { from, to };
}
export type LaundryContractRow = {
  id: string; number: number; reference: string; customerName: string; customerPhone: string;
  businessName: string; title: string; terms: string; startsOn: string; endsOn: string; amount: number;
  status: "draft" | "signed" | "cancelled"; digest: string; createdAt: string; signedAt: string | null;
  signerName: string | null; signature: LaundrySignature | null; cancelledAt: string | null; cancelReason: string | null;
};
