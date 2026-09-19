"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getOwnedBusinessForWrite } from "../lib/ownership";
import { isValidWorkingTime, validateWorkingHoursWindow } from "../lib/working-hours-validation";
import { createWhatsAppAutomation, operateWhatsAppAutomation } from "../lib/whatsapp/automation-operations";
import { hasActiveBusinessSubscription } from "../lib/subscription-entitlement";
import { syncMetaWhatsAppTemplates } from "../lib/whatsapp/template-sync";
import { disconnectWhatsAppCommerceIntegration, registerWhatsAppCommerceIntegration } from "../lib/whatsapp/commerce-integrations";
import { createShopifyAuthorization } from "../lib/whatsapp/shopify-commerce";
import { createSallaAuthorization, prepareSallaIntegration } from "../lib/commerce/salla-oauth";
import { syncSallaBookingOrders } from "../lib/commerce/salla-order-sync";
import { connectWooCommerceBookingStore, syncWooCommerceBookingOrders } from "../lib/commerce/woocommerce-commerce";
import { syncShopifyBookingOrders } from "../lib/commerce/shopify-order-sync";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function validOptionalTime(raw: string) {
  return !raw || isValidWorkingTime(raw);
}

function invalid(reason: "time" | "window") {
  redirect(`/dashboard/working-hours?error=${reason}`);
}

function validDate(raw: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return false;
  const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return parsed.toISOString().slice(0, 10) === raw;
}

function riyadhDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function refreshAppointmentPaths(slug: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/working-hours");
  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/inbox");
  revalidatePath("/preview");
  revalidatePath(`/${slug}`);
}

function boundedInteger(raw: string, minimum: number, maximum: number) {
  if (!/^\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

export async function updateBookingSlotSettingsAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");

  const defaultDuration = boundedInteger(value(formData, "defaultSlotMinutes"), 15, 480);
  const defaultCapacity = boundedInteger(value(formData, "defaultCapacity"), 1, 500);
  if (!defaultDuration || defaultDuration % 15 !== 0 || !defaultCapacity) {
    redirect("/dashboard/working-hours?error=slot-settings");
  }

  const branches = await db.branch.findMany({
    where: { businessId: business.id, isActive: true },
    select: { id: true },
  });
  const branchUpdates = branches.map((branch) => {
    const capacity = boundedInteger(value(formData, `capacity-${branch.id}`), 1, 500);
    const slotMinutes = boundedInteger(value(formData, `slot-${branch.id}`), 15, 480);
    if (!capacity || !slotMinutes || slotMinutes % 15 !== 0) return null;
    return db.branch.updateMany({
      where: { id: branch.id, businessId: business.id },
      data: {
        bookingEnabled: formData.get(`enabled-${branch.id}`) === "on",
        bookingCapacity: capacity,
        bookingSlotMinutes: slotMinutes,
      },
    });
  });
  if (branchUpdates.some((operation) => operation === null)) {
    redirect("/dashboard/working-hours?error=slot-settings");
  }

  await db.$transaction([
    db.business.updateMany({
      where: { id: business.id, ownerId: business.ownerId, deletedAt: null },
      data: { bookingSlotMinutes: defaultDuration, bookingCapacity: defaultCapacity },
    }),
    ...branchUpdates.filter((operation): operation is NonNullable<typeof operation> => operation !== null),
  ]);
  refreshAppointmentPaths(business.slug);
  redirect("/dashboard/working-hours?saved=slots");
}

export async function configureBookingWhatsAppConfirmationAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");
  if (!await hasActiveBusinessSubscription({ businessId: business.id })) redirect("/dashboard/working-hours?whatsapp=subscription-required");
  const templateId = value(formData, "templateId");
  if (!/^[0-9a-f-]{36}$/i.test(templateId)) redirect("/dashboard/working-hours?whatsapp=invalid-template");

  let previousAutomationId: string | null = null;
  try {
    const previous = await db.whatsAppAutomation.findFirst({
      where: { businessId: business.id, triggerType: "booking_confirmation", status: "active" },
      select: { id: true },
    });
    previousAutomationId = previous?.id ?? null;
    const created = await createWhatsAppAutomation({
      businessId: business.id,
      actorUserId: business.ownerId,
      name: "تأكيد حجز الموعد",
      triggerType: "booking_confirmation",
      templateId,
      cooldownMinutes: 0,
    });
    if (previousAutomationId) {
      await operateWhatsAppAutomation({ businessId: business.id, actorUserId: business.ownerId, automationId: previousAutomationId, operation: "pause" });
    }
    try {
      await operateWhatsAppAutomation({ businessId: business.id, actorUserId: business.ownerId, automationId: created.id, operation: "activate" });
    } catch (error) {
      if (previousAutomationId) {
        await operateWhatsAppAutomation({ businessId: business.id, actorUserId: business.ownerId, automationId: previousAutomationId, operation: "resume" }).catch(() => undefined);
      }
      throw error;
    }
    refreshAppointmentPaths(business.slug);
    redirect("/dashboard/working-hours?whatsapp=enabled");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/dashboard/working-hours?whatsapp=failed");
  }
}

export async function toggleBookingWhatsAppConfirmationAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");
  const automationId = value(formData, "automationId");
  const operation = value(formData, "operation");
  if (!/^[0-9a-f-]{36}$/i.test(automationId) || !["pause", "resume"].includes(operation)) redirect("/dashboard/working-hours?whatsapp=invalid");
  try {
    await operateWhatsAppAutomation({ businessId: business.id, actorUserId: business.ownerId, automationId, operation: operation as "pause" | "resume" });
    refreshAppointmentPaths(business.slug);
    redirect(`/dashboard/working-hours?whatsapp=${operation === "pause" ? "paused" : "enabled"}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/dashboard/working-hours?whatsapp=failed");
  }
}

export async function useMarketingNumberForBookingsAction() {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");
  if (!await hasActiveBusinessSubscription({ businessId: business.id })) redirect("/dashboard/working-hours?whatsapp=subscription-required");
  const connection = await db.whatsAppConnection.findFirst({
    where: { businessId: business.id, provider: "meta", marketingEnabled: true, status: "connected", disabledAt: null },
    select: { id: true },
  });
  if (!connection) redirect("/dashboard/working-hours?whatsapp=marketing-number-unavailable");
  await db.$transaction([
    db.whatsAppConnection.updateMany({
      where: { businessId: business.id, provider: "meta", bookingEnabled: true, id: { not: connection.id } },
      data: { bookingEnabled: false },
    }),
    db.whatsAppConnection.update({ where: { id: connection.id }, data: { bookingEnabled: true } }),
  ]);
  refreshAppointmentPaths(business.slug);
  redirect("/dashboard/working-hours?whatsapp=number-linked");
}

export async function syncBookingWhatsAppTemplatesAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");
  if (!await hasActiveBusinessSubscription({ businessId: business.id })) redirect("/dashboard/working-hours?whatsapp=subscription-required");
  const connectionId = value(formData, "connectionId");
  const connection = await db.whatsAppConnection.findFirst({
    where: { id: connectionId, businessId: business.id, provider: "meta", bookingEnabled: true, status: "connected", disabledAt: null },
    select: { id: true },
  });
  if (!connection) redirect("/dashboard/working-hours?whatsapp=number-unavailable");
  try {
    await syncMetaWhatsAppTemplates({ businessId: business.id, connectionId: connection.id });
    revalidatePath("/dashboard/working-hours");
    redirect("/dashboard/working-hours?whatsapp=templates-synced");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/dashboard/working-hours?whatsapp=sync-failed");
  }
}

export async function connectSallaBookingStoreAction() {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");
  if (!await hasActiveBusinessSubscription({ businessId: business.id })) redirect("/dashboard/working-hours?salla=subscription-required");
  try {
    const integration = await prepareSallaIntegration({ businessId: business.id, userId: business.ownerId });
    if (integration.status === "active") redirect("/dashboard/working-hours?salla=connected");
    const authorizationUrl = await createSallaAuthorization({ businessId: business.id, userId: business.ownerId, integrationId: integration.id });
    redirect(authorizationUrl);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const code = error instanceof Error ? error.message : "";
    redirect(`/dashboard/working-hours?salla=${code.startsWith("SALLA_CONFIG_INVALID") ? "not-configured" : "start-failed"}`);
  }
}

export async function reconnectSallaBookingStoreAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");
  if (!await hasActiveBusinessSubscription({ businessId: business.id })) redirect("/dashboard/working-hours?salla=subscription-required");
  const integrationId = value(formData, "integrationId");
  if (!/^[0-9a-f-]{36}$/i.test(integrationId)) redirect("/dashboard/working-hours?salla=invalid");
  try {
    redirect(await createSallaAuthorization({ businessId: business.id, userId: business.ownerId, integrationId }));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const code = error instanceof Error ? error.message : "";
    redirect(`/dashboard/working-hours?salla=${code.startsWith("SALLA_CONFIG_INVALID") ? "not-configured" : "start-failed"}`);
  }
}

export async function disconnectSallaBookingStoreAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");
  const integrationId = value(formData, "integrationId");
  if (!/^[0-9a-f-]{36}$/i.test(integrationId)) redirect("/dashboard/working-hours?salla=invalid");
  try {
    await disconnectWhatsAppCommerceIntegration({ businessId: business.id, actorUserId: business.ownerId, integrationId });
    refreshAppointmentPaths(business.slug);
    redirect("/dashboard/working-hours?salla=disconnected");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/dashboard/working-hours?salla=disconnect-failed");
  }
}

export async function syncSallaBookingOrdersAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");
  if (!await hasActiveBusinessSubscription({ businessId: business.id })) redirect("/dashboard/working-hours?salla=subscription-required");
  const integrationId = value(formData, "integrationId");
  if (!/^[0-9a-f-]{36}$/i.test(integrationId)) redirect("/dashboard/working-hours?salla=invalid");
  try {
    await syncSallaBookingOrders({ businessId: business.id, integrationId, actorUserId: business.ownerId });
    refreshAppointmentPaths(business.slug);
    redirect("/dashboard/working-hours?salla=synced");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/dashboard/working-hours?salla=sync-failed");
  }
}

export async function connectWooCommerceBookingStoreAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");
  if (!await hasActiveBusinessSubscription({ businessId: business.id })) redirect("/dashboard/working-hours?woocommerce=subscription-required");
  try {
    const integration = await connectWooCommerceBookingStore({
      businessId: business.id,
      actorUserId: business.ownerId,
      storeUrl: value(formData, "storeUrl"),
      consumerKey: value(formData, "consumerKey"),
      consumerSecret: value(formData, "consumerSecret"),
    });
    await syncWooCommerceBookingOrders({ businessId: business.id, integrationId: integration.id, actorUserId: business.ownerId });
    refreshAppointmentPaths(business.slug);
    redirect("/dashboard/working-hours?woocommerce=connected");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const code = error instanceof Error ? error.message : "";
    redirect(`/dashboard/working-hours?woocommerce=${code === "WOOCOMMERCE_STORE_ALREADY_ASSIGNED" ? "store-assigned" : code === "WOOCOMMERCE_STORE_UNSAFE" ? "unsafe" : "failed"}`);
  }
}

export async function syncWooCommerceBookingOrdersAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");
  const integrationId = value(formData, "integrationId");
  if (!/^[0-9a-f-]{36}$/i.test(integrationId)) redirect("/dashboard/working-hours?woocommerce=invalid");
  try {
    await syncWooCommerceBookingOrders({ businessId: business.id, integrationId, actorUserId: business.ownerId });
    refreshAppointmentPaths(business.slug);
    redirect("/dashboard/working-hours?woocommerce=synced");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/dashboard/working-hours?woocommerce=sync-failed");
  }
}

export async function disconnectWooCommerceBookingStoreAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");
  const integrationId = value(formData, "integrationId");
  if (!/^[0-9a-f-]{36}$/i.test(integrationId)) redirect("/dashboard/working-hours?woocommerce=invalid");
  try {
    const integration = await db.whatsAppCommerceIntegration.findFirst({ where: { id: integrationId, businessId: business.id, provider: "woocommerce" }, select: { id: true } });
    if (!integration) throw new Error("WOOCOMMERCE_INTEGRATION_UNAVAILABLE");
    await disconnectWhatsAppCommerceIntegration({ businessId: business.id, actorUserId: business.ownerId, integrationId });
    refreshAppointmentPaths(business.slug);
    redirect("/dashboard/working-hours?woocommerce=disconnected");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/dashboard/working-hours?woocommerce=disconnect-failed");
  }
}

export async function connectShopifyBookingStoreAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");
  if (!await hasActiveBusinessSubscription({ businessId: business.id })) redirect("/dashboard/working-hours?shopify=subscription-required");
  try {
    const registered = await registerWhatsAppCommerceIntegration({ businessId: business.id, actorUserId: business.ownerId, provider: "shopify", externalStoreId: value(formData, "shopDomain") });
    const current = await db.whatsAppCommerceIntegration.findFirst({ where: { id: registered.id, businessId: business.id, provider: "shopify" }, select: { status: true } });
    if (current?.status === "active") redirect("/dashboard/working-hours?shopify=connected");
    redirect(await createShopifyAuthorization({ businessId: business.id, userId: business.ownerId, integrationId: registered.id }));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const code = error instanceof Error ? error.message : "";
    redirect(`/dashboard/working-hours?shopify=${code.startsWith("SHOPIFY_CONFIG_INVALID") ? "not-configured" : "failed"}`);
  }
}

export async function disconnectShopifyBookingStoreAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");
  const integrationId = value(formData, "integrationId");
  const integration = await db.whatsAppCommerceIntegration.findFirst({ where: { id: integrationId, businessId: business.id, provider: "shopify" }, select: { id: true } });
  if (!integration) redirect("/dashboard/working-hours?shopify=invalid");
  await disconnectWhatsAppCommerceIntegration({ businessId: business.id, actorUserId: business.ownerId, integrationId });
  refreshAppointmentPaths(business.slug);
  redirect("/dashboard/working-hours?shopify=disconnected");
}

export async function syncShopifyBookingOrdersAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");
  const integrationId = value(formData, "integrationId");
  if (!/^[0-9a-f-]{36}$/i.test(integrationId)) redirect("/dashboard/working-hours?shopify=invalid");
  try {
    await syncShopifyBookingOrders({ businessId: business.id, integrationId, actorUserId: business.ownerId });
    refreshAppointmentPaths(business.slug);
    redirect("/dashboard/working-hours?shopify=synced");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/dashboard/working-hours?shopify=sync-failed");
  }
}

export async function upsertBookingAvailabilityOverrideAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");

  const date = value(formData, "date");
  const mode = value(formData, "mode");
  const note = value(formData, "note").slice(0, 240);
  const opensAt = value(formData, "opensAt");
  const closesAt = value(formData, "closesAt");
  const secondOpensAt = value(formData, "secondOpensAt");
  const secondClosesAt = value(formData, "secondClosesAt");
  const today = riyadhDateKey();

  if (!validDate(date) || date < today || date > shiftDate(today, 365) || !["open", "closed"].includes(mode)) {
    redirect("/dashboard/working-hours?error=override-date");
  }

  const isClosed = mode === "closed";
  if (!isClosed) {
    if (![opensAt, closesAt, secondOpensAt, secondClosesAt].every(validOptionalTime) || !opensAt || !closesAt) {
      redirect("/dashboard/working-hours?error=override-time");
    }
    if (!validateWorkingHoursWindow({ opensAt, closesAt, secondOpensAt, secondClosesAt })) {
      redirect("/dashboard/working-hours?error=override-window");
    }
  }

  await db.bookingAvailabilityOverride.upsert({
    where: { businessId_date: { businessId: business.id, date } },
    update: {
      isClosed,
      opensAt: isClosed ? null : opensAt,
      closesAt: isClosed ? null : closesAt,
      secondOpensAt: isClosed ? null : secondOpensAt || null,
      secondClosesAt: isClosed ? null : secondClosesAt || null,
      note: note || null,
    },
    create: {
      businessId: business.id,
      date,
      isClosed,
      opensAt: isClosed ? null : opensAt,
      closesAt: isClosed ? null : closesAt,
      secondOpensAt: isClosed ? null : secondOpensAt || null,
      secondClosesAt: isClosed ? null : secondClosesAt || null,
      note: note || null,
    },
  });

  refreshAppointmentPaths(business.slug);
  redirect("/dashboard/working-hours?saved=override");
}

export async function deleteBookingAvailabilityOverrideAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");
  const id = value(formData, "id");
  if (id) {
    await db.bookingAvailabilityOverride.deleteMany({ where: { id, businessId: business.id } });
    refreshAppointmentPaths(business.slug);
  }
  redirect("/dashboard/working-hours?saved=override-deleted");
}

export async function updateWorkingHoursAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");

  const rows = Array.from({ length: 7 }, (_, dayOfWeek) => {
    const isClosed = formData.get(`closed-${dayOfWeek}`) === "on";
    const opensAt = value(formData, `opens-${dayOfWeek}`);
    const closesAt = value(formData, `closes-${dayOfWeek}`);
    const secondOpensAt = value(formData, `second-opens-${dayOfWeek}`);
    const secondClosesAt = value(formData, `second-closes-${dayOfWeek}`);
    return { dayOfWeek, isClosed, opensAt, closesAt, secondOpensAt, secondClosesAt };
  });

  for (const row of rows) {
    if (![row.opensAt, row.closesAt, row.secondOpensAt, row.secondClosesAt].every(validOptionalTime)) invalid("time");
    if (row.isClosed) continue;
    if (!row.opensAt || !row.closesAt) invalid("time");
    if (!validateWorkingHoursWindow({
      opensAt: row.opensAt,
      closesAt: row.closesAt,
      secondOpensAt: row.secondOpensAt,
      secondClosesAt: row.secondClosesAt,
    })) invalid("window");
  }

  await db.$transaction(rows.map((row) => db.workingHours.upsert({
    where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek: row.dayOfWeek } },
    update: {
      isClosed: row.isClosed,
      opensAt: row.isClosed ? null : row.opensAt,
      closesAt: row.isClosed ? null : row.closesAt,
      secondOpensAt: row.isClosed ? null : row.secondOpensAt || null,
      secondClosesAt: row.isClosed ? null : row.secondClosesAt || null,
    },
    create: {
      businessId: business.id,
      dayOfWeek: row.dayOfWeek,
      isClosed: row.isClosed,
      opensAt: row.isClosed ? null : row.opensAt,
      closesAt: row.isClosed ? null : row.closesAt,
      secondOpensAt: row.isClosed ? null : row.secondOpensAt || null,
      secondClosesAt: row.isClosed ? null : row.secondClosesAt || null,
    },
  })));

  revalidatePath("/dashboard/working-hours");
  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/my-page");
  revalidatePath("/preview");
  revalidatePath(`/${business.slug}`);
  redirect("/dashboard/working-hours?saved=1");
}
