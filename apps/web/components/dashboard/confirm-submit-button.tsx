"use client";

import { Trash2 } from "lucide-react";

type Props = {
  label?: string;
  confirmMessage: string;
  className?: string;
  compact?: boolean;
};

export function ConfirmSubmitButton({ label = "حذف", confirmMessage, className = "", compact = false }: Props) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
      className={className || (compact ? "rounded-lg p-2 text-rose-600 hover:bg-rose-50" : "inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-50")}
    >
      <Trash2 className={compact ? "h-4 w-4" : "h-3.5 w-3.5"} />
      {!compact ? label : null}
    </button>
  );
}
