import { formattedUiText, translatedUiAttributes, type UiMessages } from "./i18n-presentation";
import { HOMEPAGE_TRANSLATIONS } from "./homepage-i18n";
import type { AppLocale } from "./i18n";
import { homepageText } from "./homepage-i18n";

export const UI_TRANSLATIONS: Record<string, Record<Exclude<AppLocale, "ar">, string>> = {
  "فريق التواصل": {
    "en": "Contact team",
    "zh-CN": "联系团队",
    "es": "Equipo de contacto",
    "ur": "رابطہ ٹیم"
  },
  "واتساب": {
    "en": "WhatsApp",
    "zh-CN": "WhatsApp",
    "es": "WhatsApp",
    "ur": "واٹس ایپ"
  },
  "اتصال": {
    "en": "Call",
    "zh-CN": "致电",
    "es": "Llamar",
    "ur": "کال"
  },
  "بريد": {
    "en": "Email",
    "zh-CN": "邮件",
    "es": "Correo",
    "ur": "ای میل"
  },
  "الموقع": {
    "en": "Website",
    "zh-CN": "网站",
    "es": "Sitio web",
    "ur": "ویب سائٹ"
  },
  "مشاركة": {
    "en": "Share",
    "zh-CN": "分享",
    "es": "Compartir",
    "ur": "شیئر کریں"
  },
  "الفروع": {
    "en": "Branches",
    "zh-CN": "分店",
    "es": "Sucursales",
    "ur": "شاخیں"
  },
  "الأقسام والتواصل": {
    "en": "Departments and contact",
    "zh-CN": "部门与联系",
    "es": "Departamentos y contacto",
    "ur": "شعبے اور رابطہ"
  },
  "الخدمات": {
    "en": "Services",
    "zh-CN": "服务",
    "es": "Servicios",
    "ur": "خدمات"
  },
  "معرض الأعمال": {
    "en": "Portfolio",
    "zh-CN": "作品集",
    "es": "Portafolio",
    "ur": "ہمارے کام"
  },
  "ساعات العمل": {
    "en": "Business hours",
    "zh-CN": "营业时间",
    "es": "Horario",
    "ur": "کاروباری اوقات"
  },
  "الوظائف": {
    "en": "Careers",
    "zh-CN": "招聘",
    "es": "Empleo",
    "ur": "ملازمتیں"
  },
  "روابط المنشأة": {
    "en": "Business links",
    "zh-CN": "企业链接",
    "es": "Enlaces del negocio",
    "ur": "کاروباری لنکس"
  },
  "هوية موثقة": {
    "en": "Verified identity",
    "zh-CN": "已认证身份",
    "es": "Identidad verificada",
    "ur": "تصدیق شدہ شناخت"
  },
  "هوية منشأة": {
    "en": "Business identity",
    "zh-CN": "企业身份",
    "es": "Identidad del negocio",
    "ur": "کاروباری شناخت"
  },
  "فرع": {
    "en": "branch",
    "zh-CN": "家分店",
    "es": "sucursal",
    "ur": "شاخ"
  },
  "فروع": {
    "en": "branches",
    "zh-CN": "家分店",
    "es": "sucursales",
    "ur": "شاخیں"
  },
  "قناة تواصل": {
    "en": "contact channel",
    "zh-CN": "个联系渠道",
    "es": "canal de contacto",
    "ur": "رابطے کا ذریعہ"
  },
  "قنوات تواصل": {
    "en": "contact channels",
    "zh-CN": "个联系渠道",
    "es": "canales de contacto",
    "ur": "رابطے کے ذرائع"
  },
  "خدمة": {
    "en": "service",
    "zh-CN": "项服务",
    "es": "servicio",
    "ur": "خدمت"
  },
  "خدمات": {
    "en": "services",
    "zh-CN": "项服务",
    "es": "servicios",
    "ur": "خدمات"
  },
  "مشاركة الصفحة": {
    "en": "Share page",
    "zh-CN": "分享页面",
    "es": "Compartir página",
    "ur": "صفحہ شیئر کریں"
  },
  "هوية أعمال رقمية": {
    "en": "Digital business identity",
    "zh-CN": "数字企业身份",
    "es": "Identidad digital empresarial",
    "ur": "ڈیجیٹل کاروباری شناخت"
  },
  "شعار": {
    "en": "Logo",
    "zh-CN": "标志",
    "es": "Logotipo",
    "ur": "لوگو"
  },
  "منشأة موثقة": {
    "en": "Verified business",
    "zh-CN": "已认证企业",
    "es": "Negocio verificado",
    "ur": "تصدیق شدہ کاروبار"
  },
  "أقسام صفحة المنشأة": {
    "en": "Business page sections",
    "zh-CN": "企业页面栏目",
    "es": "Secciones del negocio",
    "ur": "کاروباری صفحے کے حصے"
  },
  "نرحّب بتواصلك": {
    "en": "We welcome your enquiry",
    "zh-CN": "欢迎咨询",
    "es": "Nos encantará ayudarte",
    "ur": "ہم آپ کے رابطے کے منتظر ہیں"
  },
  "كيف نقدر نخدمك اليوم؟": {
    "en": "How can we help you today?",
    "zh-CN": "今天我们能为您提供什么帮助？",
    "es": "¿Cómo podemos ayudarte hoy?",
    "ur": "آج ہم آپ کی کیا مدد کر سکتے ہیں؟"
  },
  "كل ما تحتاجه للتواصل معنا، في مكان واحد.": {
    "en": "Everything you need to reach us, in one place.",
    "zh-CN": "联系我们所需的一切，尽在一处。",
    "es": "Todo lo que necesitas para contactarnos en un solo lugar.",
    "ur": "ہم سے رابطے کے تمام ذرائع ایک جگہ۔"
  },
  "تواصل عبر واتساب": {
    "en": "Chat on WhatsApp",
    "zh-CN": "通过 WhatsApp 联系",
    "es": "Hablar por WhatsApp",
    "ur": "واٹس ایپ پر رابطہ کریں"
  },
  "اتصل بنا": {
    "en": "Call us",
    "zh-CN": "致电我们",
    "es": "Llámanos",
    "ur": "ہمیں کال کریں"
  },
  "راسلنا بالبريد": {
    "en": "Email us",
    "zh-CN": "给我们发邮件",
    "es": "Escríbenos",
    "ur": "ہمیں ای میل کریں"
  },
  "نسعد بزيارتك": {
    "en": "We look forward to your visit",
    "zh-CN": "期待您的光临",
    "es": "Te esperamos",
    "ur": "ہم آپ کی آمد کے منتظر ہیں"
  },
  "فروعنا": {
    "en": "Our branches",
    "zh-CN": "我们的分店",
    "es": "Nuestras sucursales",
    "ur": "ہماری شاخیں"
  },
  "، ": {
    "en": ", ",
    "zh-CN": "，",
    "es": ", ",
    "ur": "، "
  },
  "الاتجاهات على الخريطة": {
    "en": "Directions on map",
    "zh-CN": "地图导航",
    "es": "Cómo llegar",
    "ur": "نقشے پر راستہ"
  },
  "اختر القسم وسنوصلك بالشخص المناسب": {
    "en": "Choose a department to reach the right person",
    "zh-CN": "选择部门，联系合适的人员",
    "es": "Elige el departamento y te conectamos con la persona adecuada",
    "ur": "شعبہ منتخب کریں، ہم متعلقہ شخص تک پہنچائیں گے"
  },
  "معلومات عن المنشأة": {
    "en": "About this business",
    "zh-CN": "企业资料",
    "es": "Información del negocio",
    "ur": "کاروبار کی معلومات"
  },
  "خبراتنا بين يديك": {
    "en": "Our expertise at your service",
    "zh-CN": "以专业经验为您服务",
    "es": "Nuestra experiencia a tu servicio",
    "ur": "ہماری مہارت آپ کی خدمت میں"
  },
  "أبرز ما نقدمه": {
    "en": "What we offer",
    "zh-CN": "我们的服务",
    "es": "Lo que ofrecemos",
    "ur": "ہم کیا پیش کرتے ہیں"
  },
  "من أعمالنا": {
    "en": "Our work",
    "zh-CN": "我们的作品",
    "es": "Nuestro trabajo",
    "ur": "ہمارے کام"
  },
  "عرض": {
    "en": "View",
    "zh-CN": "查看",
    "es": "Ver",
    "ur": "دیکھیں"
  },
  "صورة من أعمال المنشأة": {
    "en": "Portfolio image",
    "zh-CN": "企业作品图片",
    "es": "Imagen del portafolio",
    "ur": "کاروباری کام کی تصویر"
  },
  "من أعمال المنشأة": {
    "en": "Business portfolio",
    "zh-CN": "企业作品",
    "es": "Trabajos del negocio",
    "ur": "کاروبار کے کام"
  },
  "الأعمال": {
    "en": "Projects",
    "zh-CN": "项目",
    "es": "Trabajos",
    "ur": "کام"
  },
  "ملف الشركة": {
    "en": "Company profile",
    "zh-CN": "公司简介",
    "es": "Perfil de empresa",
    "ur": "کمپنی پروفائل"
  },
  "المتجر": {
    "en": "Store",
    "zh-CN": "商店",
    "es": "Tienda",
    "ur": "اسٹور"
  },
  "المتجر الإلكتروني": {
    "en": "Online store",
    "zh-CN": "网上商店",
    "es": "Tienda en línea",
    "ur": "آن لائن اسٹور"
  },
  "الموقع الإلكتروني": {
    "en": "Website",
    "zh-CN": "网站",
    "es": "Sitio web",
    "ur": "ویب سائٹ"
  },
  "خرائط Google": {
    "en": "Google Maps",
    "zh-CN": "Google 地图",
    "es": "Google Maps",
    "ur": "Google Maps"
  },
  "انضم إلينا": {
    "en": "Join us",
    "zh-CN": "加入我们",
    "es": "Únete a nosotros",
    "ur": "ہم سے جڑیں"
  },
  "أحدث الفرص الوظيفية": {
    "en": "Latest career opportunities",
    "zh-CN": "最新职位",
    "es": "Últimas vacantes",
    "ur": "تازہ ملازمت کے مواقع"
  },
  "تعرّف على الوظائف المتاحة وشاركنا خبرتك.": {
    "en": "Explore open roles and share your experience.",
    "zh-CN": "了解空缺职位，分享您的经验。",
    "es": "Consulta las vacantes y comparte tu experiencia.",
    "ur": "دستیاب مواقع دیکھیں اور اپنا تجربہ ہمارے ساتھ شیئر کریں۔"
  },
  "استعرض الفرص": {
    "en": "Explore opportunities",
    "zh-CN": "查看职位",
    "es": "Ver oportunidades",
    "ur": "مواقع دیکھیں"
  },
  "هوية أعمال رقمية · ir.sa": {
    "en": "Digital business identity · ir.sa",
    "zh-CN": "数字企业身份 · ir.sa",
    "es": "Identidad digital empresarial · ir.sa",
    "ur": "ڈیجیٹل کاروباری شناخت · ir.sa"
  },
  "تم نسخ الرابط": {
    "en": "Link copied",
    "zh-CN": "链接已复制",
    "es": "Enlace copiado",
    "ur": "لنک کاپی ہو گیا"
  },
  "عرض أقل": {
    "en": "Show less",
    "zh-CN": "收起",
    "es": "Ver menos",
    "ur": "کم دکھائیں"
  },
  "عرض الكل": {
    "en": "Show all",
    "zh-CN": "显示全部",
    "es": "Ver todo",
    "ur": "سب دکھائیں"
  },
  "ممثل المنشأة": {
    "en": "Business representative",
    "zh-CN": "企业代表",
    "es": "Representante del negocio",
    "ur": "کاروبار کا نمائندہ"
  },
  "ربط الكاميرات وإدارة المواقع": {
    "en": "Camera connections and sites",
    "zh-CN": "摄像头连接与站点",
    "es": "Conexión de cámaras y ubicaciones",
    "ur": "کیمرے جوڑنا اور مقامات"
  },
  "المشاهدة المؤقتة": {
    "en": "Temporary live viewing",
    "zh-CN": "临时实时观看",
    "es": "Visualización temporal en directo",
    "ur": "عارضی براہِ راست مشاہدہ"
  },
  "مركز العمل": {
    "en": "Workspace",
    "zh-CN": "工作中心",
    "es": "Centro de trabajo",
    "ur": "کام کا مرکز"
  },
  "صفحتي": {
    "en": "My page",
    "zh-CN": "我的页面",
    "es": "Mi página",
    "ur": "میرا صفحہ"
  },
  "الهوية الرقمية": {
    "en": "Digital identity",
    "zh-CN": "数字身份",
    "es": "Identidad digital",
    "ur": "ڈیجیٹل شناخت"
  },
  "الطلبات": {
    "en": "Requests",
    "zh-CN": "请求",
    "es": "Solicitudes",
    "ur": "درخواستیں"
  },
  "مذكرات الأعمال": {
    "en": "Business notes",
    "zh-CN": "业务笔记",
    "es": "Notas de negocio",
    "ur": "کاروباری نوٹس"
  },
  "التذكيرات الذكية": {
    "en": "Smart reminders",
    "zh-CN": "智能提醒",
    "es": "Recordatorios inteligentes",
    "ur": "اسمارٹ یاد دہانیاں"
  },
  "مركز الإشعارات": {
    "en": "Notification center",
    "zh-CN": "通知中心",
    "es": "Centro de notificaciones",
    "ur": "اطلاعات کا مرکز"
  },
  "تسويق واتساب": {
    "en": "WhatsApp marketing",
    "zh-CN": "WhatsApp 营销",
    "es": "Marketing por WhatsApp",
    "ur": "واٹس ایپ مارکیٹنگ"
  },
  "صندوق واتساب": {
    "en": "WhatsApp inbox",
    "zh-CN": "WhatsApp 收件箱",
    "es": "Bandeja de WhatsApp",
    "ur": "واٹس ایپ ان باکس"
  },
  "جهات اتصال واتساب": {
    "en": "WhatsApp contacts",
    "zh-CN": "WhatsApp 联系人",
    "es": "Contactos de WhatsApp",
    "ur": "واٹس ایپ رابطے"
  },
  "قوالب واتساب": {
    "en": "WhatsApp templates",
    "zh-CN": "WhatsApp 模板",
    "es": "Plantillas de WhatsApp",
    "ur": "واٹس ایپ سانچے"
  },
  "حملات واتساب": {
    "en": "WhatsApp campaigns",
    "zh-CN": "WhatsApp 营销活动",
    "es": "Campañas de WhatsApp",
    "ur": "واٹس ایپ مہمات"
  },
  "ربط واتساب للأعمال": {
    "en": "Connect WhatsApp Business",
    "zh-CN": "连接 WhatsApp Business",
    "es": "Conectar WhatsApp Business",
    "ur": "واٹس ایپ بزنس جوڑیں"
  },
  "سجل تدقيق واتساب": {
    "en": "WhatsApp audit log",
    "zh-CN": "WhatsApp 审计日志",
    "es": "Registro de auditoría de WhatsApp",
    "ur": "واٹس ایپ آڈٹ ریکارڈ"
  },
  "متجر الأعمال": {
    "en": "Business store",
    "zh-CN": "企业商店",
    "es": "Tienda de negocios",
    "ur": "کاروباری اسٹور"
  },
  "المظهر": {
    "en": "Appearance",
    "zh-CN": "外观",
    "es": "Apariencia",
    "ur": "ظاہری شکل"
  },
  "الفروع والفريق": {
    "en": "Branches and team",
    "zh-CN": "分店与团队",
    "es": "Sucursales y equipo",
    "ur": "شاخیں اور ٹیم"
  },
  "المنتجات": {
    "en": "Products",
    "zh-CN": "产品",
    "es": "Productos",
    "ur": "مصنوعات"
  },
  "المحتوى": {
    "en": "Content",
    "zh-CN": "内容",
    "es": "Contenido",
    "ur": "مواد"
  },
  "المعرض": {
    "en": "Gallery",
    "zh-CN": "图库",
    "es": "Galería",
    "ur": "گیلری"
  },
  "العروض": {
    "en": "Offers",
    "zh-CN": "优惠",
    "es": "Ofertas",
    "ur": "آفرز"
  },
  "روابط التواصل": {
    "en": "Contact links",
    "zh-CN": "联系链接",
    "es": "Enlaces de contacto",
    "ur": "رابطے کے لنکس"
  },
  "المواعيد والحجوزات": {
    "en": "Appointments and bookings",
    "zh-CN": "预约与预订",
    "es": "Citas y reservas",
    "ur": "ملاقاتیں اور بکنگ"
  },
  "إعدادات الحجز وساعات العمل": {
    "en": "Booking settings and hours",
    "zh-CN": "预约设置与营业时间",
    "es": "Configuración y horarios de reservas",
    "ur": "بکنگ کی ترتیبات اور اوقات"
  },
  "تحرير الصفحة": {
    "en": "Edit page",
    "zh-CN": "编辑页面",
    "es": "Editar página",
    "ur": "صفحہ ترمیم کریں"
  },
  "تخصيص الصفحة": {
    "en": "Customize page",
    "zh-CN": "自定义页面",
    "es": "Personalizar página",
    "ur": "صفحہ اپنی مرضی کے مطابق بنائیں"
  },
  "معاينة الصفحة": {
    "en": "Preview page",
    "zh-CN": "预览页面",
    "es": "Vista previa",
    "ur": "صفحے کا پیش منظر"
  },
  "الأداء": {
    "en": "Performance",
    "zh-CN": "业绩",
    "es": "Rendimiento",
    "ur": "کارکردگی"
  },
  "الدعم والمساعدة": {
    "en": "Help and support",
    "zh-CN": "帮助与支持",
    "es": "Ayuda y soporte",
    "ur": "مدد اور معاونت"
  },
  "الحساب والباقات": {
    "en": "Account and plans",
    "zh-CN": "账户与套餐",
    "es": "Cuenta y planes",
    "ur": "اکاؤنٹ اور پیکیجز"
  },
  "الموظفون والصلاحيات": {
    "en": "Staff and permissions",
    "zh-CN": "员工与权限",
    "es": "Personal y permisos",
    "ur": "ملازمین اور اجازتیں"
  },
  "إدارة الاشتراك والفوترة": {
    "en": "Subscription and billing",
    "zh-CN": "订阅与账单",
    "es": "Suscripción y facturación",
    "ur": "اشتراک اور بلنگ"
  },
  "إتمام الاشتراك": {
    "en": "Complete subscription",
    "zh-CN": "完成订阅",
    "es": "Completar suscripción",
    "ur": "اشتراک مکمل کریں"
  },
  "إيصال الدفع": {
    "en": "Payment receipt",
    "zh-CN": "付款收据",
    "es": "Recibo de pago",
    "ur": "ادائیگی کی رسید"
  },
  "مساحة العمل": {
    "en": "Workspace",
    "zh-CN": "工作空间",
    "es": "Espacio de trabajo",
    "ur": "کام کی جگہ"
  },
  "المنشأة النشطة": {
    "en": "Active business",
    "zh-CN": "当前企业",
    "es": "Negocio activo",
    "ur": "فعال کاروبار"
  },
  "اختر": {
    "en": "Choose",
    "zh-CN": "选择",
    "es": "Elegir",
    "ur": "منتخب کریں"
  },
  "تبديل": {
    "en": "Switch",
    "zh-CN": "切换",
    "es": "Cambiar",
    "ur": "تبدیل کریں"
  },
  "أقسامك بالترتيب": {
    "en": "Your sections in order",
    "zh-CN": "您的栏目顺序",
    "es": "Tus secciones en orden",
    "ur": "آپ کے حصوں کی ترتیب"
  },
  "الرئيسية": {
    "en": "Home",
    "zh-CN": "首页",
    "es": "Inicio",
    "ur": "ہوم"
  },
  "الهوية": {
    "en": "Identity",
    "zh-CN": "身份",
    "es": "Identidad",
    "ur": "شناخت"
  },
  "لوحة الأعمال": {
    "en": "Business dashboard",
    "zh-CN": "企业控制面板",
    "es": "Panel de negocios",
    "ur": "کاروباری ڈیش بورڈ"
  },
  "هويتك الرقمية والتسويقية": {
    "en": "Your digital and marketing identity",
    "zh-CN": "您的数字与营销身份",
    "es": "Tu identidad digital y de marketing",
    "ur": "آپ کی ڈیجیٹل اور مارکیٹنگ شناخت"
  },
  "مساحة عملك": {
    "en": "Your workspace",
    "zh-CN": "您的工作空间",
    "es": "Tu espacio de trabajo",
    "ur": "آپ کی کام کی جگہ"
  },
  "هويتك وحملاتك وطلباتك من مكان واحد": {
    "en": "Your identity, campaigns and requests in one place",
    "zh-CN": "身份、营销活动与请求，尽在一处",
    "es": "Tu identidad, campañas y solicitudes en un solo lugar",
    "ur": "شناخت، مہمات اور درخواستیں ایک جگہ"
  },
  "التنقل الرئيسي": {
    "en": "Main navigation",
    "zh-CN": "主导航",
    "es": "Navegación principal",
    "ur": "مرکزی نیویگیشن"
  },
  "البحث في أقسام اللوحة": {
    "en": "Search dashboard sections",
    "zh-CN": "搜索控制面板栏目",
    "es": "Buscar secciones del panel",
    "ur": "ڈیش بورڈ کے حصے تلاش کریں"
  },
  "ابحث: حجوزات، شعار، فاتورة…": {
    "en": "Search: bookings, logo, invoice…",
    "zh-CN": "搜索：预约、标志、发票…",
    "es": "Busca: reservas, logotipo, factura…",
    "ur": "تلاش کریں: بکنگ، لوگو، بل…"
  },
  "لا توجد أقسام بهذا الاسم.": {
    "en": "No matching sections.",
    "zh-CN": "没有匹配的栏目。",
    "es": "No hay secciones con ese nombre.",
    "ur": "اس نام کا کوئی حصہ نہیں۔"
  },
  "مظهر اللوحة": {
    "en": "Dashboard theme",
    "zh-CN": "控制面板主题",
    "es": "Tema del panel",
    "ur": "ڈیش بورڈ کی تھیم"
  },
  "فتح الصفحة": {
    "en": "Open page",
    "zh-CN": "打开页面",
    "es": "Abrir página",
    "ur": "صفحہ کھولیں"
  },
  "إدارة المنصة": {
    "en": "Platform administration",
    "zh-CN": "平台管理",
    "es": "Administración de la plataforma",
    "ur": "پلیٹ فارم کی انتظامیہ"
  },
  "تسجيل الخروج": {
    "en": "Sign out",
    "zh-CN": "退出登录",
    "es": "Cerrar sesión",
    "ur": "لاگ آؤٹ"
  },
  "إغلاق القائمة": {
    "en": "Close menu",
    "zh-CN": "关闭菜单",
    "es": "Cerrar menú",
    "ur": "مینو بند کریں"
  },
  "فتح القائمة": {
    "en": "Open menu",
    "zh-CN": "打开菜单",
    "es": "Abrir menú",
    "ur": "مینو کھولیں"
  },
  "منشورة": {
    "en": "Published",
    "zh-CN": "已发布",
    "es": "Publicada",
    "ur": "شائع شدہ"
  },
  "مسودة": {
    "en": "Draft",
    "zh-CN": "草稿",
    "es": "Borrador",
    "ur": "مسودہ"
  },
  "معاينة": {
    "en": "Preview",
    "zh-CN": "预览",
    "es": "Vista previa",
    "ur": "پیش منظر"
  },
  "هذا القسم غير متاح لحسابك": {
    "en": "This section is not available to your account",
    "zh-CN": "您的账户无法访问此栏目",
    "es": "Esta sección no está disponible para tu cuenta",
    "ur": "یہ حصہ آپ کے اکاؤنٹ کے لیے دستیاب نہیں"
  },
  "تواصل مع مالك المنشأة لتعديل صلاحياتك.": {
    "en": "Contact the business owner to update your permissions.",
    "zh-CN": "请联系企业所有者修改您的权限。",
    "es": "Contacta con el propietario para actualizar tus permisos.",
    "ur": "اپنی اجازتیں بدلنے کے لیے کاروبار کے مالک سے رابطہ کریں۔"
  },
  "التنقل السريع": {
    "en": "Quick navigation",
    "zh-CN": "快捷导航",
    "es": "Navegación rápida",
    "ur": "فوری نیویگیشن"
  },
  "فتح المزيد من الأدوات": {
    "en": "Open more tools",
    "zh-CN": "打开更多工具",
    "es": "Abrir más herramientas",
    "ur": "مزید اوزار کھولیں"
  },
  "المزيد": {
    "en": "More",
    "zh-CN": "更多",
    "es": "Más",
    "ur": "مزید"
  },
  "قائمة لوحة التحكم": {
    "en": "Dashboard menu",
    "zh-CN": "控制面板菜单",
    "es": "Menú del panel",
    "ur": "ڈیش بورڈ مینو"
  },
  "فاتح، داكن أو تلقائي": {
    "en": "Light, dark or automatic",
    "zh-CN": "浅色、深色或自动",
    "es": "Claro, oscuro o automático",
    "ur": "ہلکی، گہری یا خودکار"
  },
  "معاينة صفحتي": {
    "en": "Preview my page",
    "zh-CN": "预览我的页面",
    "es": "Ver mi página",
    "ur": "میرے صفحے کا پیش منظر"
  },
  "كل أدوات لوحة العميل": {
    "en": "All dashboard tools",
    "zh-CN": "所有控制面板工具",
    "es": "Todas las herramientas del panel",
    "ur": "ڈیش بورڈ کے تمام اوزار"
  },
  "البحث في قائمة الجوال": {
    "en": "Search the mobile menu",
    "zh-CN": "搜索移动端菜单",
    "es": "Buscar en el menú móvil",
    "ur": "موبائل مینو میں تلاش کریں"
  },
  "إغلاق خلفية القائمة": {
    "en": "Close menu backdrop",
    "zh-CN": "关闭菜单背景",
    "es": "Cerrar fondo del menú",
    "ur": "مینو کا پس منظر بند کریں"
  },
  "الفاتح": {
    "en": "Light",
    "zh-CN": "浅色",
    "es": "Claro",
    "ur": "ہلکی"
  },
  "الداكن": {
    "en": "Dark",
    "zh-CN": "深色",
    "es": "Oscuro",
    "ur": "گہری"
  },
  "التلقائي": {
    "en": "Automatic",
    "zh-CN": "自动",
    "es": "Automático",
    "ur": "خودکار"
  },
  "داكن": {
    "en": "Dark",
    "zh-CN": "深色",
    "es": "Oscuro",
    "ur": "گہری"
  },
  "فاتح": {
    "en": "Light",
    "zh-CN": "浅色",
    "es": "Claro",
    "ur": "ہلکی"
  },
  "تلقائي": {
    "en": "Automatic",
    "zh-CN": "自动",
    "es": "Automático",
    "ur": "خودکار"
  },
  "المظهر الحالي": {
    "en": "Current theme",
    "zh-CN": "当前主题",
    "es": "Tema actual",
    "ur": "موجودہ تھیم"
  },
  "تبديل المظهر": {
    "en": "Change theme",
    "zh-CN": "切换主题",
    "es": "Cambiar tema",
    "ur": "تھیم بدلیں"
  },
  "تم تغيير الموضع. اضغط حفظ الترتيب لتطبيقه.": {
    "en": "Position changed. Save the order to apply it.",
    "zh-CN": "位置已更改，请保存顺序以应用。",
    "es": "Posición modificada. Guarda el orden para aplicarlo.",
    "ur": "جگہ بدل گئی۔ لاگو کرنے کے لیے ترتیب محفوظ کریں۔"
  },
  "تم حفظ ترتيبك في حسابك.": {
    "en": "Your order was saved to your account.",
    "zh-CN": "顺序已保存至您的账户。",
    "es": "El orden se guardó en tu cuenta.",
    "ur": "آپ کی ترتیب اکاؤنٹ میں محفوظ ہو گئی۔"
  },
  "تمت استعادة الترتيب الافتراضي.": {
    "en": "Default order restored.",
    "zh-CN": "已恢复默认顺序。",
    "es": "Se restauró el orden predeterminado.",
    "ur": "اصل ترتیب بحال ہو گئی۔"
  },
  "تعذر الاتصال. لم يُحفظ الترتيب؛ حاول مرة أخرى.": {
    "en": "Connection failed. The order was not saved; try again.",
    "zh-CN": "连接失败，顺序未保存，请重试。",
    "es": "Error de conexión. No se guardó el orden; inténtalo otra vez.",
    "ur": "رابطہ ناکام۔ ترتیب محفوظ نہیں ہوئی؛ دوبارہ کوشش کریں۔"
  },
  "إغلاق الترتيب": {
    "en": "Close ordering panel",
    "zh-CN": "关闭排序面板",
    "es": "Cerrar panel de orden",
    "ur": "ترتیب والا پینل بند کریں"
  },
  "ترتيب القائمة": {
    "en": "Menu order",
    "zh-CN": "菜单顺序",
    "es": "Orden del menú",
    "ur": "مینو کی ترتیب"
  },
  "اسحب الأقسام من المقبض أو استخدم الأسهم، ثم اضغط حفظ. يُحفظ ترتيبك في حسابك على جميع أجهزتك.": {
    "en": "Drag sections by the handle or use the arrows, then save. Your order follows your account across devices.",
    "zh-CN": "拖动手柄或使用箭头排序，然后保存。顺序将通过账户同步到所有设备。",
    "es": "Arrastra las secciones o usa las flechas y guarda. El orden se sincroniza en todos tus dispositivos.",
    "ur": "حصوں کو ہینڈل سے کھینچیں یا تیر استعمال کریں، پھر محفوظ کریں۔ ترتیب تمام آلات پر اکاؤنٹ کے ساتھ رہتی ہے۔"
  },
  "على الجوال اسحب المقبض إلى القسم المطلوب. بلوحة المفاتيح استخدم زري الرفع والخفض.": {
    "en": "On mobile, drag the handle to the section you want. With a keyboard, use the move up and down buttons.",
    "zh-CN": "手机上拖动手柄到目标位置；使用键盘时，可用上移和下移按钮。",
    "es": "En móvil, arrastra el asa hasta la sección deseada. Con teclado, usa los botones de subir y bajar.",
    "ur": "موبائل پر ہینڈل کو مطلوبہ حصے تک کھینچیں۔ کی بورڈ سے اوپر اور نیچے کے بٹن استعمال کریں۔"
  },
  "جارٍ الحفظ…": {
    "en": "Saving…",
    "zh-CN": "正在保存…",
    "es": "Guardando…",
    "ur": "محفوظ ہو رہا ہے…"
  },
  "حفظ الترتيب": {
    "en": "Save order",
    "zh-CN": "保存顺序",
    "es": "Guardar orden",
    "ur": "ترتیب محفوظ کریں"
  },
  "الافتراضي": {
    "en": "Default",
    "zh-CN": "默认",
    "es": "Predeterminado",
    "ur": "اصل ترتیب"
  },
  "طلب مساعدة في هذه الصفحة": {
    "en": "Get help with this page",
    "zh-CN": "获取此页面的帮助",
    "es": "Pedir ayuda con esta página",
    "ur": "اس صفحے کے بارے میں مدد لیں"
  },
  "مساعدة": {
    "en": "Help",
    "zh-CN": "帮助",
    "es": "Ayuda",
    "ur": "مدد"
  },
  "توقفت المتابعة. حدّث الصفحة للتحقق من المنشأة والصلاحيات.": {
    "en": "Updates stopped. Refresh to check your business and permissions.",
    "zh-CN": "更新已停止，请刷新以检查企业和权限。",
    "es": "Se detuvo la actualización. Recarga para comprobar el negocio y los permisos.",
    "ur": "اپ ڈیٹس رک گئیں۔ کاروبار اور اجازتیں جانچنے کے لیے صفحہ تازہ کریں۔"
  },
  "أوقف المتصفح الصوت. اضغط تفعيل الجرس مجددًا.": {
    "en": "Your browser blocked sound. Enable the bell again.",
    "zh-CN": "浏览器阻止了声音，请重新启用提示铃。",
    "es": "El navegador bloqueó el sonido. Activa de nuevo el aviso.",
    "ur": "براؤزر نے آواز روک دی۔ گھنٹی دوبارہ فعال کریں۔"
  },
  "تعذر تحديث الحجوزات مؤقتًا؛ نحاول مجددًا.": {
    "en": "Booking updates are temporarily unavailable; retrying.",
    "zh-CN": "暂时无法更新预约，正在重试。",
    "es": "No se pudieron actualizar las reservas; reintentando.",
    "ur": "بکنگ کی اپ ڈیٹ عارضی طور پر دستیاب نہیں؛ دوبارہ کوشش جاری ہے۔"
  },
  "تعذر تشغيل الصوت. اسمح بالصوت لهذا الموقع ثم حاول مجددًا.": {
    "en": "Couldn't play sound. Allow sound for this site and try again.",
    "zh-CN": "无法播放声音，请允许此网站播放声音后重试。",
    "es": "No se pudo reproducir el sonido. Permite audio en este sitio y vuelve a intentarlo.",
    "ur": "آواز نہیں چل سکی۔ اس سائٹ کے لیے آواز کی اجازت دے کر دوبارہ کوشش کریں۔"
  },
  "تنبيهات الحجز الجديد": {
    "en": "New booking alerts",
    "zh-CN": "新预约通知",
    "es": "Avisos de nuevas reservas",
    "ur": "نئی بکنگ کی اطلاعات"
  },
  "جرس الحجوزات الجديدة": {
    "en": "New booking bell",
    "zh-CN": "新预约提示铃",
    "es": "Aviso sonoro de reservas",
    "ur": "نئی بکنگ کی گھنٹی"
  },
  "الجرس مفعّل ما دامت اللوحة مفتوحة. قد يعلّق المتصفح المتابعة عند قفل الجهاز.": {
    "en": "The bell works while the dashboard is open. Your browser may pause updates when the device is locked.",
    "zh-CN": "控制面板打开时提示铃生效。设备锁定时，浏览器可能暂停更新。",
    "es": "El aviso funciona mientras el panel está abierto. El navegador puede pausar las actualizaciones al bloquear el dispositivo.",
    "ur": "ڈیش بورڈ کھلا ہو تو گھنٹی کام کرتی ہے۔ آلہ لاک ہونے پر براؤزر اپ ڈیٹس روک سکتا ہے۔"
  },
  "فعّل الصوت مرة عند فتح اللوحة لتسمع جرسًا عند وصول حجز جديد.": {
    "en": "Enable sound once when opening the dashboard to hear new bookings.",
    "zh-CN": "打开控制面板后启用一次声音，即可收听新预约提示。",
    "es": "Activa el sonido al abrir el panel para oír los avisos de reservas nuevas.",
    "ur": "نئی بکنگ کی گھنٹی سننے کے لیے ڈیش بورڈ کھولتے وقت آواز ایک بار فعال کریں۔"
  },
  "كتم جرس الحجوزات": {
    "en": "Mute booking bell",
    "zh-CN": "静音预约提示铃",
    "es": "Silenciar avisos de reservas",
    "ur": "بکنگ کی گھنٹی خاموش کریں"
  },
  "تفعيل جرس الحجوزات": {
    "en": "Enable booking bell",
    "zh-CN": "启用预约提示铃",
    "es": "Activar avisos de reservas",
    "ur": "بکنگ کی گھنٹی فعال کریں"
  },
  "وصل حجز جديد ·": {
    "en": "New booking received ·",
    "zh-CN": "收到新预约 ·",
    "es": "Nueva reserva recibida ·",
    "ur": "نئی بکنگ موصول ہوئی ·"
  },
  "عرض الحجوزات الجديدة": {
    "en": "View new bookings",
    "zh-CN": "查看新预约",
    "es": "Ver reservas nuevas",
    "ur": "نئی بکنگ دیکھیں"
  },
  "إخفاء التنبيه": {
    "en": "Dismiss alert",
    "zh-CN": "关闭通知",
    "es": "Ocultar aviso",
    "ur": "اطلاع چھپائیں"
  },
  "نقطة البيع وإدارة المغسلة": {
    "en": "Laundry POS and operations",
    "zh-CN": "洗衣店收银与管理",
    "es": "Punto de venta y gestión de lavandería",
    "ur": "لانڈری کیشئر اور انتظام"
  },
  "الفريق والصلاحيات": {
    "en": "Team and permissions",
    "zh-CN": "团队与权限",
    "es": "Equipo y permisos",
    "ur": "ٹیم اور اجازتیں"
  },
  "إشعارات الكاشير والعملاء": {
    "en": "POS and customer notifications",
    "zh-CN": "收银与客户通知",
    "es": "Avisos del punto de venta y de clientes",
    "ur": "کیشئر اور گاہکوں کی اطلاعات"
  },
  "حسابات المنشأة": {
    "en": "Business accounts",
    "zh-CN": "企业账户",
    "es": "Cuentas del negocio",
    "ur": "کاروباری حسابات"
  },
  "العملاء والمخزون": {
    "en": "Customers and inventory",
    "zh-CN": "客户与库存",
    "es": "Clientes e inventario",
    "ur": "گاہک اور اسٹاک"
  },
  "إدارة التوصيل": {
    "en": "Delivery management",
    "zh-CN": "配送管理",
    "es": "Gestión de entregas",
    "ur": "ڈیلیوری کا انتظام"
  },
  "البرنامج المحاسبي": {
    "en": "Accounting software",
    "zh-CN": "会计软件",
    "es": "Programa contable",
    "ur": "حسابات کا سافٹ ویئر"
  },
  "مساحة الأعمال": {
    "en": "Business workspace",
    "zh-CN": "企业工作空间",
    "es": "Espacio de negocio",
    "ur": "کاروباری کام کی جگہ"
  },
  "تنقل مساحة الأعمال": {
    "en": "Workspace navigation",
    "zh-CN": "工作空间导航",
    "es": "Navegación del espacio de trabajo",
    "ur": "کاروباری نیویگیشن"
  },
  "لوحة التحكم": {
    "en": "Dashboard",
    "zh-CN": "控制面板",
    "es": "Panel de control",
    "ur": "ڈیش بورڈ"
  },
  "أعمالك اليومية": {
    "en": "Daily work",
    "zh-CN": "日常工作",
    "es": "Trabajo diario",
    "ur": "روزمرہ کام"
  },
  "صفحتك وهويتك": {
    "en": "Your page and identity",
    "zh-CN": "页面与身份",
    "es": "Tu página e identidad",
    "ur": "آپ کا صفحہ اور شناخت"
  },
  "التسويق والنمو": {
    "en": "Marketing and growth",
    "zh-CN": "营销与增长",
    "es": "Marketing y crecimiento",
    "ur": "مارکیٹنگ اور ترقی"
  },
  "إدارة الحساب": {
    "en": "Account management",
    "zh-CN": "账户管理",
    "es": "Gestión de cuenta",
    "ur": "اکاؤنٹ کا انتظام"
  },
  "الإشعارات": {
    "en": "Notifications",
    "zh-CN": "通知",
    "es": "Notificaciones",
    "ur": "اطلاعات"
  },
  "تذكير متأخر": {
    "en": "Overdue reminder",
    "zh-CN": "逾期提醒",
    "es": "Recordatorio vencido",
    "ur": "تاخیر شدہ یاد دہانی"
  },
  "عمل متوقف": {
    "en": "Blocked work",
    "zh-CN": "受阻工作",
    "es": "Trabajo bloqueado",
    "ur": "رکا ہوا کام"
  },
  "معرّض للتعثر": {
    "en": "At risk",
    "zh-CN": "存在风险",
    "es": "En riesgo",
    "ur": "خطرے میں"
  },
  "تجاوز موعد العمل": {
    "en": "Past the work deadline",
    "zh-CN": "已超过工作期限",
    "es": "Plazo de trabajo vencido",
    "ur": "کام کی آخری تاریخ گزر گئی"
  },
  "أولوية عاجلة": {
    "en": "Urgent priority",
    "zh-CN": "紧急优先级",
    "es": "Prioridad urgente",
    "ur": "فوری ترجیح"
  },
  "أولوية مرتفعة": {
    "en": "High priority",
    "zh-CN": "高优先级",
    "es": "Prioridad alta",
    "ur": "اعلیٰ ترجیح"
  },
  "مسؤول وموعد محددان": {
    "en": "Owner and deadline assigned",
    "zh-CN": "已指定负责人和期限",
    "es": "Responsable y plazo definidos",
    "ur": "ذمہ دار اور موعد مقرر"
  },
  "خطوة تالية واضحة": {
    "en": "Clear next action",
    "zh-CN": "明确的下一步",
    "es": "Siguiente paso claro",
    "ur": "اگلا قدم واضح ہے"
  },
  "تذكير مجدول": {
    "en": "Scheduled reminder",
    "zh-CN": "已安排提醒",
    "es": "Recordatorio programado",
    "ur": "طے شدہ یاد دہانی"
  },
  "مذكرة حديثة": {
    "en": "Recent note",
    "zh-CN": "最新笔记",
    "es": "Nota reciente",
    "ur": "حالیہ نوٹ"
  },
  "متوقف": {
    "en": "Blocked",
    "zh-CN": "已暂停",
    "es": "Bloqueado",
    "ur": "رکا ہوا"
  },
  "يحتاج متابعة": {
    "en": "Needs attention",
    "zh-CN": "需要跟进",
    "es": "Necesita seguimiento",
    "ur": "توجہ درکار"
  },
  "على المسار": {
    "en": "On track",
    "zh-CN": "进展正常",
    "es": "En curso",
    "ur": "درست سمت میں"
  },
  "اليوم": {
    "en": "Today",
    "zh-CN": "今天",
    "es": "Hoy",
    "ur": "آج"
  },
  "يحتاج تدخلك الآن": {
    "en": "Needs your attention now",
    "zh-CN": "现在需要您的处理",
    "es": "Requiere tu atención ahora",
    "ur": "ابھی آپ کی توجہ درکار ہے"
  },
  "التالي": {
    "en": "Next",
    "zh-CN": "下一步",
    "es": "Siguiente",
    "ur": "اگلا"
  },
  "أقرب خطوة بعد ذلك": {
    "en": "The next closest action",
    "zh-CN": "接下来最紧迫的行动",
    "es": "La acción más próxima",
    "ur": "اس کے بعد قریب ترین قدم"
  },
  "بانتظار متابعة": {
    "en": "Awaiting follow-up",
    "zh-CN": "等待跟进",
    "es": "Pendiente de seguimiento",
    "ur": "پیروی کا منتظر"
  },
  "متوقف مؤقتًا حتى استئنافه": {
    "en": "Paused until resumed",
    "zh-CN": "暂停，等待恢复",
    "es": "En pausa hasta reanudarse",
    "ur": "دوبارہ شروع ہونے تک رکا ہوا"
  },
  "مساحة الموظف": {
    "en": "Staff workspace",
    "zh-CN": "员工工作空间",
    "es": "Espacio del personal",
    "ur": "ملازم کی کام کی جگہ"
  },
  "مرحبًا": {
    "en": "Hello",
    "zh-CN": "您好",
    "es": "Hola",
    "ur": "خوش آمدید"
  },
  "، هذه الأقسام المتاحة لك في": {
    "en": ", these are your available sections at",
    "zh-CN": "，以下是您可访问的栏目，所在企业为",
    "es": ", estas son tus secciones disponibles en",
    "ur": "، یہ آپ کے دستیاب حصے ہیں"
  },
  "بيانات حسابي": {
    "en": "My account details",
    "zh-CN": "我的账户资料",
    "es": "Datos de mi cuenta",
    "ur": "میرے اکاؤنٹ کی تفصیلات"
  },
  "ابدأ هويتك الرقمية": {
    "en": "Start your digital identity",
    "zh-CN": "创建数字身份",
    "es": "Empieza tu identidad digital",
    "ur": "اپنی ڈیجیٹل شناخت شروع کریں"
  },
  "أنشئ الأساس مرة واحدة، ثم اجعل INFRO مساحة تشغيل حضورك الرقمي والتسويقي.": {
    "en": "Set up your foundation once, then use INFRO to run your digital and marketing presence.",
    "zh-CN": "完成基础设置后，即可使用 INFRO 管理您的数字与营销形象。",
    "es": "Configura la base una vez y usa INFRO para gestionar tu presencia digital y de marketing.",
    "ur": "بنیادی معلومات ایک بار مکمل کریں، پھر INFRO سے اپنی ڈیجیٹل اور مارکیٹنگ موجودگی سنبھالیں۔"
  },
  "إنشاء الصفحة": {
    "en": "Create page",
    "zh-CN": "创建页面",
    "es": "Crear página",
    "ur": "صفحہ بنائیں"
  },
  "بيانات الصفحة": {
    "en": "Page details",
    "zh-CN": "页面资料",
    "es": "Datos de la página",
    "ur": "صفحے کی تفصیلات"
  },
  "الشعار والمظهر": {
    "en": "Logo and appearance",
    "zh-CN": "标志与外观",
    "es": "Logotipo y apariencia",
    "ur": "لوگو اور ظاہری شکل"
  },
  "الملف التعريفي PDF": {
    "en": "Company profile PDF",
    "zh-CN": "公司简介 PDF",
    "es": "Perfil de empresa PDF",
    "ur": "کمپنی پروفائل PDF"
  },
  "أكد بريد الحساب": {
    "en": "Verify your email",
    "zh-CN": "验证邮箱",
    "es": "Verifica tu correo",
    "ur": "اپنی ای میل کی تصدیق کریں"
  },
  "التأكيد مطلوب قبل النشر العام.": {
    "en": "Verification is required before publishing.",
    "zh-CN": "发布前需要完成验证。",
    "es": "Debes verificarlo antes de publicar.",
    "ur": "شائع کرنے سے پہلے تصدیق ضروری ہے۔"
  },
  "خطوة متبقية لاستكمال حضور منشأتك.": {
    "en": "One step remains to complete your business presence.",
    "zh-CN": "完成企业形象还差一步。",
    "es": "Queda un paso para completar tu presencia.",
    "ur": "کاروباری موجودگی مکمل کرنے کا ایک مرحلہ باقی ہے۔"
  },
  "مساحة العمل جاهزة": {
    "en": "Your workspace is ready",
    "zh-CN": "工作空间已就绪",
    "es": "Tu espacio de trabajo está listo",
    "ur": "کام کی جگہ تیار ہے"
  },
  "راجع الأعمال القادمة أو أضف مذكرة تشغيلية جديدة.": {
    "en": "Review upcoming work or add a new operational note.",
    "zh-CN": "查看即将进行的工作或添加运营笔记。",
    "es": "Revisa el trabajo próximo o añade una nota operativa.",
    "ur": "آئندہ کام دیکھیں یا نیا کاروباری نوٹ شامل کریں۔"
  },
  "الزيارات": {
    "en": "Visits",
    "zh-CN": "访问量",
    "es": "Visitas",
    "ur": "وزٹ"
  },
  "التفاعل": {
    "en": "Engagement",
    "zh-CN": "互动",
    "es": "Interacción",
    "ur": "تعامل"
  },
  "الحجوزات": {
    "en": "Bookings",
    "zh-CN": "预约",
    "es": "Reservas",
    "ur": "بکنگ"
  },
  "مساحة أعمالك في انفرو": {
    "en": "Your INFRO business workspace",
    "zh-CN": "您的 INFRO 企业工作空间",
    "es": "Tu espacio de negocio en INFRO",
    "ur": "INFRO میں آپ کی کاروباری جگہ"
  },
  "موثقة": {
    "en": "Verified",
    "zh-CN": "已认证",
    "es": "Verificada",
    "ur": "تصدیق شدہ"
  },
  "مرحبًا بك. تابع عملاءك اليوم، وأدر صفحتك وتسويقك من هنا.": {
    "en": "Welcome. Follow up with customers and manage your page and marketing here.",
    "zh-CN": "欢迎。您可以在此跟进客户，管理页面和营销。",
    "es": "Bienvenido. Haz seguimiento de tus clientes y gestiona tu página y marketing desde aquí.",
    "ur": "خوش آمدید۔ یہاں گاہکوں کی پیروی، صفحے اور مارکیٹنگ کا انتظام کریں۔"
  },
  "تعديل صفحتي": {
    "en": "Edit my page",
    "zh-CN": "编辑我的页面",
    "es": "Editar mi página",
    "ur": "میرا صفحہ ترمیم کریں"
  },
  "إدارة الحجوزات": {
    "en": "Manage bookings",
    "zh-CN": "管理预约",
    "es": "Gestionar reservas",
    "ur": "بکنگ سنبھالیں"
  },
  "أولويتك الآن": {
    "en": "Your priority now",
    "zh-CN": "当前优先事项",
    "es": "Tu prioridad ahora",
    "ur": "ابھی کی ترجیح"
  },
  "متابعة العملاء": {
    "en": "Customer follow-up",
    "zh-CN": "客户跟进",
    "es": "Seguimiento de clientes",
    "ur": "گاہکوں کی پیروی"
  },
  "أعمالك المفتوحة": {
    "en": "Open work",
    "zh-CN": "未完成工作",
    "es": "Trabajo pendiente",
    "ur": "آپ کے کھلے کام"
  },
  "تُحدّث تلقائيًا": {
    "en": "Updates automatically",
    "zh-CN": "自动更新",
    "es": "Actualización automática",
    "ur": "خودکار اپ ڈیٹ"
  },
  "طلبات قيد المتابعة": {
    "en": "Requests in progress",
    "zh-CN": "跟进中的请求",
    "es": "Solicitudes en seguimiento",
    "ur": "زیرِ پیروی درخواستیں"
  },
  "لا توجد طلبات بانتظار التأكيد": {
    "en": "No requests awaiting confirmation",
    "zh-CN": "没有待确认请求",
    "es": "No hay solicitudes pendientes de confirmación",
    "ur": "تصدیق کی منتظر درخواستیں نہیں"
  },
  "إدارة الطلبات": {
    "en": "Manage requests",
    "zh-CN": "管理请求",
    "es": "Gestionar solicitudes",
    "ur": "درخواستیں سنبھالیں"
  },
  "حجوزات قادمة وجارية": {
    "en": "Upcoming and active bookings",
    "zh-CN": "即将到来及进行中的预约",
    "es": "Reservas próximas y activas",
    "ur": "آئندہ اور جاری بکنگ"
  },
  "لا توجد حجوزات بانتظار التأكيد": {
    "en": "No bookings awaiting confirmation",
    "zh-CN": "没有待确认预约",
    "es": "No hay reservas pendientes de confirmación",
    "ur": "تصدیق کی منتظر بکنگ نہیں"
  },
  "الموعد القادم": {
    "en": "Next appointment",
    "zh-CN": "下次预约",
    "es": "Próxima cita",
    "ur": "اگلی ملاقات"
  },
  "لا يوجد موعد قادم": {
    "en": "No upcoming appointment",
    "zh-CN": "暂无即将到来的预约",
    "es": "No hay próximas citas",
    "ur": "کوئی آئندہ ملاقات نہیں"
  },
  "ستظهر تفاصيل أقرب حجز هنا عند وصوله.": {
    "en": "The nearest booking will appear here when received.",
    "zh-CN": "收到预约后，最近的预约将在此显示。",
    "es": "La próxima reserva aparecerá aquí al recibirse.",
    "ur": "قریب ترین بکنگ موصول ہونے پر یہاں دکھائی دے گی۔"
  },
  "عرض جدول المواعيد": {
    "en": "View appointment schedule",
    "zh-CN": "查看预约日程",
    "es": "Ver agenda de citas",
    "ur": "ملاقاتوں کا شیڈول دیکھیں"
  },
  "متابعة أعمالك": {
    "en": "Track your work",
    "zh-CN": "跟进工作",
    "es": "Sigue tu trabajo",
    "ur": "اپنے کام کی پیروی کریں"
  },
  "ما يحتاج انتباهك الآن": {
    "en": "What needs your attention",
    "zh-CN": "需要您关注的事项",
    "es": "Lo que requiere tu atención",
    "ur": "آپ کی توجہ کا طلبگار"
  },
  "أقرب التذكيرات والمذكرات التي تحتاج متابعتك، مرتبة حسب الأولوية.": {
    "en": "Your upcoming reminders and notes, ordered by priority.",
    "zh-CN": "需要跟进的提醒和笔记，按优先级排序。",
    "es": "Tus recordatorios y notas que necesitan seguimiento, ordenados por prioridad.",
    "ur": "آپ کی توجہ کے منتظر یاد دہانیوں اور نوٹس کی ترجیحی ترتیب۔"
  },
  "كل التذكيرات": {
    "en": "All reminders",
    "zh-CN": "所有提醒",
    "es": "Todos los recordatorios",
    "ur": "تمام یاد دہانیاں"
  },
  "كل المذكرات": {
    "en": "All notes",
    "zh-CN": "所有笔记",
    "es": "Todas las notas",
    "ur": "تمام نوٹس"
  },
  "لا توجد مذكرات أو تذكيرات للمتابعة": {
    "en": "No notes or reminders need follow-up",
    "zh-CN": "没有需要跟进的笔记或提醒",
    "es": "No hay notas ni recordatorios pendientes",
    "ur": "پیروی کے لیے کوئی نوٹ یا یاد دہانی نہیں"
  },
  "دوّن ما تريد إنجازه أو أضف تذكيرًا لموعد مهم؛ ستجد أعمالك القادمة هنا.": {
    "en": "Write down a task or add a reminder for an important date; your upcoming work will appear here.",
    "zh-CN": "记下待办事项或添加重要日期提醒，接下来的工作将在此显示。",
    "es": "Anota una tarea o añade un recordatorio para una fecha importante; verás aquí el trabajo próximo.",
    "ur": "کام لکھیں یا اہم تاریخ کی یاد دہانی شامل کریں؛ آئندہ کام یہاں دکھائی دیں گے۔"
  },
  "تذكيرات نشطة": {
    "en": "Active reminders",
    "zh-CN": "有效提醒",
    "es": "Recordatorios activos",
    "ur": "فعال یاد دہانیاں"
  },
  "مذكرات نشطة": {
    "en": "Active notes",
    "zh-CN": "有效笔记",
    "es": "Notas activas",
    "ur": "فعال نوٹس"
  },
  "تذكيرات تحتاج انتباه": {
    "en": "Reminders needing attention",
    "zh-CN": "需要关注的提醒",
    "es": "Recordatorios que requieren atención",
    "ur": "توجہ طلب یاد دہانیاں"
  },
  "مذكرات تحتاج انتباه": {
    "en": "Notes needing attention",
    "zh-CN": "需要关注的笔记",
    "es": "Notas que requieren atención",
    "ur": "توجہ طلب نوٹس"
  },
  "لا توجد أعمال متأخرة أو متعثرة حاليًا؛ العناصر المعروضة هي الأقرب تشغيليًا.": {
    "en": "No overdue or at-risk work. The items shown are your next operational priorities.",
    "zh-CN": "目前没有逾期或存在风险的工作。显示的是接下来最优先的运营事项。",
    "es": "No hay trabajos vencidos o en riesgo. Se muestran las próximas prioridades operativas.",
    "ur": "فی الحال کوئی تاخیر شدہ یا خطرے میں کام نہیں؛ دکھائے گئے کام اگلی عملی ترجیحات ہیں۔"
  },
  "أداء منشأتك · آخر 7 أيام": {
    "en": "Business performance · Last 7 days",
    "zh-CN": "企业表现 · 最近 7 天",
    "es": "Rendimiento · Últimos 7 días",
    "ur": "کاروبار کی کارکردگی · گزشتہ 7 دن"
  },
  "من الزيارة إلى التواصل": {
    "en": "From visits to conversations",
    "zh-CN": "从访问到联系",
    "es": "De las visitas al contacto",
    "ur": "وزٹ سے رابطے تک"
  },
  "الزيارات أحداث مشاهدة، وليست عدد أشخاص فريدين. أول يوم وآخر يوم جزئيان.": {
    "en": "Visits count page views, not unique people. The first and last days are partial.",
    "zh-CN": "访问量统计页面浏览次数，并非独立访客人数。首日和末日为不完整日。",
    "es": "Las visitas son vistas de página, no personas únicas. El primer y último día son parciales.",
    "ur": "وزٹ سے مراد صفحہ دیکھنے کے واقعات ہیں، منفرد افراد نہیں۔ پہلا اور آخری دن جزوی ہیں۔"
  },
  "التحليلات الكاملة": {
    "en": "Full analytics",
    "zh-CN": "完整分析",
    "es": "Estadísticas completas",
    "ur": "مکمل اعداد و شمار"
  },
  "هويتك الرقمية وتواصلك مع العملاء": {
    "en": "Your digital identity and customer communication",
    "zh-CN": "数字身份与客户沟通",
    "es": "Tu identidad digital y comunicación con clientes",
    "ur": "ڈیجیٹل شناخت اور گاہکوں سے رابطہ"
  },
  "ركائز INFRO": {
    "en": "INFRO pillars",
    "zh-CN": "INFRO 核心功能",
    "es": "Pilares de INFRO",
    "ur": "INFRO کے ستون"
  },
  "حضورك الرقمي": {
    "en": "Your digital presence",
    "zh-CN": "您的数字形象",
    "es": "Tu presencia digital",
    "ur": "آپ کی ڈیجیٹل موجودگی"
  },
  "صفحتك، شعارك، ملف منشأتك وظهورها في البحث.": {
    "en": "Your page, logo, business profile and search visibility.",
    "zh-CN": "企业页面、标志、简介及搜索可见性。",
    "es": "Tu página, logotipo, perfil y visibilidad en buscadores.",
    "ur": "آپ کا صفحہ، لوگو، کاروباری پروفائل اور تلاش میں موجودگی۔"
  },
  "تواصل مع عملائك": {
    "en": "Connect with customers",
    "zh-CN": "联系客户",
    "es": "Conecta con tus clientes",
    "ur": "گاہکوں سے رابطہ"
  },
  "الحملات والقوالب والمحادثات عبر Meta الرسمي.": {
    "en": "Campaigns, templates and conversations through official Meta tools.",
    "zh-CN": "通过 Meta 官方工具管理营销活动、模板和对话。",
    "es": "Campañas, plantillas y conversaciones mediante las herramientas oficiales de Meta.",
    "ur": "Meta کے آفیشل ذرائع سے مہمات، سانچے اور گفتگو۔"
  },
  "خطوات تجهيز صفحتك": {
    "en": "Page setup steps",
    "zh-CN": "页面设置步骤",
    "es": "Pasos para preparar tu página",
    "ur": "صفحے کی تیاری کے مراحل"
  },
  "من الأساس إلى حضور مكتمل": {
    "en": "From the basics to a complete presence",
    "zh-CN": "从基础到完整的企业形象",
    "es": "De la base a una presencia completa",
    "ur": "بنیاد سے مکمل موجودگی تک"
  },
  "باقتك الحالية": {
    "en": "Your current plan",
    "zh-CN": "当前套餐",
    "es": "Tu plan actual",
    "ur": "آپ کا موجودہ پیکیج"
  },
  "تذكير": {
    "en": "Reminder",
    "zh-CN": "提醒",
    "es": "Recordatorio",
    "ur": "یاد دہانی"
  },
  "مذكرة": {
    "en": "Note",
    "zh-CN": "笔记",
    "es": "Nota",
    "ur": "نوٹ"
  },
  "الحالة": {
    "en": "Status",
    "zh-CN": "状态",
    "es": "Estado",
    "ur": "حالت"
  },
  "المسؤول": {
    "en": "Owner",
    "zh-CN": "负责人",
    "es": "Responsable",
    "ur": "ذمہ دار"
  },
  "غير محدد": {
    "en": "Not set",
    "zh-CN": "未设置",
    "es": "Sin definir",
    "ur": "مقرر نہیں"
  },
  "الموعد": {
    "en": "Due date",
    "zh-CN": "到期时间",
    "es": "Fecha prevista",
    "ur": "موعد"
  },
  "الخطوة التالية": {
    "en": "Next action",
    "zh-CN": "下一步",
    "es": "Siguiente paso",
    "ur": "اگلا قدم"
  },
  "الإنجاز": {
    "en": "Progress",
    "zh-CN": "进度",
    "es": "Progreso",
    "ur": "پیش رفت"
  },
  "فتح التذكير": {
    "en": "Open reminder",
    "zh-CN": "打开提醒",
    "es": "Abrir recordatorio",
    "ur": "یاد دہانی کھولیں"
  },
  "فتح المذكرة": {
    "en": "Open note",
    "zh-CN": "打开笔记",
    "es": "Abrir nota",
    "ur": "نوٹ کھولیں"
  },
  "لا توجد بيانات حالياً": {
    "en": "No data yet",
    "zh-CN": "暂无数据",
    "es": "Todavía no hay datos",
    "ur": "فی الحال کوئی معلومات نہیں"
  },
  "حضورك المهني": {
    "en": "Your professional presence",
    "zh-CN": "您的专业形象",
    "es": "Tu presencia profesional",
    "ur": "آپ کی پیشہ ورانہ موجودگی"
  },
  "صفحة منشأة تجمع خدماتك وفروعك وفريقك وطرق التواصل، برابط واحد يسهل مشاركته.": {
    "en": "A business page for your services, branches, team and contact channels, with one easy-to-share link.",
    "zh-CN": "一个企业页面展示服务、分店、团队和联系方式，配以便于分享的链接。",
    "es": "Una página con tus servicios, sucursales, equipo y contactos, en un enlace fácil de compartir.",
    "ur": "خدمات، شاخوں، ٹیم اور رابطے کے ذرائع کا کاروباری صفحہ، ایک آسانی سے شیئر ہونے والے لنک کے ساتھ۔"
  },
  "للمنشآت التي تريد حضورًا منظمًا يسهل على العميل فهمه والتواصل من خلاله.": {
    "en": "For businesses that want an organized presence customers can understand and use to get in touch.",
    "zh-CN": "适合希望以清晰有序的页面让客户了解并联系的企业。",
    "es": "Para negocios que quieren una presencia organizada y fácil de entender y contactar.",
    "ur": "ان کاروباروں کے لیے جو واضح اور منظم موجودگی چاہتے ہیں تاکہ گاہک آسانی سے سمجھ کر رابطہ کر سکے۔"
  },
  "أنشئ حسابك المجاني وأكمل اسم المنشأة وبيانات التواصل.": {
    "en": "Create a free account and enter your business name and contact details.",
    "zh-CN": "创建免费账户，填写企业名称和联系方式。",
    "es": "Crea una cuenta gratuita e introduce el nombre y los datos de contacto del negocio.",
    "ur": "مفت اکاؤنٹ بنائیں اور کاروبار کا نام اور رابطے کی تفصیلات شامل کریں۔"
  },
  "أضف الخدمات والفروع والشعار، وخصص الألوان والخط وترتيب الأقسام.": {
    "en": "Add services, branches and your logo; customize colors, fonts and section order.",
    "zh-CN": "添加服务、分店和标志，自定义颜色、字体和栏目顺序。",
    "es": "Añade servicios, sucursales y logotipo; personaliza colores, fuente y orden de secciones.",
    "ur": "خدمات، شاخیں اور لوگو شامل کریں؛ رنگ، فونٹ اور حصوں کی ترتیب بدلیں۔"
  },
  "أكد بريدك، وعاين الصفحة ثم انشرها وشارك رابطها.": {
    "en": "Verify your email, preview the page, then publish and share it.",
    "zh-CN": "验证邮箱，预览页面，然后发布和分享。",
    "es": "Verifica tu correo, revisa la página, publícala y comparte el enlace.",
    "ur": "ای میل کی تصدیق کریں، پیش منظر دیکھیں، پھر شائع کرکے لنک شیئر کریں۔"
  },
  "صفحة متجاوبة مع الجوال، وروابط تواصل وخريطة ومشاركة.": {
    "en": "A mobile-friendly page with contact links, map and sharing.",
    "zh-CN": "适配手机的页面，包含联系链接、地图和分享功能。",
    "es": "Página adaptada al móvil con contactos, mapa y opciones para compartir.",
    "ur": "موبائل کے موافق صفحہ، رابطے کے لنکس، نقشہ اور شیئرنگ۔"
  },
  "خدمات ومنتجات ومعرض أعمال وفريق، حسب حدود الباقة.": {
    "en": "Services, products, portfolio and team, subject to your plan limits.",
    "zh-CN": "根据套餐限额展示服务、产品、作品集和团队。",
    "es": "Servicios, productos, portafolio y equipo según los límites del plan.",
    "ur": "پیکیج کی حدود کے مطابق خدمات، مصنوعات، کاموں کی گیلری اور ٹیم۔"
  },
  "تحليلات الزيارات والتفاعل لمتابعة حضورك.": {
    "en": "Visit and engagement analytics to track your presence.",
    "zh-CN": "通过访问与互动分析追踪企业形象的效果。",
    "es": "Estadísticas de visitas e interacción para seguir tu presencia.",
    "ur": "اپنی موجودگی جانچنے کے لیے وزٹ اور تعامل کے اعداد و شمار۔"
  },
  "الهوية الأساسية مجانية. حجز المواعيد خدمة مدفوعة. توثيق المنشأة يخضع للمراجعة ولا يحدث تلقائيًا بعد التسجيل.": {
    "en": "Basic identity is free. Appointment booking is paid. Business verification requires review and is not automatic after registration.",
    "zh-CN": "基础企业身份免费，预约为付费服务。企业认证需经过审核，注册后不会自动获得。",
    "es": "La identidad básica es gratuita. Las reservas son de pago. La verificación requiere revisión y no es automática al registrarse.",
    "ur": "بنیادی شناخت مفت ہے۔ بکنگ بامعاوضہ ہے۔ کاروباری تصدیق جائزے کے بعد ہوتی ہے، رجسٹریشن سے خودکار نہیں۔"
  },
  "الكاشير والمحاسبة والمواعيد": {
    "en": "POS, accounting and appointments",
    "zh-CN": "收银、会计与预约",
    "es": "Punto de venta, contabilidad y citas",
    "ur": "کیشئر، حسابات اور ملاقاتیں"
  },
  "نظّم عملك اليومي": {
    "en": "Organize daily operations",
    "zh-CN": "管理日常业务",
    "es": "Organiza el trabajo diario",
    "ur": "روزمرہ کام منظم کریں"
  },
  "من إدخال الطلب إلى الفاتورة والتحصيل واشتراك العميل والمتابعة؛ أدوات تشغيل تتكيف مع نشاطك.": {
    "en": "From order entry to invoicing, collection, customer subscriptions and follow-up: operational tools tailored to your business.",
    "zh-CN": "从订单录入到开票、收款、客户订阅和跟进，提供适配您业务的运营工具。",
    "es": "Del pedido a la factura, cobro, suscripción del cliente y seguimiento: herramientas adaptadas a tu actividad.",
    "ur": "آرڈر سے بل، وصولی، گاہک کے اشتراک اور پیروی تک؛ کاروبار کے مطابق عملی اوزار۔"
  },
  "للورش والمغاسل والمتاجر ومقدمي الخدمات الذين يحتاجون إدارة العمل والعملاء والحسابات.": {
    "en": "For workshops, laundries, stores and service providers managing work, customers and accounts.",
    "zh-CN": "适合需要管理工作、客户和账务的维修店、洗衣店、商店及服务企业。",
    "es": "Para talleres, lavanderías, tiendas y proveedores que gestionan trabajo, clientes y cuentas.",
    "ur": "ورشاپس، لانڈری، اسٹورز اور خدماتی کاروباروں کے کام، گاہکوں اور حسابات کے انتظام کے لیے۔"
  },
  "حدد النشاط وأضف الخدمات والأسعار والموظفين بصلاحياتهم.": {
    "en": "Choose your activity and add services, prices and staff permissions.",
    "zh-CN": "选择业务类型，添加服务、价格和员工权限。",
    "es": "Define la actividad y añade servicios, precios y permisos del personal.",
    "ur": "کاروبار کی نوعیت، خدمات، قیمتیں اور ملازمین کی اجازتیں مقرر کریں۔"
  },
  "أنشئ الطلب وحدد موعد التسليم والدفع؛ يظهر اشتراك العميل ورصيده عند وجوده.": {
    "en": "Create the order and set delivery and payment details; existing customer subscriptions and balances appear automatically.",
    "zh-CN": "创建订单，设置交付和付款资料；已有客户订阅和余额将显示。",
    "es": "Crea el pedido y define entrega y pago; se mostrarán la suscripción y el saldo del cliente cuando existan.",
    "ur": "آرڈر بنائیں، ڈیلیوری اور ادائیگی طے کریں؛ گاہک کا موجودہ اشتراک اور بیلنس دکھائی دے گا۔"
  },
  "تابع الحالة والتحصيل والمخزون والتقارير، وفعّل إشعارات الطلب بعد تجهيز واتساب.": {
    "en": "Track status, collections, stock and reports; activate order notifications after configuring WhatsApp.",
    "zh-CN": "跟进状态、收款、库存和报表，配置 WhatsApp 后启用订单通知。",
    "es": "Sigue estados, cobros, inventario e informes; activa los avisos tras configurar WhatsApp.",
    "ur": "حالت، وصولی، اسٹاک اور رپورٹس دیکھیں؛ واٹس ایپ تیار ہونے پر آرڈر کی اطلاعات فعال کریں۔"
  },
  "فواتير A4 و80 مم، دفعات جزئية ومختلطة، وأرصدة العملاء.": {
    "en": "A4 and 80 mm invoices, partial and mixed payments, and customer balances.",
    "zh-CN": "A4 和 80 毫米发票、部分及混合付款、客户余额。",
    "es": "Facturas A4 y de 80 mm, pagos parciales y mixtos y saldos de clientes.",
    "ur": "A4 اور 80 ملی میٹر بل، جزوی اور مخلوط ادائیگیاں، اور گاہکوں کے بیلنس۔"
  },
  "اشتراكات برصيد أو قطع أو زيارات، ومدد شهرية مع حساب الانتهاء.": {
    "en": "Subscriptions by balance, items or visits, with monthly durations and automatic expiry dates.",
    "zh-CN": "按余额、件数或次数的客户订阅，按月设置期限并计算到期日。",
    "es": "Suscripciones de saldo, artículos o visitas, con duraciones mensuales y vencimiento calculado.",
    "ur": "بیلنس، اشیا یا دوروں کے اشتراک، ماہانہ مدت اور اختتامی تاریخ کے حساب کے ساتھ۔"
  },
  "مخزون ومشتريات وموردون ومصروفات وقيود وسندات وتقارير.": {
    "en": "Inventory, purchases, suppliers, expenses, journal entries, vouchers and reports.",
    "zh-CN": "库存、采购、供应商、费用、会计分录、凭证和报表。",
    "es": "Inventario, compras, proveedores, gastos, asientos, comprobantes e informes.",
    "ur": "اسٹاک، خریداری، سپلائرز، اخراجات، روزنامچہ، واؤچرز اور رپورٹس۔"
  },
  "جاهزية الطلب وتذكير الاستلام والسداد وطلب التقييم بموافقة العميل.": {
    "en": "Ready notices, pickup and payment reminders and review requests with customer consent.",
    "zh-CN": "经客户同意发送就绪通知、取件和付款提醒及评价请求。",
    "es": "Avisos de pedido listo, recordatorios de recogida y pago y solicitudes de valoración con consentimiento.",
    "ur": "گاہک کی رضامندی سے تیاری کی اطلاع، وصولی اور ادائیگی کی یاد دہانیاں اور جائزے کی درخواست۔"
  },
  "حجز المواعيد وتنظيم الفروع والساعات والسعة ضمن الباقات التي تشمل المواعيد.": {
    "en": "Appointment booking with branch, hours and capacity settings in plans that include bookings.",
    "zh-CN": "包含预约的套餐可设置分店、营业时间和接待容量。",
    "es": "Reservas con sucursales, horarios y capacidad en los planes que incluyen citas.",
    "ur": "بکنگ والے پیکیجز میں شاخوں، اوقات اور گنجائش کے ساتھ ملاقاتوں کا انتظام۔"
  },
  "الأجهزة والطابعة والتركيب ليست ضمن الاشتراك. الربط المباشر بأجهزة مدى والفوترة الضريبية لهما تجهيز مستقل. خدمة المحاسبة المنفصلة لا تشمل حجز المواعيد. رسائل واتساب تتطلب رقمًا متصلًا وقالبًا معتمدًا وتفعيل الإشعارات.": {
    "en": "Devices, printers and installation are excluded. Direct mada terminal integration and tax invoicing require separate setup. Standalone accounting excludes appointments. WhatsApp notices require a connected number, approved template and enabled settings.",
    "zh-CN": "不含设备、打印机和安装。mada 终端直接集成及税务开票需另行配置。独立会计服务不含预约。WhatsApp 通知需要已连接号码、获批模板和启用设置。",
    "es": "No incluye equipos, impresoras ni instalación. La integración directa de terminales mada y la facturación fiscal requieren preparación independiente. La contabilidad individual no incluye citas. Los avisos requieren número conectado, plantilla aprobada y ajustes activos.",
    "ur": "آلات، پرنٹر اور تنصیب شامل نہیں۔ mada ٹرمینل کا براہِ راست ربط اور ٹیکس بلنگ الگ تیاری چاہتے ہیں۔ الگ حسابات سروس میں ملاقاتیں شامل نہیں۔ واٹس ایپ کے لیے مربوط نمبر، منظور سانچہ اور فعال ترتیبات ضروری ہیں۔"
  },
  "تسويق واتساب والأتمتة": {
    "en": "WhatsApp marketing and automation",
    "zh-CN": "WhatsApp 营销与自动化",
    "es": "Marketing y automatización por WhatsApp",
    "ur": "واٹس ایپ مارکیٹنگ اور خودکاری"
  },
  "تواصل يحترم عميلك": {
    "en": "Communication that respects customers",
    "zh-CN": "尊重客户的沟通",
    "es": "Comunicación que respeta al cliente",
    "ur": "گاہک کا احترام کرنے والا رابطہ"
  },
  "حملات وقوالب ومحادثات وأتمتة من رقم منشأتك عبر WhatsApp Business Platform الرسمي.": {
    "en": "Campaigns, templates, conversations and automation from your business number through the official WhatsApp Business Platform.",
    "zh-CN": "通过官方 WhatsApp Business Platform，使用企业号码开展营销活动、模板消息、对话和自动化。",
    "es": "Campañas, plantillas, conversaciones y automatización desde tu número mediante WhatsApp Business Platform oficial.",
    "ur": "آفیشل WhatsApp Business Platform سے اپنے کاروباری نمبر پر مہمات، سانچے، گفتگو اور خودکاری۔"
  },
  "للأنشطة التي تريد متابعة جمهور وافق على التواصل، وتنظيم الحملات والردود وربط متجر مدعوم.": {
    "en": "For businesses following up with an opted-in audience, organizing campaigns and replies and connecting a supported store.",
    "zh-CN": "适合跟进已同意接收消息的客户、管理营销与回复并连接受支持商店的企业。",
    "es": "Para negocios con una audiencia que ha dado su consentimiento, que quieren gestionar campañas, respuestas y una tienda compatible.",
    "ur": "رضامند سامعین سے رابطے، مہمات اور جوابات کے انتظام اور معاون اسٹور جوڑنے والے کاروباروں کے لیے۔"
  },
  "اربط حساب Meta ورقم واتساب الخاص بالمنشأة، وتحقق من جاهزية الاتصال.": {
    "en": "Connect your Meta account and business WhatsApp number, then verify connection readiness.",
    "zh-CN": "连接 Meta 账户和企业 WhatsApp 号码，检查连接是否就绪。",
    "es": "Conecta la cuenta de Meta y el número del negocio y comprueba que estén listos.",
    "ur": "Meta اکاؤنٹ اور کاروباری واٹس ایپ نمبر جوڑ کر کنکشن کی تیاری جانچیں۔"
  },
  "أنشئ القوالب واعتمدها، وأضف جمهورك مع إثبات موافقته على التواصل.": {
    "en": "Create and approve templates, then add your audience with proof of consent.",
    "zh-CN": "创建并批准模板，添加客户并记录其同意。",
    "es": "Crea plantillas y obtén su aprobación; añade contactos con constancia de consentimiento.",
    "ur": "سانچے بنائیں اور منظوری لیں، پھر رضامندی کے ثبوت کے ساتھ رابطے شامل کریں۔"
  },
  "حدد الجمهور والموعد، ثم راقب حالات الإرسال والردود والاستخدام من اللوحة.": {
    "en": "Choose the audience and schedule, then track delivery, replies and usage from the dashboard.",
    "zh-CN": "选择客户群与时间，在控制面板查看送达、回复和用量。",
    "es": "Elige audiencia y horario y sigue entregas, respuestas y uso desde el panel.",
    "ur": "سامعین اور وقت چنیں، پھر ڈیش بورڈ میں ترسیل، جوابات اور استعمال دیکھیں۔"
  },
  "بناء القوالب ومزامنة اعتماد Meta، والجمهور والموافقة وإلغاء الاشتراك.": {
    "en": "Template builder and Meta approval sync, audience, consent and opt-out management.",
    "zh-CN": "模板编辑与 Meta 审批同步，客户群、同意及退订管理。",
    "es": "Creación de plantillas, sincronización con Meta y gestión de audiencia, consentimiento y bajas.",
    "ur": "سانچوں کی تیاری اور Meta منظوری کی ہم آہنگی، رابطے، رضامندی اور ان سبسکرائب کا انتظام۔"
  },
  "حملات مجدولة وسجل تسليم وصندوق محادثات بصلاحيات الموظفين.": {
    "en": "Scheduled campaigns, delivery logs and a conversation inbox with staff permissions.",
    "zh-CN": "定时营销活动、送达记录及具员工权限的对话收件箱。",
    "es": "Campañas programadas, registro de entregas y bandeja de conversaciones con permisos.",
    "ur": "طے شدہ مہمات، ترسیل کا ریکارڈ اور ملازمین کی اجازتوں والا گفتگو ان باکس۔"
  },
  "أتمتة الترحيب والمتابعة والسلات المتروكة عند الربط بمتجر ومسار مدعوم.": {
    "en": "Welcome, follow-up and abandoned-cart automation with a supported store and workflow connection.",
    "zh-CN": "连接受支持商店和流程后，启用欢迎、跟进及弃购提醒自动化。",
    "es": "Automatizaciones de bienvenida, seguimiento y carritos abandonados con tienda y flujo compatibles.",
    "ur": "معاون اسٹور اور طریقۂ کار کے ربط پر خوش آمدید، پیروی اور نامکمل کارٹ کی خودکاری۔"
  },
  "حصص معالجة شهرية كبيرة مع فصل إشعارات التشغيل عن الحملات.": {
    "en": "Large monthly processing allowances with separate operational and campaign quotas.",
    "zh-CN": "较大的月度处理配额，运营通知与营销活动分别计算。",
    "es": "Amplias cuotas mensuales de procesamiento con límites operativos y de campañas separados.",
    "ur": "بڑے ماہانہ پروسیسنگ کوٹے، عملی اطلاعات اور مہمات کے لیے الگ حدود۔"
  },
  "رسوم Meta منفصلة وتُدفع من حساب المنشأة. حصة INFRO لا ترفع حد Meta اليومي ولا تضمن التسليم. كل أتمتة تتطلب حدثًا وربطًا وموافقة وقالبًا مناسبًا؛ لا تعمل تلقائيًا لمجرد الاشتراك.": {
    "en": "Meta fees are separate and paid from the business account. INFRO allowances do not raise Meta daily limits or guarantee delivery. Each automation requires its event, integration, consent and suitable template; subscribing alone does not activate it.",
    "zh-CN": "Meta 费用独立，由企业账户支付。INFRO 配额不会提高 Meta 每日限额，也不保证送达。每个自动化流程都需要相应事件、集成、同意和适当模板；仅订阅不会自动启用。",
    "es": "Las tarifas de Meta se pagan aparte desde la cuenta del negocio. Las cuotas no aumentan los límites diarios de Meta ni garantizan la entrega. Cada automatización necesita evento, integración, consentimiento y plantilla; la suscripción no basta para activarla.",
    "ur": "Meta کی فیس الگ اور کاروبار کے اکاؤنٹ سے ہے۔ INFRO کوٹہ Meta کی روزانہ حد نہیں بڑھاتا اور ترسیل کی ضمانت نہیں۔ ہر خودکاری کو واقعہ، ربط، رضامندی اور موزوں سانچہ چاہیے؛ صرف اشتراک اسے فعال نہیں کرتا۔"
  },
  "المشاهدة المباشرة المؤقتة": {
    "en": "Temporary live viewing",
    "zh-CN": "临时实时观看",
    "es": "Visualización temporal en directo",
    "ur": "عارضی براہِ راست مشاہدہ"
  },
  "شفافية أثناء الخدمة": {
    "en": "Transparency during service",
    "zh-CN": "服务过程透明可见",
    "es": "Transparencia durante el servicio",
    "ur": "خدمت کے دوران شفافیت"
  },
  "امنح كل عميل رابطًا مؤقتًا للكاميرا المخصصة لطلبه، وأوقف الوصول عند انتهاء الوقت أو الخدمة.": {
    "en": "Give each customer a temporary link to the camera assigned to their order, and stop access when time or service ends.",
    "zh-CN": "向每位客户提供对应订单摄像头的临时链接，时间或服务结束时停止访问。",
    "es": "Da a cada cliente un enlace temporal a la cámara de su pedido y cierra el acceso al terminar el plazo o servicio.",
    "ur": "ہر گاہک کو اس کے آرڈر کے کیمرے کا عارضی لنک دیں، اور وقت یا خدمت ختم ہونے پر رسائی روک دیں۔"
  },
  "للورش والأنشطة التي تحتاج إطلاع العميل على سير الخدمة، مع زاوية تصوير تحمي خصوصية الآخرين.": {
    "en": "For workshops and businesses showing service progress while framing the camera to protect others' privacy.",
    "zh-CN": "适合展示服务进度的维修店和企业，并需选择保护他人隐私的拍摄角度。",
    "es": "Para talleres y negocios que muestran el progreso con un encuadre que protege la privacidad de otros.",
    "ur": "ورشاپس اور کاروباروں کے لیے جو کام کی پیش رفت دکھانا چاہتے ہیں، دوسروں کی رازداری محفوظ رکھتے ہوئے۔"
  },
  "أضف الموقع والمحطة وموديل الكاميرا أو جهاز التسجيل وبيانات البث داخل حسابك.": {
    "en": "Add the site, station, camera or recorder model and stream details securely in your account.",
    "zh-CN": "在账户中添加站点、工位、摄像头或录像机型号及视频流资料。",
    "es": "Añade ubicación, estación, modelo de cámara o grabador y datos de emisión dentro de tu cuenta.",
    "ur": "اکاؤنٹ کے اندر مقام، اسٹیشن، کیمرے یا ریکارڈر کا ماڈل اور اسٹریم کی تفصیلات شامل کریں۔"
  },
  "شغّل موصل INFRO على ويندوز داخل شبكة الكاميرات، ثم اختبر وصول الصورة.": {
    "en": "Run the INFRO connector on Windows inside the camera network, then test the picture.",
    "zh-CN": "在摄像头所在网络内的 Windows 设备运行 INFRO 连接器，然后测试画面。",
    "es": "Ejecuta el conector INFRO en Windows dentro de la red de cámaras y prueba la imagen.",
    "ur": "کیمروں کے نیٹ ورک میں ونڈوز پر INFRO کنیکٹر چلائیں، پھر تصویر جانچیں۔"
  },
  "أنشئ جلسة للعميل وحدد المدة؛ انسخ الرابط أو أرسله بواتساب بعد تجهيز القالب والموافقة.": {
    "en": "Create a customer session and duration; copy the link or send it by WhatsApp after template approval and consent.",
    "zh-CN": "创建客户观看会话并设置时长，复制链接，或在模板获批且客户同意后通过 WhatsApp 发送。",
    "es": "Crea una sesión con duración y copia el enlace o envíalo por WhatsApp con plantilla aprobada y consentimiento.",
    "ur": "گاہک کا سیشن اور مدت بنائیں؛ لنک کاپی کریں یا سانچے کی منظوری اور رضامندی کے بعد واٹس ایپ پر بھیجیں۔"
  },
  "ربط كاميرتين في الباقة الأساسية للبث، ومحطات وجلسات لكل منشأة.": {
    "en": "Connect two cameras in the basic live-view service, with stations and sessions for each business.",
    "zh-CN": "基础直播服务可连接两台摄像头，并为各企业设置工位和会话。",
    "es": "Conecta dos cámaras en el servicio básico, con estaciones y sesiones por negocio.",
    "ur": "بنیادی براہِ راست سروس میں دو کیمرے، ہر کاروبار کے لیے اسٹیشن اور سیشن۔"
  },
  "روابط من ساعة إلى 24 ساعة، مع إيقاف فوري من اللوحة.": {
    "en": "Links lasting 1 to 24 hours, with immediate revocation from the dashboard.",
    "zh-CN": "链接有效期为 1 至 24 小时，可在控制面板立即撤销。",
    "es": "Enlaces de 1 a 24 horas, con cierre inmediato desde el panel.",
    "ur": "1 سے 24 گھنٹے کے لنکس، ڈیش بورڈ سے فوری بندش کے ساتھ۔"
  },
  "ربط اختياري بطلب كاشير INFRO لإيقاف الوصول عند الجاهزية أو التسليم.": {
    "en": "Optional INFRO POS order binding to stop access when ready or delivered.",
    "zh-CN": "可选择绑定 INFRO 收银订单，在就绪或交付时停止访问。",
    "es": "Vinculación opcional a un pedido INFRO para cerrar el acceso al estar listo o entregado.",
    "ur": "INFRO کیشئر آرڈر سے اختیاری ربط، تیاری یا ڈیلیوری پر رسائی بند کرنے کے لیے۔"
  },
  "45 جيجابايت نقل شهريًا ≈ 50 ساعة مشاهدة مجمعة عند 2 ميجابت/ثانية.": {
    "en": "45 GB monthly transfer ≈ 50 combined viewing hours at 2 Mbps.",
    "zh-CN": "每月 45 GB 传输量，约等于以 2 Mbps 累计观看 50 小时。",
    "es": "45 GB mensuales ≈ 50 horas acumuladas de visualización a 2 Mbps.",
    "ur": "ماہانہ 45 GB ڈیٹا ≈ 2 Mbps پر مجموعی 50 گھنٹے مشاہدہ۔"
  },
  "يلزم بث متوافق مثل RTSP، وويندوز متصل وسرعة رفع مناسبة واختبار فعلي. الخدمة لا تشمل الأجهزة أو التركيب أو التسجيل أو الصوت. من يحمل الرابط يستطيع فتحه؛ شاركه مع العميل المقصود. الجودة والمشاهدات المتزامنة تزيد استهلاك الحصة.": {
    "en": "Requires a compatible stream such as RTSP, connected Windows device, suitable upload speed and physical testing. Devices, installation, recording and audio are excluded. Anyone with the link can open it; share only with the intended customer. Higher quality and concurrent viewers use more data.",
    "zh-CN": "需要 RTSP 等兼容视频流、联网 Windows 设备、足够上传带宽及实际测试。不含设备、安装、录像或音频。任何持有链接的人均可访问，请仅分享给目标客户。更高画质和同时观看人数会增加流量消耗。",
    "es": "Requiere señal compatible como RTSP, Windows conectado, subida suficiente y prueba física. No incluye equipos, instalación, grabación ni audio. Cualquier persona con el enlace puede abrirlo; compártelo solo con el cliente previsto. Más calidad y espectadores simultáneos consumen más datos.",
    "ur": "RTSP جیسی معاون اسٹریم، متصل ونڈوز، مناسب اپ لوڈ رفتار اور حقیقی جانچ ضروری ہے۔ آلات، تنصیب، ریکارڈنگ اور آواز شامل نہیں۔ لنک رکھنے والا اسے کھول سکتا ہے؛ صرف مطلوبہ گاہک کو دیں۔ بہتر معیار اور بیک وقت ناظرین زیادہ ڈیٹا استعمال کرتے ہیں۔"
  },
  "من التعريف بنشاطك إلى تشغيله وتنميته": {
    "en": "From introducing your business to running and growing it",
    "zh-CN": "从介绍企业到运营与成长",
    "es": "De presentar tu negocio a gestionarlo y hacerlo crecer",
    "ur": "کاروبار کے تعارف سے انتظام اور ترقی تک"
  },
  "خدمات مترابطة. اختر ما يخدم نشاطك.": {
    "en": "Connected services. Choose what works for you.",
    "zh-CN": "互联的服务，选择适合您的功能。",
    "es": "Servicios conectados. Elige lo que necesita tu negocio.",
    "ur": "مربوط خدمات۔ اپنے کاروبار کے مطابق منتخب کریں۔"
  },
  "ابدأ بهوية مجانية، ثم أضف التشغيل أو المواعيد أو واتساب أو المشاهدة المباشرة، منفردة أو ضمن باقة.": {
    "en": "Start with a free identity, then add operations, appointments, WhatsApp or live viewing individually or in a plan.",
    "zh-CN": "从免费身份页面开始，按需单独添加运营、预约、WhatsApp 或实时观看，也可选择组合套餐。",
    "es": "Empieza con identidad gratuita y añade operaciones, citas, WhatsApp o visualización, por separado o en un plan.",
    "ur": "مفت شناخت سے شروع کریں، پھر آپریشنز، ملاقاتیں، واٹس ایپ یا براہِ راست مشاہدہ الگ یا پیکیج میں شامل کریں۔"
  },
  "المزايا وطريقة التفعيل": {
    "en": "Features and activation steps",
    "zh-CN": "功能与启用步骤",
    "es": "Funciones y activación",
    "ur": "خصوصیات اور فعالیت کا طریقہ"
  },
  "خدمات INFRO لإدارة أعمالك وتنميتها": {
    "en": "INFRO services to run and grow your business",
    "zh-CN": "INFRO 企业运营与成长服务",
    "es": "Servicios INFRO para gestionar y hacer crecer tu negocio",
    "ur": "کاروبار کے انتظام اور ترقی کے لیے INFRO کی خدمات"
  },
  "الهوية الرقمية، الكاشير والمحاسبة والمواعيد، تسويق واتساب والمشاهدة المباشرة المؤقتة.": {
    "en": "Digital identity, POS, accounting and appointments, WhatsApp marketing and temporary live viewing.",
    "zh-CN": "数字身份、收银、会计、预约、WhatsApp 营销与临时实时观看。",
    "es": "Identidad digital, punto de venta, contabilidad, citas, marketing por WhatsApp y visualización temporal.",
    "ur": "ڈیجیٹل شناخت، کیشئر، حسابات، ملاقاتیں، واٹس ایپ مارکیٹنگ اور عارضی براہِ راست مشاہدہ۔"
  },
  "الباقات والأسعار": {
    "en": "Plans and pricing",
    "zh-CN": "套餐与价格",
    "es": "Planes y precios",
    "ur": "پیکیجز اور قیمتیں"
  },
  "لكل خدمة متطلبات تشغيل واضحة. الاشتراك وحده لا يربط رقم واتساب أو جهاز الكاميرات؛ اطلع على خطوات الخدمة قبل اختيار الباقة.": {
    "en": "Each service has clear setup requirements. A subscription alone does not connect WhatsApp or cameras; read the activation steps before choosing your plan.",
    "zh-CN": "每项服务都有明确的启用要求。仅订阅不会连接 WhatsApp 号码或摄像头，请先了解启用步骤再选择套餐。",
    "es": "Cada servicio tiene requisitos claros. Suscribirte no conecta WhatsApp ni las cámaras; consulta los pasos antes de elegir.",
    "ur": "ہر سروس کی تیاری کی شرائط واضح ہیں۔ صرف اشتراک واٹس ایپ یا کیمرے نہیں جوڑتا؛ پیکیج چننے سے پہلے مراحل پڑھیں۔"
  },
  "قارن الباقات والأسعار": {
    "en": "Compare plans and pricing",
    "zh-CN": "比较套餐与价格",
    "es": "Comparar planes y precios",
    "ur": "پیکیجز اور قیمتوں کا موازنہ"
  },
  "جميع الخدمات": {
    "en": "All services",
    "zh-CN": "所有服务",
    "es": "Todos los servicios",
    "ur": "تمام خدمات"
  },
  "ابدأ بحساب مجاني": {
    "en": "Start with a free account",
    "zh-CN": "从免费账户开始",
    "es": "Empieza con una cuenta gratuita",
    "ur": "مفت اکاؤنٹ سے شروع کریں"
  },
  "إعداد الخدمة من حسابك": {
    "en": "Set up from your account",
    "zh-CN": "在账户中设置服务",
    "es": "Configurar desde tu cuenta",
    "ur": "اپنے اکاؤنٹ سے سروس تیار کریں"
  },
  "ماذا تستفيد؟": {
    "en": "What do you gain?",
    "zh-CN": "您将获得什么？",
    "es": "¿Qué obtienes?",
    "ur": "آپ کو کیا فائدہ ہوگا؟"
  },
  "كيف تبدأ؟": {
    "en": "How do you start?",
    "zh-CN": "如何开始？",
    "es": "¿Cómo empezar?",
    "ur": "کیسے شروع کریں؟"
  },
  "متطلبات التشغيل وما يشمله الاشتراك": {
    "en": "Setup requirements and subscription scope",
    "zh-CN": "启用要求与订阅范围",
    "es": "Requisitos y alcance de la suscripción",
    "ur": "تیاری کی شرائط اور اشتراک میں شامل سہولیات"
  },
  "الباقات والخدمات المناسبة": {
    "en": "Suitable plans and services",
    "zh-CN": "适合的套餐与服务",
    "es": "Planes y servicios adecuados",
    "ur": "موزوں پیکیجز اور خدمات"
  },
  "راجع المزايا والحدود": {
    "en": "Review features and limits",
    "zh-CN": "查看功能与限额",
    "es": "Ver funciones y límites",
    "ur": "خصوصیات اور حدود دیکھیں"
  },
  "استكشف بقية الخدمات": {
    "en": "Explore other services",
    "zh-CN": "浏览其他服务",
    "es": "Explorar otros servicios",
    "ur": "دیگر خدمات دیکھیں"
  },
  "سحب": {
    "en": "Drag",
    "zh-CN": "拖动",
    "es": "Arrastrar",
    "ur": "کھینچیں"
  },
  "رفع": {
    "en": "Move up",
    "zh-CN": "上移",
    "es": "Subir",
    "ur": "اوپر کریں"
  },
  "خفض": {
    "en": "Move down",
    "zh-CN": "下移",
    "es": "Bajar",
    "ur": "نیچے کریں"
  },
  "حجز المواعيد": {
    "en": "Appointment booking",
    "zh-CN": "预约",
    "es": "Reservas de citas",
    "ur": "ملاقاتوں کی بکنگ"
  },
  "المواعيد وتعديلها وإشعاراتها التشغيلية مع هوية مجانية.": {
    "en": "Appointments, rescheduling and operational notifications with a free identity.",
    "zh-CN": "预约、改期和运营通知，附免费企业身份。",
    "es": "Citas, cambios y avisos operativos con identidad gratuita.",
    "ur": "مفت شناخت کے ساتھ ملاقاتیں، ان کی تبدیلی اور عملی اطلاعات۔"
  },
  "حسابان شامل المالك وفرع واحد": {
    "en": "2 accounts including owner and 1 branch",
    "zh-CN": "2 个账户（含所有者）及 1 家分店",
    "es": "2 cuentas incluido el propietario y 1 sucursal",
    "ur": "مالک سمیت 2 اکاؤنٹس اور 1 شاخ"
  },
  "250 حجزًا جديدًا شهريًا": {
    "en": "250 new bookings per month",
    "zh-CN": "每月 250 个新预约",
    "es": "250 reservas nuevas al mes",
    "ur": "ماہانہ 250 نئی بکنگ"
  },
  "معالجة 1,000 رسالة تشغيلية عند ربط الرقم واعتماد القالب": {
    "en": "Processing for 1,000 operational messages after number connection and template approval",
    "zh-CN": "号码连接及模板获批后可处理 1,000 条运营消息",
    "es": "Procesamiento de 1.000 mensajes operativos con número conectado y plantilla aprobada",
    "ur": "نمبر جوڑنے اور سانچے کی منظوری پر 1,000 عملی پیغامات کی پروسیسنگ"
  },
  "الكاشير والبرنامج المحاسبي": {
    "en": "POS and accounting",
    "zh-CN": "收银与会计",
    "es": "Punto de venta y contabilidad",
    "ur": "کیشئر اور حسابات"
  },
  "العملاء والاشتراكات والمخزون والقيود والسندات والعقود والتوصيل دون المواعيد.": {
    "en": "Customers, subscriptions, inventory, journal entries, vouchers, contracts and delivery, without appointments.",
    "zh-CN": "客户、订阅、库存、会计分录、凭证、合同及配送，不含预约。",
    "es": "Clientes, suscripciones, inventario, asientos, comprobantes, contratos y entregas, sin citas.",
    "ur": "گاہک، اشتراک، اسٹاک، روزنامچہ، واؤچرز، معاہدے اور ڈیلیوری؛ ملاقاتیں شامل نہیں۔"
  },
  "3 مستخدمين شامل المالك": {
    "en": "3 users including owner",
    "zh-CN": "3 位用户（含所有者）",
    "es": "3 usuarios incluido el propietario",
    "ur": "مالک سمیت 3 صارفین"
  },
  "2,000 فاتورة شهريًا": {
    "en": "2,000 invoices per month",
    "zh-CN": "每月 2,000 张发票",
    "es": "2.000 facturas al mes",
    "ur": "ماہانہ 2,000 بل"
  },
  "كاشير وخدمات تتكيف مع النشاط": {
    "en": "POS and services tailored to your activity",
    "zh-CN": "适配业务类型的收银和服务",
    "es": "Punto de venta y servicios adaptados a tu actividad",
    "ur": "کاروبار کے مطابق کیشئر اور خدمات"
  },
  "10,000 إشعار تشغيلي شهريًا عند الربط والاعتماد": {
    "en": "10,000 operational notifications per month after connection and approval",
    "zh-CN": "连接及批准后每月 10,000 条运营通知",
    "es": "10.000 avisos operativos al mes con conexión y aprobación",
    "ur": "ربط اور منظوری پر ماہانہ 10,000 عملی اطلاعات"
  },
  "الحملات والأتمتة وصندوق الردود وربط متجر مدعوم.": {
    "en": "Campaigns, automation, inbox and supported store integration.",
    "zh-CN": "营销活动、自动化、收件箱和受支持商店集成。",
    "es": "Campañas, automatización, bandeja de entrada e integración de tienda compatible.",
    "ur": "مہمات، خودکاری، ان باکس اور معاون اسٹور کا ربط۔"
  },
  "3 مستخدمين ورقم منشأة واحد": {
    "en": "3 users and 1 business number",
    "zh-CN": "3 位用户及 1 个企业号码",
    "es": "3 usuarios y 1 número de negocio",
    "ur": "3 صارفین اور 1 کاروباری نمبر"
  },
  "100,000 رسالة حملات وأتمتة شهريًا": {
    "en": "100,000 campaign and automation messages per month",
    "zh-CN": "每月 100,000 条营销及自动化消息",
    "es": "100.000 mensajes de campañas y automatización al mes",
    "ur": "ماہانہ 100,000 مہماتی اور خودکار پیغامات"
  },
  "دون كاشير أو مواعيد أو بث": {
    "en": "No POS, appointments or live viewing",
    "zh-CN": "不含收银、预约或实时观看",
    "es": "Sin punto de venta, citas ni visualización en directo",
    "ur": "کیشئر، ملاقاتیں یا براہِ راست مشاہدہ شامل نہیں"
  },
  "كاميرتان وروابط مؤقتة وإيقاف الوصول دون تسجيل.": {
    "en": "2 cameras, temporary links and access revocation, without recording.",
    "zh-CN": "2 台摄像头、临时链接和访问撤销，不录制。",
    "es": "2 cámaras, enlaces temporales y cierre de acceso, sin grabación.",
    "ur": "2 کیمرے، عارضی لنکس اور رسائی کی بندش، ریکارڈنگ کے بغیر۔"
  },
  "حسابان شامل المالك وكاميرتان": {
    "en": "2 accounts including owner and 2 cameras",
    "zh-CN": "2 个账户（含所有者）及 2 台摄像头",
    "es": "2 cuentas incluido el propietario y 2 cámaras",
    "ur": "مالک سمیت 2 اکاؤنٹس اور 2 کیمرے"
  },
  "45 GB نقل شهريًا، تقارب 50 ساعة عند 2 Mbps": {
    "en": "45 GB monthly transfer, about 50 hours at 2 Mbps",
    "zh-CN": "每月 45 GB 传输量，约等于以 2 Mbps 观看 50 小时",
    "es": "45 GB mensuales, unas 50 horas a 2 Mbps",
    "ur": "ماہانہ 45 GB ڈیٹا، 2 Mbps پر تقریباً 50 گھنٹے"
  },
  "معالجة 1,000 إشعار رابط عند ربط واتساب وقالب معتمد": {
    "en": "Processing for 1,000 link notifications with WhatsApp connected and an approved template",
    "zh-CN": "WhatsApp 已连接且模板获批后，可处理 1,000 条链接通知",
    "es": "Procesamiento de 1.000 avisos de enlace con WhatsApp conectado y plantilla aprobada",
    "ur": "واٹس ایپ ربط اور منظور سانچے پر 1,000 لنک اطلاعات کی پروسیسنگ"
  },
  "خدماتنا": {
    "en": "Our services",
    "zh-CN": "我们的服务",
    "es": "Servicios",
    "ur": "ہماری خدمات"
  },
  "شغّل أعمالك، وتواصل مع عملائك.": {
    "en": "Run your business. Connect with customers.",
    "zh-CN": "管理业务，联系客户。",
    "es": "Gestiona tu negocio. Conecta con tus clientes.",
    "ur": "کاروبار چلائیں، گاہکوں سے رابطہ رکھیں۔"
  },
  "منصة واحدة لهويتك وتشغيلك ونموك.": {
    "en": "One platform for your identity, operations and growth.",
    "zh-CN": "一个平台，连接企业身份、运营与成长。",
    "es": "Una plataforma para tu identidad, operaciones y crecimiento.",
    "ur": "شناخت، انتظام اور ترقی کے لیے ایک پلیٹ فارم۔"
  },
  "هوية رقمية، كاشير ومحاسبة ومواعيد، تسويق واتساب ومشاهدة مباشرة لعملائك. اختر الخدمات التي تناسب نشاطك وأدرها من حسابك.": {
    "en": "Digital identity, POS, accounting, appointments, WhatsApp marketing and live viewing for your customers. Choose the services your business needs and manage them from your account.",
    "zh-CN": "数字身份、收银、会计、预约、WhatsApp 营销及客户实时观看。选择适合的服务，在账户中统一管理。",
    "es": "Identidad digital, punto de venta, contabilidad, citas, marketing por WhatsApp y visualización para clientes. Elige tus servicios y gestiónalos desde tu cuenta.",
    "ur": "ڈیجیٹل شناخت، کیشئر، حسابات، ملاقاتیں، واٹس ایپ مارکیٹنگ اور گاہکوں کے لیے براہِ راست مشاہدہ۔ موزوں خدمات چنیں اور اکاؤنٹ سے سنبھالیں۔"
  },
  "إدارة أعمالك": {
    "en": "Run your business",
    "zh-CN": "管理业务",
    "es": "Gestiona tu negocio",
    "ur": "اپنا کاروبار سنبھالیں"
  },
  "فواتير وتحصيل واشتراكات عملائك ومخزون وتقارير، وفق اشتراكك.": {
    "en": "Invoices, payments, customer subscriptions, inventory and reports, according to your plan.",
    "zh-CN": "根据套餐提供发票、收款、客户订阅、库存和报表。",
    "es": "Facturas, cobros, suscripciones, inventario e informes según tu plan.",
    "ur": "پیکیج کے مطابق بل، وصولی، گاہکوں کے اشتراک، اسٹاک اور رپورٹس۔"
  },
  "شفافية الخدمة": {
    "en": "Service transparency",
    "zh-CN": "服务透明",
    "es": "Transparencia del servicio",
    "ur": "خدمت کی شفافیت"
  },
  "اربط الكاميرات وأنشئ روابط مؤقتة لعملائك بعد تجهيز الأجهزة والخدمة.": {
    "en": "Connect cameras and create temporary customer links after setting up your devices and service.",
    "zh-CN": "完成设备和服务配置后，连接摄像头并创建客户临时链接。",
    "es": "Conecta cámaras y crea enlaces temporales tras preparar los equipos y el servicio.",
    "ur": "آلات اور سروس تیار کرکے کیمرے جوڑیں اور گاہکوں کے عارضی لنکس بنائیں۔"
  },
  "تعذر تحميل المواعيد": {
    "en": "Couldn't load appointments",
    "zh-CN": "无法加载预约",
    "es": "No se pudieron cargar las citas",
    "ur": "ملاقاتیں لوڈ نہیں ہو سکیں"
  },
  "تعذر تحميل المواعيد المتاحة": {
    "en": "Couldn't load available appointments",
    "zh-CN": "无法加载可预约时间",
    "es": "No se pudieron cargar las citas disponibles",
    "ur": "دستیاب ملاقاتیں لوڈ نہیں ہو سکیں"
  },
  "أدخل رقم الجوال واختر الخدمة والفرع عند تعددهما، ثم اختر موعدًا متاحًا.": {
    "en": "Enter your phone number, choose the service and branch if needed, then select an available appointment.",
    "zh-CN": "输入手机号，按需选择服务和分店，再选择可用时间。",
    "es": "Introduce el móvil, elige servicio y sucursal si corresponde y selecciona una cita disponible.",
    "ur": "فون نمبر لکھیں، ضرورت پر خدمت اور شاخ چنیں، پھر دستیاب ملاقات منتخب کریں۔"
  },
  "تعذر تسجيل الحجز الآن. حاول مرة أخرى.": {
    "en": "Couldn't book right now. Please try again.",
    "zh-CN": "暂时无法预约，请重试。",
    "es": "No se pudo reservar ahora. Inténtalo de nuevo.",
    "ur": "ابھی بکنگ نہیں ہو سکی۔ دوبارہ کوشش کریں۔"
  },
  "تم تسجيل الحجز، وجارٍ إرسال تفاصيل الموعد إلى رقمك عبر واتساب من رقم المنشأة.": {
    "en": "Booking recorded. Appointment details are being sent to you on WhatsApp from the business number.",
    "zh-CN": "预约已登记，正在通过企业号码向您的 WhatsApp 发送详情。",
    "es": "Reserva registrada. Se están enviando los detalles por WhatsApp desde el número del negocio.",
    "ur": "بکنگ درج ہو گئی۔ کاروباری نمبر سے واٹس ایپ پر تفصیلات بھیجی جا رہی ہیں۔"
  },
  "تم تسجيل الحجز بنجاح وسيظهر مباشرة لدى المنشأة.": {
    "en": "Booking recorded successfully and visible to the business.",
    "zh-CN": "预约已成功登记，企业可立即查看。",
    "es": "Reserva registrada correctamente y visible para el negocio.",
    "ur": "بکنگ کامیابی سے درج ہو گئی اور کاروبار کو دکھائی دے گی۔"
  },
  "تعذر الاتصال بالخدمة الآن. حاول مرة أخرى.": {
    "en": "Couldn't connect right now. Please try again.",
    "zh-CN": "暂时无法连接服务，请重试。",
    "es": "No se pudo conectar. Inténtalo de nuevo.",
    "ur": "ابھی سروس سے رابطہ نہیں ہو سکا۔ دوبارہ کوشش کریں۔"
  },
  "إجراءات الطلب والحجز": {
    "en": "Requests and bookings",
    "zh-CN": "请求与预约",
    "es": "Solicitudes y reservas",
    "ur": "درخواستیں اور بکنگ"
  },
  "اختر طريقة التواصل المناسبة": {
    "en": "Choose how to contact us",
    "zh-CN": "选择联系方式",
    "es": "Elige cómo contactarnos",
    "ur": "رابطے کا طریقہ منتخب کریں"
  },
  "طلب خدمة": {
    "en": "Request a service",
    "zh-CN": "申请服务",
    "es": "Solicitar servicio",
    "ur": "خدمت کی درخواست"
  },
  "حجز موعد": {
    "en": "Book an appointment",
    "zh-CN": "预约时间",
    "es": "Reservar cita",
    "ur": "ملاقات بک کریں"
  },
  "سنسجل طلبك داخل INFRO ثم نجهز التواصل مع المنشأة.": {
    "en": "We'll record your request in INFRO and prepare your contact with the business.",
    "zh-CN": "我们将在 INFRO 登记请求，并准备与企业联系。",
    "es": "Registraremos tu solicitud en INFRO y prepararemos el contacto con el negocio.",
    "ur": "ہم INFRO میں درخواست درج کرکے کاروبار سے رابطہ تیار کریں گے۔"
  },
  "تسجيل الطلب والمتابعة": {
    "en": "Record and follow up",
    "zh-CN": "登记与跟进",
    "es": "Registro y seguimiento",
    "ur": "درخواست درج کریں اور پیروی کریں"
  },
  "المواعيد": {
    "en": "Appointments",
    "zh-CN": "预约",
    "es": "Citas",
    "ur": "ملاقاتیں"
  },
  "إغلاق": {
    "en": "Close",
    "zh-CN": "关闭",
    "es": "Cerrar",
    "ur": "بند کریں"
  },
  "لديّ موعد بالفعل · تعديل موعدي": {
    "en": "I already have an appointment · Reschedule",
    "zh-CN": "我已有预约 · 修改预约",
    "es": "Ya tengo una cita · Modificarla",
    "ur": "میری ملاقات پہلے سے ہے · تبدیل کریں"
  },
  "رقم الجوال": {
    "en": "Mobile number",
    "zh-CN": "手机号",
    "es": "Número de móvil",
    "ur": "موبائل نمبر"
  },
  "الفرع": {
    "en": "Branch",
    "zh-CN": "分店",
    "es": "Sucursal",
    "ur": "شاخ"
  },
  "اختر الفرع": {
    "en": "Choose a branch",
    "zh-CN": "选择分店",
    "es": "Elige sucursal",
    "ur": "شاخ منتخب کریں"
  },
  "الخدمة": {
    "en": "Service",
    "zh-CN": "服务",
    "es": "Servicio",
    "ur": "خدمت"
  },
  "اختر الخدمة": {
    "en": "Choose a service",
    "zh-CN": "选择服务",
    "es": "Elige servicio",
    "ur": "خدمت منتخب کریں"
  },
  "جارٍ تحميل المواعيد المتاحة": {
    "en": "Loading available appointments",
    "zh-CN": "正在加载可预约时间",
    "es": "Cargando citas disponibles",
    "ur": "دستیاب ملاقاتیں لوڈ ہو رہی ہیں"
  },
  "إعادة المحاولة": {
    "en": "Try again",
    "zh-CN": "重试",
    "es": "Reintentar",
    "ur": "دوبارہ کوشش کریں"
  },
  "التاريخ": {
    "en": "Date",
    "zh-CN": "日期",
    "es": "Fecha",
    "ur": "تاریخ"
  },
  "اختر اليوم": {
    "en": "Choose a day",
    "zh-CN": "选择日期",
    "es": "Elige un día",
    "ur": "دن منتخب کریں"
  },
  "30 يومًا قادمة": {
    "en": "Next 30 days",
    "zh-CN": "未来 30 天",
    "es": "Próximos 30 días",
    "ur": "آئندہ 30 دن"
  },
  "متاح": {
    "en": "Available",
    "zh-CN": "可用",
    "es": "Disponible",
    "ur": "دستیاب"
  },
  "غير متاح": {
    "en": "Unavailable",
    "zh-CN": "不可用",
    "es": "No disponible",
    "ur": "دستیاب نہیں"
  },
  "الوقت": {
    "en": "Time",
    "zh-CN": "时间",
    "es": "Hora",
    "ur": "وقت"
  },
  "اختر الفترة": {
    "en": "Choose a time slot",
    "zh-CN": "选择时段",
    "es": "Elige una franja",
    "ur": "وقت کا دورانیہ چنیں"
  },
  "مدة الفترة": {
    "en": "Slot duration",
    "zh-CN": "时段长度",
    "es": "Duración",
    "ur": "دورانیہ"
  },
  "دقيقة": {
    "en": "minutes",
    "zh-CN": "分钟",
    "es": "minutos",
    "ur": "منٹ"
  },
  "متاح للحجز": {
    "en": "Available to book",
    "zh-CN": "可预约",
    "es": "Disponible para reservar",
    "ur": "بکنگ کے لیے دستیاب"
  },
  "لا توجد أوقات متاحة في هذا اليوم.": {
    "en": "No times are available on this day.",
    "zh-CN": "当天没有可用时间。",
    "es": "No hay horarios disponibles este día.",
    "ur": "اس دن کوئی وقت دستیاب نہیں۔"
  },
  " (اختياري)": {
    "en": " (optional)",
    "zh-CN": "（可选）",
    "es": " (opcional)",
    "ur": " (اختیاری)"
  },
  "لإتمام الحجز، استخدم رقم الجوال نفسه المسجل في طلبك المدفوع والمؤكد من متجر المنشأة.": {
    "en": "Use the same mobile number as your paid, confirmed order in the business's store to complete this booking.",
    "zh-CN": "请使用企业商店中已付款且已确认订单的同一手机号完成预约。",
    "es": "Usa el mismo móvil de tu pedido pagado y confirmado en la tienda para completar la reserva.",
    "ur": "بکنگ مکمل کرنے کے لیے کاروباری اسٹور کے ادا شدہ اور تصدیق شدہ آرڈر والا فون نمبر استعمال کریں۔"
  },
  "إرسال تأكيد الموعد عبر واتساب": {
    "en": "Send appointment confirmation by WhatsApp",
    "zh-CN": "通过 WhatsApp 发送预约确认",
    "es": "Enviar confirmación por WhatsApp",
    "ur": "واٹس ایپ پر ملاقات کی تصدیق"
  },
  "أوافق على استلام تأكيد هذا الحجز وتحديثاته من": {
    "en": "I agree to receive this booking's confirmation and updates from",
    "zh-CN": "我同意接收本次预约的确认和更新，发送方为",
    "es": "Acepto recibir la confirmación y actualizaciones de esta reserva de",
    "ur": "میں اس بکنگ کی تصدیق اور اپ ڈیٹس وصول کرنے پر راضی ہوں، بھیجنے والا"
  },
  "على رقم الجوال الذي أدخلته.": {
    "en": "on the mobile number I entered.",
    "zh-CN": "，发送至我输入的手机号。",
    "es": "en el número de móvil que he indicado.",
    "ur": "میرے درج کردہ فون نمبر پر۔"
  },
  "جارٍ تسجيل الحجز...": {
    "en": "Recording your booking…",
    "zh-CN": "正在登记预约…",
    "es": "Registrando tu reserva…",
    "ur": "بکنگ درج ہو رہی ہے…"
  },
  "تأكيد الحجز": {
    "en": "Confirm booking",
    "zh-CN": "确认预约",
    "es": "Confirmar reserva",
    "ur": "بکنگ کی تصدیق کریں"
  },
  "تعذر إكمال العملية": {
    "en": "Couldn't complete the operation",
    "zh-CN": "无法完成操作",
    "es": "No se pudo completar la operación",
    "ur": "عمل مکمل نہیں ہو سکا"
  },
  "تعذر طلب الرمز": {
    "en": "Couldn't request the code",
    "zh-CN": "无法请求验证码",
    "es": "No se pudo solicitar el código",
    "ur": "کوڈ کی درخواست نہیں ہو سکی"
  },
  "تعذر التحقق": {
    "en": "Verification failed",
    "zh-CN": "验证失败",
    "es": "No se pudo verificar",
    "ur": "تصدیق نہیں ہو سکی"
  },
  "تعذر تأكيد حفظ التعديل": {
    "en": "Couldn't confirm the change was saved",
    "zh-CN": "无法确认修改已保存",
    "es": "No se pudo confirmar el cambio",
    "ur": "تبدیلی محفوظ ہونے کی تصدیق نہیں ہو سکی"
  },
  "تعذر حفظ الموعد": {
    "en": "Couldn't save the appointment",
    "zh-CN": "无法保存预约",
    "es": "No se pudo guardar la cita",
    "ur": "ملاقات محفوظ نہیں ہو سکی"
  },
  "تم تعديل موعدك": {
    "en": "Your appointment was updated",
    "zh-CN": "预约已修改",
    "es": "Tu cita se modificó",
    "ur": "آپ کی ملاقات تبدیل ہو گئی"
  },
  "تعديل موعدي": {
    "en": "Reschedule my appointment",
    "zh-CN": "修改我的预约",
    "es": "Modificar mi cita",
    "ur": "میری ملاقات تبدیل کریں"
  },
  "خطوات تعديل الموعد": {
    "en": "Rescheduling steps",
    "zh-CN": "改期步骤",
    "es": "Pasos para modificar la cita",
    "ur": "ملاقات بدلنے کے مراحل"
  },
  "تحقق من رقمك": {
    "en": "Verify your number",
    "zh-CN": "验证号码",
    "es": "Verifica tu número",
    "ur": "اپنے نمبر کی تصدیق کریں"
  },
  "اختر الموعد": {
    "en": "Choose appointment",
    "zh-CN": "选择预约",
    "es": "Elige la cita",
    "ur": "ملاقات منتخب کریں"
  },
  "تم الحفظ": {
    "en": "Saved",
    "zh-CN": "已保存",
    "es": "Guardado",
    "ur": "محفوظ ہو گیا"
  },
  "انتهت صلاحية التحقق. اطلب رمزًا جديدًا لحماية موعدك.": {
    "en": "Verification expired. Request a new code to protect your appointment.",
    "zh-CN": "验证已过期，请重新获取验证码以保护您的预约。",
    "es": "La verificación caducó. Solicita un código nuevo para proteger tu cita.",
    "ur": "تصدیق کی مدت ختم ہو گئی۔ ملاقات کی حفاظت کے لیے نیا کوڈ طلب کریں۔"
  },
  "التحقق مرة أخرى": {
    "en": "Verify again",
    "zh-CN": "重新验证",
    "es": "Verificar de nuevo",
    "ur": "دوبارہ تصدیق کریں"
  },
  "أدخل رقم واتساب المستخدم للحجز. لن تظهر بيانات الموعد قبل إدخال رمز التحقق.": {
    "en": "Enter the WhatsApp number used for booking. Appointment details remain hidden until you enter the verification code.",
    "zh-CN": "输入预约时使用的 WhatsApp 号码。输入验证码前，不会显示预约详情。",
    "es": "Introduce el WhatsApp usado para reservar. Los datos no se mostrarán hasta verificar el código.",
    "ur": "بکنگ والا واٹس ایپ نمبر درج کریں۔ تصدیقی کوڈ سے پہلے ملاقات کی تفصیلات نہیں دکھائی جائیں گی۔"
  },
  "رقم واتساب": {
    "en": "WhatsApp number",
    "zh-CN": "WhatsApp 号码",
    "es": "Número de WhatsApp",
    "ur": "واٹس ایپ نمبر"
  },
  "أوافق على استلام رمز واتساب لتعديل موعدي. هذه الموافقة لا تشترك بي في التسويق.": {
    "en": "I agree to receive a WhatsApp code to change my appointment. This does not subscribe me to marketing.",
    "zh-CN": "我同意接收用于修改预约的 WhatsApp 验证码，此同意不会订阅营销消息。",
    "es": "Acepto recibir un código por WhatsApp para cambiar mi cita. Esto no me suscribe a marketing.",
    "ur": "میں ملاقات بدلنے کے لیے واٹس ایپ کوڈ وصول کرنے پر راضی ہوں۔ اس سے مارکیٹنگ کی رکنیت نہیں ہوتی۔"
  },
  "طلب رمز التحقق": {
    "en": "Request verification code",
    "zh-CN": "获取验证码",
    "es": "Solicitar código",
    "ur": "تصدیقی کوڈ طلب کریں"
  },
  "إذا كان لديك موعد نشط والرقم يستقبل رسائل المنشأة، سيصلك رمز واتساب. الرمز صالح لخمس دقائق؛ قد يتأخر وصوله.": {
    "en": "If you have an active appointment and your number receives messages from this business, you will receive a WhatsApp code. It is valid for five minutes; delivery may take time.",
    "zh-CN": "若您有有效预约且号码可接收企业消息，将收到 WhatsApp 验证码。验证码有效期为五分钟，送达可能有延迟。",
    "es": "Si tienes una cita activa y tu número recibe mensajes del negocio, te llegará un código por WhatsApp. Dura cinco minutos y puede tardar en llegar.",
    "ur": "اگر ملاقات فعال ہے اور نمبر کاروبار کے پیغامات وصول کرتا ہے تو واٹس ایپ کوڈ ملے گا۔ کوڈ پانچ منٹ کے لیے ہے؛ پہنچنے میں تاخیر ہو سکتی ہے۔"
  },
  "رمز التحقق": {
    "en": "Verification code",
    "zh-CN": "验证码",
    "es": "Código de verificación",
    "ur": "تصدیقی کوڈ"
  },
  "تحقق من الرمز": {
    "en": "Verify code",
    "zh-CN": "验证验证码",
    "es": "Verificar código",
    "ur": "کوڈ کی تصدیق کریں"
  },
  "تغيير الرقم أو طلب رمز جديد": {
    "en": "Change number or request a new code",
    "zh-CN": "更改号码或重新获取验证码",
    "es": "Cambiar número o solicitar otro código",
    "ur": "نمبر بدلیں یا نیا کوڈ طلب کریں"
  },
  "خدمة الحجز": {
    "en": "Booked service",
    "zh-CN": "预约服务",
    "es": "Servicio reservado",
    "ur": "بکنگ کی خدمت"
  },
  "موعدك الحالي:": {
    "en": "Your current appointment:",
    "zh-CN": "当前预约：",
    "es": "Tu cita actual:",
    "ur": "آپ کی موجودہ ملاقات:"
  },
  "سيُعدّل هذا الحجز نفسه ويعود بانتظار تأكيد المنشأة.": {
    "en": "This same booking will be updated and returned to awaiting business confirmation.",
    "zh-CN": "将修改同一预约，并重新等待企业确认。",
    "es": "Se modificará esta misma reserva y quedará pendiente de confirmación del negocio.",
    "ur": "اسی بکنگ میں تبدیلی ہوگی اور کاروبار کی تصدیق کی منتظر ہوگی۔"
  },
  "جارٍ تحميل المواعيد المتاحة…": {
    "en": "Loading available appointments…",
    "zh-CN": "正在加载可预约时间…",
    "es": "Cargando citas disponibles…",
    "ur": "دستیاب ملاقاتیں لوڈ ہو رہی ہیں…"
  },
  "تاريخ الزيارة": {
    "en": "Visit date",
    "zh-CN": "到访日期",
    "es": "Fecha de visita",
    "ur": "دورے کی تاریخ"
  },
  "فترة الزيارة": {
    "en": "Visit time slot",
    "zh-CN": "到访时段",
    "es": "Franja de visita",
    "ur": "دورے کا وقت"
  },
  "لا توجد فترات متاحة الآن. اختر فرعًا آخر أو تواصل مع المنشأة.": {
    "en": "No slots are available now. Choose another branch or contact the business.",
    "zh-CN": "暂无可用时段，请选择其他分店或联系企业。",
    "es": "No hay franjas disponibles. Elige otra sucursal o contacta con el negocio.",
    "ur": "ابھی کوئی وقت دستیاب نہیں۔ دوسری شاخ چنیں یا کاروبار سے رابطہ کریں۔"
  },
  "حفظ الموعد الجديد": {
    "en": "Save new appointment",
    "zh-CN": "保存新预约时间",
    "es": "Guardar nueva cita",
    "ur": "نئی ملاقات محفوظ کریں"
  },
  "تحديث المواعيد المتاحة": {
    "en": "Refresh available appointments",
    "zh-CN": "刷新可预约时间",
    "es": "Actualizar disponibilidad",
    "ur": "دستیاب ملاقاتیں تازہ کریں"
  },
  "حُفظ موعدك الجديد يوم": {
    "en": "Your new appointment was saved for",
    "zh-CN": "新预约已保存，日期为",
    "es": "Tu nueva cita se guardó para el",
    "ur": "آپ کی نئی ملاقات محفوظ ہوگئی، تاریخ"
  },
  "الساعة": {
    "en": "at",
    "zh-CN": "时间",
    "es": " a las",
    "ur": "وقت"
  },
  "الفرع المحدد": {
    "en": "Selected branch",
    "zh-CN": "所选分店",
    "es": "Sucursal seleccionada",
    "ur": "منتخب شاخ"
  },
  "نفس الحجز محفوظ، وبانتظار تأكيد المنشأة.": {
    "en": "The same booking is saved and awaiting business confirmation.",
    "zh-CN": "已保存同一预约，等待企业确认。",
    "es": "Se conserva la misma reserva, pendiente de confirmación del negocio.",
    "ur": "اسی بکنگ کو محفوظ کیا گیا اور کاروبار کی تصدیق کا انتظار ہے۔"
  },
  "العودة إلى صفحة المنشأة": {
    "en": "Back to business page",
    "zh-CN": "返回企业页面",
    "es": "Volver a la página del negocio",
    "ur": "کاروباری صفحے پر واپس جائیں"
  },
  "أرغب في طلب/حجز خدمة.": {
    "en": "I'd like to request/book a service.",
    "zh-CN": "我想申请或预约服务。",
    "es": "Quiero solicitar o reservar un servicio.",
    "ur": "میں خدمت کی درخواست یا بکنگ کرنا چاہتا ہوں۔"
  },
  "لدي الاستفسار التالي:": {
    "en": "I have the following enquiry:",
    "zh-CN": "我的咨询如下：",
    "es": "Tengo la siguiente consulta:",
    "ur": "میرا استفسار یہ ہے:"
  },
  "الاسم مطلوب": {
    "en": "Name is required",
    "zh-CN": "请填写姓名",
    "es": "El nombre es obligatorio",
    "ur": "نام ضروری ہے"
  },
  "رقم الجوال مطلوب": {
    "en": "Mobile number is required",
    "zh-CN": "请填写手机号",
    "es": "El móvil es obligatorio",
    "ur": "موبائل نمبر ضروری ہے"
  },
  "رقم الجوال غير صالح": {
    "en": "Invalid mobile number",
    "zh-CN": "手机号无效",
    "es": "Número de móvil no válido",
    "ur": "موبائل نمبر درست نہیں"
  },
  "الخدمة المطلوبة مطلوبة": {
    "en": "Requested service is required",
    "zh-CN": "请选择所需服务",
    "es": "El servicio es obligatorio",
    "ur": "مطلوبہ خدمت ضروری ہے"
  },
  "الاستفسار مطلوب": {
    "en": "Enquiry is required",
    "zh-CN": "请填写咨询内容",
    "es": "La consulta es obligatoria",
    "ur": "استفسار ضروری ہے"
  },
  "تعذر تسجيل الطلب الآن. حاول مرة أخرى.": {
    "en": "Couldn't record the request right now. Please try again.",
    "zh-CN": "暂时无法登记请求，请重试。",
    "es": "No se pudo registrar la solicitud. Inténtalo de nuevo.",
    "ur": "ابھی درخواست درج نہیں ہو سکی۔ دوبارہ کوشش کریں۔"
  },
  "طلب / حجز": {
    "en": "Request / booking",
    "zh-CN": "请求 / 预约",
    "es": "Solicitud / reserva",
    "ur": "درخواست / بکنگ"
  },
  "استفسار": {
    "en": "Enquiry",
    "zh-CN": "咨询",
    "es": "Consulta",
    "ur": "استفسار"
  },
  "سيتم تسجيل الطلب في INFRO ثم تجهيز الرسالة عبر واتساب.": {
    "en": "Your request will be recorded in INFRO, then a WhatsApp message will be prepared.",
    "zh-CN": "请求将登记至 INFRO，然后准备 WhatsApp 消息。",
    "es": "Se registrará tu solicitud en INFRO y se preparará el mensaje por WhatsApp.",
    "ur": "درخواست INFRO میں درج ہوگی، پھر واٹس ایپ پیغام تیار ہوگا۔"
  },
  "أرسل استفسارك وسيتم فتح واتساب مباشرة.": {
    "en": "Submit your enquiry to open WhatsApp directly.",
    "zh-CN": "提交咨询后将直接打开 WhatsApp。",
    "es": "Envía tu consulta para abrir WhatsApp.",
    "ur": "استفسار بھیجیں، واٹس ایپ براہِ راست کھل جائے گا۔"
  },
  "الاسم": {
    "en": "Name",
    "zh-CN": "姓名",
    "es": "Nombre",
    "ur": "نام"
  },
  "الخدمة المطلوبة": {
    "en": "Requested service",
    "zh-CN": "所需服务",
    "es": "Servicio solicitado",
    "ur": "مطلوبہ خدمت"
  },
  "مثال: حجز طاولة": {
    "en": "Example: reserve a table",
    "zh-CN": "例如：预订餐桌",
    "es": "Ejemplo: reservar una mesa",
    "ur": "مثال: میز کی بکنگ"
  },
  "ملاحظات": {
    "en": "Notes",
    "zh-CN": "备注",
    "es": "Notas",
    "ur": "نوٹس"
  },
  "أضف ملاحظاتك هنا": {
    "en": "Add your notes here",
    "zh-CN": "在此添加备注",
    "es": "Añade tus notas aquí",
    "ur": "اپنے نوٹس یہاں لکھیں"
  },
  "الاسم (اختياري)": {
    "en": "Name (optional)",
    "zh-CN": "姓名（可选）",
    "es": "Nombre (opcional)",
    "ur": "نام (اختیاری)"
  },
  "الاستفسار": {
    "en": "Your enquiry",
    "zh-CN": "咨询内容",
    "es": "Consulta",
    "ur": "آپ کا استفسار"
  },
  "اكتب استفسارك هنا": {
    "en": "Write your enquiry here",
    "zh-CN": "在此填写咨询内容",
    "es": "Escribe tu consulta aquí",
    "ur": "اپنا استفسار یہاں لکھیں"
  },
  "جارٍ تسجيل الطلب...": {
    "en": "Recording your request…",
    "zh-CN": "正在登记请求…",
    "es": "Registrando tu solicitud…",
    "ur": "درخواست درج ہو رہی ہے…"
  },
  "إرسال عبر واتساب": {
    "en": "Send via WhatsApp",
    "zh-CN": "通过 WhatsApp 发送",
    "es": "Enviar por WhatsApp",
    "ur": "واٹس ایپ پر بھیجیں"
  },
  "إرسال الاستفسار عبر واتساب": {
    "en": "Send enquiry via WhatsApp",
    "zh-CN": "通过 WhatsApp 发送咨询",
    "es": "Enviar consulta por WhatsApp",
    "ur": "واٹس ایپ پر استفسار بھیجیں"
  },
  "حسابات المنشأة الرسمية": {
    "en": "Official business accounts",
    "zh-CN": "企业官方账户",
    "es": "Cuentas oficiales del negocio",
    "ur": "کاروبار کے آفیشل اکاؤنٹس"
  },
  "حساباتنا الرسمية": {
    "en": "Our official accounts",
    "zh-CN": "我们的官方账户",
    "es": "Nuestras cuentas oficiales",
    "ur": "ہمارے آفیشل اکاؤنٹس"
  },
  "القنوات المعتمدة للمنشأة": {
    "en": "Verified business channels",
    "zh-CN": "企业认可渠道",
    "es": "Canales oficiales del negocio",
    "ur": "کاروبار کے منظور شدہ ذرائع"
  },
  "الملف التعريفي الرسمي": {
    "en": "Official company profile",
    "zh-CN": "官方企业简介",
    "es": "Perfil oficial de empresa",
    "ur": "آفیشل کاروباری پروفائل"
  },
  "ملف المنشأة": {
    "en": "Business profile",
    "zh-CN": "企业简介",
    "es": "Perfil del negocio",
    "ur": "کاروباری پروفائل"
  },
  "نبذة المنشأة وخدماتها ومعلوماتها المعتمدة": {
    "en": "Business introduction, services and official information",
    "zh-CN": "企业介绍、服务和官方资料",
    "es": "Presentación, servicios e información oficial del negocio",
    "ur": "کاروبار کا تعارف، خدمات اور منظور شدہ معلومات"
  },
  "فتح الملف": {
    "en": "Open profile",
    "zh-CN": "打开简介",
    "es": "Abrir perfil",
    "ur": "پروفائل کھولیں"
  },
  "إدارة INFRO": {
    "en": "INFRO administration",
    "zh-CN": "INFRO 管理",
    "es": "Administración INFRO",
    "ur": "INFRO انتظامیہ"
  },
  "الانتقال إلى المحتوى الرئيسي": {
    "en": "Skip to main content",
    "zh-CN": "跳至主要内容",
    "es": "Ir al contenido principal",
    "ur": "مرکزی مواد پر جائیں"
  },
  "إدارة المنصة والعمليات من مركز واحد": {
    "en": "Manage the platform and operations from one center",
    "zh-CN": "在同一中心管理平台和运营",
    "es": "Gestiona la plataforma y operaciones desde un centro",
    "ur": "پلیٹ فارم اور آپریشنز کا انتظام ایک مرکز سے"
  },
  "مظهر INFRO": {
    "en": "INFRO appearance",
    "zh-CN": "INFRO 外观",
    "es": "Apariencia INFRO",
    "ur": "INFRO کی ظاہری شکل"
  },
  "فتح منصة العملاء": {
    "en": "Open customer platform",
    "zh-CN": "打开客户平台",
    "es": "Abrir plataforma de clientes",
    "ur": "گاہکوں کا پلیٹ فارم کھولیں"
  },
  "مدير المنصة": {
    "en": "Platform administrator",
    "zh-CN": "平台管理员",
    "es": "Administrador de la plataforma",
    "ur": "پلیٹ فارم منتظم"
  },
  "لوحة INFRO المركزية": {
    "en": "INFRO central dashboard",
    "zh-CN": "INFRO 中央控制面板",
    "es": "Panel central INFRO",
    "ur": "INFRO مرکزی ڈیش بورڈ"
  },
  "مركز قيادة المنصة": {
    "en": "Platform command center",
    "zh-CN": "平台管理中心",
    "es": "Centro de control de la plataforma",
    "ur": "پلیٹ فارم کا انتظامی مرکز"
  },
  "جلسة الإدارة": {
    "en": "Admin session",
    "zh-CN": "管理会话",
    "es": "Sesión de administración",
    "ur": "انتظامی سیشن"
  },
  "استوديو الهوية": {
    "en": "Identity studio",
    "zh-CN": "身份工作室",
    "es": "Estudio de identidad",
    "ur": "شناخت اسٹوڈیو"
  },
  "المنصة": {
    "en": "Platform",
    "zh-CN": "平台",
    "es": "Plataforma",
    "ur": "پلیٹ فارم"
  },
  "مركز القيادة": {
    "en": "Command center",
    "zh-CN": "管理中心",
    "es": "Centro de control",
    "ur": "انتظامی مرکز"
  },
  "التصميم والهوية": {
    "en": "Design and identity",
    "zh-CN": "设计与身份",
    "es": "Diseño e identidad",
    "ur": "ڈیزائن اور شناخت"
  },
  "تصميم": {
    "en": "Design",
    "zh-CN": "设计",
    "es": "Diseño",
    "ur": "ڈیزائن"
  },
  "نماذج الحجز": {
    "en": "Booking forms",
    "zh-CN": "预约表单",
    "es": "Formularios de reserva",
    "ur": "بکنگ فارم"
  },
  "المنشآت": {
    "en": "Businesses",
    "zh-CN": "企业",
    "es": "Negocios",
    "ur": "کاروبار"
  },
  "العملاء والإيراد": {
    "en": "Customers and revenue",
    "zh-CN": "客户与收入",
    "es": "Clientes e ingresos",
    "ur": "گاہک اور آمدن"
  },
  "العملاء والحسابات": {
    "en": "Customers and accounts",
    "zh-CN": "客户与账户",
    "es": "Clientes y cuentas",
    "ur": "گاہک اور اکاؤنٹس"
  },
  "الاشتراكات والفوترة": {
    "en": "Subscriptions and billing",
    "zh-CN": "订阅与账单",
    "es": "Suscripciones y facturación",
    "ur": "اشتراک اور بلنگ"
  },
  "أكواد الاشتراك": {
    "en": "Subscription codes",
    "zh-CN": "订阅代码",
    "es": "Códigos de suscripción",
    "ur": "اشتراک کے کوڈ"
  },
  "التجارة": {
    "en": "Commerce",
    "zh-CN": "商业",
    "es": "Comercio",
    "ur": "تجارت"
  },
  "صحة التكاملات": {
    "en": "Integration health",
    "zh-CN": "集成状态",
    "es": "Estado de integraciones",
    "ur": "انضمام کی صحت"
  },
  "منتجات المتجر": {
    "en": "Store products",
    "zh-CN": "商店产品",
    "es": "Productos de la tienda",
    "ur": "اسٹور کی مصنوعات"
  },
  "طلبات المتجر": {
    "en": "Store orders",
    "zh-CN": "商店订单",
    "es": "Pedidos de la tienda",
    "ur": "اسٹور کے آرڈرز"
  },
  "طلبات الإدارة": {
    "en": "Admin requests",
    "zh-CN": "管理请求",
    "es": "Solicitudes de administración",
    "ur": "انتظامی درخواستیں"
  },
  "تشغيل واتساب": {
    "en": "WhatsApp operations",
    "zh-CN": "WhatsApp 运营",
    "es": "Operaciones de WhatsApp",
    "ur": "واٹس ایپ آپریشنز"
  },
  "ذكية": {
    "en": "Smart",
    "zh-CN": "智能",
    "es": "Inteligente",
    "ur": "اسمارٹ"
  },
  "دعم العملاء": {
    "en": "Customer support",
    "zh-CN": "客户支持",
    "es": "Soporte al cliente",
    "ur": "گاہکوں کی معاونت"
  },
  "تنقل إدارة المنصة": {
    "en": "Platform administration navigation",
    "zh-CN": "平台管理导航",
    "es": "Navegación de administración",
    "ur": "پلیٹ فارم انتظامیہ کی نیویگیشن"
  },
  "القيادة": {
    "en": "Overview",
    "zh-CN": "概览",
    "es": "Resumen",
    "ur": "جائزہ"
  },
  "العملاء": {
    "en": "Customers",
    "zh-CN": "客户",
    "es": "Clientes",
    "ur": "گاہک"
  },
  "التنقل السريع للإدارة": {
    "en": "Admin quick navigation",
    "zh-CN": "管理快捷导航",
    "es": "Navegación rápida de administración",
    "ur": "انتظامیہ کی فوری نیویگیشن"
  },
  "إغلاق قائمة الإدارة": {
    "en": "Close admin menu",
    "zh-CN": "关闭管理菜单",
    "es": "Cerrar menú de administración",
    "ur": "انتظامی مینو بند کریں"
  },
  "كل أدوات الإدارة": {
    "en": "All admin tools",
    "zh-CN": "所有管理工具",
    "es": "Todas las herramientas de administración",
    "ur": "انتظامیہ کے تمام اوزار"
  },
  "الرئيسية ملخص متابعة": {
    "en": "home overview follow-up",
    "zh-CN": "首页 概览 跟进",
    "es": "inicio resumen seguimiento",
    "ur": "ہوم خلاصہ پیروی"
  },
  "حملات قوالب جهات اتصال رسائل WhatsApp ميتا ربط": {
    "en": "campaigns templates contacts messages WhatsApp Meta connection",
    "zh-CN": "营销 模板 联系人 消息 WhatsApp Meta 连接",
    "es": "campañas plantillas contactos mensajes WhatsApp Meta conexión",
    "ur": "مہمات سانچے رابطے پیغامات واٹس ایپ Meta ربط"
  },
  "تعديل تصميم شعار خدمات منتجات فروع فريق ساعات معرض روابط": {
    "en": "edit design logo services products branches team hours gallery links",
    "zh-CN": "编辑 设计 标志 服务 产品 分店 团队 时间 图库 链接",
    "es": "editar diseño logotipo servicios productos sucursales equipo horarios galería enlaces",
    "ur": "ترمیم ڈیزائن لوگو خدمات مصنوعات شاخیں ٹیم اوقات گیلری لنکس"
  },
  "توثيق ملف تعريفي PDF سيو SEO": {
    "en": "verification company profile PDF SEO",
    "zh-CN": "认证 企业 简介 PDF SEO",
    "es": "verificación perfil empresa PDF SEO",
    "ur": "تصدیق کمپنی پروفائل PDF SEO"
  },
  "عملاء طلب خدمة وارد": {
    "en": "customers service requests inbox",
    "zh-CN": "客户 服务 请求 收件箱",
    "es": "clientes solicitudes servicios recibidas",
    "ur": "گاہک خدمت درخواست ان باکس"
  },
  "حجز ساعات العمل جدول مواعيد إعدادات رمز تحقق OTP": {
    "en": "bookings hours appointments schedule settings verification OTP",
    "zh-CN": "预约 时间 日程 设置 验证 OTP",
    "es": "reservas horarios citas agenda ajustes verificación OTP",
    "ur": "بکنگ اوقات ملاقاتیں جدول ترتیبات تصدیق OTP"
  },
  "كاميرا كاميرات بث مباشر ورش رافعة مشاهدة مؤقتة جلسات": {
    "en": "camera cameras live stream workshop station viewing temporary sessions",
    "zh-CN": "摄像头 摄像机 直播 维修 工位 观看 临时 会话",
    "es": "cámara cámaras directo emisión taller estación visualización temporal sesiones",
    "ur": "کیمرہ کیمرے براہ راست اسٹریم ورکشاپ اسٹیشن مشاہدہ عارضی سیشن"
  },
  "تذكير مهام مواعيد تنبيه": {
    "en": "reminders tasks appointments alerts",
    "zh-CN": "提醒 任务 预约 通知",
    "es": "recordatorios tareas citas avisos",
    "ur": "یاد دہانیاں کام ملاقاتیں اطلاعات"
  },
  "تنبيهات أخبار": {
    "en": "alerts news notifications",
    "zh-CN": "提醒 新闻 通知",
    "es": "avisos noticias notificaciones",
    "ur": "الرٹس خبریں اطلاعات"
  },
  "ملاحظات مذكرة مهام": {
    "en": "notes memo tasks",
    "zh-CN": "笔记 备忘 任务",
    "es": "notas memorandos tareas",
    "ur": "نوٹس یادداشت کام"
  },
  "محاسبة كاشير فواتير دفتر قيود مورد اشتراكات عملاء مخزون جرد توصيل غسيل كوي مغسلة": {
    "en": "accounting POS invoices ledger entries suppliers subscriptions customers inventory stock delivery laundry ironing",
    "zh-CN": "会计 收银 发票 账簿 分录 供应商 订阅 客户 库存 配送 洗衣 熨烫",
    "es": "contabilidad caja facturas libro asientos proveedores suscripciones clientes inventario existencias entregas lavandería planchado",
    "ur": "حسابات کیشئر بل کھاتہ اندراج سپلائر اشتراک گاہک اسٹاک ڈیلیوری لانڈری استری"
  },
  "شراء خدمات متجر": {
    "en": "purchase services store",
    "zh-CN": "购买 服务 商店",
    "es": "comprar servicios tienda",
    "ur": "خریداری خدمات اسٹور"
  },
  "إحصائيات تقارير تحليلات زيارات": {
    "en": "statistics reports analytics visits",
    "zh-CN": "统计 报表 分析 访问",
    "es": "estadísticas informes análisis visitas",
    "ur": "اعداد شمار رپورٹس تجزیہ وزٹ"
  },
  "تواصل دعم مساعدة مشكلة": {
    "en": "contact support help issue",
    "zh-CN": "联系 支持 帮助 问题",
    "es": "contacto soporte ayuda problema",
    "ur": "رابطہ معاونت مدد مسئلہ"
  },
  "فريق مستخدمين موظف صلاحية": {
    "en": "team users employees permissions",
    "zh-CN": "团队 用户 员工 权限",
    "es": "equipo usuarios empleados permisos",
    "ur": "ٹیم صارفین ملازمین اجازتیں"
  },
  "إعدادات بريد ايميل جوال اسم اشتراك فاتورة دفع": {
    "en": "settings email mobile name subscription invoice payment",
    "zh-CN": "设置 邮箱 手机 名称 订阅 发票 付款",
    "es": "ajustes correo móvil nombre suscripción factura pago",
    "ur": "ترتیبات ای میل موبائل نام اشتراک بل ادائیگی"
  },
  "نشاط جديد": {
    "en": "New business",
    "zh-CN": "新企业",
    "es": "Nuevo negocio",
    "ur": "نیا کاروبار"
  },
  "اربط رقم إشعارات المنشأة": {
    "en": "Connect the business notification number",
    "zh-CN": "连接企业通知号码",
    "es": "Conecta el número de avisos",
    "ur": "کاروباری اطلاعات کا نمبر جوڑیں"
  },
  "ابدأ من ربط الرقم ثم جهّز القوالب المتاحة لخدمتك.": {
    "en": "Start by connecting the number, then prepare templates for your service.",
    "zh-CN": "先连接号码，再准备服务模板。",
    "es": "Conecta el número y prepara las plantillas de tu servicio.",
    "ur": "پہلے نمبر جوڑیں، پھر اپنی خدمت کے سانچے تیار کریں۔"
  },
  "قوالبك قيد مراجعة Meta": {
    "en": "Your templates are under Meta review",
    "zh-CN": "模板正在 Meta 审核中",
    "es": "Tus plantillas están en revisión de Meta",
    "ur": "آپ کے سانچے Meta کے زیرِ جائزہ ہیں"
  },
  "فعّل إشعار الخدمة بعد اعتماد القالب ومزامنته.": {
    "en": "Activate the service notice after template approval and synchronization.",
    "zh-CN": "模板获批并同步后，启用服务通知。",
    "es": "Activa el aviso tras aprobar y sincronizar la plantilla.",
    "ur": "سانچے کی منظوری اور ہم آہنگی کے بعد اطلاع فعال کریں۔"
  },
  "اختر قالبًا في إعدادات خدمتك": {
    "en": "Choose a template in your service settings",
    "zh-CN": "在服务设置中选择模板",
    "es": "Elige una plantilla en los ajustes del servicio",
    "ur": "خدمت کی ترتیبات میں سانچہ منتخب کریں"
  },
  "الاعتماد لا يفعّل الإرسال تلقائيًا؛ اختر القالب وسجّل موافقة العميل.": {
    "en": "Approval does not activate sending. Select the template and record customer consent.",
    "zh-CN": "获批不代表自动发送，请选择模板并记录客户同意。",
    "es": "La aprobación no activa el envío. Selecciona la plantilla y registra el consentimiento.",
    "ur": "منظوری سے ارسال فعال نہیں ہوتا۔ سانچہ چنیں اور گاہک کی رضامندی درج کریں۔"
  },
  "جهّز قالب إشعار الخدمة": {
    "en": "Prepare a service notification template",
    "zh-CN": "准备服务通知模板",
    "es": "Prepara una plantilla de aviso",
    "ur": "خدمت کی اطلاع کا سانچہ تیار کریں"
  },
  "اختر نموذج خدمتك وأرسله إلى Meta للمراجعة.": {
    "en": "Choose your service example and submit it to Meta for review.",
    "zh-CN": "选择服务示例并提交 Meta 审核。",
    "es": "Elige el ejemplo y envíalo a Meta para revisión.",
    "ur": "خدمت کا نمونہ چن کر Meta کو جائزے کے لیے بھیجیں۔"
  },
  "مركز عمليات القوالب": {
    "en": "Template operations center",
    "zh-CN": "模板管理中心",
    "es": "Centro de operaciones de plantillas",
    "ur": "سانچوں کا انتظامی مرکز"
  },
  "قوالب إشعارات خدمتك": {
    "en": "Your service notification templates",
    "zh-CN": "您的服务通知模板",
    "es": "Plantillas de avisos de tu servicio",
    "ur": "آپ کی خدمت کے اطلاعاتی سانچے"
  },
  "راقب اعتماد Meta، جودة القالب، عقد المتغيرات وجاهزيته للحملات من شاشة واحدة. INFRO لا يغيّر قرار الاعتماد؛ بل يعكس حالة Meta ويمنع استخدام غير الجاهز.": {
    "en": "Track Meta approval, template quality, variable requirements and campaign readiness together. INFRO reflects Meta's decision and blocks templates that are not ready; it does not change approval decisions.",
    "zh-CN": "集中查看 Meta 审批、模板质量、变量要求和营销就绪状态。INFRO 展示 Meta 的决定并阻止使用未就绪模板，不会更改审批决定。",
    "es": "Consulta aprobación, calidad, variables y disponibilidad. INFRO refleja la decisión de Meta y bloquea las plantillas no preparadas; no modifica la aprobación.",
    "ur": "Meta کی منظوری، معیار، متغیرات اور مہم کی تیاری ایک جگہ دیکھیں۔ INFRO فیصلہ نہیں بدلتا؛ Meta کی حالت دکھاتا اور غیر تیار سانچے روکتا ہے۔"
  },
  "التنقل بين القوالب": {
    "en": "Template navigation",
    "zh-CN": "模板导航",
    "es": "Navegación de plantillas",
    "ur": "سانچوں کی نیویگیشن"
  },
  "إنشاء قالب": {
    "en": "Create template",
    "zh-CN": "创建模板",
    "es": "Crear plantilla",
    "ur": "سانچہ بنائیں"
  },
  "قيد المراجعة": {
    "en": "Under review",
    "zh-CN": "审核中",
    "es": "En revisión",
    "ur": "زیرِ جائزہ"
  },
  "مكتبة القوالب": {
    "en": "Template library",
    "zh-CN": "模板库",
    "es": "Biblioteca de plantillas",
    "ur": "سانچوں کی لائبریری"
  },
  "حساب واتساب للقوالب": {
    "en": "WhatsApp account for templates",
    "zh-CN": "模板所属 WhatsApp 账户",
    "es": "Cuenta de WhatsApp de las plantillas",
    "ur": "سانچوں کا واٹس ایپ اکاؤنٹ"
  },
  "لا يوجد حساب متصل": {
    "en": "No connected account",
    "zh-CN": "没有已连接账户",
    "es": "No hay cuenta conectada",
    "ur": "کوئی اکاؤنٹ مربوط نہیں"
  },
  "حساب المنشأة": {
    "en": "Business account",
    "zh-CN": "企业账户",
    "es": "Cuenta del negocio",
    "ur": "کاروباری اکاؤنٹ"
  },
  "متصل": {
    "en": "Connected",
    "zh-CN": "已连接",
    "es": "Conectado",
    "ur": "مربوط"
  },
  "غير متصل": {
    "en": "Disconnected",
    "zh-CN": "未连接",
    "es": "Desconectado",
    "ur": "غیر مربوط"
  },
  "عرض قوالب الحساب": {
    "en": "View account templates",
    "zh-CN": "查看账户模板",
    "es": "Ver plantillas de la cuenta",
    "ur": "اکاؤنٹ کے سانچے دیکھیں"
  },
  "رحلة اعتماد قالب الإعلان": {
    "en": "Ad template approval journey",
    "zh-CN": "广告模板审批流程",
    "es": "Proceso de aprobación del anuncio",
    "ur": "اشتہاری سانچے کی منظوری کا سفر"
  },
  "إعلانك من داخل INFRO إلى مراجعة Meta": {
    "en": "Your ad from INFRO to Meta review",
    "zh-CN": "从 INFRO 提交广告至 Meta 审核",
    "es": "Tu anuncio de INFRO a la revisión de Meta",
    "ur": "INFRO سے Meta کے جائزے تک اشتہار"
  },
  "قوالب خدمتك من الإنشاء إلى اعتماد Meta": {
    "en": "Your service templates from creation to Meta approval",
    "zh-CN": "服务模板从创建到 Meta 获批",
    "es": "De la creación a la aprobación de Meta",
    "ur": "خدمت کے سانچے کی تیاری سے Meta کی منظوری تک"
  },
  "اختر نصًا أو صورة أو فيديو أو PDF، واكتب الإعلان ومتغيراته، ثم أرسله للمراجعة. بعد الاعتماد والتحديث يظهر ضمن القوالب الجاهزة في معالج الحملة مع المعاينة واختيار الجمهور والجدولة.": {
    "en": "Choose text, an image, video or PDF, write your ad and variables, then submit for review. Once approved and synchronized, it appears in the campaign wizard with preview, audience selection and scheduling.",
    "zh-CN": "选择文字、图片、视频或 PDF，填写广告与变量后提交审核。获批并同步后，可在营销向导中预览、选择客户群并排期。",
    "es": "Elige texto, imagen, vídeo o PDF, redacta el anuncio y variables y envíalo. Tras aprobación y sincronización aparecerá en el asistente con vista previa, audiencia y programación.",
    "ur": "متن، تصویر، ویڈیو یا PDF چنیں، اشتہار اور متغیرات لکھ کر جائزے کے لیے بھیجیں۔ منظوری اور ہم آہنگی کے بعد مہم کے معاون میں پیش منظر، سامعین اور وقت کے ساتھ نظر آئے گا۔"
  },
  "اختر نموذج إشعار لخدمتك وراجع النص والمتغيرات، ثم أرسله إلى Meta. بعد الاعتماد اختره من إعدادات الكاشير أو المواعيد أو المشاهدة، بحسب اشتراكك.": {
    "en": "Choose a service notice, review its text and variables and submit to Meta. After approval, select it in POS, appointment or viewing settings according to your subscription.",
    "zh-CN": "选择服务通知，检查文字和变量后提交 Meta。获批后，按订阅在收银、预约或观看设置中选择。",
    "es": "Elige un aviso, revisa texto y variables y envíalo a Meta. Después de aprobarse, selecciónalo en caja, citas o visualización según tu suscripción.",
    "ur": "خدمت کی اطلاع چنیں، متن اور متغیرات دیکھ کر Meta کو بھیجیں۔ منظوری کے بعد اپنے اشتراک کے مطابق کیشئر، ملاقات یا مشاہدے کی ترتیبات میں منتخب کریں۔"
  },
  "كل منشأة تستخدم حسابها ورقمها وقوالبها المعتمدة. لا يوجد قالب معتمد عام يتيح تغيير نص الإعلان بحرية؛ اعتماد التطبيق لا يغني عن اعتماد الرسالة لدى Meta.": {
    "en": "Each business uses its own account, number and approved templates. No general approval allows unrestricted ad edits; app approval does not replace message approval by Meta.",
    "zh-CN": "每家企业使用自己的账户、号码及已批准模板。不存在允许随意更改广告文字的通用批准；应用获批不能替代消息获批。",
    "es": "Cada negocio usa su cuenta, número y plantillas. No existe una aprobación general para editar anuncios libremente; aprobar la aplicación no sustituye la aprobación del mensaje por Meta.",
    "ur": "ہر کاروبار اپنا اکاؤنٹ، نمبر اور منظور سانچے استعمال کرتا ہے۔ عمومی منظوری سے اشتہار آزادانہ نہیں بدل سکتے؛ ایپ کی منظوری پیغام کی Meta منظوری کا متبادل نہیں۔"
  },
  "اربط رقم منشأتك لفتح محرر القوالب": {
    "en": "Connect your business number to open the editor",
    "zh-CN": "连接企业号码以打开编辑器",
    "es": "Conecta el número para abrir el editor",
    "ur": "ایڈیٹر کھولنے کے لیے کاروباری نمبر جوڑیں"
  },
  "لم تنجح آخر مزامنة تلقائية. استخدم تحديث من Meta وتحقق من اتصال الحساب.": {
    "en": "The latest automatic sync failed. Refresh from Meta and check the account connection.",
    "zh-CN": "最近一次自动同步失败，请从 Meta 刷新并检查连接。",
    "es": "Falló la última sincronización. Actualiza desde Meta y revisa la conexión.",
    "ur": "آخری خودکار ہم آہنگی ناکام رہی۔ Meta سے تازہ کریں اور رابطہ جانچیں۔"
  },
  "المزامنة التلقائية قيد التنفيذ.": {
    "en": "Automatic synchronization is running.",
    "zh-CN": "正在自动同步。",
    "es": "Sincronización automática en curso.",
    "ur": "خودکار ہم آہنگی جاری ہے۔"
  },
  "رقم واتساب المرتبط غير جاهز حاليًا. أعد تفعيل الاتصال أولًا؛ القالب المعتمد وحده لا يكفي للإرسال.": {
    "en": "The connected number is not ready. Restore the connection first; template approval alone is insufficient.",
    "zh-CN": "已连接号码尚未就绪，请先恢复连接；仅模板获批不足以发送。",
    "es": "El número no está listo. Restablece la conexión; la aprobación de la plantilla no basta.",
    "ur": "مربوط نمبر تیار نہیں۔ پہلے رابطہ بحال کریں؛ صرف سانچے کی منظوری کافی نہیں۔"
  },
  "تعذر تحديث القوالب. تحقق من اتصال الرقم ثم أعد المحاولة.": {
    "en": "Couldn't refresh templates. Check the number connection and try again.",
    "zh-CN": "无法刷新模板，请检查号码连接后重试。",
    "es": "No se pudieron actualizar las plantillas. Revisa la conexión y reintenta.",
    "ur": "سانچے تازہ نہیں ہو سکے۔ نمبر کا ربط جانچ کر دوبارہ کوشش کریں۔"
  },
  "جاهزة للحملات": {
    "en": "Campaign ready",
    "zh-CN": "可用于营销",
    "es": "Listas para campañas",
    "ur": "مہمات کے لیے تیار"
  },
  "قوالب خدمتك": {
    "en": "Your service templates",
    "zh-CN": "您的服务模板",
    "es": "Plantillas de tu servicio",
    "ur": "آپ کی خدمت کے سانچے"
  },
  "معتمد + رقم Meta المتصل": {
    "en": "Approved + connected Meta number",
    "zh-CN": "已批准 + 已连接 Meta 号码",
    "es": "Aprobadas + número de Meta conectado",
    "ur": "منظور شدہ + مربوط Meta نمبر"
  },
  "ضمن الخدمات المشمولة في الاشتراك": {
    "en": "Within your subscription services",
    "zh-CN": "属于订阅包含的服务",
    "es": "Incluidas en tu suscripción",
    "ur": "آپ کے اشتراک کی خدمات میں شامل"
  },
  "معتمدة من Meta": {
    "en": "Approved by Meta",
    "zh-CN": "Meta 已批准",
    "es": "Aprobadas por Meta",
    "ur": "Meta کی منظور شدہ"
  },
  "قد تتطلب اتصالًا جاهزًا": {
    "en": "May require a ready connection",
    "zh-CN": "可能需要已就绪的连接",
    "es": "Puede requerir conexión preparada",
    "ur": "تیار کنکشن درکار ہو سکتا ہے"
  },
  "قرار Meta لم يكتمل": {
    "en": "Meta decision pending",
    "zh-CN": "等待 Meta 决定",
    "es": "Decisión de Meta pendiente",
    "ur": "Meta کا فیصلہ باقی ہے"
  },
  "تحتاج انتباهًا": {
    "en": "Need attention",
    "zh-CN": "需要关注",
    "es": "Requieren atención",
    "ur": "توجہ درکار"
  },
  "أحدث 200 قالب من الحساب المختار · اختر الحالة لعرض القوالب المطلوبة": {
    "en": "Latest 200 templates from the selected account · Filter by status",
    "zh-CN": "所选账户最近 200 个模板 · 按状态筛选",
    "es": "Últimas 200 plantillas de la cuenta · Filtra por estado",
    "ur": "منتخب اکاؤنٹ کے تازہ ترین 200 سانچے · حالت سے چھانٹیں"
  },
  "تحديث من Meta": {
    "en": "Refresh from Meta",
    "zh-CN": "从 Meta 刷新",
    "es": "Actualizar desde Meta",
    "ur": "Meta سے تازہ کریں"
  },
  "ربط رقم واتساب": {
    "en": "Connect WhatsApp number",
    "zh-CN": "连接 WhatsApp 号码",
    "es": "Conectar número de WhatsApp",
    "ur": "واٹس ایپ نمبر جوڑیں"
  },
  "إدارة الحملات": {
    "en": "Manage campaigns",
    "zh-CN": "管理营销活动",
    "es": "Gestionar campañas",
    "ur": "مہمات سنبھالیں"
  },
  "إعداد إشعارات الخدمة": {
    "en": "Service notification settings",
    "zh-CN": "服务通知设置",
    "es": "Ajustes de avisos del servicio",
    "ur": "خدمت کی اطلاعات کی ترتیبات"
  },
  "ابحث باسم القالب أو اللغة": {
    "en": "Search by template name or language",
    "zh-CN": "按模板名称或语言搜索",
    "es": "Buscar por nombre o idioma",
    "ur": "سانچے کے نام یا زبان سے تلاش کریں"
  },
  "كل الحالات": {
    "en": "All statuses",
    "zh-CN": "所有状态",
    "es": "Todos los estados",
    "ur": "تمام حالتیں"
  },
  "جاهز للحملة": {
    "en": "Campaign ready",
    "zh-CN": "可用于营销",
    "es": "Lista para campaña",
    "ur": "مہم کے لیے تیار"
  },
  "معتمد": {
    "en": "Approved",
    "zh-CN": "已批准",
    "es": "Aprobada",
    "ur": "منظور شدہ"
  },
  "مرفوض": {
    "en": "Rejected",
    "zh-CN": "已拒绝",
    "es": "Rechazada",
    "ur": "مسترد"
  },
  "متوقف / معطل": {
    "en": "Paused / disabled",
    "zh-CN": "暂停 / 禁用",
    "es": "Pausada / desactivada",
    "ur": "رکا ہوا / غیر فعال"
  },
  "كل الأنواع": {
    "en": "All categories",
    "zh-CN": "所有类别",
    "es": "Todas las categorías",
    "ur": "تمام اقسام"
  },
  "تسويقي": {
    "en": "Marketing",
    "zh-CN": "营销",
    "es": "Marketing",
    "ur": "مارکیٹنگ"
  },
  "خدمي": {
    "en": "Utility",
    "zh-CN": "服务通知",
    "es": "Utilidad",
    "ur": "خدماتی"
  },
  "مصادقة": {
    "en": "Authentication",
    "zh-CN": "身份验证",
    "es": "Autenticación",
    "ur": "تصدیق"
  },
  "كل اللغات": {
    "en": "All languages",
    "zh-CN": "所有语言",
    "es": "Todos los idiomas",
    "ur": "تمام زبانیں"
  },
  "العربية": {
    "en": "Arabic",
    "zh-CN": "阿拉伯语",
    "es": "Árabe",
    "ur": "عربی"
  },
  "الإنجليزية": {
    "en": "English",
    "zh-CN": "英语",
    "es": "Inglés",
    "ur": "انگریزی"
  },
  "أخرى": {
    "en": "Other",
    "zh-CN": "其他",
    "es": "Otro",
    "ur": "دیگر"
  },
  "تطبيق": {
    "en": "Apply",
    "zh-CN": "应用",
    "es": "Aplicar",
    "ur": "لاگو کریں"
  },
  "نشط": {
    "en": "Active",
    "zh-CN": "启用",
    "es": "Activa",
    "ur": "فعال"
  },
  "متوقف مؤقتًا": {
    "en": "Paused",
    "zh-CN": "已暂停",
    "es": "En pausa",
    "ur": "عارضی طور پر رکا ہوا"
  },
  "حالة المزامنة": {
    "en": "Sync status",
    "zh-CN": "同步状态",
    "es": "Estado de sincronización",
    "ur": "ہم آہنگی کی حالت"
  },
  "لم تتم مزامنة قالب بعد": {
    "en": "No templates synchronized yet",
    "zh-CN": "尚未同步模板",
    "es": "Sin plantillas sincronizadas todavía",
    "ur": "ابھی کوئی سانچہ ہم آہنگ نہیں ہوا"
  },
  "اتصال Meta غير جاهز حاليًا.": {
    "en": "Meta connection is not ready.",
    "zh-CN": "Meta 连接尚未就绪。",
    "es": "La conexión de Meta no está lista.",
    "ur": "Meta کا رابطہ تیار نہیں۔"
  },
  "متى يصبح القالب جاهزًا؟": {
    "en": "When is a template ready?",
    "zh-CN": "模板何时可以使用？",
    "es": "¿Cuándo está lista una plantilla?",
    "ur": "سانچہ کب تیار ہوتا ہے؟"
  },
  "عندما يكون القالب Approved من Meta، نوعه معروف، ويرتبط باتصال Meta النشط لنشاطك. ويعاد فحص هذه الشروط قبل الإرسال.": {
    "en": "When Meta approves it, its category is known and it belongs to the business's active Meta connection. These conditions are checked again before sending.",
    "zh-CN": "当 Meta 批准、类别已知且属于企业当前有效连接时可用。发送前会再次检查这些条件。",
    "es": "Cuando Meta la aprueba, su categoría es conocida y pertenece a la conexión activa del negocio. Se comprueba de nuevo antes de enviar.",
    "ur": "جب Meta منظور کرے، قسم معلوم ہو اور کاروبار کے فعال رابطے سے تعلق ہو۔ ارسال سے پہلے یہ شرائط دوبارہ جانچی جاتی ہیں۔"
  },
  "الإنشاء والاعتماد لدى Meta": {
    "en": "Creation and Meta approval",
    "zh-CN": "创建与 Meta 审批",
    "es": "Creación y aprobación en Meta",
    "ur": "تیاری اور Meta کی منظوری"
  },
  "أنشئ القالب من محرر INFRO وأرسله للمراجعة. يظهر في المكتبة فور تأكيد استلامه، ثم تتحدّث حالته عند المزامنة مع Meta.": {
    "en": "Create and submit using the INFRO editor. The template appears after Meta confirms receipt, then its status updates during synchronization.",
    "zh-CN": "使用 INFRO 编辑器创建并提交。Meta 确认收到后，模板会出现在库中，同步时更新状态。",
    "es": "Crea y envía desde INFRO. Aparecerá cuando Meta confirme la recepción y su estado se actualizará al sincronizar.",
    "ur": "INFRO ایڈیٹر سے بنائیں اور بھیجیں۔ Meta کی وصولی کی تصدیق پر لائبریری میں نظر آئے گا، پھر ہم آہنگی سے حالت تازہ ہوگی۔"
  },
  "إشعارات الخدمات": {
    "en": "Service notifications",
    "zh-CN": "服务通知",
    "es": "Avisos de servicios",
    "ur": "خدمات کی اطلاعات"
  },
  "جاهزية الطلب والتذكيرات وطلب التقييم": {
    "en": "Order ready, reminders and review requests",
    "zh-CN": "订单就绪、提醒及评价请求",
    "es": "Pedido listo, recordatorios y valoraciones",
    "ur": "آرڈر کی تیاری، یاد دہانیاں اور جائزے"
  },
  "إرسال روابط المشاهدة": {
    "en": "Send viewing links",
    "zh-CN": "发送观看链接",
    "es": "Enviar enlaces de visualización",
    "ur": "مشاہدے کے لنکس بھیجیں"
  },
  "إشعارات المواعيد": {
    "en": "Appointment notifications",
    "zh-CN": "预约通知",
    "es": "Avisos de citas",
    "ur": "ملاقاتوں کی اطلاعات"
  },
  "اعتماد القالب لا يرسل رسالة؛ فعّل الإشعار من إعدادات خدمته بعد تسجيل موافقة العميل.": {
    "en": "Approval does not send a message. Enable the service notice after recording customer consent.",
    "zh-CN": "获批不会发送消息。记录客户同意后，请在服务设置中启用通知。",
    "es": "Aprobar la plantilla no envía mensajes. Activa el aviso tras registrar el consentimiento.",
    "ur": "منظوری سے پیغام نہیں بھیجتا۔ رضامندی درج کرنے کے بعد خدمت کی اطلاع فعال کریں۔"
  },
  "تشغيل القوالب في الأتمتة": {
    "en": "Use templates in automation",
    "zh-CN": "在自动化中使用模板",
    "es": "Usar plantillas en automatizaciones",
    "ur": "خودکاری میں سانچے استعمال کریں"
  },
  "بعد اعتماد القالب: اربطه بالمسار المناسب": {
    "en": "After approval, connect it to the right workflow",
    "zh-CN": "获批后连接到相应流程",
    "es": "Tras aprobarla, vincúlala al flujo adecuado",
    "ur": "منظوری کے بعد موزوں طریقۂ کار سے جوڑیں"
  },
  "الترحيب والمتابعة والسلال": {
    "en": "Welcome, follow-up and carts",
    "zh-CN": "欢迎、跟进与购物车",
    "es": "Bienvenida, seguimiento y carritos",
    "ur": "خوش آمدید، پیروی اور کارٹس"
  },
  "اختر قالبًا معتمدًا بلا متغيرات في الأتمتة العامة، ثم راجع شروط التشغيل وفعّل المسار.": {
    "en": "Choose an approved template without variables for general automation, review requirements and activate the workflow.",
    "zh-CN": "为通用自动化选择无变量的获批模板，检查条件并启用流程。",
    "es": "Elige una plantilla aprobada sin variables, revisa los requisitos y activa el flujo.",
    "ur": "عمومی خودکاری کے لیے بغیر متغیرات منظور سانچہ چنیں، شرائط دیکھیں اور طریقۂ کار فعال کریں۔"
  },
  "تأكيد الموعد": {
    "en": "Appointment confirmation",
    "zh-CN": "预约确认",
    "es": "Confirmación de cita",
    "ur": "ملاقات کی تصدیق"
  },
  "اختر قالب تأكيد الحجز ذي المتغيرات السبعة ورقم إشعارات الحجوزات من إعدادات المواعيد.": {
    "en": "Choose the seven-variable booking confirmation template and booking notification number in appointment settings.",
    "zh-CN": "在预约设置中选择含七个变量的确认模板及通知号码。",
    "es": "Elige la plantilla de confirmación con siete variables y el número de avisos en los ajustes.",
    "ur": "ملاقات کی ترتیبات میں سات متغیرات والا تصدیقی سانچہ اور اطلاعاتی نمبر چنیں۔"
  },
  "تأكيد طلب سلة": {
    "en": "Salla order confirmation",
    "zh-CN": "Salla 订单确认",
    "es": "Confirmación de pedido de Salla",
    "ur": "سلة آرڈر کی تصدیق"
  },
  "اربط المتجر واضبط إشعار الطلب المدفوع بقالب تأكيد الطلب. اعتماد القالب وحده لا يفعّل المسار.": {
    "en": "Connect the store and configure the paid-order notice with an order confirmation template. Approval alone does not activate the workflow.",
    "zh-CN": "连接商店并用订单确认模板配置已付款订单通知，仅获批不会启用流程。",
    "es": "Conecta la tienda y configura el aviso de pedido pagado con su plantilla. La aprobación no activa el flujo.",
    "ur": "اسٹور جوڑیں اور تصدیقی سانچے سے ادا شدہ آرڈر کی اطلاع ترتیب دیں۔ صرف منظوری طریقۂ کار فعال نہیں کرتی۔"
  },
  "صيغة افتراضية": {
    "en": "Default format",
    "zh-CN": "默认格式",
    "es": "Formato predeterminado",
    "ur": "پہلے سے طے شدہ ساخت"
  },
  "معاينة الرسالة": {
    "en": "Message preview",
    "zh-CN": "消息预览",
    "es": "Vista previa del mensaje",
    "ur": "پیغام کا پیش منظر"
  },
  "لا يحتوي هذا القالب على نص BODY قابل للمعاينة.": {
    "en": "This template has no BODY text to preview.",
    "zh-CN": "此模板没有可预览的 BODY 文字。",
    "es": "Esta plantilla no tiene texto BODY para previsualizar.",
    "ur": "اس سانچے میں پیش منظر کے لیے BODY متن نہیں۔"
  },
  "الجودة / ملاحظة Meta": {
    "en": "Quality / Meta note",
    "zh-CN": "质量 / Meta 备注",
    "es": "Calidad / Nota de Meta",
    "ur": "معیار / Meta کا نوٹ"
  },
  "لا توجد ملاحظة": {
    "en": "No note",
    "zh-CN": "无备注",
    "es": "Sin notas",
    "ur": "کوئی نوٹ نہیں"
  },
  "آخر مزامنة": {
    "en": "Last sync",
    "zh-CN": "上次同步",
    "es": "Última sincronización",
    "ur": "آخری ہم آہنگی"
  },
  "قالب إشعار خدمة؛ التفعيل من إعدادات الخدمة، واعتماد Meta لا يفعّله تلقائيًا.": {
    "en": "Service template: activate it in service settings. Meta approval does not activate it automatically.",
    "zh-CN": "服务通知模板需在服务设置中启用，Meta 批准不会自动启用。",
    "es": "Plantilla de servicio: actívala en sus ajustes. La aprobación de Meta no la activa.",
    "ur": "خدمت کا سانچہ؛ ترتیبات میں فعال کریں۔ Meta کی منظوری اسے خودکار فعال نہیں کرتی۔"
  },
  "لا توجد أتمتة مرتبطة بهذا القالب بعد.": {
    "en": "No automation is linked to this template yet.",
    "zh-CN": "此模板尚未关联自动化流程。",
    "es": "Todavía no hay automatización vinculada.",
    "ur": "اس سانچے سے ابھی کوئی خودکاری مربوط نہیں۔"
  },
  "إعداد إشعار الخدمة": {
    "en": "Configure service notice",
    "zh-CN": "配置服务通知",
    "es": "Configurar aviso del servicio",
    "ur": "خدمت کی اطلاع ترتیب دیں"
  },
  "إدارة ربط الأتمتة": {
    "en": "Manage automation links",
    "zh-CN": "管理自动化关联",
    "es": "Gestionar vínculos de automatización",
    "ur": "خودکاری کا ربط سنبھالیں"
  },
  "لا توجد قوالب مطابقة": {
    "en": "No matching templates",
    "zh-CN": "没有匹配模板",
    "es": "No hay plantillas coincidentes",
    "ur": "کوئی موزوں سانچہ نہیں"
  },
  "غيّر البحث أو المرشحات لعرض قوالب أخرى.": {
    "en": "Change the search or filters to see other templates.",
    "zh-CN": "更改搜索或筛选条件以查看其他模板。",
    "es": "Cambia la búsqueda o filtros para ver otras plantillas.",
    "ur": "دیگر سانچوں کے لیے تلاش یا فلٹر بدلیں۔"
  },
  "عرض كل القوالب": {
    "en": "View all templates",
    "zh-CN": "查看所有模板",
    "es": "Ver todas las plantillas",
    "ur": "تمام سانچے دیکھیں"
  },
  "ابدأ بمزامنة قوالب رقمك": {
    "en": "Start by synchronizing your templates",
    "zh-CN": "先同步号码的模板",
    "es": "Empieza sincronizando tus plantillas",
    "ur": "پہلے اپنے نمبر کے سانچے ہم آہنگ کریں"
  },
  "إذا أنشأت قالبًا في Meta ولم يظهر هنا بعد، حدّث القوالب لجلب حالته الحالية.": {
    "en": "If a template created in Meta is missing here, refresh to get its current status.",
    "zh-CN": "若 Meta 中创建的模板未显示，请刷新以获取当前状态。",
    "es": "Si falta una plantilla creada en Meta, actualiza para obtener su estado.",
    "ur": "Meta میں بنایا سانچہ یہاں نہیں تو اس کی حالت جاننے کے لیے تازہ کریں۔"
  },
  "اربط رقم واتساب التجاري أولًا، وبعد نجاح الربط ستظهر القوالب وحالات اعتمادها هنا.": {
    "en": "Connect WhatsApp Business first. Templates and approval statuses will appear after connection succeeds.",
    "zh-CN": "先连接 WhatsApp Business，成功后会显示模板和审批状态。",
    "es": "Conecta primero WhatsApp Business. Después aparecerán las plantillas y estados.",
    "ur": "پہلے واٹس ایپ بزنس جوڑیں۔ کامیابی کے بعد سانچے اور منظوری کی حالتیں دکھائی دیں گی۔"
  },
  "تحديث القوالب الآن": {
    "en": "Refresh templates now",
    "zh-CN": "立即刷新模板",
    "es": "Actualizar plantillas ahora",
    "ur": "ابھی سانچے تازہ کریں"
  },
  "إكمال ربط الرقم": {
    "en": "Complete number connection",
    "zh-CN": "完成号码连接",
    "es": "Completar conexión del número",
    "ur": "نمبر کا ربط مکمل کریں"
  },
  "أكمل اتصال رقم Meta": {
    "en": "Complete the Meta number connection",
    "zh-CN": "完成 Meta 号码连接",
    "es": "Completa la conexión de Meta",
    "ur": "Meta نمبر کا رابطہ مکمل کریں"
  },
  "بدون اتصال نشط لا يمكن اعتبار أي قالب جاهزًا للحملة.": {
    "en": "No template is campaign-ready without an active connection.",
    "zh-CN": "没有有效连接时，任何模板都无法用于营销。",
    "es": "Sin conexión activa ninguna plantilla está lista para campañas.",
    "ur": "فعال رابطے کے بغیر کوئی سانچہ مہم کے لیے تیار نہیں۔"
  },
  "أنشئ قالبك الأول": {
    "en": "Create your first template",
    "zh-CN": "创建第一个模板",
    "es": "Crea tu primera plantilla",
    "ur": "اپنا پہلا سانچہ بنائیں"
  },
  "استخدم محرر INFRO لإرساله إلى Meta أو حدّث القوالب الموجودة في حسابك.": {
    "en": "Submit from the INFRO editor or refresh templates in your account.",
    "zh-CN": "从 INFRO 编辑器提交，或刷新账户中已有模板。",
    "es": "Envíala desde INFRO o actualiza las plantillas de tu cuenta.",
    "ur": "INFRO ایڈیٹر سے بھیجیں یا اکاؤنٹ کے موجودہ سانچے تازہ کریں۔"
  },
  "انتظر مراجعة Meta": {
    "en": "Wait for Meta review",
    "zh-CN": "等待 Meta 审核",
    "es": "Espera la revisión de Meta",
    "ur": "Meta کے جائزے کا انتظار کریں"
  },
  "راجع القوالب غير الجاهزة": {
    "en": "Review templates that are not ready",
    "zh-CN": "检查未就绪模板",
    "es": "Revisa las plantillas no preparadas",
    "ur": "غیر تیار سانچے دیکھیں"
  },
  "عالج سبب الرفض أو حالة الإيقاف داخل Meta ثم أعد المزامنة.": {
    "en": "Resolve the rejection or pause in Meta, then synchronize again.",
    "zh-CN": "在 Meta 处理拒绝或暂停原因，再重新同步。",
    "es": "Soluciona el rechazo o la pausa en Meta y vuelve a sincronizar.",
    "ur": "Meta میں مسترد ہونے یا رکنے کی وجہ دور کرکے دوبارہ ہم آہنگ کریں۔"
  },
  "ابدأ Campaign Studio": {
    "en": "Open Campaign Studio",
    "zh-CN": "打开营销工作室",
    "es": "Abrir Campaign Studio",
    "ur": "Campaign Studio کھولیں"
  },
  "حدّث القوالب": {
    "en": "Refresh templates",
    "zh-CN": "刷新模板",
    "es": "Actualizar plantillas",
    "ur": "سانچے تازہ کریں"
  },
  "أعد المزامنة للحصول على أحدث حالات Meta.": {
    "en": "Synchronize again for the latest Meta statuses.",
    "zh-CN": "重新同步以获取最新 Meta 状态。",
    "es": "Sincroniza para obtener los estados recientes de Meta.",
    "ur": "Meta کی تازہ حالتوں کے لیے دوبارہ ہم آہنگ کریں۔"
  },
  "غير معتمد": {
    "en": "Not approved",
    "zh-CN": "未批准",
    "es": "No aprobada",
    "ur": "منظور نہیں"
  },
  "موقوف مؤقتًا": {
    "en": "Temporarily paused",
    "zh-CN": "暂时暂停",
    "es": "Pausada temporalmente",
    "ur": "عارضی طور پر موقوف"
  },
  "معطّل": {
    "en": "Disabled",
    "zh-CN": "已禁用",
    "es": "Desactivada",
    "ur": "غیر فعال"
  },
  "قيد التحديث": {
    "en": "Updating",
    "zh-CN": "更新中",
    "es": "Actualizando",
    "ur": "تازہ ہو رہا ہے"
  },
  "تمت المزامنة للتو": {
    "en": "Just synchronized",
    "zh-CN": "刚刚同步",
    "es": "Recién sincronizada",
    "ur": "ابھی ہم آہنگ ہوا"
  },
  "مسار التنقل": {
    "en": "Breadcrumb navigation",
    "zh-CN": "路径导航",
    "es": "Ruta de navegación",
    "ur": "صفحے کے راستے کی نیویگیشن"
  },
  "إشعارات الخدمة": {
    "en": "Service notices",
    "zh-CN": "服务通知",
    "es": "Avisos del servicio",
    "ur": "خدمت کی اطلاعات"
  },
  "مركز واتساب": {
    "en": "WhatsApp center",
    "zh-CN": "WhatsApp 中心",
    "es": "Centro de WhatsApp",
    "ur": "واٹس ایپ مرکز"
  },
  "إدارة إشعارات الخدمة": {
    "en": "Manage service notifications",
    "zh-CN": "管理服务通知",
    "es": "Gestionar avisos del servicio",
    "ur": "خدمت کی اطلاعات سنبھالیں"
  },
  "ربط الرقم": {
    "en": "Connect number",
    "zh-CN": "连接号码",
    "es": "Conectar número",
    "ur": "نمبر جوڑیں"
  },
  "قوالب الخدمة": {
    "en": "Service templates",
    "zh-CN": "服务模板",
    "es": "Plantillas del servicio",
    "ur": "خدمت کے سانچے"
  },
  "حالات تسليم الرسائل": {
    "en": "Message delivery status",
    "zh-CN": "消息送达状态",
    "es": "Estado de entrega de mensajes",
    "ur": "پیغامات کی ترسیل کی حالت"
  },
  "إشعارات الكاشير": {
    "en": "POS notifications",
    "zh-CN": "收银通知",
    "es": "Avisos de caja",
    "ur": "کیشئر کی اطلاعات"
  },
  "المشاهدة": {
    "en": "Viewing",
    "zh-CN": "观看",
    "es": "Visualización",
    "ur": "مشاہدہ"
  },
  "قالب تحقق الحجوزات. بعد اعتماده افحص تسجيل الرقم من صفحة الربط ثم أكمل إعداد المواعيد.": {
    "en": "Booking verification template. After approval, check number registration in setup, then finish appointment settings.",
    "zh-CN": "预约验证模板。获批后请在连接页检查号码注册，再完成预约设置。",
    "es": "Plantilla de verificación de citas. Tras aprobarse, comprueba el registro del número y termina los ajustes.",
    "ur": "بکنگ کی تصدیق کا سانچہ۔ منظوری کے بعد ربط کے صفحے سے نمبر کی رجسٹریشن جانچیں، پھر ملاقاتیں تیار کریں۔"
  },
  "إنشاء قالب أو تعديل قالب موجود": {
    "en": "Create or edit a template",
    "zh-CN": "创建或编辑模板",
    "es": "Crear o editar plantilla",
    "ur": "سانچہ بنائیں یا ترمیم کریں"
  },
  "اختر نموذجًا يناسب هدفك ثم راجع الرسالة وأرسلها إلى Meta. النماذج مسودات جاهزة للتخصيص وليست قوالب معتمدة مسبقًا.": {
    "en": "Choose an example, review the message and submit to Meta. These are customizable drafts, not pre-approved templates.",
    "zh-CN": "选择示例、检查消息并提交 Meta。这些是可自定义草稿，并非预先批准的模板。",
    "es": "Elige un ejemplo, revisa el mensaje y envíalo a Meta. Son borradores personalizables, no plantillas ya aprobadas.",
    "ur": "نمونہ چنیں، پیغام دیکھیں اور Meta کو بھیجیں۔ یہ قابلِ تخصیص مسودے ہیں، پہلے سے منظور سانچے نہیں۔"
  },
  "ابحث عن نموذج جاهز": {
    "en": "Search template examples",
    "zh-CN": "搜索模板示例",
    "es": "Buscar ejemplos de plantilla",
    "ur": "سانچوں کے نمونے تلاش کریں"
  },
  "ابحث عن رسالة تناسبك": {
    "en": "Find a suitable message",
    "zh-CN": "查找合适的消息",
    "es": "Busca un mensaje adecuado",
    "ur": "موزوں پیغام تلاش کریں"
  },
  "إنشاء قالب مخصص": {
    "en": "Create custom template",
    "zh-CN": "创建自定义模板",
    "es": "Crear plantilla personalizada",
    "ur": "حسبِ ضرورت سانچہ بنائیں"
  },
  "تصنيفات النماذج": {
    "en": "Example categories",
    "zh-CN": "示例分类",
    "es": "Categorías de ejemplos",
    "ur": "نمونوں کی اقسام"
  },
  "نماذج القوالب": {
    "en": "Template examples",
    "zh-CN": "模板示例",
    "es": "Ejemplos de plantillas",
    "ur": "سانچوں کے نمونے"
  },
  "تسويق": {
    "en": "Marketing",
    "zh-CN": "营销",
    "es": "Marketing",
    "ur": "مارکیٹنگ"
  },
  "إشعارات الطلبات والحجوزات": {
    "en": "Order and booking notifications",
    "zh-CN": "订单与预约通知",
    "es": "Avisos de pedidos y reservas",
    "ur": "آرڈرز اور بکنگ کی اطلاعات"
  },
  "مصادقة آمنة": {
    "en": "Secure authentication",
    "zh-CN": "安全验证",
    "es": "Autenticación segura",
    "ur": "محفوظ تصدیق"
  },
  "متغيرات": {
    "en": "variables",
    "zh-CN": "个变量",
    "es": "variables",
    "ur": "متغیرات"
  },
  "رمز تحقق آمن مع زر النسخ والنص المعتمد للمصادقة.": {
    "en": "Secure verification code with copy button and approved authentication text.",
    "zh-CN": "含复制按钮及获批验证文字的安全验证码。",
    "es": "Código seguro con botón de copia y texto aprobado.",
    "ur": "کاپی بٹن اور منظور تصدیقی متن کے ساتھ محفوظ کوڈ۔"
  },
  "تخصيص وإرسال للمراجعة ←": {
    "en": "Customize and submit for review →",
    "zh-CN": "自定义并提交审核 →",
    "es": "Personalizar y enviar a revisión →",
    "ur": "تخصیص کریں اور جائزے کے لیے بھیجیں ←"
  },
  "لا توجد نماذج مطابقة. غيّر البحث أو أنشئ قالبًا مخصصًا.": {
    "en": "No matching examples. Change the search or create a custom template.",
    "zh-CN": "没有匹配示例，请更改搜索或创建自定义模板。",
    "es": "No hay ejemplos coincidentes. Cambia la búsqueda o crea una plantilla.",
    "ur": "کوئی موزوں نمونہ نہیں۔ تلاش بدلیں یا اپنا سانچہ بنائیں۔"
  },
  "هذه نماذج INFRO. لإرسالها للمراجعة ومزامنة قوالبك، أكمل ربط رقم هذه المنشأة أولًا.": {
    "en": "These are INFRO examples. Connect this business number to submit and synchronize your templates.",
    "zh-CN": "这些是 INFRO 示例。请先连接企业号码，以提交和同步模板。",
    "es": "Son ejemplos de INFRO. Conecta el número del negocio para enviarlos y sincronizarlos.",
    "ur": "یہ INFRO کے نمونے ہیں۔ جائزے اور ہم آہنگی کے لیے پہلے اس کاروبار کا نمبر جوڑیں۔"
  },
  "ربط رقم المنشأة": {
    "en": "Connect business number",
    "zh-CN": "连接企业号码",
    "es": "Conectar número del negocio",
    "ur": "کاروباری نمبر جوڑیں"
  },
  "استخدم نماذج خدمتك، وحافظ على اسم القالب وترتيب متغيراته ليعمل الربط التلقائي. قوالب التسويق والوسائط غير مشمولة في هذا الاشتراك.": {
    "en": "Use your service examples and keep template names and variable order for automatic integration. Marketing and media templates are excluded from this subscription.",
    "zh-CN": "请使用对应服务示例，并保留模板名称及变量顺序以支持自动集成。此订阅不含营销及媒体模板。",
    "es": "Usa los ejemplos y conserva nombres y orden de variables para la integración. Esta suscripción no incluye plantillas de marketing ni medios.",
    "ur": "خدمت کے نمونے استعمال کریں اور خودکار ربط کے لیے نام اور متغیرات کی ترتیب برقرار رکھیں۔ اس اشتراک میں مارکیٹنگ اور میڈیا کے سانچے شامل نہیں۔"
  },
  "نوع العملية": {
    "en": "Operation type",
    "zh-CN": "操作类型",
    "es": "Tipo de operación",
    "ur": "عمل کی قسم"
  },
  "إنشاء قالب جديد": {
    "en": "Create new template",
    "zh-CN": "创建新模板",
    "es": "Crear plantilla nueva",
    "ur": "نیا سانچہ بنائیں"
  },
  " · مخصص": {
    "en": " · Custom",
    "zh-CN": " · 自定义",
    "es": " · Personalizada",
    "ur": " · اپنی مرضی کا"
  },
  "تعديل": {
    "en": "Edit",
    "zh-CN": "编辑",
    "es": "Editar",
    "ur": "ترمیم"
  },
  "راجع إعدادات قالب OTP: مدة الصلاحية من 1 إلى 90 دقيقة، دون نص مخصص أو وسائط.": {
    "en": "Check OTP settings: expiry must be 1–90 minutes, without custom text or media.",
    "zh-CN": "请检查 OTP 设置：有效期需为 1–90 分钟，不可自定义文字或媒体。",
    "es": "Revisa OTP: caducidad de 1 a 90 minutos, sin texto personalizado ni medios.",
    "ur": "OTP ترتیبات دیکھیں: مدت 1 سے 90 منٹ، بغیر اپنے متن یا میڈیا کے۔"
  },
  "تعذر رفع العينة.": {
    "en": "Sample upload failed.",
    "zh-CN": "示例上传失败。",
    "es": "No se pudo subir la muestra.",
    "ur": "نمونہ اپ لوڈ نہیں ہو سکا۔"
  },
  "تعذر إكمال رفع العينة.": {
    "en": "Couldn't finish uploading the sample.",
    "zh-CN": "无法完成示例上传。",
    "es": "No se pudo completar la subida.",
    "ur": "نمونے کا اپ لوڈ مکمل نہیں ہوا۔"
  },
  "تعذر تجهيز العينة. راجع نوع الملف وحجمه والنص والمتغيرات، ثم أعد المحاولة. لم يُرسل القالب للمراجعة.": {
    "en": "Couldn't prepare the sample. Check file type, size, text and variables and retry. The template was not submitted.",
    "zh-CN": "无法准备示例。请检查文件类型、大小、文字和变量后重试。模板尚未提交。",
    "es": "No se pudo preparar la muestra. Revisa tipo, tamaño, texto y variables y reintenta. No se envió la plantilla.",
    "ur": "نمونہ تیار نہیں ہوا۔ قسم، حجم، متن اور متغیرات دیکھ کر دوبارہ کوشش کریں۔ سانچہ نہیں بھیجا گیا۔"
  },
  "اسم القالب بالإنجليزية": {
    "en": "Template name in English",
    "zh-CN": "英文模板名称",
    "es": "Nombre de plantilla en inglés",
    "ur": "سانچے کا نام انگریزی میں"
  },
  "اللغة": {
    "en": "Language",
    "zh-CN": "语言",
    "es": "Idioma",
    "ur": "زبان"
  },
  "الفئة": {
    "en": "Category",
    "zh-CN": "类别",
    "es": "Categoría",
    "ur": "قسم"
  },
  "خدمة مرتبطة بطلب أو حجز": {
    "en": "Utility for an order or booking",
    "zh-CN": "订单或预约相关服务通知",
    "es": "Servicio vinculado a pedido o reserva",
    "ur": "آرڈر یا بکنگ کی خدمت"
  },
  "رمز التحقق OTP": {
    "en": "OTP verification code",
    "zh-CN": "OTP 验证码",
    "es": "Código OTP",
    "ur": "OTP تصدیقی کوڈ"
  },
  "صلاحية الرمز بالدقائق": {
    "en": "Code expiry in minutes",
    "zh-CN": "验证码有效期（分钟）",
    "es": "Caducidad del código en minutos",
    "ur": "کوڈ کی مدت منٹوں میں"
  },
  "معاينة توضيحية لرمز التحقق": {
    "en": "Illustrative verification code preview",
    "zh-CN": "验证码示意预览",
    "es": "Vista ilustrativa del código",
    "ur": "تصدیقی کوڈ کا وضاحتی پیش منظر"
  },
  "نسخ الرمز": {
    "en": "Copy code",
    "zh-CN": "复制验证码",
    "es": "Copiar código",
    "ur": "کوڈ کاپی کریں"
  },
  "Meta يحدد النص النهائي حسب اللغة. مدة الصلاحية هنا تظهر في الرسالة؛ يجب أن يطبّق نظام التحقق انتهاء الرمز ومنع إعادة استخدامه. إنشاء القالب لا يفعّل خدمة OTP تلقائيًا ولا يرسل رسائل.": {
    "en": "Meta determines the final text for the template language. Expiry appears in the message; your verification system must enforce expiry and prevent reuse. Creating a template does not activate OTP or send messages.",
    "zh-CN": "Meta 根据模板语言确定最终文字。有效期会显示在消息中，但验证系统仍须执行过期和防重用规则。创建模板不会启用 OTP 或发送消息。",
    "es": "Meta define el texto según el idioma. La caducidad aparece en el mensaje; tu sistema debe aplicarla y evitar reutilización. Crear la plantilla no activa OTP ni envía mensajes.",
    "ur": "Meta سانچے کی زبان کے مطابق آخری متن طے کرتا ہے۔ مدت پیغام میں دکھتی ہے؛ تصدیقی نظام کو میعاد اور دوبارہ استعمال کی ممانعت نافذ کرنی ہوگی۔ سانچہ بنانے سے OTP فعال یا پیغام ارسال نہیں ہوتا۔"
  },
  "رأس الرسالة": {
    "en": "Message header",
    "zh-CN": "消息页眉",
    "es": "Encabezado del mensaje",
    "ur": "پیغام کا سرنامہ"
  },
  "بدون وسائط": {
    "en": "No media",
    "zh-CN": "无媒体",
    "es": "Sin medios",
    "ur": "بغیر میڈیا"
  },
  "صورة": {
    "en": "Image",
    "zh-CN": "图片",
    "es": "Imagen",
    "ur": "تصویر"
  },
  "فيديو": {
    "en": "Video",
    "zh-CN": "视频",
    "es": "Vídeo",
    "ur": "ویڈیو"
  },
  "عينة للمراجعة — حتى": {
    "en": "Review sample — up to",
    "zh-CN": "审核示例 — 最大",
    "es": "Muestra para revisión — hasta",
    "ur": "جائزے کا نمونہ — زیادہ سے زیادہ"
  },
  "نص الرسالة": {
    "en": "Message text",
    "zh-CN": "消息正文",
    "es": "Texto del mensaje",
    "ur": "پیغام کا متن"
  },
  "مرحبًا {{1}}، تفاصيل عرضنا…": {
    "en": "Hello {{1}}, here are our offer details…",
    "zh-CN": "您好 {{1}}，优惠详情如下…",
    "es": "Hola {{1}}, estos son los detalles de la oferta…",
    "ur": "سلام {{1}}، ہماری پیشکش کی تفصیلات…"
  },
  "/ 1024 حرف": {
    "en": "/ 1024 characters",
    "zh-CN": "/ 1024 字符",
    "es": "/ 1024 caracteres",
    "ur": "/ 1024 حروف"
  },
  "أمثلة المتغيرات بالترتيب، مفصولة بعلامة |": {
    "en": "Variable examples in order, separated by |",
    "zh-CN": "按顺序输入变量示例，以 | 分隔",
    "es": "Ejemplos en orden, separados por |",
    "ur": "ترتیب سے متغیرات کی مثالیں، | سے الگ کریں"
  },
  "أحمد | موعد الصيانة": {
    "en": "Ahmed | Service appointment",
    "zh-CN": "艾哈迈德 | 维修预约",
    "es": "Ahmed | Cita de servicio",
    "ur": "احمد | خدمت کی ملاقات"
  },
  "لا تحتاج أمثلة إذا كانت رسالتك بدون متغيرات.": {
    "en": "No examples are needed when the message has no variables.",
    "zh-CN": "消息无变量时无需示例。",
    "es": "No necesitas ejemplos si el mensaje no tiene variables.",
    "ur": "بغیر متغیرات کے پیغام میں مثالیں ضروری نہیں۔"
  },
  "التذييل (اختياري)": {
    "en": "Footer (optional)",
    "zh-CN": "页脚（可选）",
    "es": "Pie de mensaje (opcional)",
    "ur": "اختتامی متن (اختیاری)"
  },
  "عنوان زر الرابط (اختياري)": {
    "en": "Link button label (optional)",
    "zh-CN": "链接按钮文字（可选）",
    "es": "Texto del botón de enlace (opcional)",
    "ur": "لنک بٹن کا عنوان (اختیاری)"
  },
  "رابط الزر HTTPS": {
    "en": "HTTPS button URL",
    "zh-CN": "HTTPS 按钮链接",
    "es": "URL HTTPS del botón",
    "ur": "بٹن کا HTTPS لنک"
  },
  "جارٍ تقديم الطلب…": {
    "en": "Submitting…",
    "zh-CN": "正在提交…",
    "es": "Enviando…",
    "ur": "درخواست بھیجی جا رہی ہے…"
  },
  "تم تقديم القالب": {
    "en": "Template submitted",
    "zh-CN": "模板已提交",
    "es": "Plantilla enviada",
    "ur": "سانچہ بھیج دیا گیا"
  },
  "إرسال إلى Meta للمراجعة": {
    "en": "Submit to Meta for review",
    "zh-CN": "提交 Meta 审核",
    "es": "Enviar a Meta para revisión",
    "ur": "Meta کو جائزے کے لیے بھیجیں"
  },
  "تقدم رفع العينة": {
    "en": "Sample upload progress",
    "zh-CN": "示例上传进度",
    "es": "Progreso de subida",
    "ur": "نمونے کے اپ لوڈ کی پیش رفت"
  },
  "رفع العينة": {
    "en": "Upload sample",
    "zh-CN": "上传示例",
    "es": "Subir muestra",
    "ur": "نمونہ اپ لوڈ کریں"
  },
  "% — اترك الصفحة مفتوحة حتى اكتمال التقديم.": {
    "en": "% — Keep this page open until submission completes.",
    "zh-CN": "% — 提交完成前请保持页面打开。",
    "es": "% — Mantén la página abierta hasta completar el envío.",
    "ur": "% — درخواست مکمل ہونے تک صفحہ کھلا رکھیں۔"
  },
  "مرجع الطلب:": {
    "en": "Request reference:",
    "zh-CN": "请求编号：",
    "es": "Referencia:",
    "ur": "درخواست کا حوالہ:"
  },
  "متابعة القوالب في المكتبة": {
    "en": "Track templates in the library",
    "zh-CN": "在模板库中跟进",
    "es": "Seguir en la biblioteca",
    "ur": "لائبریری میں سانچوں کی پیروی"
  },
  "معاينة رسالة واتساب": {
    "en": "WhatsApp message preview",
    "zh-CN": "WhatsApp 消息预览",
    "es": "Vista previa de WhatsApp",
    "ur": "واٹس ایپ پیغام کا پیش منظر"
  },
  "منشأتك": {
    "en": "Your business",
    "zh-CN": "您的企业",
    "es": "Tu negocio",
    "ur": "آپ کا کاروبار"
  },
  "معاينة توضيحية · WhatsApp": {
    "en": "Illustrative preview · WhatsApp",
    "zh-CN": "示意预览 · WhatsApp",
    "es": "Vista ilustrativa · WhatsApp",
    "ur": "وضاحتی پیش منظر · واٹس ایپ"
  },
  "عينة صورة القالب": {
    "en": "Template image sample",
    "zh-CN": "模板图片示例",
    "es": "Muestra de imagen",
    "ur": "سانچے کی تصویر کا نمونہ"
  },
  "ملف PDF": {
    "en": "PDF file",
    "zh-CN": "PDF 文件",
    "es": "Archivo PDF",
    "ur": "PDF فائل"
  },
  "اكتب رسالتك لتظهر المعاينة هنا.": {
    "en": "Write a message to see the preview here.",
    "zh-CN": "填写消息后将在此显示预览。",
    "es": "Escribe un mensaje para verlo aquí.",
    "ur": "پیغام لکھیں تو اس کا پیش منظر یہاں دکھے گا۔"
  },
  "الأمثلة للعرض ومراجعة Meta. بيانات العميل والوسائط النهائية تُحدد عند الإرسال.": {
    "en": "Examples are for preview and Meta review. Actual customer data and media are selected when sending.",
    "zh-CN": "示例用于预览和 Meta 审核，实际客户资料和媒体在发送时指定。",
    "es": "Los ejemplos son para vista previa y revisión. Los datos y medios finales se definen al enviar.",
    "ur": "مثالیں پیش منظر اور Meta کے جائزے کے لیے ہیں۔ گاہک کا اصل ڈیٹا اور میڈیا ارسال کے وقت طے ہوگا۔"
  },
  "الجمهور والحملات": {
    "en": "Audience and campaigns",
    "zh-CN": "客户群与营销活动",
    "es": "Audiencia y campañas",
    "ur": "سامعین اور مہمات"
  },
  "نظرة عامة": {
    "en": "Overview",
    "zh-CN": "概览",
    "es": "Resumen",
    "ur": "جائزہ"
  },
  "جهات الاتصال": {
    "en": "Contacts",
    "zh-CN": "联系人",
    "es": "Contactos",
    "ur": "رابطے"
  },
  "القوالب": {
    "en": "Templates",
    "zh-CN": "模板",
    "es": "Plantillas",
    "ur": "سانچے"
  },
  "كاروسيل المنتجات": {
    "en": "Product carousel",
    "zh-CN": "产品轮播",
    "es": "Carrusel de productos",
    "ur": "مصنوعات کا کیروسل"
  },
  "الحملات": {
    "en": "Campaigns",
    "zh-CN": "营销活动",
    "es": "Campañas",
    "ur": "مہمات"
  },
  "الرسائل وخدمة العملاء": {
    "en": "Messages and customer service",
    "zh-CN": "消息与客服",
    "es": "Mensajes y atención al cliente",
    "ur": "پیغامات اور گاہکوں کی خدمت"
  },
  "سجل الرسائل": {
    "en": "Message log",
    "zh-CN": "消息记录",
    "es": "Registro de mensajes",
    "ur": "پیغامات کا ریکارڈ"
  },
  "المحادثات": {
    "en": "Conversations",
    "zh-CN": "对话",
    "es": "Conversaciones",
    "ur": "گفتگو"
  },
  "الفرز والمتابعة": {
    "en": "Triage and follow-up",
    "zh-CN": "分拣与跟进",
    "es": "Clasificación y seguimiento",
    "ur": "چھانٹنا اور پیروی"
  },
  "منع الإرسال": {
    "en": "Send blocking",
    "zh-CN": "发送拦截",
    "es": "Bloqueo de envíos",
    "ur": "ارسال کی روک تھام"
  },
  "الأتمتة والمتاجر": {
    "en": "Automation and stores",
    "zh-CN": "自动化与商店",
    "es": "Automatización y tiendas",
    "ur": "خودکاری اور اسٹورز"
  },
  "الأتمتة": {
    "en": "Automation",
    "zh-CN": "自动化",
    "es": "Automatización",
    "ur": "خودکاری"
  },
  "بوت المحادثات": {
    "en": "Conversation bot",
    "zh-CN": "对话机器人",
    "es": "Bot de conversaciones",
    "ur": "گفتگو کا بوٹ"
  },
  "مركز الذكاء الاصطناعي": {
    "en": "AI center",
    "zh-CN": "人工智能中心",
    "es": "Centro de IA",
    "ur": "مصنوعی ذہانت کا مرکز"
  },
  "السلال المتروكة": {
    "en": "Abandoned carts",
    "zh-CN": "弃购购物车",
    "es": "Carritos abandonados",
    "ur": "نامکمل کارٹس"
  },
  "التكاملات": {
    "en": "Integrations",
    "zh-CN": "集成",
    "es": "Integraciones",
    "ur": "انضمام"
  },
  "الروابط المختصرة": {
    "en": "Short links",
    "zh-CN": "短链接",
    "es": "Enlaces cortos",
    "ur": "مختصر لنکس"
  },
  "التذكيرات": {
    "en": "Reminders",
    "zh-CN": "提醒",
    "es": "Recordatorios",
    "ur": "یاد دہانیاں"
  },
  "التشغيل والمساعدة": {
    "en": "Operations and help",
    "zh-CN": "运营与帮助",
    "es": "Operaciones y ayuda",
    "ur": "آپریشنز اور مدد"
  },
  "جميع الأدوات": {
    "en": "All tools",
    "zh-CN": "所有工具",
    "es": "Todas las herramientas",
    "ur": "تمام اوزار"
  },
  "ربط واتساب": {
    "en": "Connect WhatsApp",
    "zh-CN": "连接 WhatsApp",
    "es": "Conectar WhatsApp",
    "ur": "واٹس ایپ جوڑیں"
  },
  "سجل التدقيق": {
    "en": "Audit log",
    "zh-CN": "审计日志",
    "es": "Registro de auditoría",
    "ur": "آڈٹ ریکارڈ"
  },
  "الشروحات": {
    "en": "Guides",
    "zh-CN": "指南",
    "es": "Guías",
    "ur": "رہنما"
  },
  "جلسات الدخول": {
    "en": "Login sessions",
    "zh-CN": "登录会话",
    "es": "Sesiones de acceso",
    "ur": "لاگ ان سیشن"
  },
  "الفوترة": {
    "en": "Billing",
    "zh-CN": "账单",
    "es": "Facturación",
    "ur": "بلنگ"
  },
  "أقسام تسويق واتساب": {
    "en": "WhatsApp marketing sections",
    "zh-CN": "WhatsApp 营销栏目",
    "es": "Secciones de marketing de WhatsApp",
    "ur": "واٹس ایپ مارکیٹنگ کے حصے"
  },
  "مجموعات أدوات واتساب": {
    "en": "WhatsApp tool groups",
    "zh-CN": "WhatsApp 工具分组",
    "es": "Grupos de herramientas de WhatsApp",
    "ur": "واٹس ایپ اوزاروں کے گروہ"
  },
  "تذكير الاستلام": {
    "en": "Pickup reminder",
    "zh-CN": "取件提醒",
    "es": "Recordatorio de recogida",
    "ur": "وصولی کی یاد دہانی"
  },
  "رسالة تخص طلبًا معينًا بموافقة صاحبه. اعتماد الفئة النهائي لدى Meta؛ التفعيل من إعدادات إشعارات الكاشير.": {
    "en": "A notice about a specific order with customer consent. Meta determines the final category. Activate it in POS notifications.",
    "zh-CN": "经客户同意发送的特定订单通知，最终类别由 Meta 决定。请在收银通知中启用。",
    "es": "Aviso de un pedido concreto con consentimiento. Meta decide la categoría. Actívalo en los avisos de caja.",
    "ur": "رضامندی کے ساتھ مخصوص آرڈر کی اطلاع۔ آخری قسم Meta طے کرتا ہے؛ کیشئر اطلاعات میں فعال کریں۔"
  },
  "تذكير المبلغ المتبقي": {
    "en": "Outstanding balance reminder",
    "zh-CN": "未付余额提醒",
    "es": "Recordatorio de saldo pendiente",
    "ur": "باقی رقم کی یاد دہانی"
  },
  "طلب تقييم الخدمة": {
    "en": "Service review request",
    "zh-CN": "服务评价请求",
    "es": "Solicitud de valoración",
    "ur": "خدمت کے جائزے کی درخواست"
  },
  "نص مصادقة ثابت من Meta مع زر نسخ الرمز. يحتاج مسار تحقق يولّد الرمز ويتحقق منه؛ ليس رسالة حملة جماعية.": {
    "en": "Fixed Meta authentication text with a copy-code button. Requires a verification flow that generates and checks codes; it is not a bulk campaign message.",
    "zh-CN": "Meta 固定验证文字及复制按钮，需要生成和校验验证码的流程，不能作为群发营销消息。",
    "es": "Texto fijo de Meta con botón de copia. Necesita un flujo que genere y verifique códigos; no es una campaña masiva.",
    "ur": "Meta کا مقرر تصدیقی متن اور کوڈ کاپی بٹن۔ کوڈ بنانے اور جانچنے کا نظام چاہیے؛ یہ اجتماعی مہم کا پیغام نہیں۔"
  },
  "ترحيب بالعميل": {
    "en": "Customer welcome",
    "zh-CN": "欢迎客户",
    "es": "Bienvenida al cliente",
    "ur": "گاہک کو خوش آمدید"
  },
  "متوافق مع الأتمتة العامة بلا متغيرات، ويتطلب موافقة العميل التسويقية.": {
    "en": "Works with general automation without variables and requires marketing consent.",
    "zh-CN": "适用于无变量的通用自动化，需要营销同意。",
    "es": "Compatible con automatización general sin variables y con consentimiento de marketing.",
    "ur": "بغیر متغیرات عمومی خودکاری کے لیے موزوں؛ مارکیٹنگ کی رضامندی ضروری ہے۔"
  },
  "متابعة بعد الخدمة": {
    "en": "After-service follow-up",
    "zh-CN": "服务后跟进",
    "es": "Seguimiento tras el servicio",
    "ur": "خدمت کے بعد پیروی"
  },
  "متوافق مع أتمتة المتابعة بعد إتمام طلب أو حجز، بعد اعتماد القالب وموافقة العميل.": {
    "en": "Works with follow-up after an order or booking is completed, after approval and customer consent.",
    "zh-CN": "获批并获得客户同意后，可用于订单或预约完成后的跟进自动化。",
    "es": "Compatible con seguimiento tras finalizar un pedido o cita, con aprobación y consentimiento.",
    "ur": "آرڈر یا بکنگ مکمل ہونے کے بعد پیروی کے لیے موزوں؛ منظوری اور رضامندی کے بعد۔"
  },
  "إعادة تواصل مع العملاء": {
    "en": "Reconnect with customers",
    "zh-CN": "重新联系客户",
    "es": "Retomar contacto con clientes",
    "ur": "گاہکوں سے دوبارہ رابطہ"
  },
  "متوافق مع مسار العملاء غير النشطين. يتطلب موافقة تسويقية سارية.": {
    "en": "Works with inactive-customer workflows and requires current marketing consent.",
    "zh-CN": "适用于非活跃客户流程，需要有效的营销同意。",
    "es": "Compatible con clientes inactivos y consentimiento de marketing vigente.",
    "ur": "غیر فعال گاہکوں کے طریقۂ کار کے لیے موزوں؛ موجودہ مارکیٹنگ رضامندی ضروری ہے۔"
  },
  "تأكيد الطلب": {
    "en": "Order confirmation",
    "zh-CN": "订单确认",
    "es": "Confirmación del pedido",
    "ur": "آرڈر کی تصدیق"
  },
  "متوافق مع متغيرات مسار تأكيد طلب سلة المدفوع.": {
    "en": "Matches the paid Salla order confirmation variables.",
    "zh-CN": "与 Salla 已付款订单确认流程的变量匹配。",
    "es": "Compatible con las variables de confirmación de pedidos pagados de Salla.",
    "ur": "سلة کے ادا شدہ آرڈر کی تصدیق کے متغیرات کے مطابق۔"
  },
  "شحن الطلب": {
    "en": "Order shipped",
    "zh-CN": "订单发货",
    "es": "Envío del pedido",
    "ur": "آرڈر روانہ"
  },
  "متوافق مع متغيرات مسار شحن طلب سلة.": {
    "en": "Matches the Salla shipping workflow variables.",
    "zh-CN": "与 Salla 发货流程的变量匹配。",
    "es": "Compatible con las variables de envío de Salla.",
    "ur": "سلة آرڈر کی روانگی کے متغیرات کے مطابق۔"
  },
  "طلب المغسلة جاهز للاستلام": {
    "en": "Laundry order ready for pickup",
    "zh-CN": "洗衣订单可取件",
    "es": "Pedido de lavandería listo",
    "ur": "لانڈری آرڈر وصولی کے لیے تیار"
  },
  "بعد اعتماد القالب، اختره من إشعارات واتساب داخل المغسلة.": {
    "en": "After approval, choose it in laundry WhatsApp notification settings.",
    "zh-CN": "获批后，请在洗衣店 WhatsApp 通知中选择。",
    "es": "Tras aprobarse, selecciónala en los avisos de WhatsApp de la lavandería.",
    "ur": "منظوری کے بعد لانڈری کی واٹس ایپ اطلاعات میں منتخب کریں۔"
  },
  "رابط المشاهدة المؤقتة": {
    "en": "Temporary viewing link",
    "zh-CN": "临时观看链接",
    "es": "Enlace temporal de visualización",
    "ur": "عارضی مشاہدے کا لنک"
  },
  "قالب INFRO Live المخصص. اترك النص والمتغيرات الأربعة كما هي؛ بعد اعتماده يمكنك إرسال الروابط من قسم المشاهدة المؤقتة.": {
    "en": "Dedicated INFRO Live template. Keep the text and four variables unchanged. After approval, send links from temporary viewing.",
    "zh-CN": "INFRO Live 专用模板。请保留原文及四个变量；获批后可从临时观看栏目发送链接。",
    "es": "Plantilla INFRO Live. Conserva texto y cuatro variables. Tras aprobarse, envía enlaces desde visualización temporal.",
    "ur": "INFRO Live کا مخصوص سانچہ۔ متن اور چار متغیرات برقرار رکھیں؛ منظوری پر مشاہدے کے حصے سے لنکس بھیجیں۔"
  },
  "متوافق مع متغيرات إشعار الحجز السبعة. اربطه من إعدادات الحجوزات بعد اعتماده.": {
    "en": "Matches the seven booking variables. Connect it in appointment settings after approval.",
    "zh-CN": "与预约通知的七个变量匹配。获批后在预约设置中关联。",
    "es": "Compatible con las siete variables de citas. Vincúlala en los ajustes tras aprobarse.",
    "ur": "بکنگ کے سات متغیرات کے مطابق۔ منظوری کے بعد ملاقاتوں کی ترتیبات میں جوڑیں۔"
  },
  "تذكير بسلة متروكة": {
    "en": "Abandoned cart reminder",
    "zh-CN": "弃购提醒",
    "es": "Recordatorio de carrito abandonado",
    "ur": "نامکمل کارٹ کی یاد دہانی"
  },
  "نموذج بلا متغيرات متوافق مع مسار السلة الحالي، ويتطلب موافقة تسويقية.": {
    "en": "No-variable example matching the current cart workflow; marketing consent is required.",
    "zh-CN": "无变量示例，适配当前购物车流程，需要营销同意。",
    "es": "Ejemplo sin variables compatible con el flujo de carritos; requiere consentimiento.",
    "ur": "موجودہ کارٹ کے طریقۂ کار کے لیے بغیر متغیرات نمونہ؛ مارکیٹنگ کی رضامندی ضروری ہے۔"
  },
  "أضف رابط التقييم في زر القالب. التصنيف النهائي تحدده Meta.": {
    "en": "Add your review link to the button. Meta determines the final category.",
    "zh-CN": "请在按钮中添加评价链接，最终类别由 Meta 决定。",
    "es": "Añade el enlace de valoración al botón. Meta decide la categoría final.",
    "ur": "بٹن میں جائزے کا لنک ڈالیں۔ آخری قسم Meta طے کرتا ہے۔"
  },
  "عرض لعملائك": {
    "en": "Offer for your customers",
    "zh-CN": "客户优惠",
    "es": "Oferta para tus clientes",
    "ur": "گاہکوں کے لیے پیشکش"
  },
  "يمكن إضافة صورة أو فيديو أو PDF وعينة للمراجعة من حقول المحرر.": {
    "en": "You can add an image, video or PDF and a review sample in the editor.",
    "zh-CN": "可在编辑器中添加图片、视频或 PDF 及审核示例。",
    "es": "Puedes añadir imagen, vídeo o PDF y una muestra en el editor.",
    "ur": "ایڈیٹر میں تصویر، ویڈیو یا PDF اور جائزے کا نمونہ شامل کر سکتے ہیں۔"
  },
  "تسليم الطلب": {
    "en": "Order delivered",
    "zh-CN": "订单已交付",
    "es": "Pedido entregado",
    "ur": "آرڈر پہنچ گیا"
  },
  "بعد الاعتماد، اختر هذا القالب للحالة المطابقة في إعدادات إشعارات طلبات سلة. لا تُفعّل الأحداث تلقائيًا بمجرد إنشاء القالب.": {
    "en": "After approval, choose this template for its matching Salla order status. Creating it does not activate events automatically.",
    "zh-CN": "获批后，在 Salla 订单通知设置中为对应状态选择此模板。创建模板不会自动启用事件。",
    "es": "Tras aprobarse, selecciónala para el estado correspondiente de Salla. Crear la plantilla no activa eventos.",
    "ur": "منظوری کے بعد سلة کے متعلقہ آرڈر کی حالت کے لیے چنیں۔ صرف تیاری سے واقعات خودکار فعال نہیں ہوتے۔"
  },
  "إلغاء الطلب": {
    "en": "Order cancellation",
    "zh-CN": "订单取消",
    "es": "Cancelación del pedido",
    "ur": "آرڈر منسوخ"
  },
  "استرجاع الطلب": {
    "en": "Order return",
    "zh-CN": "订单退货",
    "es": "Devolución del pedido",
    "ur": "آرڈر کی واپسی"
  },
  "تجهيز الطلب": {
    "en": "Order preparation",
    "zh-CN": "订单准备",
    "es": "Preparación del pedido",
    "ur": "آرڈر کی تیاری"
  },
  "شكر على التقييم": {
    "en": "Thank you for your review",
    "zh-CN": "感谢您的评价",
    "es": "Gracias por tu valoración",
    "ur": "جائزے پر شکریہ"
  },
  "نموذج للتخصيص والإرسال من حملة بعد الاعتماد والموافقة التسويقية؛ ليس مرتبطًا تلقائيًا بحدث تقييم.": {
    "en": "Customize and send through a campaign after approval and marketing consent. It is not automatically triggered by a review event.",
    "zh-CN": "获批并取得营销同意后，可自定义并通过营销活动发送；不会由评价事件自动触发。",
    "es": "Personaliza y envía en una campaña con aprobación y consentimiento. No se dispara automáticamente por una valoración.",
    "ur": "منظوری اور مارکیٹنگ رضامندی کے بعد تخصیص کرکے مہم سے بھیجیں۔ جائزے کے واقعے سے خودکار ارسال نہیں ہوتا۔"
  },
  "متابعة ملاحظة العميل": {
    "en": "Follow up on customer feedback",
    "zh-CN": "跟进客户反馈",
    "es": "Seguimiento de comentarios",
    "ur": "گاہک کی رائے کی پیروی"
  },
  "أضف زر تواصل مناسبًا. إرسال المتابعة يخضع لاعتماد القالب وموافقة العميل؛ لا يوجد مشغّل تقييم تلقائي لهذا النموذج.": {
    "en": "Add a contact button. Follow-up requires approval and consent; this example has no automatic review trigger.",
    "zh-CN": "添加联系按钮。跟进发送需要模板批准和客户同意；此示例无自动评价触发器。",
    "es": "Añade un botón de contacto. Requiere aprobación y consentimiento; no tiene disparador automático de valoración.",
    "ur": "رابطے کا بٹن شامل کریں۔ منظوری اور رضامندی ضروری ہیں؛ اس نمونے کا خودکار جائزہ محرک نہیں۔"
  },
  "إطلاق منتجات جديدة": {
    "en": "New product launch",
    "zh-CN": "新品发布",
    "es": "Lanzamiento de productos",
    "ur": "نئی مصنوعات کی پیشکش"
  },
  "أضف صورة أو فيديو يعرض المنتجات، وزرًا إلى صفحة المجموعة.": {
    "en": "Add product images or video and a button linking to the collection.",
    "zh-CN": "添加产品图片或视频，以及前往产品系列的按钮。",
    "es": "Añade imágenes o vídeo y un botón a la colección.",
    "ur": "مصنوعات کی تصویر یا ویڈیو اور مجموعے کے صفحے کا بٹن شامل کریں۔"
  },
  "كتالوج PDF": {
    "en": "PDF catalog",
    "zh-CN": "PDF 目录",
    "es": "Catálogo PDF",
    "ur": "PDF کیٹلاگ"
  },
  "اختر رأس PDF وأرفق ملفًا للمراجعة. حدد ملف الإرسال الفعلي عند إعداد الحملة.": {
    "en": "Choose a PDF header and attach a review file. Select the final sending file when preparing the campaign.",
    "zh-CN": "选择 PDF 页眉并附上审核文件；设置营销活动时再选择正式发送文件。",
    "es": "Elige encabezado PDF y adjunta una muestra. Define el archivo final al preparar la campaña.",
    "ur": "PDF سرنامہ چنیں اور جائزے کے لیے فائل دیں۔ مہم تیار کرتے وقت اصل ارسال کی فائل مقرر کریں۔"
  },
  "كل النماذج": {
    "en": "All examples",
    "zh-CN": "所有示例",
    "es": "Todos los ejemplos",
    "ur": "تمام نمونے"
  },
  "الطلبات والمواعيد": {
    "en": "Orders and appointments",
    "zh-CN": "订单与预约",
    "es": "Pedidos y citas",
    "ur": "آرڈرز اور ملاقاتیں"
  },
  "التسويق": {
    "en": "Marketing",
    "zh-CN": "营销",
    "es": "Marketing",
    "ur": "مارکیٹنگ"
  },
  "التقييم والمتابعة": {
    "en": "Reviews and follow-up",
    "zh-CN": "评价与跟进",
    "es": "Valoraciones y seguimiento",
    "ur": "جائزے اور پیروی"
  },
  "رموز التحقق": {
    "en": "Verification codes",
    "zh-CN": "验证码",
    "es": "Códigos de verificación",
    "ur": "تصدیقی کوڈ"
  },
  "قوالب قيد المراجعة: {count}. لا يمكن الإرسال قبل الاعتماد.": {
    "en": "Templates under review: {count}. Sending requires approval.",
    "zh-CN": "审核中的模板：{count}。获批前无法发送。",
    "es": "Plantillas en revisión: {count}. Se necesita aprobación para enviar.",
    "ur": "زیرِ جائزہ سانچے: {count}۔ منظوری سے پہلے ارسال ممکن نہیں۔"
  },
  "قوالب جاهزة: {count}. مرتبطة باتصال النشاط الحالي.": {
    "en": "Ready templates: {count}. Linked to this business connection.",
    "zh-CN": "已就绪模板：{count}。已关联当前企业连接。",
    "es": "Plantillas listas: {count}. Vinculadas a la conexión del negocio.",
    "ur": "تیار سانچے: {count}۔ موجودہ کاروباری رابطے سے منسلک۔"
  },
  "الرقم: {number}": {
    "en": "Number: {number}",
    "zh-CN": "号码：{number}",
    "es": "Número: {number}",
    "ur": "نمبر: {number}"
  },
  "أرفق {type} للمعاينة": {
    "en": "Attach {type} for preview",
    "zh-CN": "附加{type}以预览",
    "es": "Adjunta {type} para la vista previa",
    "ur": "پیش منظر کے لیے {type} شامل کریں"
  },
  "الكل": {
    "en": "All",
    "zh-CN": "全部",
    "es": "Todos",
    "ur": "سب"
  },
  "تعذر الحفظ": {
    "en": "Couldn't save",
    "zh-CN": "无法保存",
    "es": "No se pudo guardar",
    "ur": "محفوظ نہیں ہو سکا"
  },
  "حُفظ الطلب وأصبحت الفاتورة جاهزة للطباعة.": {
    "en": "Order saved. The invoice is ready to print.",
    "zh-CN": "订单已保存，发票可打印。",
    "es": "Pedido guardado. La factura está lista para imprimir.",
    "ur": "آرڈر محفوظ ہو گیا۔ بل پرنٹ کے لیے تیار ہے۔"
  },
  "حُفظ الطلب وأصبح المستند جاهزًا للطباعة.": {
    "en": "Order saved. The document is ready to print.",
    "zh-CN": "订单已保存，单据可打印。",
    "es": "Pedido guardado. El documento está listo para imprimir.",
    "ur": "آرڈر محفوظ ہو گیا۔ دستاویز پرنٹ کے لیے تیار ہے۔"
  },
  "تم حفظ العملية بنجاح": {
    "en": "Operation saved successfully",
    "zh-CN": "操作已成功保存",
    "es": "Operación guardada correctamente",
    "ur": "عمل کامیابی سے محفوظ ہو گیا"
  },
  "تعذر الاتصال. أعد المحاولة بنفس البيانات لتجنب تكرار العملية.": {
    "en": "Connection failed. Retry with the same details to avoid duplication.",
    "zh-CN": "连接失败。请使用相同资料重试，以免重复操作。",
    "es": "Error de conexión. Reintenta con los mismos datos para evitar duplicados.",
    "ur": "رابطہ ناکام۔ دہرا عمل روکنے کے لیے انہی تفصیلات سے دوبارہ کوشش کریں۔"
  },
  "إضافة": {
    "en": "Add",
    "zh-CN": "添加",
    "es": "Añadir",
    "ur": "شامل کریں"
  },
  "شعار المنشأة": {
    "en": "Business logo",
    "zh-CN": "企业标志",
    "es": "Logotipo del negocio",
    "ur": "کاروبار کا لوگو"
  },
  "INFRO · مساحة العمل": {
    "en": "INFRO · Workspace",
    "zh-CN": "INFRO · 工作空间",
    "es": "INFRO · Espacio de trabajo",
    "ur": "INFRO · کام کی جگہ"
  },
  "اختر القطع، حدد الخدمة، وأصدر مستند الطلب.": {
    "en": "Choose items and service, then issue the order document.",
    "zh-CN": "选择衣物及服务，然后生成订单单据。",
    "es": "Elige prendas y servicio y emite el documento del pedido.",
    "ur": "اشیا اور خدمت چنیں، پھر آرڈر کی دستاویز جاری کریں۔"
  },
  "اختر الأصناف والخدمات، وسجّل طلب العميل والتحصيل.": {
    "en": "Choose items and services, then record the customer order and payment.",
    "zh-CN": "选择商品及服务，登记客户订单和收款。",
    "es": "Elige artículos y servicios y registra el pedido y el cobro.",
    "ur": "اشیا اور خدمات چنیں، پھر گاہک کا آرڈر اور وصولی درج کریں۔"
  },
  "راجع حساباتك، أنشئ القيود وتابع التقارير المالية.": {
    "en": "Review accounts, create entries and follow financial reports.",
    "zh-CN": "查看账务、创建分录并跟进财务报表。",
    "es": "Revisa cuentas, crea asientos y consulta informes financieros.",
    "ur": "حسابات دیکھیں، اندراج بنائیں اور مالی رپورٹس کی پیروی کریں۔"
  },
  "أدوات متصلة ببيانات منشأتك وحساباتها.": {
    "en": "Tools connected to your business data and accounts.",
    "zh-CN": "与企业资料和账务相连的工具。",
    "es": "Herramientas conectadas a los datos y cuentas de tu negocio.",
    "ur": "آپ کے کاروباری ڈیٹا اور حسابات سے مربوط اوزار۔"
  },
  "نشاط المغاسل": {
    "en": "Laundry activity",
    "zh-CN": "洗衣业务",
    "es": "Actividad de lavandería",
    "ur": "لانڈری کا کاروبار"
  },
  "خدمات ومنتجات": {
    "en": "Services and products",
    "zh-CN": "服务与产品",
    "es": "Servicios y productos",
    "ur": "خدمات اور مصنوعات"
  },
  "طلبات تحت العمل": {
    "en": "Orders in progress",
    "zh-CN": "处理中的订单",
    "es": "Pedidos en curso",
    "ur": "زیرِ تکمیل آرڈرز"
  },
  "جميع الطلبات غير المسلّمة": {
    "en": "All undelivered orders",
    "zh-CN": "所有未交付订单",
    "es": "Todos los pedidos sin entregar",
    "ur": "تمام غیر پہنچائے گئے آرڈرز"
  },
  "جاهز للاستلام": {
    "en": "Ready for pickup",
    "zh-CN": "可取件",
    "es": "Listo para recoger",
    "ur": "وصولی کے لیے تیار"
  },
  "بانتظار زيارة العميل": {
    "en": "Awaiting customer visit",
    "zh-CN": "等待客户到访",
    "es": "Esperando al cliente",
    "ur": "گاہک کی آمد کا منتظر"
  },
  "تحصيل الطلبات المباشر": {
    "en": "Direct order collections",
    "zh-CN": "订单直接收款",
    "es": "Cobros directos de pedidos",
    "ur": "آرڈرز کی براہِ راست وصولی"
  },
  "ر.س": {
    "en": "SAR",
    "zh-CN": "沙特里亚尔",
    "es": "SAR",
    "ur": "ریال"
  },
  "منذ بدء استخدام النظام": {
    "en": "Since system use began",
    "zh-CN": "自开始使用系统以来",
    "es": "Desde el inicio del sistema",
    "ur": "نظام کے استعمال کے آغاز سے"
  },
  "مبالغ متبقية": {
    "en": "Outstanding amounts",
    "zh-CN": "未收款项",
    "es": "Importes pendientes",
    "ur": "باقی رقوم"
  },
  "ذمم طلبات المنشأة": {
    "en": "Receivables on business orders",
    "zh-CN": "企业订单应收款",
    "es": "Cuentas por cobrar de pedidos",
    "ur": "کاروباری آرڈرز کی واجب الوصول رقوم"
  },
  "أولوية متابعة الطلبات": {
    "en": "Order follow-up priority",
    "zh-CN": "订单跟进优先级",
    "es": "Prioridad de seguimiento",
    "ur": "آرڈرز کی پیروی کی ترجیح"
  },
  "الأقدم تأخرًا يظهر أولًا. يشمل الطلبات الجاهزة التي لم يستلمها العميل؛ لا يعني ذلك تأخر التجهيز بالضرورة.": {
    "en": "Oldest overdue orders appear first, including ready orders not yet picked up. This does not necessarily mean preparation is late.",
    "zh-CN": "最早逾期订单优先显示，包括已就绪但未取件的订单，并不一定代表处理延误。",
    "es": "Los más atrasados aparecen primero, incluidos los listos sin recoger. No implica necesariamente retraso de preparación.",
    "ur": "سب سے پرانے تاخیر شدہ آرڈر پہلے ہیں، تیار مگر غیر وصول شدہ بھی شامل ہیں۔ اس کا مطلب لازماً تیاری میں تاخیر نہیں۔"
  },
  "تُطبّق الفلاتر على كامل سجل المنشأة قبل عرض آخر 100 نتيجة.": {
    "en": "Filters apply to the full business history before showing the latest 100 results.",
    "zh-CN": "先筛选企业完整记录，再显示最新 100 条结果。",
    "es": "Los filtros se aplican a todo el historial antes de mostrar los últimos 100 resultados.",
    "ur": "تازہ ترین 100 نتائج سے پہلے پورے کاروباری ریکارڈ پر فلٹر لگتا ہے۔"
  },
  "اختر الخدمات": {
    "en": "Choose services",
    "zh-CN": "选择服务",
    "es": "Elegir servicios",
    "ur": "خدمات منتخب کریں"
  },
  "صنفًا": {
    "en": "items",
    "zh-CN": "件商品",
    "es": "artículos",
    "ur": "اشیا"
  },
  "نوع الخدمة وأسعار المنيو": {
    "en": "Service type and menu prices",
    "zh-CN": "服务类型与价目表",
    "es": "Tipo de servicio y precios",
    "ur": "خدمت کی قسم اور مینو کی قیمتیں"
  },
  "نوع الغسيل": {
    "en": "Laundry type",
    "zh-CN": "洗衣类型",
    "es": "Tipo de lavado",
    "ur": "دھلائی کی قسم"
  },
  "سرعة الخدمة": {
    "en": "Service speed",
    "zh-CN": "服务速度",
    "es": "Rapidez del servicio",
    "ur": "خدمت کی رفتار"
  },
  "تسعير المستعجل": {
    "en": "Rush pricing",
    "zh-CN": "加急定价",
    "es": "Precios urgentes",
    "ur": "فوری خدمت کی قیمتیں"
  },
  "بأسعار المستعجل": {
    "en": "At rush prices",
    "zh-CN": "按加急价格",
    "es": "Con precios urgentes",
    "ur": "فوری خدمت کی قیمتوں پر"
  },
  "بالأسعار العادية": {
    "en": "At standard prices",
    "zh-CN": "按普通价格",
    "es": "Con precios normales",
    "ur": "عام قیمتوں پر"
  },
  "منيو المستعجل · الأسعار النهائية موضحة على الأصناف. غير المسعّر غير متاح.": {
    "en": "Rush menu · Final item prices are shown. Items without a rush price are unavailable.",
    "zh-CN": "加急菜单 · 显示商品最终价格，未设置加急价的商品不可用。",
    "es": "Menú urgente · Se muestran precios finales. Sin precio urgente, el artículo no está disponible.",
    "ur": "فوری مینو · آخری قیمتیں اشیا پر ہیں۔ بغیر فوری قیمت والی خدمت دستیاب نہیں۔"
  },
  "منيو العادي · اختر نوع الخدمة قبل إضافة الأصناف.": {
    "en": "Standard menu · Choose the service type before adding items.",
    "zh-CN": "普通菜单 · 添加商品前请选择服务类型。",
    "es": "Menú normal · Elige el servicio antes de añadir artículos.",
    "ur": "عام مینو · اشیا شامل کرنے سے پہلے خدمت کی قسم چنیں۔"
  },
  "البحث عن صنف": {
    "en": "Search items",
    "zh-CN": "搜索商品",
    "es": "Buscar artículos",
    "ur": "اشیا تلاش کریں"
  },
  "ابحث عن ثوب، شماغ، بطانية…": {
    "en": "Search thobe, shemagh, blanket…",
    "zh-CN": "搜索长袍、头巾、毯子…",
    "es": "Busca túnica, pañuelo, manta…",
    "ur": "ثوب، شماغ، کمبل تلاش کریں…"
  },
  "ابحث باسم الصنف أو الخدمة…": {
    "en": "Search by item or service name…",
    "zh-CN": "按商品或服务名称搜索…",
    "es": "Busca por artículo o servicio…",
    "ur": "صنف یا خدمت کے نام سے تلاش کریں…"
  },
  "نوع خدمة المغسلة": {
    "en": "Laundry service type",
    "zh-CN": "洗衣服务类型",
    "es": "Tipo de servicio de lavandería",
    "ur": "لانڈری خدمت کی قسم"
  },
  "غسيل وكوي": {
    "en": "Wash and iron",
    "zh-CN": "洗涤与熨烫",
    "es": "Lavado y planchado",
    "ur": "دھلائی اور استری"
  },
  "كوي فقط": {
    "en": "Iron only",
    "zh-CN": "仅熨烫",
    "es": "Solo planchado",
    "ur": "صرف استری"
  },
  "تصنيف الملابس": {
    "en": "Clothing category",
    "zh-CN": "衣物分类",
    "es": "Categoría de prendas",
    "ur": "کپڑوں کی قسم"
  },
  "تصنيف الأصناف": {
    "en": "Item category",
    "zh-CN": "商品分类",
    "es": "Categoría de artículos",
    "ur": "اشیا کی قسم"
  },
  "ابدأ بقائمة خدماتك": {
    "en": "Start with your service menu",
    "zh-CN": "先设置服务菜单",
    "es": "Empieza con tu lista de servicios",
    "ur": "اپنی خدمات کی فہرست سے شروع کریں"
  },
  "أضف أصناف منشأتك وخدماتها وأسعارها الفعلية. لن تُضاف أسعار افتراضية إلى حساباتك.": {
    "en": "Add your own items, services and actual prices. No default prices will be added to your accounts.",
    "zh-CN": "添加企业自己的商品、服务及实际价格，不会向账务中加入默认价格。",
    "es": "Añade tus artículos, servicios y precios reales. No se agregarán precios predeterminados a tus cuentas.",
    "ur": "اپنی اشیا، خدمات اور اصل قیمتیں شامل کریں۔ حسابات میں فرضی قیمتیں نہیں ڈالی جائیں گی۔"
  },
  "إضافة أول خدمة": {
    "en": "Add first service",
    "zh-CN": "添加首项服务",
    "es": "Añadir primer servicio",
    "ur": "پہلی خدمت شامل کریں"
  },
  "اطلب من المالك إعداد الخدمات.": {
    "en": "Ask the owner to configure services.",
    "zh-CN": "请所有者配置服务。",
    "es": "Pide al propietario que configure los servicios.",
    "ur": "مالک سے خدمات تیار کرنے کو کہیں۔"
  },
  "لا توجد أصناف مطابقة. جرّب البحث أو التصنيف الآخر، أو أضف الأسعار من الخدمات والأسعار.": {
    "en": "No matching items. Try another search or category, or add prices in Services and pricing.",
    "zh-CN": "没有匹配商品，请更改搜索或分类，或在服务与价格中添加价格。",
    "es": "No hay coincidencias. Prueba otra búsqueda o categoría o añade precios en Servicios y precios.",
    "ur": "کوئی موزوں صنف نہیں۔ تلاش یا قسم بدلیں، یا خدمات اور قیمتوں میں قیمتیں شامل کریں۔"
  },
  "سعر المستعجل غير محدد": {
    "en": "Rush price not set",
    "zh-CN": "未设置加急价格",
    "es": "Precio urgente sin definir",
    "ur": "فوری قیمت مقرر نہیں"
  },
  "العودة إلى الأصناف": {
    "en": "Back to items",
    "zh-CN": "返回商品",
    "es": "Volver a artículos",
    "ur": "اشیا پر واپس جائیں"
  },
  "تفاصيل الطلب": {
    "en": "Order details",
    "zh-CN": "订单详情",
    "es": "Detalles del pedido",
    "ur": "آرڈر کی تفصیلات"
  },
  "وحدة": {
    "en": "unit",
    "zh-CN": "单位",
    "es": "unidad",
    "ur": "اکائی"
  },
  "حدد سعر المستعجل أو اختر عادي": {
    "en": "Set a rush price or choose standard",
    "zh-CN": "设置加急价或选择普通服务",
    "es": "Define precio urgente o elige normal",
    "ur": "فوری قیمت مقرر کریں یا عام خدمت چنیں"
  },
  "اختر الخدمات لإضافتها إلى الطلب.": {
    "en": "Choose services to add to the order.",
    "zh-CN": "选择要加入订单的服务。",
    "es": "Elige servicios para añadir al pedido.",
    "ur": "آرڈر میں شامل کرنے کے لیے خدمات چنیں۔"
  },
  "نوع الخدمة:": {
    "en": "Service type:",
    "zh-CN": "服务类型：",
    "es": "Tipo de servicio:",
    "ur": "خدمت کی قسم:"
  },
  "· تغييره من أعلى المنيو": {
    "en": "· Change it above the menu",
    "zh-CN": "· 可在菜单上方更改",
    "es": "· Cámbialo encima del menú",
    "ur": "· اسے مینو کے اوپر بدلیں"
  },
  "بعض أصناف السلة دون سعر مستعجل. حدد أسعارها من الخدمات والأسعار، أو ارجع للوضع العادي قبل حفظ الطلب.": {
    "en": "Some cart items have no rush price. Set prices in Services and pricing or switch to standard before saving.",
    "zh-CN": "部分购物车商品没有加急价。请先设置价格，或切换普通服务后保存。",
    "es": "Algunos artículos no tienen precio urgente. Defínelo o vuelve al modo normal antes de guardar.",
    "ur": "کچھ اشیا کی فوری قیمت نہیں۔ قیمتیں مقرر کریں یا محفوظ کرنے سے پہلے عام طریقہ چنیں۔"
  },
  "وافق العميل على إشعار واتساب عند جاهزية هذا الطلب للاستلام": {
    "en": "Customer agreed to a WhatsApp notice when this order is ready for pickup",
    "zh-CN": "客户同意在本订单可取件时接收 WhatsApp 通知",
    "es": "El cliente acepta el aviso por WhatsApp cuando este pedido esté listo",
    "ur": "گاہک اس آرڈر کی تیاری پر واٹس ایپ اطلاع سے متفق ہے"
  },
  "وافق العميل على تذكير استلام هذا الطلب وتذكير المبلغ المتبقي عند الجاهزية": {
    "en": "Customer agreed to pickup and outstanding-payment reminders when this order is ready",
    "zh-CN": "客户同意在订单就绪时接收取件和未付款提醒",
    "es": "El cliente acepta recordatorios de recogida y saldo pendiente al estar listo",
    "ur": "گاہک تیاری پر اس آرڈر کی وصولی اور باقی ادائیگی کی یاد دہانیوں سے متفق ہے"
  },
  "وافق العميل على رسالة تطلب تقييم خدمة هذا الطلب بعد التسليم": {
    "en": "Customer agreed to a service review request after this order is delivered",
    "zh-CN": "客户同意在订单交付后接收服务评价请求",
    "es": "El cliente acepta una solicitud de valoración tras la entrega",
    "ur": "گاہک آرڈر پہنچنے کے بعد خدمت کے جائزے کی درخواست سے متفق ہے"
  },
  "ملاحظات الطلب": {
    "en": "Order notes",
    "zh-CN": "订单备注",
    "es": "Notas del pedido",
    "ur": "آرڈر کے نوٹس"
  },
  "لون القطعة، بقعة، تعليمات خاصة…": {
    "en": "Item color, stain, special instructions…",
    "zh-CN": "衣物颜色、污渍、特殊要求…",
    "es": "Color, mancha, instrucciones especiales…",
    "ur": "رنگ، داغ، خصوصی ہدایات…"
  },
  "تفاصيل الطلب وتعليمات العميل…": {
    "en": "Order details and customer instructions…",
    "zh-CN": "订单详情与客户要求…",
    "es": "Detalles e instrucciones del cliente…",
    "ur": "آرڈر کی تفصیلات اور گاہک کی ہدایات…"
  },
  "الإجمالي بأسعار القائمة": {
    "en": "Total at menu prices",
    "zh-CN": "按价目表计算的总额",
    "es": "Total según los precios de lista",
    "ur": "مینو کی قیمتوں کے مطابق کل"
  },
  "التسعير غير مكتمل": {
    "en": "Pricing incomplete",
    "zh-CN": "定价未完成",
    "es": "Precios incompletos",
    "ur": "قیمتیں نامکمل ہیں"
  },
  "المبالغ حسب أسعار خدماتك. المنشأة غير مسجلة في ضريبة القيمة المضافة؛ لا تُحتسب ضريبة.": {
    "en": "Amounts follow your service prices. The business is not VAT registered; VAT is not charged.",
    "zh-CN": "金额按服务价格计算。企业未登记增值税，不计收增值税。",
    "es": "Importes según tus precios. El negocio no está registrado en IVA; no se calcula este impuesto.",
    "ur": "رقوم آپ کی خدمت کی قیمتوں کے مطابق ہیں۔ کاروبار VAT میں رجسٹرڈ نہیں؛ ٹیکس نہیں لیا جاتا۔"
  },
  "هذا المسار يسجّل الطلبات والتحصيل دون احتساب الضريبة، ولا يصدر فاتورة ضريبية. إعداد الفوترة الضريبية مستقل عن نوع النشاط.": {
    "en": "This workflow records orders and payments without tax and does not issue tax invoices. Tax invoicing requires separate setup, regardless of business activity.",
    "zh-CN": "此流程登记不含税的订单与收款，不开具税务发票。税务开票需单独设置，与业务类型无关。",
    "es": "Este flujo registra pedidos y cobros sin impuestos y no emite facturas fiscales. La facturación fiscal requiere configuración independiente de la actividad.",
    "ur": "یہ طریقہ بغیر ٹیکس آرڈرز اور وصولیاں درج کرتا ہے، ٹیکس بل نہیں بناتا۔ ٹیکس بلنگ کی تیاری کاروباری نوعیت سے الگ ہے۔"
  },
  "تسجيل الشبكة لا ينفّذ دفعًا إلكترونيًا.": {
    "en": "Recording a card payment does not execute an electronic payment.",
    "zh-CN": "登记刷卡收款不会执行电子支付。",
    "es": "Registrar un pago con tarjeta no ejecuta el pago electrónico.",
    "ur": "کارڈ ادائیگی درج کرنے سے الیکٹرانک ادائیگی نہیں ہوتی۔"
  },
  "حفظ الطلب وإصدار المستند": {
    "en": "Save order and issue document",
    "zh-CN": "保存订单并生成单据",
    "es": "Guardar pedido y emitir documento",
    "ur": "آرڈر محفوظ اور دستاویز جاری کریں"
  },
  "مراجعة الطلب ·": {
    "en": "Review order ·",
    "zh-CN": "检查订单 ·",
    "es": "Revisar pedido ·",
    "ur": "آرڈر کا جائزہ ·"
  },
  "راجع أسعار المستعجل": {
    "en": "Review rush prices",
    "zh-CN": "检查加急价格",
    "es": "Revisar precios urgentes",
    "ur": "فوری قیمتیں دیکھیں"
  },
  "سجل الطلبات": {
    "en": "Order history",
    "zh-CN": "订单记录",
    "es": "Historial de pedidos",
    "ur": "آرڈرز کا ریکارڈ"
  },
  "آخر 100 نتيجة": {
    "en": "Latest 100 results",
    "zh-CN": "最新 100 条结果",
    "es": "Últimos 100 resultados",
    "ur": "تازہ ترین 100 نتائج"
  },
  "اسم العميل، الجوال أو رقم الطلب": {
    "en": "Customer name, mobile or order number",
    "zh-CN": "客户姓名、手机或订单号",
    "es": "Nombre, móvil o número de pedido",
    "ur": "گاہک کا نام، موبائل یا آرڈر نمبر"
  },
  "البحث في الطلبات": {
    "en": "Search orders",
    "zh-CN": "搜索订单",
    "es": "Buscar pedidos",
    "ur": "آرڈرز تلاش کریں"
  },
  "بحث": {
    "en": "Search",
    "zh-CN": "搜索",
    "es": "Buscar",
    "ur": "تلاش"
  },
  "الطلب / العميل": {
    "en": "Order / customer",
    "zh-CN": "订单 / 客户",
    "es": "Pedido / cliente",
    "ur": "آرڈر / گاہک"
  },
  "التسليم المتوقع": {
    "en": "Expected delivery",
    "zh-CN": "预计交付",
    "es": "Entrega prevista",
    "ur": "متوقع ڈیلیوری"
  },
  "الإجمالي / المتبقي": {
    "en": "Total / remaining",
    "zh-CN": "总额 / 余额",
    "es": "Total / pendiente",
    "ur": "کل / باقی"
  },
  "الإجراء": {
    "en": "Action",
    "zh-CN": "操作",
    "es": "Acción",
    "ur": "عمل"
  },
  "موعد التسليم": {
    "en": "Delivery appointment",
    "zh-CN": "交付时间",
    "es": "Fecha de entrega",
    "ur": "ڈیلیوری کا موعد"
  },
  "نوع الخدمة": {
    "en": "Service type",
    "zh-CN": "服务类型",
    "es": "Tipo de servicio",
    "ur": "خدمت کی قسم"
  },
  "المتبقي": {
    "en": "Remaining",
    "zh-CN": "余额",
    "es": "Pendiente",
    "ur": "باقی"
  },
  "التفاصيل والفاتورة": {
    "en": "Details and invoice",
    "zh-CN": "详情与发票",
    "es": "Detalles y factura",
    "ur": "تفصیلات اور بل"
  },
  "لا توجد طلبات مطابقة بعد": {
    "en": "No matching orders yet",
    "zh-CN": "暂无匹配订单",
    "es": "Todavía no hay pedidos coincidentes",
    "ur": "ابھی کوئی موزوں آرڈر نہیں"
  },
  "الطلبات التي تحفظها ستظهر هنا مع حالة التجهيز والتحصيل.": {
    "en": "Saved orders appear here with preparation and payment status.",
    "zh-CN": "保存的订单将显示处理及收款状态。",
    "es": "Los pedidos guardados aparecen con su preparación y cobro.",
    "ur": "محفوظ آرڈر یہاں تیاری اور وصولی کی حالت کے ساتھ دکھیں گے۔"
  },
  "دليل خدمات المغسلة": {
    "en": "Laundry service catalog",
    "zh-CN": "洗衣服务目录",
    "es": "Catálogo de lavandería",
    "ur": "لانڈری خدمات کی فہرست"
  },
  "الأصناف والخدمات": {
    "en": "Items and services",
    "zh-CN": "商品与服务",
    "es": "Artículos y servicios",
    "ur": "اشیا اور خدمات"
  },
  "الأسعار محفوظة لكل منشأة بشكل مستقل": {
    "en": "Prices are saved independently for each business",
    "zh-CN": "每家企业的价格独立保存",
    "es": "Los precios se guardan por negocio",
    "ur": "ہر کاروبار کی قیمتیں الگ محفوظ ہیں"
  },
  "اسم الصنف": {
    "en": "Item name",
    "zh-CN": "商品名称",
    "es": "Nombre del artículo",
    "ur": "صنف کا نام"
  },
  "ثوب": {
    "en": "Thobe",
    "zh-CN": "长袍",
    "es": "Túnica",
    "ur": "ثوب"
  },
  "اسم المنتج أو الخدمة": {
    "en": "Product or service name",
    "zh-CN": "产品或服务名称",
    "es": "Nombre de producto o servicio",
    "ur": "مصنوعہ یا خدمت کا نام"
  },
  "التصنيف": {
    "en": "Category",
    "zh-CN": "分类",
    "es": "Categoría",
    "ur": "قسم"
  },
  "ملابس رجالية": {
    "en": "Men's clothing",
    "zh-CN": "男装",
    "es": "Ropa de hombre",
    "ur": "مردانہ کپڑے"
  },
  "سعر غسيل وكوي": {
    "en": "Wash and iron price",
    "zh-CN": "洗涤熨烫价格",
    "es": "Precio de lavado y planchado",
    "ur": "دھلائی اور استری کی قیمت"
  },
  "سعر كوي فقط": {
    "en": "Iron-only price",
    "zh-CN": "仅熨烫价格",
    "es": "Precio de solo planchado",
    "ur": "صرف استری کی قیمت"
  },
  "السعر بالريال": {
    "en": "Price in SAR",
    "zh-CN": "价格（沙特里亚尔）",
    "es": "Precio en SAR",
    "ur": "قیمت ریال میں"
  },
  "إضافة الصنف": {
    "en": "Add item",
    "zh-CN": "添加商品",
    "es": "Añadir artículo",
    "ur": "صنف شامل کریں"
  },
  "إيقاف الخدمة للطلبات الجديدة؟ الطلبات السابقة تبقى محفوظة.": {
    "en": "Disable this service for new orders? Previous orders remain saved.",
    "zh-CN": "停止为新订单提供此服务？历史订单将保留。",
    "es": "¿Desactivar para pedidos nuevos? Los anteriores se conservan.",
    "ur": "نئے آرڈرز کے لیے خدمت بند کریں؟ سابق آرڈرز محفوظ رہیں گے۔"
  },
  "إيقاف": {
    "en": "Disable",
    "zh-CN": "停用",
    "es": "Desactivar",
    "ur": "بند کریں"
  },
  "لتغيير سعر خدمة: أوقفها وأضف النسخة الجديدة. تحتفظ الطلبات السابقة بأسمائها وأسعارها عند الاستلام.": {
    "en": "To change a service price, disable it and add a new version. Previous orders keep the names and prices recorded when received.",
    "zh-CN": "修改价格时，请停用旧服务并新增版本。历史订单保留接收时的名称和价格。",
    "es": "Para cambiar el precio, desactiva y añade una versión nueva. Los pedidos anteriores conservan nombres y precios originales.",
    "ur": "قیمت بدلنے کے لیے خدمت بند کرکے نیا نسخہ شامل کریں۔ پرانے آرڈر وصولی کے نام اور قیمتیں برقرار رکھتے ہیں۔"
  },
  "التحصيل والمصروفات": {
    "en": "Collections and expenses",
    "zh-CN": "收款与费用",
    "es": "Cobros y gastos",
    "ur": "وصولیاں اور اخراجات"
  },
  "ملخص تشغيلي · جميع الفترات": {
    "en": "Operational summary · All periods",
    "zh-CN": "运营摘要 · 所有期间",
    "es": "Resumen operativo · Todos los periodos",
    "ur": "عملی خلاصہ · تمام ادوار"
  },
  "المحصّل": {
    "en": "Collected",
    "zh-CN": "已收款",
    "es": "Cobrado",
    "ur": "وصول شدہ"
  },
  "المصروفات المسجلة": {
    "en": "Recorded expenses",
    "zh-CN": "已登记费用",
    "es": "Gastos registrados",
    "ur": "درج شدہ اخراجات"
  },
  "صافي التحصيل بعد المصروفات": {
    "en": "Net collections after expenses",
    "zh-CN": "扣除费用后的净收款",
    "es": "Cobros netos tras gastos",
    "ur": "اخراجات کے بعد خالص وصولی"
  },
  "يشمل تحصيل الطلبات المباشر والمصروفات فقط؛ شراء الاشتراكات واستردادها ودفعات الموردين في سجلاتها والدفتر. هذا ملخص نقدي تشغيلي، وليس قائمة أرباح أو دفتر محاسبة معتمدًا. لا تُحتسب ضريبة قيمة مضافة، وتُسجّل مدفوعات الشبكة والتحويل يدويًا.": {
    "en": "Includes direct order collections and expenses only. Subscription purchases/refunds and supplier payments are in their own records and the ledger. This is an operational cash summary, not a profit statement or approved accounting ledger. No VAT is calculated; card and transfer payments are recorded manually.",
    "zh-CN": "仅包含订单直接收款与费用。订阅购买、退款及供应商付款在各自记录和账簿中。此为运营现金摘要，并非利润表或正式会计账簿。不计算增值税；刷卡及转账收款手动登记。",
    "es": "Incluye solo cobros directos y gastos. Las compras y reembolsos de suscripciones y pagos a proveedores están en sus registros y libro. Es un resumen operativo de efectivo, no un estado de resultados ni un libro contable aprobado. Sin IVA; tarjetas y transferencias se registran manualmente.",
    "ur": "صرف آرڈرز کی براہِ راست وصولی اور اخراجات شامل ہیں۔ اشتراک کی خرید، واپسی اور سپلائر ادائیگیاں اپنے ریکارڈ اور کھاتے میں ہیں۔ یہ نقد عملی خلاصہ ہے، منافع کی رپورٹ یا منظور شدہ حسابی کھاتہ نہیں۔ VAT نہیں لگتا؛ کارڈ اور منتقلی دستی درج ہیں۔"
  },
  "تسجيل مصروف": {
    "en": "Record expense",
    "zh-CN": "登记费用",
    "es": "Registrar gasto",
    "ur": "اخراجات درج کریں"
  },
  "بيان المصروف": {
    "en": "Expense description",
    "zh-CN": "费用说明",
    "es": "Descripción del gasto",
    "ur": "اخراجات کی تفصیل"
  },
  "مواد تنظيف، تغليف…": {
    "en": "Cleaning supplies, packaging…",
    "zh-CN": "清洁用品、包装…",
    "es": "Limpieza, embalaje…",
    "ur": "صفائی کا سامان، پیکنگ…"
  },
  "المبلغ بالريال": {
    "en": "Amount in SAR",
    "zh-CN": "金额（沙特里亚尔）",
    "es": "Importe en SAR",
    "ur": "رقم ریال میں"
  },
  "مصدر دفع المصروف": {
    "en": "Expense payment source",
    "zh-CN": "费用支付来源",
    "es": "Origen del pago del gasto",
    "ur": "اخراجات کی ادائیگی کا ذریعہ"
  },
  "الصندوق": {
    "en": "Cash fund",
    "zh-CN": "现金箱",
    "es": "Caja",
    "ur": "نقد صندوق"
  },
  "تحويل مسجل": {
    "en": "Recorded transfer",
    "zh-CN": "已登记转账",
    "es": "Transferencia registrada",
    "ur": "درج شدہ منتقلی"
  },
  "غير محدد — يحتاج تسوية": {
    "en": "Unspecified — reconciliation needed",
    "zh-CN": "未指定 — 需要对账",
    "es": "Sin definir — requiere conciliación",
    "ur": "غیر مقرر — تطبیق درکار"
  },
  "تسجيل المصروف": {
    "en": "Save expense",
    "zh-CN": "保存费用",
    "es": "Guardar gasto",
    "ur": "اخراجات محفوظ کریں"
  },
  "آخر 50 مصروفًا": {
    "en": "Latest 50 expenses",
    "zh-CN": "最近 50 笔费用",
    "es": "Últimos 50 gastos",
    "ur": "تازہ ترین 50 اخراجات"
  },
  "تفاصيل طلب المغسلة": {
    "en": "Laundry order details",
    "zh-CN": "洗衣订单详情",
    "es": "Detalles del pedido de lavandería",
    "ur": "لانڈری آرڈر کی تفصیلات"
  },
  "تفاصيل طلب العميل": {
    "en": "Customer order details",
    "zh-CN": "客户订单详情",
    "es": "Detalles del pedido del cliente",
    "ur": "گاہک کے آرڈر کی تفصیلات"
  },
  "مقاس الطباعة": {
    "en": "Paper size",
    "zh-CN": "打印纸张大小",
    "es": "Tamaño de impresión",
    "ur": "پرنٹ کا سائز"
  },
  "حراري 80 مم": {
    "en": "80 mm thermal",
    "zh-CN": "80 毫米热敏纸",
    "es": "Térmico de 80 mm",
    "ur": "80 ملی میٹر تھرمل"
  },
  "طباعة": {
    "en": "Print",
    "zh-CN": "打印",
    "es": "Imprimir",
    "ur": "پرنٹ کریں"
  },
  "اختر ورق 80 مم في إعدادات الطابعة، والمقياس 100٪، وأوقف رؤوس وتذييلات المتصفح.": {
    "en": "Select 80 mm paper, 100% scale and disable browser headers and footers.",
    "zh-CN": "选择 80 毫米纸张、100% 缩放，并关闭浏览器页眉页脚。",
    "es": "Elige papel de 80 mm, escala 100% y desactiva encabezados y pies del navegador.",
    "ur": "80 ملی میٹر کاغذ، 100٪ پیمانہ منتخب کریں اور براؤزر کے سرنامے و اختتامی متن بند کریں۔"
  },
  "اختر ورق A4، والمقياس 100٪، وأوقف رؤوس وتذييلات المتصفح.": {
    "en": "Select A4 paper, 100% scale and disable browser headers and footers.",
    "zh-CN": "选择 A4 纸张、100% 缩放，并关闭浏览器页眉页脚。",
    "es": "Elige A4, escala 100% y desactiva encabezados y pies del navegador.",
    "ur": "A4 کاغذ، 100٪ پیمانہ منتخب کریں اور براؤزر کے سرنامے و اختتامی متن بند کریں۔"
  },
  "شعار المنشأة في الفاتورة": {
    "en": "Business logo on invoice",
    "zh-CN": "发票上的企业标志",
    "es": "Logotipo en la factura",
    "ur": "بل پر کاروبار کا لوگو"
  },
  "فاتورة": {
    "en": "Invoice",
    "zh-CN": "发票",
    "es": "Factura",
    "ur": "بل"
  },
  "رقم الطلب #": {
    "en": "Order #",
    "zh-CN": "订单号 #",
    "es": "Pedido #",
    "ur": "آرڈر #"
  },
  "التسليم المتوقع:": {
    "en": "Expected delivery:",
    "zh-CN": "预计交付：",
    "es": "Entrega prevista:",
    "ur": "متوقع ڈیلیوری:"
  },
  "الحالة:": {
    "en": "Status:",
    "zh-CN": "状态：",
    "es": "Estado:",
    "ur": "حالت:"
  },
  "الكمية": {
    "en": "Quantity",
    "zh-CN": "数量",
    "es": "Cantidad",
    "ur": "تعداد"
  },
  "السعر": {
    "en": "Price",
    "zh-CN": "价格",
    "es": "Precio",
    "ur": "قیمت"
  },
  "المجموع": {
    "en": "Subtotal",
    "zh-CN": "小计",
    "es": "Subtotal",
    "ur": "ذیلی کل"
  },
  "الإجمالي": {
    "en": "Total",
    "zh-CN": "合计",
    "es": "Total",
    "ur": "کل"
  },
  "المدفوع:": {
    "en": "Paid:",
    "zh-CN": "已付：",
    "es": "Pagado:",
    "ur": "ادا شدہ:"
  },
  "تفصيل الدفعات": {
    "en": "Payment breakdown",
    "zh-CN": "付款明细",
    "es": "Desglose de pagos",
    "ur": "ادائیگی کی تفصیل"
  },
  "المتبقي على الفاتورة:": {
    "en": "Outstanding invoice balance:",
    "zh-CN": "发票未付余额：",
    "es": "Saldo pendiente de factura:",
    "ur": "بل کی باقی رقم:"
  },
  "رصيد الاشتراك المتبقي": {
    "en": "Remaining subscription balance",
    "zh-CN": "订阅剩余余额",
    "es": "Saldo de suscripción restante",
    "ur": "اشتراک کا باقی بیلنس"
  },
  "تفاصيل رصيد الاشتراك": {
    "en": "Subscription balance details",
    "zh-CN": "订阅余额详情",
    "es": "Detalles del saldo de suscripción",
    "ur": "اشتراک کے بیلنس کی تفصیل"
  },
  "رصيد الاشتراك الأصلي:": {
    "en": "Original subscription balance:",
    "zh-CN": "原始订阅余额：",
    "es": "Saldo original de suscripción:",
    "ur": "اشتراک کا اصل بیلنس:"
  },
  "المستخدم من الاشتراك في هذه الفاتورة:": {
    "en": "Subscription used on this invoice:",
    "zh-CN": "本发票使用的订阅金额：",
    "es": "Suscripción usada en esta factura:",
    "ur": "اس بل میں استعمال شدہ اشتراک:"
  },
  "رصيد الاشتراك المتبقي بعد هذه الفاتورة:": {
    "en": "Subscription balance after this invoice:",
    "zh-CN": "本发票后的订阅余额：",
    "es": "Saldo tras esta factura:",
    "ur": "اس بل کے بعد اشتراک کا باقی بیلنس:"
  },
  "الوحدات المتبقية:": {
    "en": "Remaining units:",
    "zh-CN": "剩余数量：",
    "es": "Unidades restantes:",
    "ur": "باقی اکائیاں:"
  },
  "قطعة": {
    "en": "item",
    "zh-CN": "件",
    "es": "artículo",
    "ur": "صنف"
  },
  "زيارة": {
    "en": "visit",
    "zh-CN": "次",
    "es": "visita",
    "ur": "دورہ"
  },
  "الرصيد عند إصدار الفاتورة أو آخر سداد من الاشتراك لها؛ لا يشمل العمليات اللاحقة.": {
    "en": "Balance at invoice issue or the latest subscription payment for this invoice; later transactions are excluded.",
    "zh-CN": "余额以开票时或本发票最近一次订阅付款时为准，不含之后的交易。",
    "es": "Saldo al emitir la factura o en su último pago con suscripción; no incluye operaciones posteriores.",
    "ur": "بل کے اجرا یا اس کی آخری اشتراکی ادائیگی کا بیلنس؛ بعد کی کارروائیاں شامل نہیں۔"
  },
  "ملاحظات:": {
    "en": "Notes:",
    "zh-CN": "备注：",
    "es": "Notas:",
    "ur": "نوٹس:"
  },
  "تسجيل الدفعة": {
    "en": "Record payment",
    "zh-CN": "登记付款",
    "es": "Registrar pago",
    "ur": "ادائیگی درج کریں"
  },
  "المرحلة التالية:": {
    "en": "Next stage:",
    "zh-CN": "下一阶段：",
    "es": "Siguiente etapa:",
    "ur": "اگلا مرحلہ:"
  },
  "الإدارة المالية": {
    "en": "Financial management",
    "zh-CN": "财务管理",
    "es": "Gestión financiera",
    "ur": "مالی انتظام"
  },
  "إشراف المغسلة": {
    "en": "Laundry supervision",
    "zh-CN": "洗衣店运营监督",
    "es": "Supervisión de lavandería",
    "ur": "لانڈری کی نگرانی"
  },
  "محاسبة المغسلة": {
    "en": "Laundry accounting",
    "zh-CN": "洗衣店会计",
    "es": "Contabilidad de lavandería",
    "ur": "لانڈری کے حسابات"
  },
  "الكاشير": {
    "en": "POS",
    "zh-CN": "收银",
    "es": "Caja",
    "ur": "کیشئر"
  },
  "الطلبات والتسليم": {
    "en": "Orders and delivery",
    "zh-CN": "订单与交付",
    "es": "Pedidos y entregas",
    "ur": "آرڈرز اور ڈیلیوری"
  },
  "المخزون والجرد": {
    "en": "Inventory and stocktaking",
    "zh-CN": "库存与盘点",
    "es": "Inventario y recuento",
    "ur": "اسٹاک اور گنتی"
  },
  "دفتر المحاسبة": {
    "en": "Accounting ledger",
    "zh-CN": "会计账簿",
    "es": "Libro contable",
    "ur": "حسابات کا کھاتہ"
  },
  "الموردون والمشتريات": {
    "en": "Suppliers and purchases",
    "zh-CN": "供应商与采购",
    "es": "Proveedores y compras",
    "ur": "سپلائرز اور خریداری"
  },
  "اشتراكات العملاء": {
    "en": "Customer subscriptions",
    "zh-CN": "客户订阅",
    "es": "Suscripciones de clientes",
    "ur": "گاہکوں کے اشتراک"
  },
  "العقود والتوقيع": {
    "en": "Contracts and signing",
    "zh-CN": "合同与签署",
    "es": "Contratos y firma",
    "ur": "معاہدے اور دستخط"
  },
  "التسوية البنكية": {
    "en": "Bank reconciliation",
    "zh-CN": "银行对账",
    "es": "Conciliación bancaria",
    "ur": "بینک تطبیق"
  },
  "إعداد المنشأة": {
    "en": "Business setup",
    "zh-CN": "企业设置",
    "es": "Configuración del negocio",
    "ur": "کاروبار کی تیاری"
  },
  "الخدمات والأسعار": {
    "en": "Services and pricing",
    "zh-CN": "服务与价格",
    "es": "Servicios y precios",
    "ur": "خدمات اور قیمتیں"
  },
  "الشعار وبيانات الفواتير": {
    "en": "Logo and invoice details",
    "zh-CN": "标志与发票资料",
    "es": "Logotipo y datos de facturas",
    "ur": "لوگو اور بل کی تفصیلات"
  },
  "أقسام البرنامج": {
    "en": "Program sections",
    "zh-CN": "程序栏目",
    "es": "Secciones del programa",
    "ur": "پروگرام کے حصے"
  },
  "إغلاق قائمة الأقسام": {
    "en": "Close sections menu",
    "zh-CN": "关闭栏目菜单",
    "es": "Cerrar menú de secciones",
    "ur": "حصوں کا مینو بند کریں"
  },
  "فتح قائمة الأقسام": {
    "en": "Open sections menu",
    "zh-CN": "打开栏目菜单",
    "es": "Abrir menú de secciones",
    "ur": "حصوں کا مینو کھولیں"
  },
  "الأقسام": {
    "en": "Sections",
    "zh-CN": "栏目",
    "es": "Secciones",
    "ur": "حصے"
  },
  "طلب جديد": {
    "en": "New order",
    "zh-CN": "新订单",
    "es": "Pedido nuevo",
    "ur": "نیا آرڈر"
  },
  "التنقل بين أقسام البرنامج": {
    "en": "Program navigation",
    "zh-CN": "程序导航",
    "es": "Navegación del programa",
    "ur": "پروگرام کی نیویگیشن"
  },
  "البحث عن قسم": {
    "en": "Search sections",
    "zh-CN": "搜索栏目",
    "es": "Buscar sección",
    "ur": "حصہ تلاش کریں"
  },
  "ابحث عن قسم…": {
    "en": "Search a section…",
    "zh-CN": "搜索栏目…",
    "es": "Busca una sección…",
    "ur": "حصہ تلاش کریں…"
  },
  "الفريق والتواصل": {
    "en": "Team and communication",
    "zh-CN": "团队与沟通",
    "es": "Equipo y comunicación",
    "ur": "ٹیم اور رابطہ"
  },
  "إشعارات واتساب": {
    "en": "WhatsApp notifications",
    "zh-CN": "WhatsApp 通知",
    "es": "Avisos de WhatsApp",
    "ur": "واٹس ایپ اطلاعات"
  },
  "اختر من النتائج أو غيّر كلمة البحث.": {
    "en": "Choose a result or change your search.",
    "zh-CN": "选择结果或更改搜索。",
    "es": "Elige un resultado o cambia la búsqueda.",
    "ur": "نتیجہ چنیں یا تلاش بدلیں۔"
  },
  "دفعة إضافية": {
    "en": "Additional payment",
    "zh-CN": "追加付款",
    "es": "Pago adicional",
    "ur": "اضافی ادائیگی"
  },
  "الدفعة المستلمة": {
    "en": "Payment received",
    "zh-CN": "已收款项",
    "es": "Pago recibido",
    "ur": "وصول شدہ ادائیگی"
  },
  "الطريقة": {
    "en": "Method",
    "zh-CN": "方式",
    "es": "Método",
    "ur": "طریقہ"
  },
  "طريقة التحصيل": {
    "en": "Collection method",
    "zh-CN": "收款方式",
    "es": "Método de cobro",
    "ur": "وصولی کا طریقہ"
  },
  "نقدًا": {
    "en": "Cash",
    "zh-CN": "现金",
    "es": "Efectivo",
    "ur": "نقد"
  },
  "شبكة — تسجيل يدوي": {
    "en": "Card — manual record",
    "zh-CN": "银行卡 — 手动登记",
    "es": "Tarjeta — registro manual",
    "ur": "کارڈ — دستی اندراج"
  },
  "تحويل — تسجيل يدوي": {
    "en": "Transfer — manual record",
    "zh-CN": "转账 — 手动登记",
    "es": "Transferencia — registro manual",
    "ur": "منتقلی — دستی اندراج"
  },
  "نقدًا + شبكة — تسجيل يدوي": {
    "en": "Cash + card — manual record",
    "zh-CN": "现金 + 银行卡 — 手动登记",
    "es": "Efectivo + tarjeta — registro manual",
    "ur": "نقد + کارڈ — دستی اندراج"
  },
  "الجزء النقدي من الدفعة": {
    "en": "Cash part of payment",
    "zh-CN": "付款中的现金部分",
    "es": "Parte en efectivo",
    "ur": "ادائیگی کا نقد حصہ"
  },
  "يُسجّل باقي الدفعة كشبكة. أكّد نجاح الدفع على الجهاز قبل الحفظ؛ الربط التلقائي لم يُفعّل بعد.": {
    "en": "The rest is recorded as card payment. Confirm payment success on the terminal before saving; automatic integration is not active yet.",
    "zh-CN": "剩余部分登记为银行卡收款。保存前请确认终端支付成功，自动集成尚未启用。",
    "es": "El resto se registra como tarjeta. Confirma el éxito en el terminal antes de guardar; la integración automática aún no está activa.",
    "ur": "باقی حصہ کارڈ ادائیگی درج ہوگا۔ محفوظ کرنے سے پہلے مشین پر کامیاب ادائیگی کی تصدیق کریں؛ خودکار ربط ابھی فعال نہیں۔"
  },
  "متى يستلم العميل طلبه؟": {
    "en": "When will the customer pick up the order?",
    "zh-CN": "客户何时取件？",
    "es": "¿Cuándo recogerá el cliente?",
    "ur": "گاہک آرڈر کب وصول کرے گا؟"
  },
  "اختر موعدًا سريعًا أو حدد اليوم والوقت. جميع المواعيد بتوقيت الرياض.": {
    "en": "Choose a quick option or set the date and time. All times use Riyadh time.",
    "zh-CN": "选择快捷时间或指定日期和时间，均为利雅得时间。",
    "es": "Elige una opción rápida o fecha y hora. Se usa la hora de Riad.",
    "ur": "فوری انتخاب یا تاریخ اور وقت چنیں۔ تمام اوقات ریاض کے ہیں۔"
  },
  "بعد ساعتين": {
    "en": "In 2 hours",
    "zh-CN": "2 小时后",
    "es": "En 2 horas",
    "ur": "2 گھنٹے بعد"
  },
  "بعد 4 ساعات": {
    "en": "In 4 hours",
    "zh-CN": "4 小时后",
    "es": "En 4 horas",
    "ur": "4 گھنٹے بعد"
  },
  "غدًا في هذا الوقت": {
    "en": "Tomorrow at this time",
    "zh-CN": "明天此时",
    "es": "Mañana a esta hora",
    "ur": "کل اسی وقت"
  },
  "بعد يومين": {
    "en": "In 2 days",
    "zh-CN": "2 天后",
    "es": "En 2 días",
    "ur": "2 دن بعد"
  },
  "يوم التسليم": {
    "en": "Delivery date",
    "zh-CN": "交付日期",
    "es": "Día de entrega",
    "ur": "ڈیلیوری کی تاریخ"
  },
  "ساعة التسليم": {
    "en": "Delivery hour",
    "zh-CN": "交付小时",
    "es": "Hora de entrega",
    "ur": "ڈیلیوری کا گھنٹہ"
  },
  "الدقيقة": {
    "en": "Minute",
    "zh-CN": "分钟",
    "es": "Minuto",
    "ur": "منٹ"
  },
  "دقيقة التسليم": {
    "en": "Delivery minute",
    "zh-CN": "交付分钟",
    "es": "Minuto de entrega",
    "ur": "ڈیلیوری کا منٹ"
  },
  "الفترة": {
    "en": "AM / PM",
    "zh-CN": "上午 / 下午",
    "es": "AM / PM",
    "ur": "صبح / شام"
  },
  "فترة التسليم": {
    "en": "Delivery AM / PM",
    "zh-CN": "交付上午 / 下午",
    "es": "AM / PM de entrega",
    "ur": "ڈیلیوری صبح / شام"
  },
  "صباحًا": {
    "en": "AM",
    "zh-CN": "上午",
    "es": "AM",
    "ur": "صبح"
  },
  "مساءً": {
    "en": "PM",
    "zh-CN": "下午",
    "es": "PM",
    "ur": "شام"
  },
  "موعد التسليم:": {
    "en": "Delivery appointment:",
    "zh-CN": "交付时间：",
    "es": "Fecha de entrega:",
    "ur": "ڈیلیوری کا موعد:"
  },
  "لم يُحدد موعد بعد. اضغط أحد الخيارات أو اختر يوم التسليم.": {
    "en": "No appointment selected. Choose a quick option or a delivery date.",
    "zh-CN": "尚未选择时间，请使用快捷选项或选择交付日期。",
    "es": "No hay fecha. Elige una opción rápida o un día de entrega.",
    "ur": "ابھی موعد منتخب نہیں۔ فوری انتخاب یا ڈیلیوری کی تاریخ چنیں۔"
  },
  "راجع التاريخ": {
    "en": "Check date",
    "zh-CN": "检查日期",
    "es": "Revisa la fecha",
    "ur": "تاریخ دیکھیں"
  },
  "بداية الاشتراك ومدته": {
    "en": "Subscription start and duration",
    "zh-CN": "订阅开始与时长",
    "es": "Inicio y duración de suscripción",
    "ur": "اشتراک کا آغاز اور مدت"
  },
  "تاريخ البداية": {
    "en": "Start date",
    "zh-CN": "开始日期",
    "es": "Fecha de inicio",
    "ur": "آغاز کی تاریخ"
  },
  "تاريخ بداية الاشتراك": {
    "en": "Subscription start date",
    "zh-CN": "订阅开始日期",
    "es": "Fecha inicial de suscripción",
    "ur": "اشتراک کی ابتدائی تاریخ"
  },
  "مدة الاشتراك": {
    "en": "Subscription duration",
    "zh-CN": "订阅时长",
    "es": "Duración de suscripción",
    "ur": "اشتراک کی مدت"
  },
  "مدة الباقة الأصلية ·": {
    "en": "Original package duration ·",
    "zh-CN": "原套餐时长 ·",
    "es": "Duración original del paquete ·",
    "ur": "اصل پیکیج کی مدت ·"
  },
  "يوم": {
    "en": "days",
    "zh-CN": "天",
    "es": "días",
    "ur": "دن"
  },
  "تاريخ نهاية مخصص": {
    "en": "Custom end date",
    "zh-CN": "自定义结束日期",
    "es": "Fin personalizado",
    "ur": "اختیاری آخری تاریخ"
  },
  "آخر يوم للاستخدام": {
    "en": "Last usable day",
    "zh-CN": "最后可用日期",
    "es": "Último día de uso",
    "ur": "استعمال کا آخری دن"
  },
  "يبدأ:": {
    "en": "Starts:",
    "zh-CN": "开始：",
    "es": "Empieza:",
    "ur": "آغاز:"
  },
  "ينتهي:": {
    "en": "Ends:",
    "zh-CN": "结束：",
    "es": "Termina:",
    "ur": "اختتام:"
  },
  "تُحسب الأشهر تقويميًا تلقائيًا، مع مراعاة فبراير ونهاية الشهر. ينتهي الاستخدام عند الموعد الموضح أعلاه.": {
    "en": "Calendar months are calculated automatically, including February and month ends. Use expires at the time shown above.",
    "zh-CN": "自动按自然月计算，考虑二月及月末情况，使用权限在上方时间到期。",
    "es": "Se calculan meses naturales, incluidos febrero y fin de mes. El uso vence en la fecha indicada.",
    "ur": "فروری اور مہینے کے اختتام سمیت تقویمی مہینے خودکار شمار ہوتے ہیں۔ استعمال اوپر دکھائے وقت ختم ہوگا۔"
  },
  "تعذر قراءة الاشتراكات": {
    "en": "Couldn't read subscriptions",
    "zh-CN": "无法读取订阅",
    "es": "No se pudieron leer las suscripciones",
    "ur": "اشتراک پڑھنے میں ناکامی"
  },
  "راجع الطلب": {
    "en": "Review order",
    "zh-CN": "检查订单",
    "es": "Revisar pedido",
    "ur": "آرڈر دیکھیں"
  },
  "اشتراكات العميل في الكاشير": {
    "en": "Customer subscriptions at POS",
    "zh-CN": "收银中的客户订阅",
    "es": "Suscripciones en caja",
    "ur": "کیشئر میں گاہکوں کے اشتراک"
  },
  "استخدام رصيد اشتراك العميل تلقائيًا": {
    "en": "Use the customer's subscription balance automatically",
    "zh-CN": "自动使用客户订阅余额",
    "es": "Usar el saldo de suscripción automáticamente",
    "ur": "گاہک کا اشتراکی بیلنس خودکار استعمال کریں"
  },
  "أدخل جوال العميل للتعرف على باقاته ورصيدها.": {
    "en": "Enter the customer's mobile to find packages and balances.",
    "zh-CN": "输入客户手机号以查找套餐和余额。",
    "es": "Introduce el móvil para consultar paquetes y saldos.",
    "ur": "پیکیجز اور بیلنس جاننے کے لیے گاہک کا موبائل لکھیں۔"
  },
  "إعادة قراءة الرصيد": {
    "en": "Refresh balance",
    "zh-CN": "刷新余额",
    "es": "Actualizar saldo",
    "ur": "بیلنس تازہ کریں"
  },
  "جارٍ قراءة اشتراكات العميل…": {
    "en": "Reading customer subscriptions…",
    "zh-CN": "正在读取客户订阅…",
    "es": "Leyendo suscripciones…",
    "ur": "گاہک کے اشتراک پڑھے جا رہے ہیں…"
  },
  "· المتبقي": {
    "en": "· Remaining",
    "zh-CN": "· 剩余",
    "es": "· Restante",
    "ur": "· باقی"
  },
  "· حتى": {
    "en": "· Until",
    "zh-CN": "· 截至",
    "es": "· Hasta",
    "ur": "· تک"
  },
  "إجمالي الطلب بعد تسعير الباقات:": {
    "en": "Order total after package pricing:",
    "zh-CN": "套餐计价后的订单总额：",
    "es": "Total tras aplicar paquetes:",
    "ur": "پیکیج کی قیمت کے بعد آرڈر کا کل:"
  },
  "المغطى من الاشتراكات:": {
    "en": "Covered by subscriptions:",
    "zh-CN": "订阅覆盖金额：",
    "es": "Cubierto por suscripciones:",
    "ur": "اشتراک سے ادا شدہ:"
  },
  "المتبقي على الطلب بعد الدفعة والاشتراك:": {
    "en": "Remaining order balance after payment and subscription:",
    "zh-CN": "付款及订阅抵扣后的订单余额：",
    "es": "Pendiente tras pago y suscripción:",
    "ur": "ادائیگی اور اشتراک کے بعد آرڈر کی باقی رقم:"
  },
  ": سيبقى": {
    "en": ": Remaining",
    "zh-CN": "：剩余",
    "es": ": Quedará",
    "ur": ": باقی رہے گا"
  },
  "بعد الحفظ": {
    "en": "after saving",
    "zh-CN": "保存后",
    "es": "después de guardar",
    "ur": "محفوظ کرنے کے بعد"
  },
  "لا يوجد رصيد اشتراك لهذا العميل في المنشأة.": {
    "en": "This customer has no subscription balance at this business.",
    "zh-CN": "此客户在本企业没有订阅余额。",
    "es": "El cliente no tiene saldo de suscripción en este negocio.",
    "ur": "اس کاروبار میں گاہک کا کوئی اشتراکی بیلنس نہیں۔"
  },
  "تحديث رصيد الاشتراكات": {
    "en": "Refresh subscription balances",
    "zh-CN": "刷新订阅余额",
    "es": "Actualizar saldos de suscripción",
    "ur": "اشتراک کے بیلنس تازہ کریں"
  },
  "يخصم العدد عند حفظ الطلب. كل كمية من الخدمة المحددة تستهلك قطعة أو زيارة واحدة؛ الزيارة ليست جميع أصناف الطلب. تُسعّر الوحدات المغطاة بحصتها من سعر الباقة": {
    "en": "Units are deducted when saving. Each quantity of the selected service uses one item or visit; a visit does not cover all order items. Covered units use their share of the package price",
    "zh-CN": "保存时扣减数量。所选服务的每个数量消耗一件或一次额度；一次并不覆盖订单的所有商品。覆盖数量按其套餐价格份额计价",
    "es": "Las unidades se descuentan al guardar. Cada cantidad del servicio consume un artículo o visita; una visita no cubre todo el pedido. Las unidades cubiertas usan su parte del precio del paquete",
    "ur": "محفوظ کرنے پر تعداد کم ہوتی ہے۔ منتخب خدمت کی ہر تعداد ایک صنف یا دورہ استعمال کرتی ہے؛ دورہ آرڈر کی تمام اشیا نہیں۔ شامل اکائیاں پیکیج کی قیمت کے حصے سے شمار ہوتی ہیں"
  },
  "، ويُحتسب فرق المستعجل للوحدات المغطاة بصورة مستقلة": {
    "en": ", and the rush surcharge on covered units is calculated separately",
    "zh-CN": "，加急差价另行计算",
    "es": ", y el suplemento urgente se calcula por separado",
    "ur": "، اور شامل اکائیوں کا فوری خدمت کا فرق الگ شمار ہوتا ہے"
  },
  "، ثم يطبّق الرصيد المالي على الخدمات المتبقية. الدفعة المستلمة أدناه مبلغ جديد فقط؛ لا تشمل رصيد الاشتراك.": {
    "en": ", then credit applies to remaining services. The payment below is new money only and excludes subscription credit.",
    "zh-CN": "，然后将余额用于剩余服务。下方收款仅为新增付款，不含订阅余额。",
    "es": ", después se aplica el saldo a los servicios restantes. El pago inferior es dinero nuevo; excluye el crédito de suscripción.",
    "ur": "، پھر مالی بیلنس باقی خدمات پر لگتا ہے۔ نیچے کی وصولی صرف نئی رقم ہے؛ اشتراک کا بیلنس شامل نہیں۔"
  },
  "خيارات الخدمة": {
    "en": "Service options",
    "zh-CN": "服务选项",
    "es": "Opciones de servicio",
    "ur": "خدمت کے اختیارات"
  },
  "فعّل العادي والمستعجل فقط إذا كانت منشأتك تقدم الخدمة بسرعتين. إيقاف الخيار يخفيه من المنيو والطلبات الجديدة ويحفظ أسعار وفواتير العمليات السابقة.": {
    "en": "Enable standard/rush only if you offer two speeds. Disabling hides it from the menu and new orders while preserving previous prices and invoices.",
    "zh-CN": "仅在提供两种速度时启用普通与加急。关闭后从菜单和新订单隐藏，但保留历史价格和发票。",
    "es": "Activa normal/urgente solo si ofreces ambas velocidades. Desactivar lo oculta sin alterar precios ni facturas anteriores.",
    "ur": "عام اور فوری صرف دو رفتاروں والی خدمت کے لیے فعال کریں۔ بند کرنے سے مینو اور نئے آرڈرز سے چھپتا ہے؛ سابق قیمتیں اور بل محفوظ رہتے ہیں۔"
  },
  "تفعيل عادي / مستعجل لهذا النشاط": {
    "en": "Enable standard / rush for this activity",
    "zh-CN": "为此业务启用普通 / 加急",
    "es": "Activar normal / urgente",
    "ur": "اس کاروبار کے لیے عام / فوری فعال کریں"
  },
  "أسعار المستعجل": {
    "en": "Rush service prices",
    "zh-CN": "加急服务价格",
    "es": "Precios de urgencia",
    "ur": "فوری خدمت کی قیمتیں"
  },
  "من": {
    "en": "From",
    "zh-CN": "从",
    "es": "Desde",
    "ur": "سے"
  },
  "خدمة مسعّرة": {
    "en": "priced services",
    "zh-CN": "项已定价服务",
    "es": "servicios con precio",
    "ur": "قیمت والی خدمات"
  },
  "حدد السعر النهائي للمستعجل لكل خدمة. يظهر السعر مباشرة في منيو المستعجل والسلة. اترك الحقل فارغًا وأحفظ لإيقاف المستعجل لهذه الخدمة. الفواتير السابقة تحتفظ بأسعارها.": {
    "en": "Set each service's final rush price. It appears in the menu and cart. Leave blank and save to disable rush for that service. Old invoices retain their prices.",
    "zh-CN": "设置各服务最终加急价，将显示于菜单和购物车。留空保存可停用该项加急服务，历史发票价格不变。",
    "es": "Define el precio urgente final. Se verá en menú y carrito. Deja vacío y guarda para desactivarlo. Las facturas anteriores conservan sus precios.",
    "ur": "ہر خدمت کی آخری فوری قیمت مقرر کریں، جو مینو اور سلة میں دکھے گی۔ خالی چھوڑ کر محفوظ کرنے سے اس خدمت کی فوری صورت بند ہوگی۔ سابق بلوں کی قیمتیں برقرار ہیں۔"
  },
  "ابحث عن خدمة لتسعير المستعجل": {
    "en": "Search a service for rush pricing",
    "zh-CN": "搜索要设置加急价的服务",
    "es": "Buscar servicio para precio urgente",
    "ur": "فوری قیمت کے لیے خدمت تلاش کریں"
  },
  "ثوب، بطانية، كوي…": {
    "en": "Thobe, blanket, ironing…",
    "zh-CN": "长袍、毯子、熨烫…",
    "es": "Túnica, manta, planchado…",
    "ur": "ثوب، کمبل، استری…"
  },
  "· العادي": {
    "en": "· Standard",
    "zh-CN": "· 普通",
    "es": "· Normal",
    "ur": "· عام"
  },
  "سعر المستعجل بالريال": {
    "en": "Rush price in SAR",
    "zh-CN": "加急价（沙特里亚尔）",
    "es": "Precio urgente en SAR",
    "ur": "فوری قیمت ریال میں"
  },
  "حفظ سعر المستعجل": {
    "en": "Save rush price",
    "zh-CN": "保存加急价",
    "es": "Guardar precio urgente",
    "ur": "فوری قیمت محفوظ کریں"
  },
  "أضف الخدمات أولًا، ثم حدد أسعار المستعجل هنا.": {
    "en": "Add services first, then set rush prices here.",
    "zh-CN": "请先添加服务，再设置加急价格。",
    "es": "Añade servicios primero y define aquí sus precios urgentes.",
    "ur": "پہلے خدمات شامل کریں، پھر یہاں فوری قیمتیں طے کریں۔"
  },
  "دليل أصناف المغسلة الجاهز": {
    "en": "Ready-made laundry item catalog",
    "zh-CN": "预设洗衣商品目录",
    "es": "Catálogo de prendas preparado",
    "ur": "تیار لانڈری اشیا کی فہرست"
  },
  "سعّر الصنف مرة واحدة: غسيل وكوي، وكوي فقط. اترك السعر فارغًا للخدمة التي لا تقدمها. الأسعار المحفوظة ظاهرة ولا تتغير عند إضافة الخدمة الأخرى.": {
    "en": "Price each item once for wash-and-iron and iron-only. Leave unsupported services blank. Saved prices remain visible and unchanged when adding the other service.",
    "zh-CN": "分别为洗涤熨烫及仅熨烫设置价格，不提供的服务留空。新增另一种服务不会改变已保存价格。",
    "es": "Define lavado/planchado y solo planchado una vez. Deja vacío lo que no ofreces. Añadir otra opción no cambia los precios guardados.",
    "ur": "ہر صنف کی دھلائی و استری اور صرف استری کی قیمت ایک بار دیں۔ غیر فراہم خدمت خالی رکھیں۔ دوسری خدمت شامل کرنے پر محفوظ قیمتیں نہیں بدلتیں۔"
  },
  "أدخل سعر خدمة واحدة على الأقل لإضافتها.": {
    "en": "Enter at least one service price to add the item.",
    "zh-CN": "至少填写一项服务价格才能添加商品。",
    "es": "Introduce al menos un precio para añadirlo.",
    "ur": "شامل کرنے کے لیے کم از کم ایک خدمت کی قیمت لکھیں۔"
  },
  "أصناف": {
    "en": "items",
    "zh-CN": "件商品",
    "es": "artículos",
    "ur": "اشیا"
  },
  "ر.س · مفعّلة": {
    "en": "SAR · Active",
    "zh-CN": "沙特里亚尔 · 已启用",
    "es": "SAR · Activa",
    "ur": "ریال · فعال"
  },
  "إضافة الأصناف المسعّرة إلى الكاشير": {
    "en": "Add priced items to POS",
    "zh-CN": "将已定价商品加入收银",
    "es": "Añadir artículos con precio a caja",
    "ur": "قیمت والی اشیا کیشئر میں شامل کریں"
  },
  "مساحة عمل منشأتك": {
    "en": "Your business workspace",
    "zh-CN": "企业工作空间",
    "es": "Espacio de tu negocio",
    "ur": "آپ کے کاروبار کی کام کی جگہ"
  },
  "الطلبات والفواتير وبيانات العملاء محمية بحساب المنشأة.": {
    "en": "Orders, invoices and customer data are protected by the business account.",
    "zh-CN": "订单、发票和客户资料受企业账户保护。",
    "es": "Pedidos, facturas y clientes están protegidos por la cuenta del negocio.",
    "ur": "آرڈر، بل اور گاہکوں کا ڈیٹا کاروباری اکاؤنٹ سے محفوظ ہے۔"
  },
  "بعد الدخول افتح": {
    "en": "After signing in, open",
    "zh-CN": "登录后打开",
    "es": "Después de entrar, abre",
    "ur": "لاگ ان کے بعد کھولیں"
  },
  "كاشير المنشأة": {
    "en": "Business POS",
    "zh-CN": "企业收银",
    "es": "Caja del negocio",
    "ur": "کاروبار کا کیشئر"
  },
  "تحتاج صلاحية كاشير المنشأة": {
    "en": "Business POS permission required",
    "zh-CN": "需要企业收银权限",
    "es": "Necesitas permiso de caja",
    "ur": "کاروبار کے کیشئر کی اجازت درکار ہے"
  },
  "اختر المنشأة من لوحة التحكم، أو اطلب من مالكها إتاحة قسم كاشير المنشأة لحسابك.": {
    "en": "Choose the business from the dashboard or ask its owner to grant POS access.",
    "zh-CN": "从控制面板选择企业，或请所有者授予收银权限。",
    "es": "Elige el negocio o pide al propietario acceso a caja.",
    "ur": "ڈیش بورڈ سے کاروبار چنیں یا مالک سے کیشئر کی اجازت لیں۔"
  },
  "العودة إلى لوحة التحكم": {
    "en": "Back to dashboard",
    "zh-CN": "返回控制面板",
    "es": "Volver al panel",
    "ur": "ڈیش بورڈ پر واپس جائیں"
  },
  "INFRO · البرنامج المحاسبي": {
    "en": "INFRO · Accounting software",
    "zh-CN": "INFRO · 会计软件",
    "es": "INFRO · Programa contable",
    "ur": "INFRO · حسابات کا سافٹ ویئر"
  },
  "سجّل الدخول واختر منشأتك للوصول إلى حساباتها.": {
    "en": "Sign in and choose your business to access its accounts.",
    "zh-CN": "登录并选择企业以访问账务。",
    "es": "Inicia sesión y elige el negocio para acceder a sus cuentas.",
    "ur": "حسابات تک رسائی کے لیے لاگ ان کریں اور اپنا کاروبار چنیں۔"
  },
  "اختيار المنشأة": {
    "en": "Choose business",
    "zh-CN": "选择企业",
    "es": "Elegir negocio",
    "ur": "کاروبار منتخب کریں"
  },
  "هذه الخدمات ضمن باقات التشغيل والنمو والشاملة. الهوية مجانية دون مواعيد أو كاشير.": {
    "en": "These services are included in Operations, Growth and Complete. Identity is free without appointments or POS.",
    "zh-CN": "这些服务包含于运营、成长和全能套餐。免费身份套餐不含预约或收银。",
    "es": "Incluidas en Operaciones, Crecimiento e Integral. Identidad es gratuita, sin citas ni caja.",
    "ur": "یہ خدمات آپریشنز، ترقی اور جامع میں ہیں۔ شناخت مفت ہے، بغیر ملاقاتوں یا کیشئر کے۔"
  },
  "مقارنة الباقات والترقية": {
    "en": "Compare plans and upgrade",
    "zh-CN": "比较套餐并升级",
    "es": "Comparar planes y mejorar",
    "ur": "پیکیجز کا موازنہ اور اپ گریڈ"
  },
  "تحتاج صلاحية البرنامج المحاسبي": {
    "en": "Accounting permission required",
    "zh-CN": "需要会计权限",
    "es": "Necesitas permiso contable",
    "ur": "حسابات کی اجازت درکار ہے"
  },
  "يحدد مالك المنشأة مهامك من الموظفين والصلاحيات.": {
    "en": "The business owner assigns your tasks in Staff and permissions.",
    "zh-CN": "企业所有者在员工与权限中分配任务。",
    "es": "El propietario define tus tareas en Personal y permisos.",
    "ur": "مالک ملازمین اور اجازتوں میں آپ کے کام طے کرتا ہے۔"
  },
  "هذه المهمة غير متاحة لحسابك": {
    "en": "This task is unavailable to your account",
    "zh-CN": "您的账户无法使用此任务",
    "es": "Esta tarea no está disponible para tu cuenta",
    "ur": "یہ کام آپ کے اکاؤنٹ کے لیے دستیاب نہیں"
  },
  "العودة إلى البرنامج المحاسبي": {
    "en": "Back to accounting software",
    "zh-CN": "返回会计软件",
    "es": "Volver al programa contable",
    "ur": "حسابات کے پروگرام پر واپس جائیں"
  },
  "مغسلة ملابس": {
    "en": "Laundry",
    "zh-CN": "洗衣店",
    "es": "Lavandería",
    "ur": "لانڈری"
  },
  "مهام البرنامج المحاسبي": {
    "en": "Accounting tasks",
    "zh-CN": "会计任务",
    "es": "Tareas contables",
    "ur": "حسابات کے کام"
  },
  "شهر": {
    "en": "month",
    "zh-CN": "个月",
    "es": "mes",
    "ur": "ماہ"
  },
  "شهران": {
    "en": "2 months",
    "zh-CN": "2 个月",
    "es": "2 meses",
    "ur": "2 ماہ"
  },
  "3 أشهر": {
    "en": "3 months",
    "zh-CN": "3 个月",
    "es": "3 meses",
    "ur": "3 ماہ"
  },
  "4 أشهر": {
    "en": "4 months",
    "zh-CN": "4 个月",
    "es": "4 meses",
    "ur": "4 ماہ"
  },
  "5 أشهر": {
    "en": "5 months",
    "zh-CN": "5 个月",
    "es": "5 meses",
    "ur": "5 ماہ"
  },
  "6 أشهر": {
    "en": "6 months",
    "zh-CN": "6 个月",
    "es": "6 meses",
    "ur": "6 ماہ"
  },
  "7 أشهر": {
    "en": "7 months",
    "zh-CN": "7 个月",
    "es": "7 meses",
    "ur": "7 ماہ"
  },
  "8 أشهر": {
    "en": "8 months",
    "zh-CN": "8 个月",
    "es": "8 meses",
    "ur": "8 ماہ"
  },
  "9 أشهر": {
    "en": "9 months",
    "zh-CN": "9 个月",
    "es": "9 meses",
    "ur": "9 ماہ"
  },
  "10 أشهر": {
    "en": "10 months",
    "zh-CN": "10 个月",
    "es": "10 meses",
    "ur": "10 ماہ"
  },
  "11 أشهر": {
    "en": "11 months",
    "zh-CN": "11 个月",
    "es": "11 meses",
    "ur": "11 ماہ"
  },
  "سنة كاملة": {
    "en": "Full year",
    "zh-CN": "全年",
    "es": "Un año completo",
    "ur": "مکمل سال"
  },
  "مستلم": {
    "en": "Received",
    "zh-CN": "已接收",
    "es": "Recibido",
    "ur": "موصول"
  },
  "قيد المعالجة": {
    "en": "Processing",
    "zh-CN": "处理中",
    "es": "En proceso",
    "ur": "زیرِ عمل"
  },
  "تم التسليم": {
    "en": "Delivered",
    "zh-CN": "已交付",
    "es": "Entregado",
    "ur": "پہنچا دیا گیا"
  },
  "جميع الطلبات": {
    "en": "All orders",
    "zh-CN": "所有订单",
    "es": "Todos los pedidos",
    "ur": "تمام آرڈرز"
  },
  "متأخرة عن التسليم": {
    "en": "Past delivery time",
    "zh-CN": "交付逾期",
    "es": "Entrega atrasada",
    "ur": "ڈیلیوری سے تاخیر شدہ"
  },
  "جاهزة للاستلام": {
    "en": "Ready for pickup",
    "zh-CN": "可取件",
    "es": "Listos para recoger",
    "ur": "وصولی کے لیے تیار"
  },
  "غير مسددة": {
    "en": "Unpaid",
    "zh-CN": "未付款",
    "es": "Sin pagar",
    "ur": "غیر ادا شدہ"
  },
  "تم تسليمها": {
    "en": "Delivered",
    "zh-CN": "已交付",
    "es": "Entregados",
    "ur": "پہنچائے گئے"
  },
  "عادي": {
    "en": "Standard",
    "zh-CN": "普通",
    "es": "Normal",
    "ur": "عام"
  },
  "مستعجل": {
    "en": "Rush",
    "zh-CN": "加急",
    "es": "Urgente",
    "ur": "فوری"
  },
  "لم يبدأ": {
    "en": "Not started",
    "zh-CN": "未开始",
    "es": "Sin iniciar",
    "ur": "شروع نہیں ہوا"
  },
  "منتهي الصلاحية": {
    "en": "Expired",
    "zh-CN": "已过期",
    "es": "Caducado",
    "ur": "مدت ختم"
  },
  "نفد الرصيد": {
    "en": "Balance exhausted",
    "zh-CN": "余额已用完",
    "es": "Saldo agotado",
    "ur": "بیلنس ختم"
  },
  "تحويل": {
    "en": "Transfer",
    "zh-CN": "转账",
    "es": "Transferencia",
    "ur": "منتقلی"
  },
  "رصيد اشتراك": {
    "en": "Subscription credit",
    "zh-CN": "订阅余额",
    "es": "Crédito de suscripción",
    "ur": "اشتراکی بیلنس"
  },
  "الكمية: {count}": {
    "en": "Qty: {count}",
    "zh-CN": "数量：{count}",
    "es": "Cantidad: {count}",
    "ur": "تعداد: {count}"
  },
  "من إجمالي": {
    "en": "of",
    "zh-CN": "共",
    "es": "de",
    "ur": "کل میں سے"
  },
  "شهر واحد": {
    "en": "1 month",
    "zh-CN": "1 个月",
    "es": "1 mes",
    "ur": "1 ماہ"
  },
  "الهوية والتشغيل والتسويق": {"en":"Business identity, operations and marketing","zh-CN":"企业身份、运营与营销","es":"Identidad, operaciones y marketing","ur":"شناخت، انتظام اور مارکیٹنگ"},
"باقات INFRO":{"en": "INFRO plans", "zh-CN": "INFRO 套餐", "es": "Planes INFRO", "ur": "INFRO کے پیکیج"},
"هوية مجانية، وخدمات تتوسع مع نشاطك":{"en": "Free identity, services that grow with your business", "zh-CN": "免费企业身份，服务随业务扩展", "es": "Identidad gratuita y servicios que crecen con tu negocio", "ur": "مفت شناخت، کاروبار کے ساتھ بڑھتی خدمات"},
"باقتك الحالية:":{"en": "Your current plan:", "zh-CN": "当前套餐：", "es": "Tu plan actual:", "ur": "آپ کا موجودہ پیکیج:"},
". حساب المالك ضمن عدد المستخدمين. الاشتراكات السابقة تحتفظ بشروطها وأسعارها.":{"en": ". The owner counts toward the user limit. Existing subscriptions retain their terms and prices.", "zh-CN": "。用户限额包含所有者。原有订阅保留其条款和价格。", "es": ". El propietario cuenta para el límite de usuarios. Las suscripciones anteriores conservan sus condiciones y precios.", "ur": "۔ صارفین کی تعداد میں مالک شامل ہے۔ سابقہ اشتراک کی شرائط اور قیمتیں برقرار رہتی ہیں۔"},
"استخدام الباقة هذا الشهر":{"en": "Plan usage this month", "zh-CN": "本月套餐用量", "es": "Uso del plan este mes", "ur": "اس ماہ پیکیج کا استعمال"},
"استخدام الشهر الحالي":{"en": "Current month usage", "zh-CN": "当月用量", "es": "Uso del mes actual", "ur": "موجودہ ماہ کا استعمال"},
"المستخدمون:":{"en": "Users:", "zh-CN": "用户：", "es": "Usuarios:", "ur": "صارفین:"},
"وفق الاشتراك السابق":{"en": "Under your existing subscription", "zh-CN": "按原有订阅", "es": "Según tu suscripción anterior", "ur": "سابقہ اشتراک کے مطابق"},
"· الفواتير:":{"en": "· Invoices:", "zh-CN": "· 发票：", "es": "· Facturas:", "ur": "· انوائس:"},
"· الحجوزات الجديدة:":{"en": "· New bookings:", "zh-CN": "· 新预约：", "es": "· Nuevas reservas:", "ur": "· نئی بکنگ:"},
"معالجة القوالب:":{"en": "Template processing:", "zh-CN": "模板处理：", "es": "Procesamiento de plantillas:", "ur": "ٹیمپلیٹ پروسیسنگ:"},
"· نقل المشاهدة:":{"en": "· Viewing data transfer:", "zh-CN": "· 观看流量：", "es": "· Transferencia de visualización:", "ur": "· ویڈیو ڈیٹا منتقلی:"},
"الحملات والأتمتة:":{"en": "Campaigns and automation:", "zh-CN": "营销与自动化：", "es": "Campañas y automatización:", "ur": "مہمات اور آٹومیشن:"},
"· إشعارات التشغيل:":{"en": "· Operational notifications:", "zh-CN": "· 运营通知：", "es": "· Avisos operativos:", "ur": "· عملیاتی اطلاعات:"},
"إدارة الاشتراك الحالي":{"en": "Manage current subscription", "zh-CN": "管理当前订阅", "es": "Gestionar suscripción actual", "ur": "موجودہ اشتراک کا انتظام"},
"لتغيير الباقة راجع إدارة الاشتراك؛ لا يتغير اشتراكك تلقائيًا.":{"en": "To change plans, open subscription management. Your subscription does not change automatically.", "zh-CN": "如需更改套餐，请前往订阅管理。订阅不会自动更改。", "es": "Para cambiar de plan, abre la gestión de suscripciones. Tu suscripción no cambia automáticamente.", "ur": "پیکیج تبدیل کرنے کے لیے اشتراک کے انتظام میں جائیں۔ آپ کا اشتراک خود بخود تبدیل نہیں ہوتا۔"},
"اختيار الباقة ومراجعة الدفع":{"en": "Select plan and review payment", "zh-CN": "选择套餐并核对付款", "es": "Elegir plan y revisar el pago", "ur": "پیکیج منتخب کریں اور ادائیگی دیکھیں"},
"الدفع غير متاح حاليًا":{"en": "Payment is currently unavailable", "zh-CN": "付款暂不可用", "es": "El pago no está disponible actualmente", "ur": "ادائیگی فی الحال دستیاب نہیں"},
"تفاصيل المحاسبة وواتساب والبث وشروطها":{"en": "Accounting, WhatsApp and live viewing: features and requirements", "zh-CN": "会计、WhatsApp 与直播：功能及要求", "es": "Contabilidad, WhatsApp y vídeo en directo: funciones y requisitos", "ur": "اکاؤنٹنگ، واٹس ایپ اور براہ راست ویڈیو: خصوصیات اور تقاضے"},
"تجهيز بوابة الدفع — إدارة INFRO":{"en": "Payment gateway setup — INFRO administration", "zh-CN": "支付网关设置 — INFRO 管理", "es": "Configurar pasarela de pago — Administración INFRO", "ur": "ادائیگی گیٹ وے کی ترتیب — INFRO انتظامیہ"},
"أريد خدمة منفصلة":{"en": "I need a standalone service", "zh-CN": "我需要单项服务", "es": "Necesito un servicio independiente", "ur": "مجھے الگ خدمت چاہیے"},
"سجل الفوترة وإدارة التجديد":{"en": "Billing history and renewal management", "zh-CN": "账单记录与续订管理", "es": "Historial de facturación y gestión de renovación", "ur": "بلنگ ریکارڈ اور تجدید کا انتظام"},
"اشترك في الخدمة التي تحتاجها":{"en": "Subscribe to the service you need", "zh-CN": "订阅所需服务", "es": "Suscríbete al servicio que necesitas", "ur": "اپنی ضرورت کی خدمت کا اشتراک لیں"},
"الهوية الرقمية الأساسية مجانية مع كل خدمة. إذا احتجت أكثر من خدمة، اختر باقة جامعة؛ اشتراك الحساب لا يجمع رسوم خدمات منفصلة تلقائيًا.":{"en": "Basic digital identity is free with every service. For several services, choose a bundle; your account subscription does not automatically combine standalone service fees.", "zh-CN": "每项服务均包含免费的基础数字身份。如需多项服务，请选择组合套餐；账户订阅不会自动合并单项服务费用。", "es": "La identidad digital básica es gratuita con cada servicio. Para varios servicios, elige un paquete; la suscripción de la cuenta no combina automáticamente las tarifas de servicios independientes.", "ur": "ہر خدمت کے ساتھ بنیادی ڈیجیٹل شناخت مفت ہے۔ متعدد خدمات کے لیے جامع پیکیج منتخب کریں؛ اکاؤنٹ کا اشتراک الگ خدمات کی فیس خود بخود جمع نہیں کرتا۔"},
"خدمتك الحالية":{"en": "Your current service", "zh-CN": "当前服务", "es": "Tu servicio actual", "ur": "آپ کی موجودہ خدمت"},
"إدارة اشتراكك الحالي قبل تغيير الخدمة":{"en": "Manage your current subscription before changing services", "zh-CN": "更改服务前请管理当前订阅", "es": "Gestiona tu suscripción actual antes de cambiar de servicio", "ur": "خدمت بدلنے سے پہلے موجودہ اشتراک کا انتظام کریں"},
"اختيار الخدمة ومراجعة الدفع":{"en": "Select service and review payment", "zh-CN": "选择服务并核对付款", "es": "Elegir servicio y revisar el pago", "ur": "خدمت منتخب کریں اور ادائیگی دیکھیں"},
"تفاصيل الميزات وشروط التشغيل":{"en": "Features and activation requirements", "zh-CN": "功能与启用要求", "es": "Funciones y requisitos de activación", "ur": "خصوصیات اور فعالیت کے تقاضے"},
"مقارنة الباقات الجامعة":{"en": "Compare bundled plans", "zh-CN": "比较组合套餐", "es": "Comparar paquetes de servicios", "ur": "جامع پیکیجوں کا موازنہ"},
"التوصيل":{"en": "Delivery", "zh-CN": "配送", "es": "Entrega", "ur": "ڈیلیوری"},
"إضافة {name}":{"en": "Add {name}", "zh-CN": "添加 {name}", "es": "Añadir {name}", "ur": "{name} شامل کریں"},
"تقليل {name}":{"en": "Decrease {name}", "zh-CN": "减少 {name}", "es": "Reducir {name}", "ur": "{name} کم کریں"},
"زيادة {name}":{"en": "Increase {name}", "zh-CN": "增加 {name}", "es": "Aumentar {name}", "ur": "{name} بڑھائیں"},
"اسم العميل":{"en": "Customer name", "zh-CN": "客户姓名", "es": "Nombre del cliente", "ur": "گاہک کا نام"},
"تعذر البحث":{"en": "Search failed", "zh-CN": "搜索失败", "es": "No se pudo buscar", "ur": "تلاش ناکام ہوئی"},
"تم استدعاء العميل المحفوظ":{"en": "Saved customer loaded", "zh-CN": "已载入已保存的客户", "es": "Cliente guardado cargado", "ur": "محفوظ گاہک کی معلومات آگئیں"},
"عميل جديد؛ سيُحفظ ملفه عند حفظ الطلب":{"en": "New customer; their profile will be saved with the order", "zh-CN": "新客户；保存订单时将保存客户档案", "es": "Cliente nuevo; su ficha se guardará con el pedido", "ur": "نیا گاہک؛ آرڈر محفوظ کرتے وقت پروفائل محفوظ ہوگا"},
"تعذر الاتصال":{"en": "Unable to connect", "zh-CN": "无法连接", "es": "No se pudo conectar", "ur": "رابطہ نہیں ہو سکا"},
"جارٍ البحث…":{"en": "Searching…", "zh-CN": "正在搜索…", "es": "Buscando…", "ur": "تلاش جاری ہے…"},
"استدعاء العميل بالجوال":{"en": "Find customer by mobile", "zh-CN": "按手机号查找客户", "es": "Buscar cliente por móvil", "ur": "موبائل سے گاہک تلاش کریں"},
"تعذر الاتصال بدليل العملاء":{"en": "Unable to load the customer directory", "zh-CN": "无法载入客户目录", "es": "No se pudo cargar el directorio de clientes", "ur": "گاہکوں کی فہرست لوڈ نہیں ہوسکی"},
"دليل العملاء":{"en": "Customer directory", "zh-CN": "客户目录", "es": "Directorio de clientes", "ur": "گاہکوں کی فہرست"},
"نتيجة · حتى 100 ملف":{"en": "results · up to 100 profiles", "zh-CN": "条结果 · 最多 100 份档案", "es": "resultados · hasta 100 fichas", "ur": "نتائج · زیادہ سے زیادہ 100 پروفائل"},
"يُحفظ ملف العميل مع الطلب الجديد برقم جوال موحد. بيانات التواصل تخص خدمة الطلب؛ لا يعني حفظها موافقة على رسائل تسويقية. الطلبات السابقة تحتفظ باسم العميل ورقمه وقت الإصدار.":{"en": "A customer profile is saved with a new order using a normalized mobile number. Contact details are for order service; saving them does not imply marketing consent. Previous orders retain the name and number recorded when issued.", "zh-CN": "新订单将按统一格式的手机号保存客户档案。联系方式仅用于订单服务；保存并不代表同意接收营销信息。历史订单保留开具时的姓名和号码。", "es": "La ficha se guarda con un pedido nuevo mediante un móvil normalizado. Los datos de contacto son para atender el pedido; guardarlos no implica consentimiento de marketing. Los pedidos anteriores conservan el nombre y número registrados al emitirlos.", "ur": "نئے آرڈر کے ساتھ یکساں فارمیٹ والے موبائل نمبر سے گاہک کا پروفائل محفوظ ہوتا ہے۔ رابطے کی تفصیلات آرڈر کی خدمت کے لیے ہیں؛ محفوظ کرنا مارکیٹنگ کی رضامندی نہیں ہے۔ پرانے آرڈر اجرا کے وقت کا نام اور نمبر برقرار رکھتے ہیں۔"},
"البحث في العملاء":{"en": "Search customers", "zh-CN": "搜索客户", "es": "Buscar clientes", "ur": "گاہک تلاش کریں"},
"الاسم أو الجوال":{"en": "Name or mobile", "zh-CN": "姓名或手机号", "es": "Nombre o móvil", "ur": "نام یا موبائل"},
"بحث العملاء":{"en": "Search customers", "zh-CN": "搜索客户", "es": "Buscar clientes", "ur": "گاہک تلاش کریں"},
"ملف جديد":{"en": "New profile", "zh-CN": "新建档案", "es": "Nueva ficha", "ur": "نیا پروفائل"},
"ربط الطلبات السابقة بملفات العملاء":{"en": "Link previous orders to customer profiles", "zh-CN": "将历史订单关联到客户档案", "es": "Vincular pedidos anteriores con fichas de clientes", "ur": "پرانے آرڈر گاہکوں کے پروفائل سے جوڑیں"},
"يجمع الطلبات ذات الجوال نفسه داخل المنشأة دون تغيير الفواتير أو المبالغ. الأرقام غير الصالحة تُترك للمراجعة. كل ضغطة تعالج حتى 25 طلبًا؛ أعد المحاولة إذا انقطع الاتصال.":{"en": "Groups orders with the same mobile within this business without changing invoices or amounts. Invalid numbers remain for review. Each click processes up to 25 orders; retry if the connection is interrupted.", "zh-CN": "在本企业内关联同一手机号的订单，不更改发票或金额。无效号码留待审核。每次点击最多处理 25 个订单；连接中断后可重试。", "es": "Agrupa pedidos con el mismo móvil dentro del negocio sin modificar facturas ni importes. Los números no válidos quedan pendientes de revisión. Cada clic procesa hasta 25 pedidos; reintenta si se interrumpe la conexión.", "ur": "اسی کاروبار میں ایک ہی موبائل والے آرڈر جوڑتا ہے، انوائس یا رقم تبدیل نہیں کرتا۔ غلط نمبر جائزے کے لیے رہتے ہیں۔ ہر کلک پر زیادہ سے زیادہ 25 آرڈر پراسیس ہوتے ہیں؛ رابطہ منقطع ہو تو دوبارہ کوشش کریں۔"},
"تعذر الترحيل":{"en": "Unable to link orders", "zh-CN": "无法关联订单", "es": "No se pudieron vincular los pedidos", "ur": "آرڈر جوڑے نہیں جاسکے"},
"رُبط {processed} طلبًا؛ {skipped} يحتاج مراجعة رقم الجوال.":{"en": "Linked {processed} orders; {skipped} need a mobile-number review.", "zh-CN": "已关联 {processed} 个订单；{skipped} 个需要检查手机号。", "es": "Se vincularon {processed} pedidos; {skipped} necesitan revisar el móvil.", "ur": "{processed} آرڈر جوڑ دیے گئے؛ {skipped} کے موبائل نمبر کا جائزہ درکار ہے۔"},
"اضغط متابعة لترحيل الدفعة التالية.":{"en": "Select Continue to link the next batch.", "zh-CN": "点击继续以关联下一批。", "es": "Pulsa Continuar para vincular el siguiente lote.", "ur": "اگلا بیچ جوڑنے کے لیے جاری رکھیں دبائیں۔"},
"اكتملت هذه الدفعة.":{"en": "This batch is complete.", "zh-CN": "本批处理完成。", "es": "Este lote está completo.", "ur": "یہ بیچ مکمل ہوگیا۔"},
"تعذر الاتصال. أعد المحاولة":{"en": "Unable to connect. Try again.", "zh-CN": "无法连接，请重试。", "es": "No se pudo conectar. Inténtalo de nuevo.", "ur": "رابطہ نہیں ہوسکا۔ دوبارہ کوشش کریں۔"},
"متابعة ربط الطلبات السابقة":{"en": "Continue linking previous orders", "zh-CN": "继续关联历史订单", "es": "Continuar vinculando pedidos anteriores", "ur": "پرانے آرڈر جوڑنا جاری رکھیں"},
"ربط الطلبات السابقة":{"en": "Link previous orders", "zh-CN": "关联历史订单", "es": "Vincular pedidos anteriores", "ur": "پرانے آرڈر جوڑیں"},
"العميل / الجوال":{"en": "Customer / mobile", "zh-CN": "客户／手机号", "es": "Cliente / móvil", "ur": "گاہک / موبائل"},
"عدد الطلبات":{"en": "Order count", "zh-CN": "订单数", "es": "Número de pedidos", "ur": "آرڈر کی تعداد"},
"إجمالي الطلبات":{"en": "Order total", "zh-CN": "订单总额", "es": "Total de pedidos", "ur": "آرڈر کی کل رقم"},
"الملف":{"en": "Profile", "zh-CN": "档案", "es": "Ficha", "ur": "پروفائل"},
"فتح ملف":{"en": "Open profile", "zh-CN": "打开档案", "es": "Abrir ficha", "ur": "پروفائل کھولیں"},
"لا توجد ملفات مطابقة. أضف عميلًا أو اربط الطلبات السابقة.":{"en": "No matching profiles. Add a customer or link previous orders.", "zh-CN": "没有匹配的档案。请添加客户或关联历史订单。", "es": "No hay fichas coincidentes. Añade un cliente o vincula pedidos anteriores.", "ur": "کوئی مماثل پروفائل نہیں۔ گاہک شامل کریں یا پرانے آرڈر جوڑیں۔"},
"ملف {name}":{"en": "Profile: {name}", "zh-CN": "档案：{name}", "es": "Ficha: {name}", "ur": "پروفائل: {name}"},
"إضافة عميل":{"en": "Add customer", "zh-CN": "添加客户", "es": "Añadir cliente", "ur": "گاہک شامل کریں"},
"تم حفظ ملف العميل":{"en": "Customer profile saved", "zh-CN": "客户档案已保存", "es": "Ficha del cliente guardada", "ur": "گاہک کا پروفائل محفوظ ہوگیا"},
"تعذر الاتصال. ابحث عن الجوال قبل إعادة الإضافة":{"en": "Unable to connect. Search the mobile before adding again.", "zh-CN": "无法连接。再次添加前请先搜索手机号。", "es": "No se pudo conectar. Busca el móvil antes de volver a añadirlo.", "ur": "رابطہ نہیں ہوسکا۔ دوبارہ شامل کرنے سے پہلے موبائل تلاش کریں۔"},
"اسم صاحب الملف":{"en": "Profile holder name", "zh-CN": "档案持有人姓名", "es": "Nombre del titular de la ficha", "ur": "پروفائل رکھنے والے کا نام"},
"جوال صاحب الملف":{"en": "Profile holder mobile", "zh-CN": "档案持有人手机号", "es": "Móvil del titular de la ficha", "ur": "پروفائل رکھنے والے کا موبائل"},
"الجوال معرّف ثابت لهذا الملف. أنشئ ملفًا جديدًا عند تغييره؛ لا تُنقل الطلبات القديمة تلقائيًا.":{"en": "The mobile is this profile's fixed identifier. Create a new profile when it changes; previous orders are not transferred automatically.", "zh-CN": "手机号是此档案的固定标识。更换号码时请新建档案；历史订单不会自动转移。", "es": "El móvil es el identificador fijo de esta ficha. Si cambia, crea una ficha nueva; los pedidos anteriores no se transfieren automáticamente.", "ur": "موبائل اس پروفائل کی مستقل شناخت ہے۔ نمبر تبدیل ہو تو نیا پروفائل بنائیں؛ پرانے آرڈر خود بخود منتقل نہیں ہوتے۔"},
"عنوان التوصيل المقدم من العميل":{"en": "Delivery address provided by the customer", "zh-CN": "客户提供的配送地址", "es": "Dirección de entrega facilitada por el cliente", "ur": "گاہک کا فراہم کردہ ڈیلیوری پتہ"},
"تعليمات خدمة العميل":{"en": "Customer service instructions", "zh-CN": "客户服务说明", "es": "Instrucciones de servicio del cliente", "ur": "گاہک کی خدمت کی ہدایات"},
"حفظ ملف العميل":{"en": "Save customer profile", "zh-CN": "保存客户档案", "es": "Guardar ficha del cliente", "ur": "گاہک کا پروفائل محفوظ کریں"},
"طلبات العميل المرتبطة":{"en": "Linked customer orders", "zh-CN": "已关联的客户订单", "es": "Pedidos vinculados del cliente", "ur": "گاہک کے منسلک آرڈر"},
"آخر 100 طلب. إجمالي الملف يشمل كل الطلبات المرتبطة. لا يشمل الطلبات السابقة حتى ربطها من الأعلى.":{"en": "Latest 100 orders. Profile totals include all linked orders. Earlier orders are excluded until linked above.", "zh-CN": "显示最近 100 个订单。档案总额包含所有已关联订单。较早订单需先在上方关联后才会计入。", "es": "Últimos 100 pedidos. Los totales incluyen todos los pedidos vinculados. Los anteriores quedan excluidos hasta vincularlos arriba.", "ur": "آخری 100 آرڈر۔ پروفائل کا مجموعہ تمام منسلک آرڈر شامل کرتا ہے۔ پرانے آرڈر اوپر سے جوڑے جانے تک شامل نہیں ہوتے۔"},
"الطلب":{"en": "Order", "zh-CN": "订单", "es": "Pedido", "ur": "آرڈر"},
"تاريخ الاستلام":{"en": "Received date", "zh-CN": "收件日期", "es": "Fecha de recepción", "ur": "وصولی کی تاریخ"},
"جارٍ قراءة الطلبات…":{"en": "Loading orders…", "zh-CN": "正在载入订单…", "es": "Cargando pedidos…", "ur": "آرڈر لوڈ ہورہے ہیں…"},
"{count} خدمة محددة: {services}":{"en": "{count} selected services: {services}", "zh-CN": "{count} 项指定服务：{services}", "es": "{count} servicios seleccionados: {services}", "ur": "{count} منتخب خدمات: {services}"},
"تعذر تحميل الباقات":{"en": "Unable to load packages", "zh-CN": "无法载入套餐", "es": "No se pudieron cargar los paquetes", "ur": "پیکیج لوڈ نہیں ہوسکے"},
"باقات المنشأة":{"en": "Business packages", "zh-CN": "企业套餐", "es": "Paquetes del negocio", "ur": "کاروبار کے پیکیج"},
"رصيد مسبق الدفع · حسب خدمات نشاطك":{"en": "Prepaid credit · based on your services", "zh-CN": "预付余额 · 按企业服务设置", "es": "Saldo prepago · según tus servicios", "ur": "پیشگی بیلنس · آپ کی خدمات کے مطابق"},
"اختر رصيدًا ماليًا أو عدد قطع أو زيارات خدمة. باقات العدد تخص خدمة واحدة محددة؛ كل كمية منها تستهلك وحدة، وتظهر تلقائيًا عند إدخال جوال المشترك في الكاشير.":{"en": "Choose monetary credit, items or service visits. Unit packages apply to one selected service; each quantity uses one unit. They appear automatically when the subscriber's mobile is entered at POS.", "zh-CN": "可选择金额余额、件数或服务次数。计次套餐仅适用于一项指定服务，每份数量消耗一个单位。在收银台输入订阅客户的手机号后会自动显示。", "es": "Elige saldo monetario, piezas o visitas de servicio. Los paquetes por unidades se aplican a un servicio concreto; cada cantidad consume una unidad. Aparecen al introducir el móvil del suscriptor en caja.", "ur": "مالی بیلنس، اشیا کی تعداد یا خدمت کے دورے منتخب کریں۔ تعداد والے پیکیج ایک منتخب خدمت کے لیے ہیں؛ ہر مقدار ایک یونٹ استعمال کرتی ہے۔ کیشئر میں رکن کا موبائل درج کرنے پر خود ظاہر ہوتے ہیں۔"},
"رصيد مالي":{"en": "Monetary credit", "zh-CN": "金额余额", "es": "Saldo monetario", "ur": "مالی بیلنس"},
"خدمة مؤرشفة":{"en": "Archived service", "zh-CN": "已归档服务", "es": "Servicio archivado", "ur": "محفوظ شدہ پرانی خدمت"},
"يشمل جميع خدمات ومنتجات المنشأة":{"en": "Includes all business services and products", "zh-CN": "包含企业所有服务与商品", "es": "Incluye todos los servicios y productos del negocio", "ur": "کاروبار کی تمام خدمات اور مصنوعات شامل ہیں"},
"تسجيل مشترك في":{"en": "Enroll subscriber in", "zh-CN": "登记订阅客户：", "es": "Inscribir suscriptor en", "ur": "اس میں رکن درج کریں:"},
"تعذر الإيقاف":{"en": "Unable to deactivate", "zh-CN": "无法停用", "es": "No se pudo desactivar", "ur": "غیر فعال نہیں ہوسکا"},
"إيقاف الاشتراكات الجديدة":{"en": "Stop new enrollments", "zh-CN": "停止新订阅", "es": "Detener nuevas inscripciones", "ur": "نئے اشتراک روکیں"},
"لا توجد باقات فعالة. أضف أول باقة لتسجيل المشتركين.":{"en": "No active packages. Add your first package to enroll subscribers.", "zh-CN": "没有有效套餐。请添加首个套餐以登记订阅客户。", "es": "No hay paquetes activos. Añade el primero para inscribir suscriptores.", "ur": "کوئی فعال پیکیج نہیں۔ رکن درج کرنے کے لیے پہلا پیکیج شامل کریں۔"},
"إضافة باقة جديدة":{"en": "Add a new package", "zh-CN": "添加新套餐", "es": "Añadir un paquete nuevo", "ur": "نیا پیکیج شامل کریں"},
"لتغيير شروط باقة، أنشئ إصدارًا جديدًا وأوقف القديمة. الاشتراكات القائمة تحتفظ بشروطها وأرصدتها.":{"en": "To change package terms, create a new version and deactivate the old one. Existing subscriptions retain their terms and balances.", "zh-CN": "如需更改套餐条款，请创建新版本并停用旧版本。现有订阅保留其原有条款和余额。", "es": "Para cambiar las condiciones, crea una versión nueva y desactiva la anterior. Las suscripciones existentes conservan sus condiciones y saldos.", "ur": "پیکیج کی شرائط بدلنے کے لیے نیا ورژن بنائیں اور پرانا بند کریں۔ موجودہ اشتراک اپنی شرائط اور بیلنس برقرار رکھتے ہیں۔"},
"تعذر الاتصال؛ أعد المحاولة بنفس البيانات":{"en": "Unable to connect; retry with the same details", "zh-CN": "无法连接；请使用相同资料重试", "es": "No se pudo conectar; reintenta con los mismos datos", "ur": "رابطہ نہیں ہوسکا؛ اسی معلومات کے ساتھ دوبارہ کوشش کریں"},
"نوع الباقة":{"en": "Package type", "zh-CN": "套餐类型", "es": "Tipo de paquete", "ur": "پیکیج کی قسم"},
"عدد قطع":{"en": "Item count", "zh-CN": "件数", "es": "Número de piezas", "ur": "اشیا کی تعداد"},
"عدد زيارات خدمة":{"en": "Service visit count", "zh-CN": "服务次数", "es": "Número de visitas de servicio", "ur": "خدمت کے دوروں کی تعداد"},
"العدد المشمول":{"en": "Included units", "zh-CN": "包含的单位数", "es": "Unidades incluidas", "ur": "شامل یونٹ"},
"اختر خدمة واحدة من القائمة. كل وحدة من هذه الخدمة تستهلك وحدة من الباقة. الزيارة لا تشمل بقية أصناف الطلب. تُوزع قيمة الباقة على وحداتها وتظهر في المستند، ويُغلق العدد المتبقي عند استرداد كامل قيمته غير المستخدمة.":{"en": "Select one service. Each quantity of that service consumes one package unit. A visit does not cover other order items. The package value is allocated across its units and shown on the document. Refunding the full unused value closes the remaining units.", "zh-CN": "请选择一项服务。该服务的每份数量消耗一个套餐单位。一次服务不包含订单中的其他项目。套餐金额按单位分摊并显示在单据上。退还全部未使用金额后，剩余单位将关闭。", "es": "Elige un servicio. Cada cantidad consume una unidad del paquete. Una visita no incluye otros artículos del pedido. El valor se reparte entre las unidades y aparece en el documento. Al devolver todo el valor sin usar, se cierran las unidades restantes.", "ur": "ایک خدمت منتخب کریں۔ اس کی ہر مقدار پیکیج کا ایک یونٹ استعمال کرتی ہے۔ ایک دورہ آرڈر کی دوسری اشیا کو شامل نہیں کرتا۔ پیکیج کی قیمت یونٹوں پر تقسیم ہوکر دستاویز پر دکھتی ہے۔ پوری غیر استعمال شدہ رقم واپس کرنے پر باقی یونٹ بند ہوجاتے ہیں۔"},
"اسم الباقة":{"en": "Package name", "zh-CN": "套餐名称", "es": "Nombre del paquete", "ur": "پیکیج کا نام"},
"الباقة الشهرية":{"en": "Monthly package", "zh-CN": "月度套餐", "es": "Paquete mensual", "ur": "ماہانہ پیکیج"},
"سعر الباقة بالريال":{"en": "Package price in SAR", "zh-CN": "套餐价格（沙特里亚尔）", "es": "Precio del paquete en SAR", "ur": "پیکیج کی قیمت سعودی ریال میں"},
"مدة الباقة بالأيام":{"en": "Package duration in days", "zh-CN": "套餐期限（天）", "es": "Duración del paquete en días", "ur": "پیکیج کی مدت دنوں میں"},
"وصف الباقة وشروطها":{"en": "Package description and terms", "zh-CN": "套餐说明与条款", "es": "Descripción y condiciones del paquete", "ur": "پیکیج کی تفصیل اور شرائط"},
"الخدمات المشمولة — اتركها فارغة لتشمل الجميع":{"en": "Included services — leave empty to include all", "zh-CN": "包含的服务 — 留空则包含全部", "es": "Servicios incluidos — deja vacío para incluir todos", "ur": "شامل خدمات — سب شامل کرنے کے لیے خالی چھوڑیں"},
"الخدمة المشمولة — اختر واحدة":{"en": "Included service — choose one", "zh-CN": "包含的服务 — 请选择一项", "es": "Servicio incluido — elige uno", "ur": "شامل خدمت — ایک منتخب کریں"},
"حفظ الباقة":{"en": "Save package", "zh-CN": "保存套餐", "es": "Guardar paquete", "ur": "پیکیج محفوظ کریں"},
"شراء اشتراك":{"en": "Subscription purchase", "zh-CN": "购买订阅", "es": "Compra de suscripción", "ur": "اشتراک کی خریداری"},
"سداد من الاشتراك":{"en": "Payment from subscription", "zh-CN": "从订阅余额支付", "es": "Pago con suscripción", "ur": "اشتراک سے ادائیگی"},
"استرداد رصيد":{"en": "Credit refund", "zh-CN": "余额退款", "es": "Devolución de saldo", "ur": "بیلنس کی واپسی"},
"نقد":{"en": "Cash", "zh-CN": "现金", "es": "Efectivo", "ur": "نقد"},
"حُفظت العملية ورُحّل قيدها المحاسبي":{"en": "Transaction saved and journal entry posted", "zh-CN": "交易已保存，会计分录已过账", "es": "Operación guardada y asiento contabilizado", "ur": "معاملہ محفوظ اور حسابی اندراج درج ہوگیا"},
"تعذر الاتصال. أعد المحاولة بنفس البيانات.":{"en": "Unable to connect. Retry with the same details.", "zh-CN": "无法连接。请使用相同资料重试。", "es": "No se pudo conectar. Reintenta con los mismos datos.", "ur": "رابطہ نہیں ہوسکا۔ اسی معلومات کے ساتھ دوبارہ کوشش کریں۔"},
"المشتركون وأرصدة الباقات":{"en": "Subscribers and package balances", "zh-CN": "订阅客户与套餐余额", "es": "Suscriptores y saldos de paquetes", "ur": "ارکان اور پیکیج کے بیلنس"},
"تظهر وحدات الباقات العددية وقيمتها غير المستخدمة، دون تجديد تلقائي أو خصم من بطاقة العميل. يلزم تهيئة دفتر المحاسبة. انتهاء مدة الاستخدام لا يمحو الرصيد؛ يمكن استرداد الجزء غير المستخدم. تسجيل الاسترداد يوثّق مبلغًا أعدته فعليًا ولا ينفذ تحويلًا بنكيًا.":{"en": "Shows package units and unused value, without automatic renewal or card charges. Set up the accounting ledger first. Expiry does not erase the balance; unused value can be refunded. Recording a refund documents money already returned and does not execute a bank transfer.", "zh-CN": "显示套餐单位及未使用金额，不自动续订或扣款。需先设置会计账簿。使用期限到期不会清除余额，未使用部分可退款。登记退款仅记录已实际退还的金额，不会执行银行转账。", "es": "Muestra unidades y valor sin usar, sin renovación automática ni cargos a la tarjeta. Configura primero el libro contable. El vencimiento no elimina el saldo; el valor sin usar puede devolverse. Registrar una devolución documenta dinero ya devuelto y no ejecuta una transferencia bancaria.", "ur": "پیکیج کے یونٹ اور غیر استعمال شدہ قیمت دکھتی ہے، خودکار تجدید یا کارڈ سے کٹوتی نہیں ہوتی۔ پہلے حسابی دفتر ترتیب دیں۔ مدت ختم ہونے سے بیلنس مٹتا نہیں؛ غیر استعمال شدہ حصہ واپس ہوسکتا ہے۔ واپسی کا اندراج صرف پہلے واپس کی گئی رقم کا ریکارڈ ہے، بینک ٹرانسفر نہیں کرتا۔"},
"جوال العميل للبحث":{"en": "Customer mobile to search", "zh-CN": "用于搜索的客户手机号", "es": "Móvil del cliente para buscar", "ur": "تلاش کے لیے گاہک کا موبائل"},
"اتركه لعرض أحدث الاشتراكات":{"en": "Leave empty to show recent subscriptions", "zh-CN": "留空显示最新订阅", "es": "Deja vacío para ver suscripciones recientes", "ur": "حالیہ اشتراک دکھانے کے لیے خالی چھوڑیں"},
"عرض الاشتراكات":{"en": "Show subscriptions", "zh-CN": "显示订阅", "es": "Ver suscripciones", "ur": "اشتراک دکھائیں"},
"أحدث 100 اشتراك؛ ابحث برقم العميل للوصول إلى اشتراكاته.":{"en": "Latest 100 subscriptions; search the customer's mobile to find theirs.", "zh-CN": "显示最新 100 个订阅；搜索客户手机号可查找其订阅。", "es": "Últimas 100 suscripciones; busca el móvil del cliente para encontrar las suyas.", "ur": "حالیہ 100 اشتراک؛ گاہک کے اشتراک تلاش کرنے کے لیے اس کا موبائل درج کریں۔"},
"العميل / الاشتراك":{"en": "Customer / subscription", "zh-CN": "客户／订阅", "es": "Cliente / suscripción", "ur": "گاہک / اشتراک"},
"القيمة / المتبقي":{"en": "Value / remaining", "zh-CN": "金额／剩余", "es": "Valor / restante", "ur": "قیمت / باقی"},
"الحالة / نهاية الاستخدام":{"en": "Status / use expiry", "zh-CN": "状态／使用期限", "es": "Estado / fin de uso", "ur": "حالت / استعمال کا اختتام"},
"القيمة غير المستخدمة":{"en": "Unused value", "zh-CN": "未使用金额", "es": "Valor sin usar", "ur": "غیر استعمال شدہ قیمت"},
"استخدام أو استرداد":{"en": "Use or refund", "zh-CN": "使用或退款", "es": "Usar o devolver", "ur": "استعمال یا واپسی"},
"تجديد / اشتراك جديد":{"en": "Renew / new subscription", "zh-CN": "续订／新订阅", "es": "Renovar / nueva suscripción", "ur": "تجدید / نیا اشتراک"},
"لا توجد اشتراكات مطابقة.":{"en": "No matching subscriptions.", "zh-CN": "没有匹配的订阅。", "es": "No hay suscripciones coincidentes.", "ur": "کوئی مماثل اشتراک نہیں۔"},
"تسجيل اشتراك جديد":{"en": "Register a new subscription", "zh-CN": "登记新订阅", "es": "Registrar una nueva suscripción", "ur": "نیا اشتراک درج کریں"},
"التجديد ينشئ اشتراكًا جديدًا دون مسح رصيد الاشتراك السابق. اختر الباقة أعلاه أو أدخل رصيدًا مخصصًا.":{"en": "Renewal creates a new subscription without erasing the previous balance. Select a package above or enter custom credit.", "zh-CN": "续订会创建新订阅，不会清除旧余额。请选择上方套餐或输入自定义余额。", "es": "La renovación crea una suscripción nueva sin borrar el saldo anterior. Elige un paquete arriba o introduce un saldo personalizado.", "ur": "تجدید نیا اشتراک بناتی ہے، پرانا بیلنس مٹتا نہیں۔ اوپر پیکیج منتخب کریں یا حسب ضرورت بیلنس درج کریں۔"},
"الباقة المختارة:":{"en": "Selected package:", "zh-CN": "所选套餐：", "es": "Paquete seleccionado:", "ur": "منتخب پیکیج:"},
"ر.س ·":{"en": "SAR ·", "zh-CN": "SAR ·", "es": "SAR ·", "ur": "ریال ·"},
"رصيد مخصص بدل الباقة":{"en": "Custom credit instead of a package", "zh-CN": "使用自定义余额代替套餐", "es": "Saldo personalizado en lugar de paquete", "ur": "پیکیج کے بجائے حسب ضرورت بیلنس"},
"جوال عميل مسجل":{"en": "Registered customer mobile", "zh-CN": "已登记客户的手机号", "es": "Móvil de un cliente registrado", "ur": "درج شدہ گاہک کا موبائل"},
"اسم الاشتراك":{"en": "Subscription name", "zh-CN": "订阅名称", "es": "Nombre de la suscripción", "ur": "اشتراک کا نام"},
"رصيد الخدمات الشهري":{"en": "Monthly service credit", "zh-CN": "每月服务余额", "es": "Saldo mensual de servicios", "ur": "ماہانہ خدمات کا بیلنس"},
"قيمة الاشتراك المستلمة":{"en": "Subscription payment received", "zh-CN": "已收订阅金额", "es": "Importe recibido de la suscripción", "ur": "اشتراک کی وصول شدہ رقم"},
"طريقة استلام قيمة الاشتراك":{"en": "Subscription collection method", "zh-CN": "订阅收款方式", "es": "Método de cobro de la suscripción", "ur": "اشتراک کی رقم وصول کرنے کا طریقہ"},
"حفظ الاشتراك والتحصيل":{"en": "Save subscription and collection", "zh-CN": "保存订阅与收款", "es": "Guardar suscripción y cobro", "ur": "اشتراک اور وصولی محفوظ کریں"},
"القيمة غير المستخدمة:":{"en": "Unused value:", "zh-CN": "未使用金额：", "es": "Valor sin usar:", "ur": "غیر استعمال شدہ قیمت:"},
"رقم طلب العميل":{"en": "Customer order number", "zh-CN": "客户订单号", "es": "Número de pedido del cliente", "ur": "گاہک کا آرڈر نمبر"},
"مبلغ السداد من الاشتراك":{"en": "Amount to pay from subscription", "zh-CN": "从订阅支付的金额", "es": "Importe a pagar con la suscripción", "ur": "اشتراک سے ادا کرنے کی رقم"},
"سداد الطلب من الرصيد":{"en": "Pay order from credit", "zh-CN": "使用余额支付订单", "es": "Pagar pedido con saldo", "ur": "بیلنس سے آرڈر ادا کریں"},
"تُستهلك الوحدات تلقائيًا عند إنشاء الطلب من الكاشير. الاسترداد يغلق جميع الوحدات المتبقية مقابل كامل قيمتها غير المستخدمة.":{"en": "Units are used automatically when creating a POS order. A refund closes all remaining units in exchange for their full unused value.", "zh-CN": "创建收银订单时自动消耗单位。退款会退还全部未使用金额并关闭所有剩余单位。", "es": "Las unidades se consumen al crear un pedido en caja. Una devolución cierra todas las unidades restantes a cambio de todo su valor sin usar.", "ur": "کیشئر سے آرڈر بناتے وقت یونٹ خود استعمال ہوتے ہیں۔ واپسی میں باقی تمام یونٹ ان کی پوری غیر استعمال شدہ قیمت کے بدلے بند ہوجاتے ہیں۔"},
"استرداد رصيد غير مستخدم":{"en": "Refund unused credit", "zh-CN": "退还未使用余额", "es": "Devolver saldo sin usar", "ur": "غیر استعمال شدہ بیلنس واپس کریں"},
"المبلغ المعاد للعميل":{"en": "Amount returned to the customer", "zh-CN": "退还客户的金额", "es": "Importe devuelto al cliente", "ur": "گاہک کو واپس کی گئی رقم"},
"طريقة إعادة الرصيد":{"en": "Refund method", "zh-CN": "退款方式", "es": "Método de devolución", "ur": "واپسی کا طریقہ"},
"سبب ومرجع الاسترداد":{"en": "Refund reason and reference", "zh-CN": "退款原因与参考号", "es": "Motivo y referencia de la devolución", "ur": "واپسی کی وجہ اور حوالہ"},
"أؤكد أن المبلغ أُعيد فعليًا للعميل":{"en": "I confirm the money was actually returned to the customer", "zh-CN": "我确认金额已实际退还给客户", "es": "Confirmo que el dinero ya se devolvió al cliente", "ur": "میں تصدیق کرتا ہوں کہ رقم گاہک کو حقیقتاً واپس کردی گئی ہے"},
"تسجيل استرداد الرصيد":{"en": "Record credit refund", "zh-CN": "登记余额退款", "es": "Registrar devolución de saldo", "ur": "بیلنس کی واپسی درج کریں"},
"آخر حركات الاشتراكات":{"en": "Recent subscription movements", "zh-CN": "最近订阅交易", "es": "Movimientos recientes de suscripciones", "ur": "اشتراک کی حالیہ حرکات"},
"التاريخ / البيان":{"en": "Date / description", "zh-CN": "日期／说明", "es": "Fecha / concepto", "ur": "تاریخ / تفصیل"},
"النوع":{"en": "Type", "zh-CN": "类型", "es": "Tipo", "ur": "قسم"},
"المبلغ":{"en": "Amount", "zh-CN": "金额", "es": "Importe", "ur": "رقم"},
"المستند":{"en": "Document", "zh-CN": "单据", "es": "Documento", "ur": "دستاویز"},
"سند قبض — اشتراك":{"en": "Receipt voucher — subscription", "zh-CN": "收款凭证 — 订阅", "es": "Comprobante de cobro — suscripción", "ur": "وصولی کی رسید — اشتراک"},
"سند صرف — استرداد اشتراك":{"en": "Payment voucher — subscription refund", "zh-CN": "付款凭证 — 订阅退款", "es": "Comprobante de pago — devolución de suscripción", "ur": "ادائیگی کی رسید — اشتراک کی واپسی"},
"سند تسوية — استخدام رصيد اشتراك":{"en": "Settlement voucher — subscription credit used", "zh-CN": "结算凭证 — 使用订阅余额", "es": "Comprobante de liquidación — uso de saldo de suscripción", "ur": "تصفیے کی رسید — اشتراک کے بیلنس کا استعمال"},
"عرض السند":{"en": "View voucher", "zh-CN": "查看凭证", "es": "Ver comprobante", "ur": "رسید دیکھیں"},
"سند العملية المالية":{"en": "Financial transaction voucher", "zh-CN": "财务交易凭证", "es": "Comprobante de operación financiera", "ur": "مالی معاملے کی رسید"},
"إغلاق السند":{"en": "Close voucher", "zh-CN": "关闭凭证", "es": "Cerrar comprobante", "ur": "رسید بند کریں"},
"مقاس طباعة السند":{"en": "Voucher print size", "zh-CN": "凭证打印尺寸", "es": "Tamaño de impresión del comprobante", "ur": "رسید کی طباعت کا سائز"},
"طباعة السند":{"en": "Print voucher", "zh-CN": "打印凭证", "es": "Imprimir comprobante", "ur": "رسید پرنٹ کریں"},
"اختر مقاس الورق المطابق والمقياس 100٪، وأوقف رؤوس وتذييلات المتصفح.":{"en": "Select the matching paper size and 100% scale, and turn off browser headers and footers.", "zh-CN": "选择对应纸张尺寸和 100% 缩放，并关闭浏览器页眉页脚。", "es": "Elige el tamaño de papel correspondiente y escala al 100 %, y desactiva las cabeceras y pies del navegador.", "ur": "مناسب کاغذ کا سائز اور 100٪ پیمانہ منتخب کریں، اور براؤزر کے ہیڈر اور فوٹر بند کریں۔"},
"مرجع السند:":{"en": "Voucher reference:", "zh-CN": "凭证参考号：", "es": "Referencia del comprobante:", "ur": "رسید کا حوالہ:"},
"الطرف:":{"en": "Party:", "zh-CN": "往来方：", "es": "Parte:", "ur": "فریق:"},
"الطريقة:":{"en": "Method:", "zh-CN": "方式：", "es": "Método:", "ur": "طریقہ:"},
"سند صادر من سجل المنشأة للعملية المالية الموضحة أعلاه.":{"en": "Voucher issued from the business records for the financial transaction shown above.", "zh-CN": "此凭证由企业记录出具，用于上述财务交易。", "es": "Comprobante emitido desde los registros del negocio para la operación financiera indicada.", "ur": "اوپر دکھائے گئے مالی معاملے کے لیے کاروبار کے ریکارڈ سے جاری کردہ رسید۔"}
};

export function uiText(locale: AppLocale, text: string): string {
  if (locale === "ar") return text;
  return UI_TRANSLATIONS[text]?.[locale] ?? homepageText(locale, text);
}

export function localizeUiAttributes<T extends Record<string, unknown>>(locale: AppLocale, props: T): T {
  return translatedUiAttributes(uiMessagesForLocale(locale),props);
}

/** Interpolate presentation variables without changing identifiers or interpreting markup. */
export function uiFormat(locale: AppLocale, text: string, values: Record<string, string | number | bigint>): string {
 return formattedUiText(uiMessagesForLocale(locale),text,values);
}

/** Only the selected language is serialized to the browser. No business content is included. */
export function uiMessagesForLocale(locale:AppLocale):UiMessages {
 if(locale==="ar")return {};
 return Object.freeze(Object.fromEntries([...Object.entries(HOMEPAGE_TRANSLATIONS),...Object.entries(UI_TRANSLATIONS)].map(([key,value])=>[key,value[locale]])));
}
