"use client";

import type { Prisma } from "@prisma/client";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, CircleDot, Eye, FileText, Loader2, Monitor, Plus, QrCode, RotateCw, Smartphone, Trash2 } from "lucide-react";
import { publishBusinessAction, type BuilderActionState } from "../../app/actions/page-builder";
import { PublicQrCard } from "../public/public-qr-card";
import { PublicShareButton } from "../public/public-share-button";
import { Button } from "../ui/button";
import { activitySelectorOptions, resolveActivityId, type ActivityId } from "../../app/lib/activity-engine";
import { normalizePageModules, serializePageModules, type ContactTeamMember, type PageModuleState, type PortfolioItem } from "../../app/lib/page-modules";
import { PageModulesManager } from "./page-modules-manager";

type MyPageBusiness = Prisma.BusinessGetPayload<{
  include: {
    galleryItems: true;
    socialLinks: true;
    products: true;
  };
}>;

type AutosaveFields = {
  name: string;
  businessType: string;
  shortDescription: string;
  description: string;
  whatsapp: string;
  phone: string;
  city: string;
  district: string;
  googleMapsLink: string;
  primaryColor: string;
  themePreset: "custom" | "ocean" | "sunset" | "fresh";
  themeMode: "light" | "dark" | "auto";
  buttonStyle: "filled" | "soft" | "outline";
  cardStyle: "flat" | "bordered" | "shadow";
  cornerRadius: "sm" | "md" | "lg";
};

type AutosavePatch = {
  fields?: Partial<AutosaveFields>;
  modules?: PageModuleState[];
};

const defaultState: BuilderActionState = {};
const inputClass =
  "h-11 w-full min-w-0 rounded-xl border border-[#e7eaf7] bg-[#fafbff] px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#bdb4ff] focus:outline-none";
const textAreaClass =
  "min-h-[104px] w-full min-w-0 rounded-xl border border-[#e7eaf7] bg-[#fafbff] px-3 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#bdb4ff] focus:outline-none";

function buildInitialFields(business: MyPageBusiness): AutosaveFields {
  const appearanceParts = String(business.cardStyle ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  const themeMode = (appearanceParts.find((part) => part === "light" || part === "dark" || part === "auto") ?? "light") as AutosaveFields["themeMode"];
  const cardStyle = (appearanceParts.find((part) => part === "flat" || part === "bordered" || part === "shadow") ?? "bordered") as AutosaveFields["cardStyle"];
  const cornerRadius = (appearanceParts.find((part) => part === "sm" || part === "md" || part === "lg") ?? "md") as AutosaveFields["cornerRadius"];
  const buttonStyle = ((business.buttonStyle as AutosaveFields["buttonStyle"] | null) ?? "filled") as AutosaveFields["buttonStyle"];

  return {
    name: business.name,
    businessType: resolveActivityId(business.businessType),
    shortDescription: business.shortDescription ?? "",
    description: business.description ?? "",
    whatsapp: business.whatsapp ?? "",
    phone: business.phone ?? "",
    city: business.city ?? "",
    district: business.district ?? "",
    googleMapsLink: business.googleMapsLink ?? "",
    primaryColor: business.primaryColor ?? "#5D43EF",
    themePreset: "custom",
    themeMode,
    buttonStyle,
    cardStyle,
    cornerRadius,
  };
}

function saveStateText(status: "saved" | "saving" | "error") {
  if (status === "saving") {
    return "جارٍ الحفظ...";
  }

  if (status === "error") {
    return "تعذر الحفظ — حاول مرة أخرى";
  }

  return "✓ تم الحفظ";
}

function isPatchEmpty(patch: AutosavePatch) {
  return !patch.fields && !patch.modules;
}

function normalizeHttpUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function createTeamMember(): ContactTeamMember {
  return {
    id: crypto.randomUUID(),
    name: "",
    title: "",
    whatsapp: "",
    phone: "",
    email: "",
    photoUrl: "",
    visible: true,
    sortOrder: 0,
  };
}

function createPortfolioItem(): PortfolioItem {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    imageUrl: "",
    url: "",
    visible: true,
    sortOrder: 0,
  };
}

