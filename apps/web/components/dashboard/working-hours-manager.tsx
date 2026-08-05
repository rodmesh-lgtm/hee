"use client";

import { useActionState, useState } from "react";
import { saveWorkingHoursStepAction, type BuilderActionState } from "../../app/actions/page-builder";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

type HourRow = {
  dayOfWeek: number;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  secondOpensAt: string | null;
  secondClosesAt: string | null;
};

const dayNames = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];
const defaultState: BuilderActionState = {};

export function WorkingHoursManager({ openingHours }: { openingHours: HourRow[] }) {
  const [state, action, pending] = useActionState(saveWorkingHoursStepAction, defaultState);
  const [hours, setHours] = useState(
    dayNames.map((_, dayOfWeek) => {
      const existing = openingHours.find((item) => item.dayOfWeek === dayOfWeek);
      return {
        dayOfWeek,
        isClosed: existing?.isClosed ?? false,
        opensAt: existing?.opensAt ?? "09:00",
        closesAt: existing?.closesAt ?? "23:00",
        secondOpensAt: existing?.secondOpensAt ?? "",
        secondClosesAt: existing?.secondClosesAt ?? "",
      };
    }),
  );

  return (
    <Card className="space-y-4 bg-slate-950/75" hoverLift={false}>
      <h2 className="text-2xl font-black text-white">ساعات العمل</h2>
      <p className="text-sm text-slate-300">عدّل ساعات كل يوم بسهولة. يمكنك تحديد فترة واحدة أو فترتين خلال اليوم.</p>

      <form action={action} className="space-y-4">
        <input
          type="hidden"
          name="hoursJson"
          value={JSON.stringify(
            hours.map((item) => ({
              ...item,
              secondOpensAt: item.secondOpensAt || null,
              secondClosesAt: item.secondClosesAt || null,
            })),
          )}
        />

        <div className="space-y-3">
          {hours.map((hour, index) => (
            <div key={hour.dayOfWeek} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-white">{dayNames[index]}</p>
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={hour.isClosed}
                    onChange={(event) => {
                      setHours((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? {
                                ...row,
                                isClosed: event.target.checked,
                              }
                            : row,
                        ),
                      );
                    }}
                  />
                  مغلق
                </label>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="time"
                  disabled={hour.isClosed}
                  value={hour.opensAt ?? ""}
                  onChange={(event) => {
                    setHours((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index
                          ? {
                              ...row,
                              opensAt: event.target.value,
                            }
                          : row,
                      ),
                    );
                  }}
                  className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white"
                />
                <input
                  type="time"
                  disabled={hour.isClosed}
                  value={hour.closesAt ?? ""}
                  onChange={(event) => {
                    setHours((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index
                          ? {
                              ...row,
                              closesAt: event.target.value,
                            }
                          : row,
                      ),
                    );
                  }}
                  className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white"
                />
                <input
                  type="time"
                  disabled={hour.isClosed}
                  value={hour.secondOpensAt ?? ""}
                  onChange={(event) => {
                    setHours((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index
                          ? {
                              ...row,
                              secondOpensAt: event.target.value,
                            }
                          : row,
                      ),
                    );
                  }}
                  className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white"
                />
                <input
                  type="time"
                  disabled={hour.isClosed}
                  value={hour.secondClosesAt ?? ""}
                  onChange={(event) => {
                    setHours((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index
                          ? {
                              ...row,
                              secondClosesAt: event.target.value,
                            }
                          : row,
                      ),
                    );
                  }}
                  className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white"
                />
              </div>
            </div>
          ))}
        </div>

        {state.error ? <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{state.error}</p> : null}
        {state.success ? <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{state.success}</p> : null}

        <Button type="submit" disabled={pending}>{pending ? "جاري الحفظ..." : "حفظ ساعات العمل"}</Button>
      </form>
    </Card>
  );
}
