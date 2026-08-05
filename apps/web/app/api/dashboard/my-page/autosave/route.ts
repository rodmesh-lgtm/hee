import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../../../../lib/db";
import { getCurrentUser } from "../../../../lib/auth";
import { isQaAuditModeUser } from "../../../../lib/qa-audit";
import { normalizePageModulesInput, serializePageModules } from "../../../../lib/page-modules";

const fieldPatchSchema = z.object({
  name: z.string().trim().min(2).optional(),
  businessType: z.string().trim().min(2).optional(),
  shortDescription: z.string().trim().max(80).optional(),
  description: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  city: z.string().trim().optional(),
  district: z.string().trim().optional(),
  googleMapsLink: z.string().trim().optional(),
  primaryColor: z.string().trim().optional(),
  themePreset: z.enum(["custom", "ocean", "sunset", "fresh"]).optional(),
  themeMode: z.enum(["light", "dark", "auto"]).optional(),
  buttonStyle: z.enum(["filled", "soft", "outline"]).optional(),
  cardStyle: z.enum(["flat", "bordered", "shadow"]).optional(),
  cornerRadius: z.enum(["sm", "md", "lg"]).optional(),
});

const moduleConfigSchema = z.object({
  title: z.string().trim().optional(),
  ctaLabel: z.string().trim().optional(),
  sheetTitle: z.string().trim().optional(),
  sheetDescription: z.string().trim().optional(),
  showPrice: z.boolean().optional(),
  showUnit: z.boolean().optional(),
  careersEnabled: z.boolean().optional(),
  careersEmail: z.string().trim().email().or(z.literal("")).optional(),
  careersExternalUrl: z.string().trim().optional(),
  careersLabel: z.string().trim().max(40).optional(),
  websiteType: z.enum(["WEBSITE", "ONLINE_STORE"]).optional(),
  websiteUrl: z.string().trim().optional(),
  businessLinkEnabled: z.boolean().optional(),
  businessLinkType: z.enum(["website", "store"]).optional(),
  businessLinkUrl: z.string().trim().optional(),
  businessLinkLabel: z.string().trim().max(40).optional(),
  serviceSectionTitle: z.string().trim().max(40).optional(),
  externalStoreUrl: z.string().trim().optional(),
  featuredProductIds: z.array(z.string().trim().min(1)).max(3).optional(),
  productExternalLinks: z.record(z.string(), z.string().trim()).optional(),
  salesTeam: z.array(
    z.object({
      id: z.string().trim().min(1),
      photoUrl: z.string().trim().optional(),
      name: z.string().trim().min(1).max(60),
      title: z.string().trim().max(60).optional(),
      whatsapp: z.string().trim().optional(),
      phone: z.string().trim().optional(),
      email: z.string().trim().optional(),
      visible: z.boolean().optional(),
      sortOrder: z.number().int().min(0).optional(),
    }),
  ).max(3).optional(),
  customerServiceTeam: z.array(
    z.object({
      id: z.string().trim().min(1),
      photoUrl: z.string().trim().optional(),
      name: z.string().trim().min(1).max(60),
      title: z.string().trim().max(60).optional(),
      whatsapp: z.string().trim().optional(),
      phone: z.string().trim().optional(),
      email: z.string().trim().optional(),
      visible: z.boolean().optional(),
      sortOrder: z.number().int().min(0).optional(),
    }),
  ).max(3).optional(),
  portfolioItems: z.array(
    z.object({
      id: z.string().trim().min(1),
      imageUrl: z.string().trim().optional(),
      title: z.string().trim().min(1).max(80),
      description: z.string().trim().max(300).optional(),
      url: z.string().trim().optional(),
      ctaLabel: z.string().trim().max(40).optional(),
      visible: z.boolean().optional(),
      sortOrder: z.number().int().min(0).optional(),
    }),
  ).max(6).optional(),
  companyProfile: z.object({
    title: z.string().trim().max(80).optional(),
    description: z.string().trim().max(260).optional(),
    ctaLabel: z.string().trim().max(40).optional(),
    pdfUrl: z.string().trim().optional(),
    pdfStorageKey: z.string().trim().optional(),
    pdfFileName: z.string().trim().max(180).optional(),
    pdfFileSize: z.number().int().min(0).max(5 * 1024 * 1024).optional(),
    visible: z.boolean().optional(),
  }).optional(),
});

const moduleSchema = z.object({
  id: z.string().trim(),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(0),
  config: moduleConfigSchema,
});

const autosavePayloadSchema = z.object({
  fields: fieldPatchSchema.optional(),
  modules: z.array(moduleSchema).optional(),
});

