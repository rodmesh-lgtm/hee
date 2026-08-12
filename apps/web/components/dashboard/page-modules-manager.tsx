"use client";

import { useMemo, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { ArrowDown, ArrowUp, Briefcase, Eye, EyeOff, FileText, GripVertical, Info, Link2, MapPin, MessageCircle, MoreHorizontal, Package, Phone, Plus, Sparkles, Store, Timer, UsersRound, X } from "lucide-react";
import { PAGE_MODULE_LABELS, type PageModuleId, type PageModuleState } from "../../app/lib/page-modules";

type PageModulesManagerProps = {
  businessType: string;
  value: PageModuleState[];
  onChange: (modules: PageModuleState[]) => void;
  renderModuleSettings?: (module: PageModuleState) => React.ReactNode;
};

const blockDescriptions: Record<PageModuleId, string> = {
  about: "تعريف سريع بنشاطك",
  products: "عرض منتجاتك",
  services: "عرض خدماتك",
  request: "زر طلب أو حجز مباشر",
  inquiry: "استقبال استفسارات العملاء",
  location: "عنوانك ورابط الخريطة",
  hours: "مواعيد العمل",
  contact: "وسائل التواصل",
  links: "روابط إضافية",
  externalStore: "رابط متجرك الإلكتروني ومنتجاتك المميزة",
  companyProfile: "ملف تعريفي للشركة بصيغة PDF",
  contactTeam: "فريق المبيعات وخدمة العملاء",
  portfolio: "نماذج أعمالك ومشاريعك",
};

const moduleIcons: Record<PageModuleId, React.ComponentType<{ className?: string }>> = {
  products: Package,
  services: Sparkles,
  request: MessageCircle,
  inquiry: MessageCircle,
  location: MapPin,
  hours: Timer,
  about: Info,
  contact: Phone,
  links: Link2,
  externalStore: Store,
  companyProfile: FileText,
  contactTeam: UsersRound,
  portfolio: Briefcase,
};

function reorderModules(modules: PageModuleState[]) {
  return modules.map((module, index) => ({ ...module, sortOrder: index }));
}

function updateModule(modules: PageModuleState[], moduleId: PageModuleState["id"], updater: (module: PageModuleState) => PageModuleState) {
  return reorderModules(modules.map((module) => (module.id === moduleId ? updater(module) : module)));
}

function reorderEnabledModules(modules: PageModuleState[], nextEnabledOrder: PageModuleId[]) {
  const ordered = [...modules].sort((left, right) => left.sortOrder - right.sortOrder);
  const byId = new Map(ordered.map((module) => [module.id, module] as const));
  const enabledIndexes: number[] = [];

  ordered.forEach((module, index) => {
    if (module.enabled) {
      enabledIndexes.push(index);
    }
  });

  const nextEnabled = nextEnabledOrder.map((id) => byId.get(id)).filter((module): module is PageModuleState => Boolean(module));
  const nextOrdered = [...ordered];
  enabledIndexes.forEach((slotIndex, enabledIndex) => {
    const replacement = nextEnabled[enabledIndex];
    if (replacement) {
      nextOrdered[slotIndex] = replacement;
    }
  });

  return reorderModules(nextOrdered);
}

function moveEnabledModule(modules: PageModuleState[], moduleId: PageModuleId, direction: "up" | "down") {
  const enabled = [...modules].filter((module) => module.enabled);
  const currentIndex = enabled.findIndex((module) => module.id === moduleId);
  if (currentIndex === -1) {
    return modules;
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= enabled.length) {
    return modules;
  }

  const nextEnabled = [...enabled];
  const [moved] = nextEnabled.splice(currentIndex, 1);
  nextEnabled.splice(targetIndex, 0, moved);
  return reorderEnabledModules(modules, nextEnabled.map((module) => module.id));
}

function blockTitle(module: PageModuleState) {
  return module.config.title?.trim() || PAGE_MODULE_LABELS[module.id];
}

function ModuleRow({
  module,
  isActive,
  ordered,
  onChange,
  onToggleActive,
  canMoveUp,
  canMoveDown,
  isMenuOpen,
  onToggleMenu,
  onCloseMenu,
  customSettings,
  isDragging,
  onDragStateChange,
}: {
  module: PageModuleState;
  isActive: boolean;
  ordered: PageModuleState[];
  onChange: (modules: PageModuleState[]) => void;
  onToggleActive: (id: PageModuleState["id"]) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isMenuOpen: boolean;
  onToggleMenu: (id: PageModuleState["id"]) => void;
  onCloseMenu: () => void;
  customSettings?: React.ReactNode;
  isDragging: boolean;
  onDragStateChange: (id: PageModuleId, dragging: boolean) => void;
}) {
  const dragControls = useDragControls();
  const ModuleIcon = moduleIcons[module.id] ?? Store;
  const companyProfileFileName = module.id === "companyProfile" ? String(module.config.companyProfile?.pdfFileName ?? "").trim() : "";

  return (
    <Reorder.Item
      key={module.id}
      value={module.id}
      drag="y"
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0.05}
      whileDrag={{ scale: 1.01, zIndex: 30, boxShadow: "0 16px 30px -24px rgba(36,43,94,0.42)" }}
      onDragStart={() => onDragStateChange(module.id, true)}
      onDragEnd={() => onDragStateChange(module.id, false)}
      className="list-none"
    >
      <div
        className={`rounded-2xl border p-3 transition ${
          isDragging ? "border-[#cdc4ff] bg-[#f5f2ff]" : isActive ? "border-[#d9d0ff] bg-[#f8f6ff]" : "border-[#eef1fa] bg-white"
        }`}
      >
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            style={{ touchAction: "none" }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              dragControls.start(event, { snapToCursor: true });
            }}
            className="inline-flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-slate-400 active:cursor-grabbing"
            aria-label="تحريك القسم"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onToggleActive(module.id)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-right"
          >
            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${module.enabled ? "bg-[#ece8ff] text-[#5a4fd5]" : "bg-[#f3f4f9] text-slate-500"}`}>
              <ModuleIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <span className="block truncate text-sm font-black text-[#242b5e]">{blockTitle(module)}</span>
              <span className={`text-[11px] font-bold ${module.enabled ? "text-emerald-700" : "text-slate-500"}`}>{module.enabled ? "ظاهر" : "مخفي"}</span>
              {companyProfileFileName ? (
                <span className="mt-0.5 block truncate text-[10px] font-medium text-[#5a4fd5]" dir="ltr">
                  {companyProfileFileName}
                </span>
              ) : null}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onToggleMenu(module.id)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-[#f7f8ff]"
            aria-label="إجراءات القسم"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {isMenuOpen ? (
            <div className="absolute left-0 top-11 z-20 w-44 rounded-2xl border border-[#eceffc] bg-white p-2 shadow-[0_24px_50px_-35px_rgba(36,43,94,0.35)]">
              <button
                type="button"
                onClick={() => {
                  onToggleActive(module.id);
                  onCloseMenu();
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-bold text-[#263064] hover:bg-[#f7f7ff]"
              >
                تعديل
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(updateModule(ordered, module.id, (item) => ({ ...item, enabled: !item.enabled })));
                  onCloseMenu();
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-bold text-[#263064] hover:bg-[#f7f7ff]"
              >
                {module.enabled ? "إخفاء" : "إظهار"}
                {module.enabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(updateModule(ordered, module.id, (item) => ({ ...item, enabled: false })));
                  onCloseMenu();
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50"
              >
                إزالة
              </button>
              <div className="my-1 h-px bg-[#eceffc]" />
              <button
                type="button"
                onClick={() => {
                  onChange(moveEnabledModule(ordered, module.id, "up"));
                  onCloseMenu();
                }}
                disabled={!canMoveUp}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-bold text-[#263064] hover:bg-[#f7f7ff] disabled:cursor-not-allowed disabled:opacity-40"
              >
                تحريك لأعلى
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(moveEnabledModule(ordered, module.id, "down"));
                  onCloseMenu();
                }}
                disabled={!canMoveDown}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-bold text-[#263064] hover:bg-[#f7f7ff] disabled:cursor-not-allowed disabled:opacity-40"
              >
                تحريك لأسفل
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        {isActive ? (
          <div className="mt-3 space-y-3 rounded-xl border border-[#eceffc] bg-[#fbfcff] p-3">
            <p className="text-sm font-black text-[#283064]">إعدادات {blockTitle(module)}</p>
            {(module.id === "request" || module.id === "inquiry") ? (
              <>
                <label className="grid gap-1.5 text-sm text-slate-700">
                  <span className="font-semibold text-[#262c5f]">عنوان الزر</span>
                  <input
                    value={module.config.ctaLabel ?? ""}
                    onChange={(event) =>
                      onChange(
                        updateModule(ordered, module.id, (item) => ({
                          ...item,
                          config: { ...item.config, ctaLabel: event.target.value },
                        })),
                      )
                    }
                    className="h-11 rounded-xl border border-[#e8ebf7] bg-[#fafbff] px-3 text-sm text-slate-800 focus:border-[#bcb2ff] focus:outline-none"
                    placeholder="اكتب النص الظاهر على الزر"
                  />
                </label>
                <label className="grid gap-1.5 text-sm text-slate-700">
                  <span className="font-semibold text-[#262c5f]">عنوان نافذة الطلب</span>
                  <input
                    value={module.config.sheetTitle ?? ""}
                    onChange={(event) =>
                      onChange(
                        updateModule(ordered, module.id, (item) => ({
                          ...item,
                          config: { ...item.config, sheetTitle: event.target.value },
                        })),
                      )
                    }
                    className="h-11 rounded-xl border border-[#e8ebf7] bg-[#fafbff] px-3 text-sm text-slate-800 focus:border-[#bcb2ff] focus:outline-none"
                    placeholder="عنوان مختصر وواضح"
                  />
                </label>
              </>
            ) : null}

            {customSettings ? customSettings : null}

            {module.id === "products" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex items-center justify-between rounded-xl border border-[#eceffc] bg-[#fafbff] px-3 py-2.5 text-sm text-slate-700">
                  <span>إظهار السعر</span>
                  <input
                    type="checkbox"
                    checked={module.config.showPrice !== false}
                    onChange={(event) =>
                      onChange(
                        updateModule(ordered, module.id, (item) => ({
                          ...item,
                          config: { ...item.config, showPrice: event.target.checked },
                        })),
                      )
                    }
                    className="h-4 w-4"
                  />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-[#eceffc] bg-[#fafbff] px-3 py-2.5 text-sm text-slate-700">
                  <span>إظهار الوحدة</span>
                  <input
                    type="checkbox"
                    checked={module.config.showUnit !== false}
                    onChange={(event) =>
                      onChange(
                        updateModule(ordered, module.id, (item) => ({
                          ...item,
                          config: { ...item.config, showUnit: event.target.checked },
                        })),
                      )
                    }
                    className="h-4 w-4"
                  />
                </label>
              </div>
            ) : null}

            {module.id === "services" ? (
              <label className="flex items-center justify-between rounded-xl border border-[#eceffc] bg-[#fafbff] px-3 py-2.5 text-sm text-slate-700">
                <span>إظهار السعر</span>
                <input
                  type="checkbox"
                  checked={module.config.showPrice !== false}
                  onChange={(event) =>
                    onChange(
                      updateModule(ordered, module.id, (item) => ({
                        ...item,
                        config: { ...item.config, showPrice: event.target.checked },
                      })),
                    )
                  }
                  className="h-4 w-4"
                />
              </label>
            ) : null}

            {!customSettings && (module.id === "location" || module.id === "hours" || module.id === "about" || module.id === "contact" || module.id === "links") ? (
              <p className="rounded-xl border border-[#eceffc] bg-[#fafbff] px-3 py-2.5 text-sm text-slate-600">هذا القسم يعتمد على بياناتك في نموذج الصفحة، ويمكنك فقط ترتيبه أو إخفاءه.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Reorder.Item>
  );
}

export function PageModulesManager({ businessType: _businessType, value, onChange, renderModuleSettings }: PageModulesManagerProps) {
  const [activeId, setActiveId] = useState<PageModuleState["id"] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuId, setMenuId] = useState<PageModuleState["id"] | null>(null);
  const [draggingId, setDraggingId] = useState<PageModuleId | null>(null);

  const ordered = useMemo(() => [...value].sort((left, right) => left.sortOrder - right.sortOrder), [value]);
  const enabledModules = ordered.filter((module) => module.enabled);
  const disabledModules = ordered.filter((module) => !module.enabled);
  const activeModule = ordered.find((module) => module.id === activeId) ?? null;

  const enableModule = (moduleId: PageModuleId) => {
    onChange(
      reorderModules(
        ordered.map((module) =>
          module.id === moduleId
            ? {
                ...module,
                enabled: true,
              }
            : module,
        ),
      ),
    );
    setPickerOpen(false);
    setActiveId(moduleId);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-[#edf0fb] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-[#202657]">محتوى صفحتك</h2>
          <p className="mt-1 text-sm text-slate-500">رتّب الأقسام الظاهرة لعميلك بسهولة.</p>
        </div>
        <span className="rounded-full bg-[#f6f7ff] px-3 py-1 text-xs font-bold text-slate-500">{enabledModules.length} أقسام ظاهرة</span>
      </div>

      <Reorder.Group
        axis="y"
        values={enabledModules.map((module) => module.id)}
        onReorder={(next) => onChange(reorderEnabledModules(ordered, next as PageModuleId[]))}
        className="space-y-2.5"
      >
        {enabledModules.map((module) => {
          const isActive = activeModule?.id === module.id;
          const enabledIndex = enabledModules.findIndex((item) => item.id === module.id);
          return <ModuleRow key={module.id} module={module} isActive={isActive} ordered={ordered} onChange={onChange} onToggleActive={(id) => setActiveId((current) => current === id ? null : id)} canMoveUp={enabledIndex > 0} canMoveDown={enabledIndex < enabledModules.length - 1} isMenuOpen={menuId === module.id} onToggleMenu={(id) => setMenuId((current) => current === id ? null : id)} onCloseMenu={() => setMenuId(null)} customSettings={renderModuleSettings?.(module)} isDragging={draggingId === module.id} onDragStateChange={(id, dragging) => {
            setDraggingId(dragging ? id : null);
            if (dragging) {
              setMenuId((current) => (current === id ? null : current));
            }
          }} />;
        })}
      </Reorder.Group>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#cfc7ff] bg-[#f8f6ff] text-sm font-black text-[#5a4fd5] transition hover:bg-[#f2efff]"
      >
        <Plus className="h-4 w-4" />
        أضف إلى صفحتك
      </button>

      {pickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/35 p-3 sm:items-center sm:justify-center">
          <div className="w-full max-w-lg rounded-t-2xl border border-[#eceffc] bg-white p-4 shadow-2xl sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-[#23295c]">اختر ما تريد إضافته</h3>
                <p className="text-sm text-slate-500">لن تظهر إعدادات أي قسم قبل إضافته.</p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#eceffc] bg-white text-slate-500"
                aria-label="إغلاق نافذة الإضافة"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {disabledModules.map((module) => (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => enableModule(module.id)}
                  className="rounded-xl border border-[#eceffc] bg-[#fafbff] px-3 py-3 text-right transition hover:border-[#cdc4ff] hover:bg-[#f4f1ff]"
                >
                  <p className="text-sm font-bold text-[#273065]">{PAGE_MODULE_LABELS[module.id]}</p>
                  <p className="mt-1 text-xs text-slate-500">{blockDescriptions[module.id]}</p>
                </button>
              ))}
            </div>

            {disabledModules.length === 0 ? (
              <p className="rounded-xl border border-[#eceffc] bg-[#fafbff] px-3 py-3 text-sm text-slate-600">كل الأقسام المتاحة مضافة حالياً.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
