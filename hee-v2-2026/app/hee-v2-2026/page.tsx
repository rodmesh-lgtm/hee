"use client";

import { useState } from "react";
import styles from "./page.module.css";

const departments = [
  {name:"المبيعات",count:3,people:[{name:"أحمد السالم",role:"مدير المبيعات",i:"أ"},{name:"نورة الحربي",role:"أخصائية مبيعات",i:"ن"},{name:"محمد العتيبي",role:"أخصائي مبيعات",i:"م"}]},
  {name:"خدمة العملاء",count:2,people:[{name:"سارة القحطاني",role:"خدمة العملاء",i:"س"},{name:"خالد المطيري",role:"متابعة العملاء",i:"خ"}]},
  {name:"الإدارة",count:1,people:[{name:"عبدالله الغامدي",role:"الإدارة العامة",i:"ع"}]},
  {name:"الاستشارات",count:2,people:[{name:"ريم السبيعي",role:"مستشارة أعمال",i:"ر"},{name:"تركي الدوسري",role:"مستشار أول",i:"ت"}]},
];

const activities = [
  ["عقار","أركان العقارية","شركة تطوير واستثمار عقاري","green"],
  ["مصنع","مصنع النخبة","للمنتجات الغذائية","cyan"],
  ["مطعم","مذاق الشرق","للمأكولات الشرقية","orange"],
  ["مكتب مهني","التميز للمحاماة","محامون ومستشارون قانونيون","purple"],
  ["تجارة إلكترونية","متجر أركان","لأدوات المنزل والأثاث","pink"],
];

function Badge(){return <span className={styles.badge}><span>✓</span><b>موثق لدى HEE</b></span>}

