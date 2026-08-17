"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getOwnedBusinessWithPlanForWrite } from "../lib/ownership";
import { normalizePlanCode } from "../lib/plan-entitlements";

const PLAN_RANK = { FREE: 0, BUSINESS: 1, PRO: 2 } as const;

const THEMES = {
  HEE_LIGHT: {
    requiredPlan: "FREE",
    primaryColor: "#6f3bd2",
    secondaryColor: "#1f2552",
    buttonColor: "#6f3bd2",
    buttonStyle: "rounded",
    cardStyle: "bordered|light|md",
  },
  EXECUTIVE: {
    requiredPlan: "BUSINESS",
    primaryColor: "#1f2552",
    secondaryColor: "#6f3bd2",
    buttonColor: "#1f2552",
    buttonStyle: "rounded",
    cardStyle: "shadow|light|md",
  },
  SIGNATURE: {
    requiredPlan: "PRO",
    primaryColor: "#7c3aed",
    secondaryColor: "#251438",
    buttonColor: "#7c3aed",
    buttonStyle: "soft",
    cardStyle: "shadow|light|lg",
  },
} as const;

type ThemeKey = keyof typeof THEMES;

export async function applyBrandThemeAction(formData: FormData) {
  const business = await getOwnedBusinessWithPlanForWrite();
  if (!business) redirect("/login");

  const requested = String(formData.get("theme") ?? "HEE_LIGHT").trim().toUpperCase() as ThemeKey;
  const theme = THEMES[requested];
  if (!theme) redirect("/dashboard/branding?theme=invalid");

  const currentPlan = normalizePlanCode(business.plan?.code);
  if (PLAN_RANK[currentPlan] < PLAN_RANK[theme.requiredPlan]) {
    redirect("/dashboard/branding?theme=upgrade");
  }

  await db.business.update({
    where: { id: business.id },
    data: {
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      buttonColor: theme.buttonColor,
      buttonStyle: theme.buttonStyle,
      cardStyle: theme.cardStyle,
    },
  });

  revalidatePath("/dashboard/branding");
  revalidatePath("/dashboard/my-page");
  revalidatePath(`/${business.slug}`);
  redirect(`/dashboard/branding?theme=${requested.toLowerCase()}`);
}