function normalizeUrl(raw?: string) {
  const value = raw?.trim() ?? "";
  if (!value) {
    return null;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:/i.test(value)) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const parsed = new URL(candidate);
    if (!/^https?:$/i.test(parsed.protocol) || !parsed.hostname || /\s/.test(parsed.href)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function resolveThemePreset(
  preset: "custom" | "ocean" | "sunset" | "fresh",
  current: { secondaryColor: string | null; buttonColor: string | null; buttonStyle: string | null; cardStyle: string | null },
) {
  switch (preset) {
    case "fresh":
      return {
        secondaryColor: "#052E16",
        buttonColor: "#22C55E",
        buttonStyle: "rounded",
        cardStyle: "flat",
      };
    case "sunset":
      return {
        secondaryColor: "#2A0A0A",
        buttonColor: "#F97316",
        buttonStyle: "pill",
        cardStyle: "elevated",
      };
    case "ocean":
      return {
        secondaryColor: "#082F49",
        buttonColor: "#0EA5E9",
        buttonStyle: "rounded",
        cardStyle: "glass",
      };
    default:
      return current;
  }
}

function parseCardAppearance(value?: string | null) {
  const parts = String(value ?? "").split("|").map((part) => part.trim()).filter(Boolean);
  const themeMode = parts.find((part) => ["light", "dark", "auto"].includes(part)) ?? "light";
  const cardStyle = parts.find((part) => ["flat", "bordered", "shadow"].includes(part)) ?? "bordered";
  const cornerRadius = parts.find((part) => ["sm", "md", "lg"].includes(part)) ?? "md";
  return { themeMode, cardStyle, cornerRadius };
}

function composeCardAppearance(themeMode: string, cardStyle: string, cornerRadius: string) {
  return `${themeMode}|${cardStyle}|${cornerRadius}`;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول" }, { status: 401 });
  }

  if (await isQaAuditModeUser(user.id)) {
    return NextResponse.json({ error: "وضع المعاينة QA للقراءة فقط" }, { status: 403 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const parsed = autosavePayloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  const business = await db.business.findFirst({ where: { ownerId: user.id } });
  if (!business) {
    return NextResponse.json({ error: "ابدأ بإنشاء النشاط أولاً" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  const changedKeys: string[] = [];
  const fields = parsed.data.fields;

  if (fields) {
    const assignText = (key: keyof typeof fields, targetKey: string = key) => {
      const nextValue = fields[key];
      if (typeof nextValue === "string" && nextValue !== business[targetKey as keyof typeof business]) {
        updates[targetKey] = nextValue;
        changedKeys.push(targetKey);
      }
    };

    assignText("name");
    assignText("businessType");
    assignText("shortDescription");
    assignText("description");
    assignText("city");
    assignText("district");

    if (typeof fields.whatsapp === "string" && fields.whatsapp !== (business.whatsapp ?? "")) {
      updates.whatsapp = fields.whatsapp || null;
      changedKeys.push("whatsapp");
    }

    if (typeof fields.phone === "string" && fields.phone !== (business.phone ?? "")) {
      updates.phone = fields.phone || null;
      changedKeys.push("phone");
    }

    if (typeof fields.googleMapsLink === "string") {
      const normalizedMaps = normalizeUrl(fields.googleMapsLink);
      if (normalizedMaps !== business.googleMapsLink) {
        updates.googleMapsLink = normalizedMaps;
        changedKeys.push("googleMapsLink");
      }
    }

    if (typeof fields.primaryColor === "string" && fields.primaryColor !== (business.primaryColor ?? "")) {
      updates.primaryColor = fields.primaryColor;
      changedKeys.push("primaryColor");
    }

    if (fields.themePreset) {
      const theme = resolveThemePreset(fields.themePreset, {
        secondaryColor: business.secondaryColor,
        buttonColor: business.buttonColor,
        buttonStyle: business.buttonStyle,
        cardStyle: business.cardStyle,
      });

      if (
        theme.secondaryColor !== business.secondaryColor ||
        theme.buttonColor !== business.buttonColor ||
        theme.buttonStyle !== business.buttonStyle ||
        theme.cardStyle !== business.cardStyle
      ) {
        updates.secondaryColor = theme.secondaryColor;
        updates.buttonColor = theme.buttonColor;
        updates.buttonStyle = theme.buttonStyle;
        updates.cardStyle = theme.cardStyle;
        changedKeys.push("themePreset");
      }
    }

    const currentAppearance = parseCardAppearance(business.cardStyle);
    const nextThemeMode = fields.themeMode ?? currentAppearance.themeMode;
    const nextCardStyle = fields.cardStyle ?? currentAppearance.cardStyle;
    const nextCornerRadius = fields.cornerRadius ?? currentAppearance.cornerRadius;
    const nextCardAppearance = composeCardAppearance(nextThemeMode, nextCardStyle, nextCornerRadius);

    if (nextCardAppearance !== (business.cardStyle ?? "")) {
      updates.cardStyle = nextCardAppearance;
      changedKeys.push("cardStyle");
    }

    if (fields.buttonStyle && fields.buttonStyle !== (business.buttonStyle ?? "")) {
      updates.buttonStyle = fields.buttonStyle;
      changedKeys.push("buttonStyle");
    }
  }

  if (parsed.data.modules) {
    const normalizedModules = normalizePageModulesInput(parsed.data.modules, (fields?.businessType as string | undefined) ?? business.businessType);
    const serializedModules = serializePageModules(normalizedModules);
    const previousSerializedModules = JSON.stringify(normalizePageModulesInput(business.pageModules, business.businessType));
    const nextSerializedModules = JSON.stringify(serializedModules);

    if (previousSerializedModules !== nextSerializedModules) {
      updates.pageModules = serializedModules;
      updates.bookingAvailable = normalizedModules.some((module) => module.enabled && ["request", "services", "inquiry"].includes(module.id));
      updates.acceptOnlineOrders = normalizedModules.some((module) => module.enabled && module.id === "products");
      changedKeys.push("pageModules");
    }
  }

  if (changedKeys.length === 0) {
    return NextResponse.json({ ok: true, changedKeys: [] });
  }

  await db.business.update({
    where: { id: business.id },
    data: updates,
  });

  revalidatePath("/dashboard/my-page");
  revalidatePath(`/b/${business.slug}`);

  return NextResponse.json({ ok: true, changedKeys });
}