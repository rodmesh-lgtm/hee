import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { IrLogo } from "../brand/ir-logo";
import { Button } from "../ui/button";
import { Container } from "../shared/container";

const navLinks = [
  { label: "الرئيسية", href: "/#home" },
  { label: "المزايا", href: "/#features" },
  { label: "كيف تعمل", href: "/#how-it-works" },
  { label: "الأسعار", href: "/#pricing" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
      <Container className="flex items-center justify-between gap-4 py-3">
        <Link href="/" className="flex items-center gap-3" aria-label="iR - منصة هوية أعمال رقمية">
          <IrLogo className="h-11 w-11" priority />
          <div className="hidden sm:block">
            <div className="text-sm font-black text-slate-950 dark:text-white">iR</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-300">هوية أعمال رقمية</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="التنقل الرئيسي">
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-semibold text-slate-600 transition hover:text-violet-700 dark:text-slate-200 dark:hover:text-violet-300">
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href="/register">
          <Button variant="secondary" size="sm" icon={<Sparkles className="h-4 w-4" />}>
            ابدأ الآن
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </Container>
    </header>
  );
}