export function MyPageEditor({
  business,
  publicUrl,
  qrDataUrl,
  paymentEligible,
}: {
  business: MyPageBusiness;
  publicUrl: string;
  qrDataUrl: string;
  paymentEligible: boolean;
}) {
  const initialFields = useMemo(() => buildInitialFields(business), [business]);
  const initialModules = useMemo(() => normalizePageModules((business as { pageModules?: unknown }).pageModules, business.businessType), [business]);

  const [publishState, publishAction, publishPending] = useActionState(publishBusinessAction, defaultState);
  const [fields, setFields] = useState<AutosaveFields>(initialFields);
  const [modules, setModules] = useState<PageModuleState[]>(initialModules);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [identityEditOpen, setIdentityEditOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"phone" | "desktop">("phone");
  const [previewVersion, setPreviewVersion] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [saveError, setSaveError] = useState("");
  const [companyProfileUploading, setCompanyProfileUploading] = useState(false);
  const [companyProfileUploadError, setCompanyProfileUploadError] = useState("");

  const fieldsRef = useRef(fields);
  const modulesRef = useRef(modules);
  const lastSavedFieldsRef = useRef(initialFields);
  const lastSavedModulesRef = useRef(initialModules);
  const saveTimerRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const queuedSaveRef = useRef(false);
  const failedPatchRef = useRef<AutosavePatch | null>(null);

  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  useEffect(() => {
    modulesRef.current = modules;
  }, [modules]);

  void paymentEligible;
  const isPublished = business.isPublished;
  const activeProducts = useMemo(
    () => [...business.products].filter((product) => product.isActive).sort((left, right) => left.sortOrder - right.sortOrder),
    [business.products],
  );

  const patchModuleConfig = (moduleId: PageModuleState["id"], updater: (config: PageModuleState["config"]) => PageModuleState["config"]) => {
    updateModules(
      modulesRef.current.map((module) => {
        if (module.id !== moduleId) return module;
        return {
          ...module,
          config: updater(module.config),
        };
      }),
    );
  };

  const buildPatch = () => {
    const currentFields = fieldsRef.current;
    const lastSavedFields = lastSavedFieldsRef.current;
    const fieldPatch: Partial<AutosaveFields> = {};

    (Object.keys(currentFields) as Array<keyof AutosaveFields>).forEach((key) => {
      if (currentFields[key] !== lastSavedFields[key]) {
        (fieldPatch as Record<string, unknown>)[key] = currentFields[key];
      }
    });

    const modulesChanged = JSON.stringify(serializePageModules(modulesRef.current)) !== JSON.stringify(serializePageModules(lastSavedModulesRef.current));

    return {
      fields: Object.keys(fieldPatch).length > 0 ? fieldPatch : undefined,
      modules: modulesChanged ? modulesRef.current : undefined,
    } satisfies AutosavePatch;
  };

  const commitSavedPatch = (patch: AutosavePatch) => {
    if (patch.fields) {
      lastSavedFieldsRef.current = {
        ...lastSavedFieldsRef.current,
        ...patch.fields,
      };
    }

    if (patch.modules) {
      lastSavedModulesRef.current = patch.modules;
    }
  };

  const flushAutosave = async (explicitPatch?: AutosavePatch) => {
    const patch = explicitPatch ?? buildPatch();
    if (isPatchEmpty(patch)) {
      if (saveStatus !== "error") {
        setSaveStatus("saved");
      }
      return;
    }

    if (saveInFlightRef.current) {
      queuedSaveRef.current = true;
      return;
    }

    saveInFlightRef.current = true;
    setSaveStatus("saving");
    setSaveError("");

    try {
      const response = await fetch("/api/dashboard/my-page/autosave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });

      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "تعذر الحفظ — حاول مرة أخرى");
      }

      commitSavedPatch(patch);
      failedPatchRef.current = null;
      setSaveStatus("saved");
      setPreviewVersion((value) => value + 1);
    } catch (error) {
      failedPatchRef.current = patch;
      setSaveError(error instanceof Error ? error.message : "تعذر الحفظ — حاول مرة أخرى");
      setSaveStatus("error");
    } finally {
      saveInFlightRef.current = false;
      if (failedPatchRef.current) {
        queuedSaveRef.current = false;
        return;
      }

      const nextPatch = buildPatch();
      if (queuedSaveRef.current || !isPatchEmpty(nextPatch)) {
        queuedSaveRef.current = false;
        window.clearTimeout(saveTimerRef.current ?? undefined);
        saveTimerRef.current = window.setTimeout(() => {
          void flushAutosave();
        }, 500);
      }
    }
  };

  const scheduleAutosave = (delay = 900) => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      void flushAutosave();
    }, delay);
  };

  const updateField = <K extends keyof AutosaveFields>(key: K, value: AutosaveFields[K]) => {
    const nextFields = {
      ...fieldsRef.current,
      [key]: value,
    };
    fieldsRef.current = nextFields;
    setFields(nextFields);
    scheduleAutosave();
  };

  const updateModules = (nextModules: PageModuleState[]) => {
    modulesRef.current = nextModules;
    setModules(nextModules);
    scheduleAutosave(350);
  };

  const retryAutosave = () => {
    const retryPatch = failedPatchRef.current ?? buildPatch();
    void flushAutosave(retryPatch);
  };

  const saveStateClass =
    saveStatus === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : saveStatus === "saving"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_406px] lg:[direction:ltr]">
      <section className="min-w-0 space-y-4 lg:[direction:rtl]">
        <div className="space-y-3 rounded-2xl border border-[#edf0fb] bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-[#1f2552]">{fields.name || business.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${business.isPublished ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                  <CircleDot className="h-3.5 w-3.5" />
                  {business.isPublished ? "منشورة" : "غير منشورة"}
                </span>
                <span className="rounded-full bg-[#f6f8ff] px-2.5 py-1 text-xs font-semibold text-slate-500">{publicUrl.replace(/^https?:\/\//, "")}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#e2dcff] bg-[#f4f1ff] px-4 text-sm font-bold text-[#544ad6]"
              >
                <Eye className="h-4 w-4" />
                عرض الصفحة
              </a>
              <PublicShareButton
                title={fields.name || business.name}
                text={fields.shortDescription || fields.description || business.businessType}
                url={publicUrl}
                label="مشاركة"
                className="h-10 rounded-xl border border-[#e2dcff] bg-[#f4f1ff] px-4 text-sm font-bold text-[#544ad6]"
              />
              <Button type="button" variant="secondary" size="sm" className="h-10 rounded-xl lg:hidden" onClick={() => setPreviewOpen(true)}>
                معاينة صفحتي
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#edf0fb] pt-3">
            <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-black ${saveStateClass}`}>
              {saveStatus === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {isPublished && saveStatus === "saved" ? "✓ تم حفظ التعديلات" : saveStateText(saveStatus)}
            </div>

            <div className="flex items-center gap-3">
              {isPublished ? <span className="text-xs font-semibold text-slate-500">التغييرات المحفوظة تظهر مباشرة في صفحتك المنشورة</span> : <span className="text-xs font-semibold text-amber-700">لديك تغييرات غير منشورة</span>}
              <button type="button" onClick={() => setQrOpen(true)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e6e9f6] bg-white px-2.5 text-xs font-bold text-[#5b51d6]">
                <QrCode className="h-3.5 w-3.5" />
                QR
              </button>
            </div>

            {saveStatus === "error" ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-700">{saveError}</span>
                <button type="button" onClick={retryAutosave} className="inline-flex h-8 items-center justify-center rounded-lg border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700">
                  <RotateCw className="ml-1 h-3.5 w-3.5" />
                  إعادة المحاولة
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <section className="space-y-4 rounded-2xl border border-[#edf0fb] bg-white p-4">
          <div>
            <h2 className="text-lg font-black text-[#22295b]">هويتك</h2>
            <p className="mt-1 text-sm text-slate-500">عدّل الاسم والنبذة بسرعة، واترك التفاصيل عند الحاجة.</p>
          </div>

          {!identityEditOpen ? (
            <div className="rounded-xl border border-[#edf0fb] bg-[#fbfcff] p-3">
              <div className="grid items-center gap-3 sm:grid-cols-[86px_minmax(0,1fr)_auto]">
                <div className="flex h-[86px] w-[86px] items-center justify-center overflow-hidden rounded-full border border-[#e7eaf7] bg-white text-xs text-slate-400">
                  {business.logoUrl ? <img src={business.logoUrl} alt="شعار النشاط" className="h-full w-full object-cover" /> : "شعار"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xl font-black text-[#1f2552]">{fields.name || business.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{fields.shortDescription || "أضف نبذة مختصرة عن نشاطك"}</p>
                </div>
                <Button type="button" variant="secondary" size="sm" className="rounded-xl border-[#dfd8ff] bg-white px-4 text-[#5a4fd5]" onClick={() => setIdentityEditOpen(true)}>
                  تعديل الهوية
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-3 lg:grid-cols-[112px_minmax(0,1fr)]">
                <div className="space-y-2">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-[#e7eaf7] bg-[#fbfcff] text-xs text-slate-400">
                    {business.logoUrl ? <img src={business.logoUrl} alt="شعار النشاط" className="h-full w-full object-cover" /> : "شعار"}
                  </div>
                  <label className="inline-flex h-9 cursor-not-allowed items-center justify-center rounded-lg border border-[#e7eaf7] bg-[#f9faff] px-3 text-xs font-bold text-slate-500">
                    تغيير الشعار
                    <input name="logoFile" type="file" accept="image/*" className="sr-only" disabled />
                  </label>
                </div>

                <div className="space-y-3">
                  <label className="grid gap-1.5 text-sm text-slate-700">
                    <span className="font-semibold text-[#2a3066]">اسم النشاط</span>
                    <input value={fields.name} onChange={(event) => updateField("name", event.target.value)} placeholder="مثال: مطعم النخلة" className={inputClass} />
                  </label>

                  <label className="grid gap-1.5 text-sm text-slate-700">
                    <span className="font-semibold text-[#2a3066]">نبذة قصيرة</span>
                    <input value={fields.shortDescription} onChange={(event) => updateField("shortDescription", event.target.value)} placeholder="وصف سريع يظهر تحت اسم نشاطك" className={inputClass} />
                  </label>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-[#edf0fb] bg-[#fbfcff] p-3">
                <div className="overflow-hidden rounded-lg border border-[#e7eaf7] bg-white">
                  {business.coverUrl ? (
                    <img src={business.coverUrl} alt="صورة الغلاف" className="h-24 w-full object-cover" />
                  ) : (
                    <div className="flex h-24 items-center justify-center text-xs text-slate-400">صورة الغلاف</div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex h-9 cursor-not-allowed items-center justify-center rounded-lg border border-[#e7eaf7] bg-white px-3 text-xs font-bold text-slate-500">
                    تغيير الغلاف
                    <input name="coverFile" type="file" accept="image/*" className="sr-only" disabled />
                  </label>
                  <Button type="button" variant="secondary" size="sm" className="rounded-lg px-3" onClick={() => setIdentityEditOpen(false)}>
                    إغلاق التحرير
                  </Button>
                </div>
              </div>

              <details>
                <summary className="cursor-pointer list-none text-sm font-bold text-[#5d53d5]">معلومات إضافية</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm text-slate-700">
                    <span className="font-semibold text-[#2a3066]">نوع النشاط</span>
                    <select value={fields.businessType} onChange={(event) => updateField("businessType", event.target.value as ActivityId)} className={inputClass}>
                      {activitySelectorOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="hidden sm:block" />

                  <label className="grid gap-1.5 text-sm text-slate-700 sm:col-span-2">
                    <span className="font-semibold text-[#2a3066]">الوصف التفصيلي</span>
                    <textarea value={fields.description} onChange={(event) => updateField("description", event.target.value)} placeholder="عرّف عملاءك بنشاطك بصورة أوضح" className={textAreaClass} />
                  </label>
                </div>
              </details>
            </>
          )}
        </section>

        <PageModulesManager
          businessType={fields.businessType}
          value={modules}
          onChange={updateModules}
          renderModuleSettings={(module) => {
            if (module.id === "contact") {
              return (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm text-slate-700">
                      <span className="font-semibold text-[#2a3066]">واتساب</span>
                      <input value={fields.whatsapp} onChange={(event) => updateField("whatsapp", event.target.value)} placeholder="05xxxxxxxx" dir="ltr" className={inputClass} />
                    </label>
                    <label className="grid gap-1.5 text-sm text-slate-700">
                      <span className="font-semibold text-[#2a3066]">رقم الاتصال</span>
                      <input value={fields.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="05xxxxxxxx" dir="ltr" className={inputClass} />
                    </label>
                  </div>

                  <div className="space-y-3 rounded-xl border border-[#e7ebf9] bg-[#fbfcff] p-3">
                    <p className="text-sm font-black text-[#2a3066]">روابط النشاط والتواصل</p>

                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#2a3066]">
                      <input
                        type="checkbox"
                        checked={module.config.businessLinkEnabled === true}
                        onChange={(event) =>
                          patchModuleConfig("contact", (config) => ({
                            ...config,
                            businessLinkEnabled: event.target.checked,
                            websiteType: config.websiteType === "ONLINE_STORE" ? "ONLINE_STORE" : "WEBSITE",
                          }))
                        }
                      />
                      تفعيل وجهة الويب الأساسية
                    </label>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="grid gap-1 text-xs text-slate-600">
                        <span>websiteType</span>
                        <select
                          value={module.config.websiteType === "ONLINE_STORE" ? "ONLINE_STORE" : "WEBSITE"}
                          onChange={(event) =>
                            patchModuleConfig("contact", (config) => ({
                              ...config,
                              websiteType: event.target.value === "ONLINE_STORE" ? "ONLINE_STORE" : "WEBSITE",
                              businessLinkType: event.target.value === "ONLINE_STORE" ? "store" : "website",
                            }))
                          }
                          className={inputClass}
                        >
                          <option value="WEBSITE">WEBSITE - الموقع الإلكتروني</option>
                          <option value="ONLINE_STORE">ONLINE_STORE - المتجر الإلكتروني</option>
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs text-slate-600">
                        <span>تسمية مخصصة (اختياري)</span>
                        <input
                          value={module.config.businessLinkLabel ?? ""}
                          onChange={(event) =>
                            patchModuleConfig("contact", (config) => ({
                              ...config,
                              businessLinkLabel: event.target.value,
                            }))
                          }
                          placeholder="اتركه فارغًا لاستخدام التسمية الافتراضية"
                          className={inputClass}
                        />
                      </label>
                      <label className="grid gap-1 text-xs text-slate-600 sm:col-span-2">
                        <span>الرابط الرسمي</span>
                        <input
                          value={module.config.websiteUrl ?? module.config.businessLinkUrl ?? ""}
                          onChange={(event) =>
                            patchModuleConfig("contact", (config) => ({
                              ...config,
                              websiteUrl: normalizeHttpUrl(event.target.value),
                              businessLinkUrl: normalizeHttpUrl(event.target.value),
                            }))
                          }
                          placeholder="https://example.com"
                          dir="ltr"
                          className={inputClass}
                        />
                      </label>
                    </div>

                    <div className="h-px bg-[#e4e8f8]" />

                    <p className="text-sm font-black text-[#2a3066]">التوظيف</p>
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#2a3066]">
                      <input
                        type="checkbox"
                        checked={module.config.careersEnabled === true}
                        onChange={(event) =>
                          patchModuleConfig("contact", (config) => ({
                            ...config,
                            careersEnabled: event.target.checked,
                            careersLabel: config.careersLabel?.trim() || "انضم إلى فريقنا",
                          }))
                        }
                      />
                      تفعيل إجراء التوظيف
                    </label>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="grid gap-1 text-xs text-slate-600">
                        <span>تسمية الإجراء</span>
                        <input
                          value={module.config.careersLabel ?? ""}
                          onChange={(event) =>
                            patchModuleConfig("contact", (config) => ({
                              ...config,
                              careersLabel: event.target.value,
                            }))
                          }
                          placeholder="انضم إلى فريقنا"
                          className={inputClass}
                        />
                      </label>
                      <label className="grid gap-1 text-xs text-slate-600">
                        <span>إيميل التوظيف</span>
                        <input
                          value={module.config.careersEmail ?? ""}
                          onChange={(event) =>
                            patchModuleConfig("contact", (config) => ({
                              ...config,
                              careersEmail: event.target.value.trim(),
                            }))
                          }
                          placeholder="jobs@example.com"
                          dir="ltr"
                          className={inputClass}
                        />
                      </label>
                      <label className="grid gap-1 text-xs text-slate-600 sm:col-span-2">
                        <span>رابط خارجي للتوظيف (اختياري)</span>
                        <input
                          value={module.config.careersExternalUrl ?? ""}
                          onChange={(event) =>
                            patchModuleConfig("contact", (config) => ({
                              ...config,
                              careersExternalUrl: normalizeHttpUrl(event.target.value),
                            }))
                          }
                          placeholder="https://jobs.example.com"
                          dir="ltr"
                          className={inputClass}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-slate-500">لن يظهر إجراء التوظيف للعملاء إلا عند التفعيل وتوفر رابط خارجي أو بريد صحيح.</p>
                  </div>
                </div>
              );
            }

            if (module.id === "location") {
              return (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm text-slate-700">
                    <span className="font-semibold text-[#2a3066]">المدينة</span>
                    <input value={fields.city} onChange={(event) => updateField("city", event.target.value)} placeholder="مثال: الرياض" className={inputClass} />
                  </label>
                  <label className="grid gap-1.5 text-sm text-slate-700">
                    <span className="font-semibold text-[#2a3066]">الحي</span>
                    <input value={fields.district} onChange={(event) => updateField("district", event.target.value)} placeholder="مثال: الملقا" className={inputClass} />
                  </label>
                  <label className="grid gap-1.5 text-sm text-slate-700 sm:col-span-2">
                    <span className="font-semibold text-[#2a3066]">رابط Google Maps</span>
                    <input value={fields.googleMapsLink} onChange={(event) => updateField("googleMapsLink", event.target.value)} placeholder="https://maps.google.com/..." dir="ltr" className={inputClass} />
                  </label>
                </div>
              );
            }

            if (module.id === "about") {
              return (
                <label className="grid gap-1.5 text-sm text-slate-700">
                  <span className="font-semibold text-[#2a3066]">الوصف التفصيلي</span>
                  <textarea value={fields.description} onChange={(event) => updateField("description", event.target.value)} placeholder="عرّف عملاءك بنشاطك بصورة أوضح" className={textAreaClass} />
                </label>
              );
            }

            if (module.id === "services") {
              return (
                <label className="grid gap-1.5 text-sm text-slate-700">
                  <span className="font-semibold text-[#2a3066]">عنوان قسم الخدمات</span>
                  <input
                    value={module.config.serviceSectionTitle ?? module.config.title ?? ""}
                    onChange={(event) =>
                      patchModuleConfig("services", (config) => ({
                        ...config,
                        serviceSectionTitle: event.target.value,
                        title: event.target.value,
                      }))
                    }
                    placeholder="مثال: الخدمات / القائمة / الباقات"
                    className={inputClass}
                  />
                </label>
              );
            }

            if (module.id === "externalStore") {
              return (
                <label className="grid gap-1.5 text-sm text-slate-700">
                  <span className="font-semibold text-[#2a3066]">رابط المتجر الإلكتروني الخارجي</span>
                  <input
                    value={module.config.externalStoreUrl ?? ""}
                    onChange={(event) =>
                      patchModuleConfig("externalStore", (config) => ({
                        ...config,
                        externalStoreUrl: normalizeHttpUrl(event.target.value),
                      }))
                    }
                    placeholder="https://store.example.com"
                    dir="ltr"
                    className={inputClass}
                  />
                </label>
              );
            }

            if (module.id === "products") {
              const featuredIds = module.config.featuredProductIds ?? [];
              const links = module.config.productExternalLinks ?? {};
              const canAddFeatured = featuredIds.length < 3;

              return (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500">الحد الأعلى للمنتجات المميزة: 3 منتجات</p>
                  <div className="space-y-2">
                    {activeProducts.map((product) => {
                      const selected = featuredIds.includes(product.id);
                      const linkValue = links[product.id] ?? "";

                      return (
                        <div key={product.id} className="rounded-xl border border-[#e8ebf7] bg-white p-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-[#1f2552]">{product.name}</p>
                            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700">
                              <input
                                type="checkbox"
                                checked={selected}
                                disabled={!selected && !canAddFeatured}
                                onChange={(event) => {
                                  const checked = event.target.checked;
                                  patchModuleConfig("products", (config) => {
                                    const current = config.featuredProductIds ?? [];
                                    const next = checked
                                      ? [...current, product.id].slice(0, 3)
                                      : current.filter((id) => id !== product.id);
                                    return {
                                      ...config,
                                      featuredProductIds: next,
                                    };
                                  });
                                }}
                              />
                              منتج مميز
                            </label>
                          </div>

                          <label className="mt-2 grid gap-1 text-xs text-slate-600">
                            <span>رابط المنتج الخارجي</span>
                            <input
                              value={linkValue}
                              onChange={(event) => {
                                patchModuleConfig("products", (config) => ({
                                  ...config,
                                  productExternalLinks: {
                                    ...(config.productExternalLinks ?? {}),
                                    [product.id]: normalizeHttpUrl(event.target.value),
                                  },
                                }));
                              }}
                              placeholder="https://merchant.com/product"
                              dir="ltr"
                              className={inputClass}
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            if (module.id === "contactTeam") {
              const sales = module.config.salesTeam ?? [];
              const support = module.config.customerServiceTeam ?? [];

              const updateTeam = (kind: "salesTeam" | "customerServiceTeam", next: ContactTeamMember[]) => {
                patchModuleConfig("contactTeam", (config) => ({
                  ...config,
                  [kind]: next.map((member, index) => ({
                    ...member,
                    sortOrder: index,
                  })),
                }));
              };

              const move = (list: ContactTeamMember[], index: number, direction: -1 | 1) => {
                const target = index + direction;
                if (target < 0 || target >= list.length) return list;
                const next = [...list];
                const [item] = next.splice(index, 1);
                next.splice(target, 0, item);
                return next;
              };

              const renderTeamList = (label: string, kind: "salesTeam" | "customerServiceTeam", list: ContactTeamMember[]) => (
                <div className="space-y-2 rounded-xl border border-[#e9ecf9] bg-[#fbfcff] p-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-[#1f2552]">{label}</p>
                    <button
                      type="button"
                      disabled={list.length >= 3}
                      onClick={() => updateTeam(kind, [...list, createTeamMember()])}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d9ddf1] bg-white px-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      إضافة
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">الحد الأعلى: 3 أعضاء</p>

                  {list.map((member, index) => (
                    <div key={member.id} className="space-y-2 rounded-lg border border-[#e6eaf7] bg-white p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-700">عضو #{index + 1}</p>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => updateTeam(kind, move(list, index, -1))} className="h-7 rounded border border-[#e2e7f6] px-2 text-xs">↑</button>
                          <button type="button" onClick={() => updateTeam(kind, move(list, index, 1))} className="h-7 rounded border border-[#e2e7f6] px-2 text-xs">↓</button>
                          <button type="button" onClick={() => updateTeam(kind, list.filter((entry) => entry.id !== member.id))} className="inline-flex h-7 items-center gap-1 rounded border border-rose-200 px-2 text-xs text-rose-700">
                            <Trash2 className="h-3.5 w-3.5" />
                            حذف
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <input value={member.name ?? ""} onChange={(event) => updateTeam(kind, list.map((entry) => entry.id === member.id ? { ...entry, name: event.target.value } : entry))} placeholder="الاسم" className={inputClass} />
                        <input value={member.title ?? ""} onChange={(event) => updateTeam(kind, list.map((entry) => entry.id === member.id ? { ...entry, title: event.target.value } : entry))} placeholder="المسمى الوظيفي" className={inputClass} />
                        <input value={member.whatsapp ?? ""} onChange={(event) => updateTeam(kind, list.map((entry) => entry.id === member.id ? { ...entry, whatsapp: event.target.value } : entry))} placeholder="واتساب" className={inputClass} dir="ltr" />
                        <input value={member.phone ?? ""} onChange={(event) => updateTeam(kind, list.map((entry) => entry.id === member.id ? { ...entry, phone: event.target.value } : entry))} placeholder="هاتف" className={inputClass} dir="ltr" />
                        <input value={member.email ?? ""} onChange={(event) => updateTeam(kind, list.map((entry) => entry.id === member.id ? { ...entry, email: event.target.value } : entry))} placeholder="email@example.com" className={inputClass} dir="ltr" />
                        <input value={member.photoUrl ?? ""} onChange={(event) => updateTeam(kind, list.map((entry) => entry.id === member.id ? { ...entry, photoUrl: event.target.value } : entry))} placeholder="رابط الصورة" className={inputClass} dir="ltr" />
                      </div>

                      <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                        <input type="checkbox" checked={member.visible !== false} onChange={(event) => updateTeam(kind, list.map((entry) => entry.id === member.id ? { ...entry, visible: event.target.checked } : entry))} />
                        ظاهر في الصفحة
                      </label>
                    </div>
                  ))}
                </div>
              );

              return (
                <div className="space-y-3">
                  {renderTeamList("فريق المبيعات", "salesTeam", sales)}
                  {renderTeamList("خدمة العملاء", "customerServiceTeam", support)}
                </div>
              );
            }

            if (module.id === "portfolio") {
              const items = module.config.portfolioItems ?? [];

              const updateItems = (next: PortfolioItem[]) => {
                patchModuleConfig("portfolio", (config) => ({
                  ...config,
                  portfolioItems: next.map((item, index) => ({
                    ...item,
                    sortOrder: index,
                  })),
                }));
              };

              const moveItem = (index: number, direction: -1 | 1) => {
                const target = index + direction;
                if (target < 0 || target >= items.length) return;
                const next = [...items];
                const [item] = next.splice(index, 1);
                next.splice(target, 0, item);
                updateItems(next);
              };

              return (
                <div className="space-y-2 rounded-xl border border-[#e9ecf9] bg-[#fbfcff] p-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-[#1f2552]">عناصر البورتفوليو</p>
                    <button
                      type="button"
                      disabled={items.length >= 6}
                      onClick={() => updateItems([...items, createPortfolioItem()])}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d9ddf1] bg-white px-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      إضافة
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">الحد الأعلى: 6 عناصر</p>

                  {items.map((item, index) => (
                    <div key={item.id} className="space-y-2 rounded-lg border border-[#e6eaf7] bg-white p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-700">عنصر #{index + 1}</p>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => moveItem(index, -1)} className="h-7 rounded border border-[#e2e7f6] px-2 text-xs">↑</button>
                          <button type="button" onClick={() => moveItem(index, 1)} className="h-7 rounded border border-[#e2e7f6] px-2 text-xs">↓</button>
                          <button type="button" onClick={() => updateItems(items.filter((entry) => entry.id !== item.id))} className="inline-flex h-7 items-center gap-1 rounded border border-rose-200 px-2 text-xs text-rose-700">
                            <Trash2 className="h-3.5 w-3.5" />
                            حذف
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <input value={item.title ?? ""} onChange={(event) => updateItems(items.map((entry) => entry.id === item.id ? { ...entry, title: event.target.value } : entry))} placeholder="العنوان" className={inputClass} />
                        <input value={item.url ?? ""} onChange={(event) => updateItems(items.map((entry) => entry.id === item.id ? { ...entry, url: normalizeHttpUrl(event.target.value) } : entry))} placeholder="رابط المشروع (اختياري)" className={inputClass} dir="ltr" />
                        <input value={item.imageUrl ?? ""} onChange={(event) => updateItems(items.map((entry) => entry.id === item.id ? { ...entry, imageUrl: normalizeHttpUrl(event.target.value) } : entry))} placeholder="رابط الصورة" className={inputClass} dir="ltr" />
                        <input value={item.description ?? ""} onChange={(event) => updateItems(items.map((entry) => entry.id === item.id ? { ...entry, description: event.target.value } : entry))} placeholder="وصف مختصر" className={inputClass} />
                        <input value={item.ctaLabel ?? ""} onChange={(event) => updateItems(items.map((entry) => entry.id === item.id ? { ...entry, ctaLabel: event.target.value } : entry))} placeholder="تسمية CTA (افتراضي: عرض العمل)" className={inputClass} />
                      </div>

                      <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                        <input type="checkbox" checked={item.visible !== false} onChange={(event) => updateItems(items.map((entry) => entry.id === item.id ? { ...entry, visible: event.target.checked } : entry))} />
                        ظاهر في الصفحة
                      </label>
                    </div>
                  ))}
                </div>
              );
            }

            if (module.id === "companyProfile") {
              const companyProfile = module.config.companyProfile ?? {
                title: "الملف التعريفي",
                description: "",
                ctaLabel: "عرض الملف التعريفي",
                pdfUrl: "",
                pdfStorageKey: "",
                pdfFileName: "",
                pdfFileSize: 0,
                visible: true,
              };

              const formatBytes = (bytes?: number) => {
                const value = Number(bytes ?? 0);
                if (!Number.isFinite(value) || value <= 0) return "";
                if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
                return `${(value / (1024 * 1024)).toFixed(2)} MB`;
              };

              const setCompanyProfile = (next: Partial<typeof companyProfile>) => {
                patchModuleConfig("companyProfile", (config) => ({
                  ...config,
                  companyProfile: {
                    ...companyProfile,
                    ...next,
                  },
                }));
              };

              const onUploadPdf = async (event: { target: HTMLInputElement }) => {
                const file = event.target.files?.[0] ?? null;
                event.target.value = "";
                if (!file) return;

                setCompanyProfileUploadError("");
                setCompanyProfileUploading(true);

                try {
                  const formData = new FormData();
                  formData.set("file", file);
                  if (companyProfile.pdfStorageKey?.trim()) {
                    formData.set("previousStorageKey", companyProfile.pdfStorageKey.trim());
                  }
                  const response = await fetch("/api/dashboard/my-page/company-profile/upload", {
                    method: "POST",
                    body: formData,
                  });
                  const result = (await response.json().catch(() => ({}))) as { error?: string; url?: string; storageKey?: string; fileName?: string; size?: number };
                  if (!response.ok || !result.url) {
                    throw new Error(result.error ?? "تعذر رفع الملف التعريفي");
                  }

                  setCompanyProfile({
                    pdfUrl: result.url,
                    pdfStorageKey: result.storageKey ?? "",
                    pdfFileName: result.fileName ?? file.name,
                    pdfFileSize: result.size ?? file.size,
                    visible: true,
                  });
                } catch (error) {
                  setCompanyProfileUploadError(error instanceof Error ? error.message : "تعذر رفع الملف التعريفي");
                } finally {
                  setCompanyProfileUploading(false);
                }
              };

              return (
                <div className="space-y-3 rounded-xl border border-[#e7ebf9] bg-[#fbfcff] p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#2a3066]" />
                    <p className="text-sm font-black text-[#2a3066]">Company Profile</p>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#2a3066]">
                    <input
                      type="checkbox"
                      checked={companyProfile.visible !== false}
                      onChange={(event) => setCompanyProfile({ visible: event.target.checked })}
                    />
                    إظهار قسم الملف التعريفي في الصفحة العامة
                  </label>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={companyProfile.title ?? ""}
                      onChange={(event) => setCompanyProfile({ title: event.target.value })}
                      placeholder="العنوان (افتراضي: الملف التعريفي)"
                      className={inputClass}
                    />
                    <input
                      value={companyProfile.ctaLabel ?? ""}
                      onChange={(event) => setCompanyProfile({ ctaLabel: event.target.value })}
                      placeholder="نص الزر (افتراضي: عرض الملف التعريفي)"
                      className={inputClass}
                    />
                    <textarea
                      value={companyProfile.description ?? ""}
                      onChange={(event) => setCompanyProfile({ description: event.target.value })}
                      placeholder="وصف مختصر (اختياري)"
                      className={`${textAreaClass} sm:col-span-2 min-h-[86px]`}
                    />
                  </div>

                  <div className="space-y-2 rounded-xl border border-[#e6eaf7] bg-white p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-[#d9ddf1] bg-[#f8faff] px-3 text-xs font-bold text-[#2a3066]">
                        {companyProfile.pdfUrl ? "استبدال PDF" : "رفع PDF"}
                        <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={onUploadPdf} disabled={companyProfileUploading} />
                      </label>
                      {companyProfile.pdfUrl ? (
                        <button
                          type="button"
                          onClick={async () => {
                            const storageKey = String(companyProfile.pdfStorageKey ?? "").trim();
                            if (storageKey) {
                              await fetch("/api/dashboard/my-page/company-profile/upload", {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ storageKey }),
                              });
                            }

                            setCompanyProfile({ pdfUrl: "", pdfStorageKey: "", pdfFileName: "", pdfFileSize: 0 });
                          }}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700"
                        >
                          إزالة الملف
                        </button>
                      ) : null}
                      {companyProfileUploading ? <span className="text-xs text-amber-700">جارٍ الرفع...</span> : null}
                    </div>
                    {companyProfile.pdfUrl ? (
                      <p className="text-xs text-slate-600" dir="ltr">
                        {companyProfile.pdfFileName || "company-profile.pdf"}
                        {companyProfile.pdfFileSize ? ` • ${formatBytes(companyProfile.pdfFileSize)}` : ""}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">ارفع ملف PDF فقط (حد أقصى 5MB).</p>
                    )}
                    {companyProfileUploadError ? <p className="text-xs text-rose-700">{companyProfileUploadError}</p> : null}
                  </div>
                </div>
              );
            }

            return null;
          }}
        />

        <section className="rounded-2xl border border-[#edf0fb] bg-white p-2">
          <details>
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2 text-base font-black text-[#22295b]">
              <span>مظهر الصفحة</span>
              <ChevronLeft className="h-4 w-4 text-slate-500" />
            </summary>
            <div className="mt-2 grid gap-3 border-t border-[#edf0fb] px-3 pb-3 pt-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm text-slate-700">
                <span className="font-semibold text-[#2a3066]">اللون الأساسي</span>
                <input type="color" value={fields.primaryColor} onChange={(event) => updateField("primaryColor", event.target.value)} className="h-11 w-full rounded-xl border border-[#e7eaf7] bg-[#fafbff] p-1.5" />
              </label>
              <label className="grid gap-1.5 text-sm text-slate-700">
                <span className="font-semibold text-[#2a3066]">الثيم</span>
                <select value={fields.themeMode} onChange={(event) => updateField("themeMode", event.target.value as AutosaveFields["themeMode"])} className={inputClass}>
                  <option value="light">فاتح</option>
                  <option value="dark">داكن</option>
                  <option value="auto">تلقائي</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm text-slate-700">
                <span className="font-semibold text-[#2a3066]">نمط الأزرار</span>
                <select value={fields.buttonStyle} onChange={(event) => updateField("buttonStyle", event.target.value as AutosaveFields["buttonStyle"])} className={inputClass}>
                  <option value="filled">ممتلئ</option>
                  <option value="soft">ناعم</option>
                  <option value="outline">حدود</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm text-slate-700">
                <span className="font-semibold text-[#2a3066]">نمط البطاقات</span>
                <select value={fields.cardStyle} onChange={(event) => updateField("cardStyle", event.target.value as AutosaveFields["cardStyle"])} className={inputClass}>
                  <option value="flat">مسطح</option>
                  <option value="bordered">حدود</option>
                  <option value="shadow">ظل خفيف</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm text-slate-700">
                <span className="font-semibold text-[#2a3066]">حواف البطاقات</span>
                <select value={fields.cornerRadius} onChange={(event) => updateField("cornerRadius", event.target.value as AutosaveFields["cornerRadius"])} className={inputClass}>
                  <option value="sm">صغير</option>
                  <option value="md">متوسط</option>
                  <option value="lg">كبير</option>
                </select>
              </label>
            </div>
          </details>
        </section>

        {!isPublished ? (
          <section className="space-y-3 rounded-2xl border border-[#f3dfb3] bg-[#fff9ed] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-black text-[#7a5312]">لديك تغييرات غير منشورة</h3>
                <p className="text-sm text-[#9a6b1d]">حُفظت تعديلاتك، لكنها لن تظهر للعميل حتى تنشر الصفحة.</p>
              </div>
              <form action={publishAction}>
                <Button type="submit" disabled={publishPending} size="sm" className="rounded-xl">
                  {publishPending ? "جارٍ النشر..." : "نشر التغييرات"}
                </Button>
              </form>
            </div>
            {publishState.error ? <p className="text-sm text-rose-700">{publishState.error}</p> : null}
            {publishState.success ? <p className="text-sm text-emerald-700">{publishState.success}</p> : null}
          </section>
        ) : null}
      </section>

      <aside className="hidden lg:block lg:[direction:rtl]">
        <div className="sticky top-20 space-y-3 rounded-2xl border border-[#edf0fb] bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-black text-[#22295b]">معاينة صفحتك</h3>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              مباشر
            </span>
          </div>
          <div className="overflow-hidden rounded-[20px] border border-[#dfe3f4] bg-white">
            {previewMode === "phone" ? (
              <div className="mx-auto w-[326px] py-3">
                <div className="overflow-hidden rounded-[34px] border-[6px] border-[#111827] bg-white shadow-[0_20px_50px_-28px_rgba(15,23,42,0.55)]">
                  <iframe key={`${previewVersion}-phone`} src={`/${business.slug}?preview=${previewVersion}`} title="معاينة الصفحة" className="h-[640px] w-full" />
                </div>
              </div>
            ) : (
              <iframe key={`${previewVersion}-desktop`} src={`/${business.slug}?preview=${previewVersion}&surface=desktop`} title="معاينة الصفحة" className="h-[668px] w-full" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode("phone")}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition ${previewMode === "phone" ? "border-[#d8d1ff] bg-[#f3f0ff] text-[#5349d8]" : "border-[#e5e8f5] bg-white text-slate-600"}`}
            >
              <Smartphone className="h-4 w-4" />
              الهاتف
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("desktop")}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition ${previewMode === "desktop" ? "border-[#d8d1ff] bg-[#f3f0ff] text-[#5349d8]" : "border-[#e5e8f5] bg-white text-slate-600"}`}
            >
              <Monitor className="h-4 w-4" />
              سطح المكتب
            </button>
          </div>
          <p className="text-xs text-slate-500">المعاينة تعرض الصفحة الفعلية نفسها وتُحدّث بعد نجاح الحفظ التلقائي.</p>
        </div>
      </aside>

      {previewOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-900/35 p-3 backdrop-blur-sm lg:hidden">
          <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-[#eceffc] bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-[#eceffc] p-3">
              <div>
                <h3 className="text-lg font-black text-[#22295b]">معاينة صفحتي</h3>
                <p className="text-xs text-slate-500">معاينة مباشرة في شاشة كاملة.</p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => setPreviewOpen(false)}>
                إغلاق
              </Button>
            </div>
            <iframe key={`mobile-${previewVersion}`} src={`/${business.slug}?preview=${previewVersion}`} title="معاينة الصفحة" className="min-h-0 flex-1 border-0" />
          </div>
        </div>
      ) : null}

      {qrOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-[#eceffc] bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-[#22295b]">رمز المشاركة</h3>
                <p className="text-xs text-slate-500">امسح الرمز أو شاركه مباشرة.</p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => setQrOpen(false)}>
                إغلاق
              </Button>
            </div>
            <PublicQrCard qrDataUrl={qrDataUrl} publicUrl={publicUrl} accentColor={fields.primaryColor || business.primaryColor || "#5D43EF"} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
