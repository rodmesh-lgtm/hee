"use client";

import { useState } from "react";
import styles from "./page.module.css";

type Rep = { name: string; role: string; phone?: string; whatsapp?: string; email?: string };
type Department = { name: string; count: number; reps: Rep[] };

const departments: Department[] = [
  { name: "المبيعات", count: 3, reps: [
    { name: "أحمد السلمي", role: "مدير مبيعات الشركات", phone: "+966500000001", whatsapp: "+966500000001", email: "sales1@example.sa" },
    { name: "نورة الحربي", role: "مسؤولة مبيعات الشركات", phone: "+966500000002", whatsapp: "+966500000002", email: "sales2@example.sa" },
    { name: "محمد العتيبي", role: "مندوب مبيعات", phone: "+966500000003", whatsapp: "+966500000003", email: "sales3@example.sa" },
  ]},
  { name: "خدمة العملاء", count: 2, reps: [
    { name: "سارة القحطاني", role: "خدمة العملاء", whatsapp: "+966500000010", email: "support@example.sa" },
    { name: "خالد المطيري", role: "متابعة العملاء", phone: "+966500000011", email: "care@example.sa" },
  ]},
  { name: "الإدارة", count: 1, reps: [
    { name: "عبدالله العتيبي", role: "الإدارة العامة", email: "admin@example.sa" }
  ]},
];

const services = [
  { title: "التطوير العقاري", desc: "تطوير مشاريع سكنية وتجارية مختارة." },
  { title: "إدارة الأملاك", desc: "إدارة وتشغيل الأصول والعقارات." },
  { title: "الوساطة العقارية", desc: "حلول بيع وتأجير وتسويق عقاري." },
];
const projects = [
  { title: "مشروع أركان ريزيدنس", meta: "فلل سكنية – الرياض" },
  { title: "أركان تاور", meta: "مكاتب تجارية – الرياض" },
  { title: "أركان فيو", meta: "شقق فاخرة – جدة" },
];
const socials = ["Instagram", "X", "LinkedIn", "Snapchat"];

function CheckBadge({ small = false }: { small?: boolean }) {
  return <span className={`${styles.verifiedBadge} ${small ? styles.badgeSmall : ""}`} aria-label="موثق">✓</span>;
}

