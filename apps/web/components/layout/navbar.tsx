import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { Container } from "../shared/container";

const navLinks = [
  { label: "الرئيسية", href: "/#home" },
  { label: "المزايا", href: "/#features" },
  { label: "الأنواع", href: "/#business-types" },
  { label: "الأسعار", href: "/#pricing" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <Container className="flex items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-black text-white">
            H
          </div>
          <div>
            <div className="text-sm font-black text-slate-950 dark:text-white">HEE</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-300">Growth Platform</div>
          </div>
        </div>

        <nav className="hidden items-center gap-6 lg:flex">
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-semibold text-slate-600 transition hover:text-indigo-700 dark:text-slate-200 dark:hover:text-indigo-300">
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
