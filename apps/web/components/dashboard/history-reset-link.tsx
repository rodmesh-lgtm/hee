"use client";

import Link from "next/link";

export function HistoryResetLink({ href, className }: { href: string; className: string }) {
  return <Link href={href} className={className} onClick={(event) => {
    // A same-URL navigation does not remount uncontrolled inputs. Clear any
    // unsubmitted edits first, then let navigation restore the default query.
    event.currentTarget.closest("#history")?.querySelector<HTMLFormElement>('form[method="get"]')?.reset();
  }}>مسح البحث والتصفية</Link>;
}
