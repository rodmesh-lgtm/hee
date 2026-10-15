"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserForWrites } from "../lib/auth";
import { db } from "../lib/db";
import { dashboardNavItems } from "../../components/dashboard/dashboard-nav";
import { validDashboardOrder } from "../../lib/dashboard-navigation-order";

export async function saveDashboardNavigation(order: unknown): Promise<{ error?: string; success?: boolean }> {
  const user = await getCurrentUserForWrites();
  if (!validDashboardOrder(order, dashboardNavItems.map(item => item.href))) return { error: "ترتيب غير صالح. أعد فتح ترتيب القائمة." };
  try {
    // The caller can only update their own preference. Navigation permissions remain independent.
    await db.user.update({ where: { id: user.id, deletedAt: null }, data: { dashboardNavOrder: order } });
    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch { return { error: "تعذر حفظ الترتيب. حاول مرة أخرى." }; }
}
