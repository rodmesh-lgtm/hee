const navLinks = [
  { label: "الرئيسية", href: "#home" },
  { label: "المزايا", href: "#features" },
  { label: "الأسعار", href: "#pricing" },
  { label: "الدخول", href: "#cta" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-black text-white shadow-lg shadow-indigo-500/30">
            H
          </div>
          <div>
            <p className="text-lg font-black tracking-tight text-slate-900">HEE</p>
            <p className="text-[11px] text-slate-500">منصة الأعمال الرقمية</p>
          </div>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-700 md:flex">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className="transition hover:text-indigo-600">
              {link.label}
            </a>
          ))}
        </nav>

        <button className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-700">
          ابدأ مجاناً
        </button>
      </div>
    </header>
  );
}
