export type HeePlanCode = "FREE" | "BUSINESS" | "PRO";

export type PlanEntitlements = {
  code: HeePlanCode;
  label: string;
  branchLimit: number | null;
  serviceLimit: number | null;
  contactLimit: number | null;
  departmentLimit: number | null;
  premiumThemes: boolean;
  customColors: boolean;
  verificationEligible: boolean;
  analytics: "basic" | "advanced";
};

export const HEE_PLAN_ENTITLEMENTS: Record<HeePlanCode, PlanEntitlements> = {
  FREE: {
    code: "FREE",
    label: "مجانية",
    branchLimit: 1,
    serviceLimit: 3,
    contactLimit: 2,
    departmentLimit: 2,
    premiumThemes: false,
    customColors: false,
    verificationEligible: false,
    analytics: "basic",
  },
  BUSINESS: {
    code: "BUSINESS",
    label: "Business",
    branchLimit: 5,
    serviceLimit: 12,
    contactLimit: 8,
    departmentLimit: 8,
    premiumThemes: true,
    customColors: true,
    verificationEligible: true,
    analytics: "advanced",
  },
  PRO: {
    code: "PRO",
    label: "Pro",
    branchLimit: null,
    serviceLimit: null,
    contactLimit: null,
    departmentLimit: null,
    premiumThemes: true,
    customColors: true,
    verificationEligible: true,
    analytics: "advanced",
  },
};

export function normalizePlanCode(code?: string | null): HeePlanCode {
  const normalized = String(code ?? "FREE").trim().toUpperCase();
  if (normalized === "BUSINESS" || normalized === "PRO") return normalized;
  return "FREE";
}

export function getPlanEntitlements(code?: string | null) {
  return HEE_PLAN_ENTITLEMENTS[normalizePlanCode(code)];
}

export function limitReached(current: number, limit: number | null) {
  return limit !== null && current >= limit;
}

export function formatPlanLimit(limit: number | null) {
  return limit === null ? "غير محدود" : String(limit);
}
