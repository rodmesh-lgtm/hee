import { COMMERCIAL_PLANS,STANDALONE_SERVICES,SELLABLE_PLANS, SUPPORTED_PAID_PLAN_CODES } from "./commercial-plans";
export type HeePlanCode = "FREE" | typeof SUPPORTED_PAID_PLAN_CODES[number];

export type PlanEntitlements = {
  code: HeePlanCode;
  bookings:boolean;
  cashier:boolean;
  liveView:boolean;
  staffLimit:number|null;
  monthlyInvoices:number|null;
  monthlyBookings:number|null;
  monthlyTemplates:number|null;
  monthlyMarketingTemplates?:number;
  monthlyOperationalTemplates?:number;
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

function commercialEntitlements(code:Exclude<HeePlanCode,"FREE"|"BUSINESS"|"PRO">):PlanEntitlements {
 const baseCode=["OPERATE","GROWTH","SCALE"].includes(code)?`${code}_35`:code;
 const bundle=COMMERCIAL_PLANS.find(p=>p.code===baseCode),single=STANDALONE_SERVICES.find(p=>p.code===baseCode),plan=bundle??single!;
 const historic=["OPERATE","GROWTH","SCALE"].includes(code);
 const buckets=historic?{}:{monthlyMarketingTemplates:plan.monthlyMarketingTemplates,monthlyOperationalTemplates:plan.monthlyOperationalTemplates};
 const historicTemplates=code==="OPERATE"?1000:code==="GROWTH"?5000:15000;
 const bookings=single?single.bookings:true,cashier=single?single.cashier:true,marketing=single?single.whatsappMarketing:baseCode!=="OPERATE_35";
 return {code,label:plan.name,productLimit:plan.productLimit,branchLimit:plan.branchLimit,serviceLimit:null,contactLimit:baseCode==="GROWTH_35"?8:baseCode==="SCALE_35"?15:3,departmentLimit:baseCode==="GROWTH_35"?8:baseCode==="SCALE_35"?15:3,premiumThemes:true,customColors:true,verificationEligible:true,offerDesigner:false,analytics:marketing?"advanced":"basic",whatsappMarketing:marketing,bookings,cashier,liveView:plan.cameras>0,staffLimit:plan.staffLimit,monthlyInvoices:plan.monthlyInvoices,monthlyBookings:plan.monthlyBookings,monthlyTemplates:historic?historicTemplates:plan.monthlyTemplates,...buckets,liveCameraLimit:plan.cameras,liveTransferKB:plan.liveTransferKB};
}
export const HEE_PLAN_ENTITLEMENTS: Record<HeePlanCode, PlanEntitlements> = {
  OPERATE_35:commercialEntitlements("OPERATE_35"),GROWTH_35:commercialEntitlements("GROWTH_35"),SCALE_35:commercialEntitlements("SCALE_35"),
  BOOKING_ONLY_35:commercialEntitlements("BOOKING_ONLY_35"),ACCOUNTING_ONLY_35:commercialEntitlements("ACCOUNTING_ONLY_35"),WHATSAPP_ONLY_35:commercialEntitlements("WHATSAPP_ONLY_35"),LIVE_ONLY_35:commercialEntitlements("LIVE_ONLY_35"),
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
  OPERATE_35:1,GROWTH_35:2,SCALE_35:3,BOOKING_ONLY_35:1,ACCOUNTING_ONLY_35:1,WHATSAPP_ONLY_35:1,LIVE_ONLY_35:1,
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

/** Upgrades preserve the currently purchased service set and never charge a cheaper replacement period twice. */
export function isCommercialUpgrade(current:string|undefined,target:string,currentMonthlyPrice:number){
 const to=SELLABLE_PLANS.find(plan=>plan.code===target);if(!to||to.monthlyPrice<=currentMonthlyPrice)return false;
 const from=getPlanEntitlements(current),next=getPlanEntitlements(target);
 const maintainsLimits=(["staffLimit","monthlyInvoices","monthlyBookings","monthlyTemplates","liveTransferKB"] as const).every(key=>next[key]===null||(from[key]!==null&&next[key]!>=from[key]!));
 return maintainsLimits&&from.code!==next.code&&(!from.bookings||next.bookings)&&(!from.cashier||next.cashier)&&(!from.whatsappMarketing||next.whatsappMarketing)&&(!from.liveView||next.liveView);
}
