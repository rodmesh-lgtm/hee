export type HeePlanCode = "FREE" | "BUSINESS" | "PRO";

export type PlanEntitlements = {
  code: HeePlanCode;
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
};

export const HEE_PLAN_ENTITLEMENTS: Record<HeePlanCode, PlanEntitlements> = {
  FREE: {
    code: "FREE",
    label: "مجانية",
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
  },
  BUSINESS: {
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
  },
  PRO: {
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
  },
};

const PLAN_RANK: Record<HeePlanCode, number> = {
  FREE: 0,
  BUSINESS: 1,
  PRO: 2,
};

export function normalizePlanCode(code?: string | null): HeePlanCode {
  const normalized = String(code ?? "FREE").trim().toUpperCase();
  if (normalized === "BUSINESS" || normalized === "PRO") return normalized;
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

export function formatPlanLimit(limit: number | null) {
  return limit === null ? "غير محدود" : String(limit);
}