export default function HEEProfileConceptPage() {
  const [activeDept, setActiveDept] = useState(0);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [digitalType, setDigitalType] = useState<"website" | "store">("website");
  const activeDepartment = departments[activeDept];
  const digitalLabel = digitalType === "website" ? "الموقع الإلكتروني" : "المتجر الإلكتروني";
  const digitalUrl = digitalType === "website" ? "arkan.sa" : "store.arkan.sa";

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.shell}>
        <section className={styles.profileCard}>
          <header className={styles.identity}>
            <div className={styles.logo}>أركان</div>
            <div className={styles.identityText}>
              <div className={styles.nameRow}>
                <h1>أركان العقارية</h1>
                <button className={styles.badgeButton} onClick={() => setVerificationOpen(true)} title="عرض تفاصيل التوثيق"><CheckBadge /></button>
              </div>
              <div className={styles.subtitle}>شركة أركان للتطوير والاستثمار العقاري</div>
              <div className={styles.meta}>الرياض · المملكة العربية السعودية</div>
              <p className={styles.shortBio}>نطور مشاريع سكنية وتجارية نوعية، ونقدم حلولًا عقارية واضحة لعملائنا وشركائنا.</p>
            </div>
            <button className={styles.shareButton}>مشاركة</button>
          </header>

          <div className={styles.quickActions}>
            <a href="https://wa.me/966500000000"><span>◔</span><span>واتساب</span></a>
            <a href="tel:+966500000000"><span>☎</span><span>اتصال</span></a>
            <a href="#location"><span>⌖</span><span>الموقع</span></a>
            <a href="#contact"><span>✉</span><span>استفسار</span></a>
          </div>

          <section className={styles.socialStrip}>
            <div className={styles.sectionLabel}>حساباتنا</div>
            <div className={styles.socials}>{socials.map((name) => <button key={name}>{name}</button>)}</div>
          </section>

          <section className={styles.aboutBlock}>
            <div>
              <h2>عن المنشأة</h2>
              <p>شركة سعودية متخصصة في التطوير والاستثمار العقاري وإدارة الأصول. نعمل على تقديم مشاريع ذات قيمة طويلة الأجل وتجربة تعامل أكثر وضوحًا.</p>
            </div>
            <button className={styles.profilePdf}>
              <span className={styles.pdfIcon}>PDF</span>
              <span><b>الملف التعريفي للشركة</b><small>تعرف على الشركة وخبراتها ومشاريعها</small></span>
              <span className={styles.arrow}>←</span>
            </button>
          </section>

          <section className={styles.compactSection}>
            <div className={styles.sectionHeader}><div><h2>مجالاتنا</h2><p>مختصر وواضح، دون تحويل الصفحة إلى موقع شركة كامل.</p></div><button>عرض الكل</button></div>
            <div className={styles.serviceGrid}>{services.map((s) => <article key={s.title}><div className={styles.serviceIcon}>◇</div><h3>{s.title}</h3><p>{s.desc}</p></article>)}</div>
          </section>

          <section className={styles.compactSection}>
            <div className={styles.sectionHeader}><div><h2>أعمال مختارة</h2><p>عينات لإثبات الخبرة، وليست معرضًا ضخمًا.</p></div><button>عرض الكل</button></div>
            <div className={styles.projects}>{projects.map((p, i) => <article key={p.title}><div className={`${styles.projectArt} ${styles["project" + (i+1)]}`}></div><div><b>{p.title}</b><small>{p.meta}</small></div></article>)}</div>
          </section>

          <section className={styles.contactSection} id="contact">
            <div className={styles.sectionHeader}><div><h2>تواصل مع القسم المناسب</h2><p>اختر القسم، ثم تواصل مع الشخص الصحيح مباشرة.</p></div></div>
            <div className={styles.deptTabs}>{departments.map((d, i) => <button key={d.name} onClick={() => setActiveDept(i)} className={i === activeDept ? styles.activeTab : ""}>{d.name}<small>{d.count} مسؤول</small></button>)}</div>
            <div className={styles.reps}>{activeDepartment.reps.map((r) => <article key={r.name}><div className={styles.avatar}>{r.name.charAt(0)}</div><div className={styles.repInfo}><b>{r.name}</b><small>{r.role}</small></div><div className={styles.repActions}>{r.whatsapp && <a href={`https://wa.me/${r.whatsapp.replace(/\D/g, "")}`} title="واتساب">◉</a>}{r.phone && <a href={`tel:${r.phone}`} title="اتصال">☎</a>}{r.email && <a href={`mailto:${r.email}`} title="بريد">✉</a>}</div></article>)}</div>
          </section>

          <section className={styles.digitalSection}>
            <div className={styles.sectionHeader}><div><h2>وجهة المنشأة الإلكترونية</h2><p>صاحب الصفحة يحدد من اللوحة: موقع إلكتروني أو متجر إلكتروني.</p></div></div>
            <div className={styles.digitalSelector}><button onClick={() => setDigitalType("website")} className={digitalType === "website" ? styles.activeChoice : ""}>موقع إلكتروني</button><button onClick={() => setDigitalType("store")} className={digitalType === "store" ? styles.activeChoice : ""}>متجر إلكتروني</button></div>
            <a className={styles.digitalCard} href={`https://${digitalUrl}`}><div><b>{digitalLabel}</b><small>{digitalUrl}</small></div><span>فتح ←</span></a>
          </section>

          <section className={styles.infoGrid} id="location">
            <article><span>⌖</span><b>فروعنا</b><small>الرياض · جدة</small></article>
            <article><span>◷</span><b>ساعات العمل</b><small>الأحد–الخميس، 8ص–5م</small></article>
            <article><span>▣</span><b>رقم الترخيص</b><small>1200012345</small></article>
          </section>

          <footer className={styles.footer}><span className={styles.footerBrand}>HEE</span><span>ملف أعمال ذكي لمنشأتك</span><span>hee.sa</span></footer>
        </section>

        <aside className={styles.sidePanel}>
          <section className={styles.sideCard}><h2>فكرة التطبيق</h2><p>هذه ليست صفحة شركة تقليدية، وليست Linktree. إنها ملف أعمال رقمي مختصر يجمع هوية المنشأة، وسائل التواصل، التعريف، الأقسام والمسؤولين، والمعلومات المهمة.</p></section>
          <section className={styles.sideCard}><h2>ما يظهر حسب نوع النشاط</h2><div className={styles.typeRows}><div><b>شركة / مصنع</b><span>نبذة، ملف تعريفي، أقسام، مبيعات، فروع، موقع</span></div><div><b>شركة عقارية</b><span>مشاريع مختارة، مبيعات، فروع، ملف تعريفي</span></div><div><b>مطعم</b><span>منيو، فروع، حجز/طلب، ساعات، تواصل</span></div><div><b>مكتب مهني</b><span>خدمات، فريق، حجز، ملف تعريفي، موقع</span></div></div></section>
          <section className={styles.sideCard}><h2>داخل لوحة المشترك</h2><div className={styles.dashboardPreview}><div className={styles.metric}><b>2,842</b><span>زيارة</span></div><div className={styles.metric}><b>842</b><span>نقرة تواصل</span></div><div className={styles.metric}><b>621</b><span>نقرة موقع</span></div></div><div className={styles.featureList}><span>✓ دليل الشركات والتواصل B2B</span><span>✓ التوثيق ضمن الباقات</span><span>✓ أدوات ذكاء اصطناعي حسب النشاط</span><span>✓ للمطاعم: تصوير المنيو → استخراج → مراجعة → نشر</span></div></section>
        </aside>
      </div>

      {verificationOpen && <div className={styles.modalBackdrop} onClick={() => setVerificationOpen(false)}><div className={styles.modal} onClick={(e) => e.stopPropagation()}><button className={styles.close} onClick={() => setVerificationOpen(false)}>×</button><div className={styles.largeBadge}><CheckBadge /></div><h2>منشأة موثقة على HEE</h2><p>تم التحقق من بيانات المنشأة الأساسية.</p><ul><li>✓ رقم الجوال</li><li>✓ واتساب الأعمال</li><li>✓ البريد الإلكتروني</li><li>✓ السجل التجاري</li></ul><div className={styles.verifyCode}>رقم التحقق: HEE-784S12</div></div></div>}
    </main>
  );
}
