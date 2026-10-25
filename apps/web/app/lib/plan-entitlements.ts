import { COMMERCIAL_PLANS, SUPPORTED_PAID_PLAN_CODES } from "./commercial-plans";
export type HeePlanCode = "FREE" | "BUSINESS" | "PRO" | "OPERATE" | "GROWTH" | "SCALE";

export type PlanEntitlements = {
  code: HeePlanCode;
  bookings:boolean;
  cashier:boolean;
  liveView:boolean;
  staffLimit:number|null;
  monthlyInvoices:number|null;
  monthlyBookings:number|null;
  monthlyTemplates:number|null;
  liveCameraLimit:number;
  liveTransferKB:number|null;
  label: string;
  productLimit: number | null;
  branchLimit: number | null;
  serviceLimit: number | null;
  contactLimit: number | null;
  departmentLimit: number | null;
  premiumThemes: boolean;
  customColors: boolean;
  verificationEligible: boolean;
  offerDesigner: boolean;
  analytics: "basic" | "advanced";
  whatsappMarketing: boolean;
};

function commercialEntitlements(code:"OPERATE"|"GROWTH"|"SCALE"):PlanEntitlements {
 const plan=COMMERCIAL_PLANS.find(p=>p.code===code)!;
 return {code,label:plan.name,productLimit:plan.productLimit,branchLimit:plan.branchLimit,serviceLimit:null,contactLimit:code==="OPERATE"?3:code==="GROWTH"?8:15,departmentLimit:code==="OPERATE"?3:code==="GROWTH"?8:15,premiumThemes:true,customColors:true,verificationEligible:true,offerDesigner:false,analytics:code==="OPERATE"?"basic":"advanced",whatsappMarketing:code!=="OPERATE",bookings:true,cashier:true,liveView:plan.cameras>0,staffLimit:plan.staffLimit,monthlyInvoices:plan.monthlyInvoices,monthlyBookings:plan.monthlyBookings,monthlyTemplates:plan.monthlyTemplates,liveCameraLimit:plan.cameras,liveTransferKB:plan.liveTransferKB};
}
export const HEE_PLAN_ENTITLEMENTS: Record<HeePlanCode, PlanEntitlements> = {
  OPERATE:commercialEntitlements("OPERATE"),
  GROWTH:commercialEntitlements("GROWTH"),
  SCALE:commercialEntitlements("SCALE"),
  FREE: {
    bookings:false,cashier:false,liveView:false,staffLimit:1,monthlyInvoices:0,monthlyBookings:0,monthlyTemplates:0,liveCameraLimit:0,liveTransferKB:0,
    code: "FREE",
    label: "الهوية",
    productLimit: 3,
    branchLimit: 1,
    serviceLimit: null,
    contactLimit: 2,
    departmentLimit: 2,
    premiumThemes: false,
    customColors: true,
    verificationEligible: false,
    offerDesigner: false,
    analytics: "basic",
    whatsappMarketing: false,
  },
  BUSINESS: {
    bookings:true,cashier:true,liveView:true,staffLimit:null,monthlyInvoices:null,monthlyBookings:null,monthlyTemplates:null,liveCameraLimit:100,liveTransferKB:null,
    code: "BUSINESS",
    label: "Business",
    productLimit: 10,
    branchLimit: 5,
    serviceLimit: null,
    contactLimit: 8,
    departmentLimit: 8,
    premiumThemes: true,
    customColors: true,
    verificationEligible: true,
    offerDesigner: true,
    analytics: "advanced",
    whatsappMarketing: true,
  },
  PRO: {
    bookings:true,cashier:true,liveView:true,staffLimit:null,monthlyInvoices:null,monthlyBookings:null,monthlyTemplates:null,liveCameraLimit:100,liveTransferKB:null,
    code: "PRO",
    label: "Pro",
    productLimit: 30,
    branchLimit: null,
    serviceLimit: null,
    contactLimit: null,
    departmentLimit: null,
    premiumThemes: true,
    customColors: true,
    verificationEligible: true,
    offerDesigner: true,
    analytics: "advanced",
    whatsappMarketing: true,
  },
};

const PLAN_RANK: Record<HeePlanCode, number> = {
  FREE: 0,
  BUSINESS: 1,
  PRO: 2,
  OPERATE:1,GROWTH:2,SCALE:3,
};

// A persisted catalog row alone does not define feature access. Do not issue a
// successful subscription for an unknown plan that would silently resolve to FREE.
export function isSupportedPaidPlan(code?: string | null) {
  return SUPPORTED_PAID_PLAN_CODES.some(value=>value===code);
}

export function normalizePlanCode(code?: string | null): HeePlanCode {
  const normalized = String(code ?? "FREE").trim().toUpperCase();
  if (isSupportedPaidPlan(normalized)) return normalized as HeePlanCode;
  return "FREE";
}

export function getPlanEntitlements(code?: string | null) {
  return HEE_PLAN_ENTITLEMENTS[normalizePlanCode(code)];
}

export function getPlanRank(code?: string | null) {
  return PLAN_RANK[normalizePlanCode(code)];
}

export function isPlanAtLeast(current?: string | null, required?: string | null) {
  return getPlanRank(current) >= getPlanRank(required);
}

export function limitReached(current: number, limit: number | null) {
  return limit !== null && current >= limit;
}

// Downgrades are non-destructive: existing customer data is retained even when the
// new plan is below its current usage. Writes that increase a limited collection
// remain blocked until usage is reduced below the new limit or the plan is upgraded.
// This is deliberately different from hiding/deleting historical data at billing time.
export function canIncreaseLimitedUsage(current: number, limit: number | null) {
  return !limitReached(current, limit);
}

export function usageOverLimit(current: number, limit: number | null) {
  return limit !== null && current > limit;
}

export function formatPlanLimit(limit: number | null) {
  return limit === null ? "غير محدود" : String(limit);
}