export default function Page(){
 const [active,setActive]=useState(0); const [verify,setVerify]=useState(false); const d=departments[active];
 return <main className={styles.page} dir="rtl">
   <div className={styles.top}><button className={styles.lang}>AR⌄</button><div><button>◉</button><button>☰</button></div></div>
   <section className={styles.hero}>
     <div className={styles.identity}>
       <div className={styles.logo}>أركان</div>
       <div className={styles.idText}><button className={styles.badgeBtn} onClick={()=>setVerify(true)}><Badge/></button><h1>أركان العقارية</h1><p className={styles.type}>شركة تطوير واستثمار عقاري</p><p className={styles.loc}>الرياض · المملكة العربية السعودية</p></div>
       <div className={styles.actions}><a href="#contact"><span>◉</span><b>واتساب</b></a><a href="tel:+966500000000"><span>⌕</span><b>اتصال</b></a><a href="#"><span>◎</span><b>الموقع</b></a><a href="#contact"><span>✉</span><b>استفسار</b></a></div>
       <button className={styles.pdf}><span className={styles.pdfMark}>PDF</span><span><b>الملف التعريفي للمنشأة</b><small>تعرّف على شركتنا وخبراتنا ومشاريعنا</small></span><em>←</em></button>
     </div>
     <div className={styles.pitch}><div className={styles.shield}>✓</div><h2>تصميم هوية الأعمال الجديد<br/>HEE · الإصدار 2.0</h2><p>هوية موثقة · تواصل مباشر · تجربة ذكية</p>
       <div className={styles.reasons}><h3>لماذا هذا التصميم مختلف؟</h3>{[["✦","هوية بصرية قوية","بطاقة هوية موثقة تعزز الثقة من أول نظرة."],["⚡","تجربة سريعة ومركزة","اختصار المعلومات المهمة في عناصر قابلة للتنفيذ."],["👥","تواصل ذكي","الوصول للشخص المناسب خلال ثوانٍ عبر الأقسام."],["✧","تصميم عصري 2026","مساحات بيضاء وتدرجات هادئة وتفاعلات سلسة."],["▦","متكيف مع نوع النشاط","نفس الهيكل، محتوى مناسب لطبيعة كل منشأة."]].map(x=><div className={styles.reason} key={x[1]}><span>{x[0]}</span><div><b>{x[1]}</b><small>{x[2]}</small></div></div>)}</div>
     </div>
   </section>

   <section className={styles.mid} id="contact">
     <div className={styles.block}><div className={styles.head}><div><h3>تواصل مع القسم المناسب</h3><p>اختر القسم وسنصلك بالشخص المناسب فورًا</p></div></div>
       <div className={styles.depts}>{departments.map((x,i)=><button key={x.name} className={i===active?styles.active:""} onClick={()=>setActive(i)}><span>♙</span><b>{x.name}</b><small>{x.count} مسؤولين</small></button>)}</div>
       <div className={styles.projects}><div className={styles.head}><h3>أعمالنا ومشاريعنا</h3><button>عرض الكل</button></div><div className={styles.projectGrid}><article><div className={`${styles.projImg} ${styles.p1}`}></div><div><b>مجمع أركان التجاري</b><small>مكاتب تجارية · الرياض</small></div></article><article><div className={`${styles.projImg} ${styles.p2}`}></div><div><b>مشروع النخيل ريزيدنس</b><small>فلل سكنية · الرياض</small></div></article></div></div>
     </div>

     <div className={styles.sheet}><div className={styles.sheetHead}><div><h3>{d.name}</h3><p>{d.count} مسؤولين</p></div><button>×</button></div>{d.people.map(p=><article key={p.name}><div className={styles.avatar}>{p.i}</div><div><b>{p.name}</b><small>{p.role}</small></div><div className={styles.personBtns}><a href="mailto:test@example.sa">✉</a><a href="tel:+966500000000">⌕</a><a href="https://wa.me/966500000000">◉</a></div></article>)}<button className={styles.contactDept}>تواصل مع القسم <span>◉</span></button></div>
   </section>

   <section className={styles.adaptive}><div className={styles.head}><div><h3>يتكيف مع جميع أنواع الأنشطة</h3><p>HEE لا يفرض نفس ترتيب المحتوى على الجميع</p></div></div><div className={styles.activityGrid}>{activities.map(a=><article key={a[1]}><span className={`${styles.tag} ${styles[a[3]]}`}>{a[0]}</span><div className={styles.miniLogo}>{a[1].slice(0,1)}</div><h4>{a[1]}</h4><p>{a[2]}</p><div className={styles.miniActions}><span>واتساب</span><span>اتصال</span><span>استفسار</span></div><div className={styles.rows}><div>نبذة <span>›</span></div><div>التواصل <span>›</span></div><div>الموقع <span>›</span></div></div></article>)}</div></section>

   <footer className={styles.footer}><div><span>◈</span><b>أمن وموثوق</b><small>بيانات محمية بأحدث التقنيات</small></div><div><span>⌁</span><b>روابط قصيرة</b><small>رابط واحد لكل منشأة</small></div><div><span>▥</span><b>تحليلات ذكية</b><small>اعرف من زار صفحتك وتفاعل معها</small></div><div><span>⚡</span><b>تحديث فوري</b><small>يظهر التغيير مباشرة للعملاء</small></div><div><span>◉</span><b>دعم فني</b><small>متابعة مستمرة للمشتركين</small></div></footer>

   {verify&&<div className={styles.overlay} onClick={()=>setVerify(false)}><div className={styles.modal} onClick={e=>e.stopPropagation()}><button className={styles.close} onClick={()=>setVerify(false)}>×</button><div className={styles.bigBadge}>✓</div><h3>منشأة موثقة على HEE</h3><p>تم التحقق من بيانات النشاط الأساسية.</p><div className={styles.verifyGrid}><span>✓ السجل التجاري</span><span>✓ رقم الجوال</span><span>✓ البريد الإلكتروني</span><span>✓ واتساب الأعمال</span></div><div className={styles.code}>HEE-784S12</div></div></div>}
 </main>
}
