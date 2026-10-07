import Link from "next/link";
import { ArrowUpLeft, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
export function WorkspaceHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className="wa-heading"><div className="wa-heading-copy"><span className="wa-eyebrow"><MessageCircle aria-hidden="true" size={15}/>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action ? <div className="wa-heading-actions">{action}</div> : null}</header>;
}
export function WorkspaceMetric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <article className="wa-metric"><span>{label}</span><strong>{typeof value === "number" ? value.toLocaleString("ar-SA") : value}</strong>{hint ? <small>{hint}</small> : null}</article>;
}
export function WorkspaceEmpty({ title, description, href, label }: { title: string; description: string; href?: string; label?: string }) {
  return <div className="wa-empty"><MessageCircle size={28} aria-hidden="true"/><h3>{title}</h3><p>{description}</p>{href ? <Link href={href} className="wa-button">{label}<ArrowUpLeft size={16} aria-hidden="true"/></Link> : null}</div>;
}
