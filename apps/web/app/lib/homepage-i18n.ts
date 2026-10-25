import type { AppLocale } from "./i18n";

/** Reviewed public-homepage copy; business-owned content is never machine-translated. */
export const HOMEPAGE_TRANSLATIONS: Record<string, Record<Exclude<AppLocale, "ar">, string>> = {
  "مجانية": {
    "en": "Free",
    "zh-CN": "免费",
    "es": "Gratis",
    "ur": "مفت"
  },
  "مطعم": {
    "en": "Restaurant",
    "zh-CN": "餐厅",
    "es": "Restaurante",
    "ur": "ریستوران"
  },
  "القائمة · الفروع · الحجز": {
    "en": "Menu · Branches · Booking",
    "zh-CN": "菜单 · 分店 · 预约",
    "es": "Menú · Sucursales · Reservas",
    "ur": "مینو · شاخیں · بکنگ"
  },
  "عيادة": {
    "en": "Clinic",
    "zh-CN": "诊所",
    "es": "Clínica",
    "ur": "کلینک"
  },
  "الخدمات · الفريق · الموقع": {
    "en": "Services · Team · Location",
    "zh-CN": "服务 · 团队 · 位置",
    "es": "Servicios · Equipo · Ubicación",
    "ur": "خدمات · ٹیم · مقام"
  },
  "متجر": {
    "en": "Store",
    "zh-CN": "商店",
    "es": "Tienda",
    "ur": "اسٹور"
  },
  "المنتجات · التواصل · الفروع": {
    "en": "Products · Contact · Branches",
    "zh-CN": "产品 · 联系方式 · 分店",
    "es": "Productos · Contacto · Sucursales",
    "ur": "مصنوعات · رابطہ · شاخیں"
  },
  "شركة خدمات": {
    "en": "Service business",
    "zh-CN": "服务企业",
    "es": "Empresa de servicios",
    "ur": "خدماتی کاروبار"
  },
  "الخدمات · الفريق · التواصل": {
    "en": "Services · Team · Contact",
    "zh-CN": "服务 · 团队 · 联系方式",
    "es": "Servicios · Equipo · Contacto",
    "ur": "خدمات · ٹیم · رابطہ"
  },
  "هل تبقى هوية INFRO ثابتة في صفحة منشأتي؟": {
    "en": "Does INFRO branding remain on my business page?",
    "zh-CN": "我的企业页面会保留 INFRO 品牌吗？",
    "es": "¿Se mantiene la marca INFRO en mi página?",
    "ur": "کیا میرے کاروباری صفحے پر INFRO کی شناخت برقرار رہتی ہے؟"
  },
  "نعم. تعتمد صفحات العملاء قالبًا موحدًا وعلامة INFRO ثابتة، وتعرض كل صفحة اسم المنشأة وشعارها والبايو وخدماتها وبياناتها الخاصة.": {
    "en": "Yes. Customer pages use a shared layout and fixed INFRO branding, with each business's own name, logo, bio, services and details.",
    "zh-CN": "是的。客户页面使用统一布局并保留 INFRO 品牌，同时展示各企业自己的名称、标志、简介、服务和资料。",
    "es": "Sí. Las páginas utilizan un diseño común y la marca INFRO, junto con el nombre, logotipo, descripción, servicios y datos de cada negocio.",
    "ur": "جی ہاں۔ صفحات میں مشترکہ ترتیب اور INFRO کی شناخت کے ساتھ ہر کاروبار کا اپنا نام، لوگو، تعارف، خدمات اور تفصیلات دکھائی جاتی ہیں۔"
  },
  "هل أستطيع تغيير ألوان الصفحة والخط؟": {
    "en": "Can I change the page colors and font?",
    "zh-CN": "我可以更改页面颜色和字体吗？",
    "es": "¿Puedo cambiar los colores y la fuente?",
    "ur": "کیا میں صفحے کے رنگ اور فونٹ بدل سکتا ہوں؟"
  },
  "يمكنك اختيار مجموعة ألوان جاهزة أو تخصيص اللون الرئيسي والتفاصيل والخلفية، والاختيار بين ثلاثة خطوط عربية. عاين النتيجة ثم احفظها، ويمكنك العودة إلى مظهر INFRO الافتراضي.": {
    "en": "Choose a preset palette or customize the primary, detail and background colors, and select from three Arabic fonts. Preview and save your changes, or restore the default INFRO appearance.",
    "zh-CN": "您可以选择预设配色，或自定义主色、细节色和背景色，并从三种阿拉伯文字体中选择。预览后保存，也可恢复 INFRO 默认外观。",
    "es": "Elige una paleta o personaliza los colores principal, de detalle y de fondo, y selecciona entre tres fuentes árabes. Previsualiza y guarda, o restaura el aspecto de INFRO.",
    "ur": "تیار رنگوں کا مجموعہ منتخب کریں یا مرکزی، تفصیلی اور پس منظر کے رنگ بدلیں، اور تین عربی فونٹس میں سے چنیں۔ پیش منظر دیکھ کر محفوظ کریں یا INFRO کی اصل شکل بحال کریں۔"
  },
  "كيف أنشر صفحة منشأتي؟": {
    "en": "How do I publish my business page?",
    "zh-CN": "如何发布我的企业页面？",
    "es": "¿Cómo publico la página de mi negocio?",
    "ur": "میں اپنے کاروبار کا صفحہ کیسے شائع کروں؟"
  },
  "أنشئ حسابك وأكد بريدك الإلكتروني، ثم أكمل بيانات المنشأة وعاين صفحتك قبل نشرها من لوحة التحكم. يمكنك تعديل بياناتك لاحقًا من الحساب نفسه.": {
    "en": "Create an account and verify your email, then complete your business details and preview the page before publishing from your dashboard. You can edit it later from the same account.",
    "zh-CN": "创建账户并验证邮箱，填写企业资料，预览页面后从控制面板发布。之后可在同一账户中修改。",
    "es": "Crea tu cuenta y verifica tu correo. Completa los datos, revisa la página y publícala desde el panel. Podrás editarla después desde la misma cuenta.",
    "ur": "اکاؤنٹ بنائیں اور ای میل کی تصدیق کریں، کاروباری تفصیلات مکمل کرکے پیش منظر دیکھیں اور ڈیش بورڈ سے شائع کریں۔ بعد میں اسی اکاؤنٹ سے ترمیم کر سکتے ہیں۔"
  },
  "هل يمكن إضافة موظفين بصلاحيات محددة؟": {
    "en": "Can I add employees with specific permissions?",
    "zh-CN": "可以为员工设置特定权限吗？",
    "es": "¿Puedo añadir empleados con permisos específicos?",
    "ur": "کیا ملازمین کو مخصوص اجازتوں کے ساتھ شامل کر سکتا ہوں؟"
  },
  "يمكن لصاحب المنشأة إضافة مستخدمين موظفين وتحديد الأقسام المسموح لهم بفتحها، دون منحهم الوصول إلى جميع أقسام الحساب.": {
    "en": "The business owner can add staff accounts and choose the sections they can access without giving access to the entire account.",
    "zh-CN": "企业所有者可以添加员工账户，并指定可访问的栏目，无需开放整个账户。",
    "es": "El propietario puede añadir empleados y elegir qué secciones pueden abrir sin darles acceso a toda la cuenta.",
    "ur": "کاروبار کا مالک ملازمین کے اکاؤنٹس بنا کر ان کے لیے مخصوص حصے کھول سکتا ہے، پورے اکاؤنٹ تک رسائی دیے بغیر۔"
  },
  "متى تعمل رسائل واتساب وتأكيدات الحجوزات؟": {
    "en": "When do WhatsApp messages and booking confirmations work?",
    "zh-CN": "WhatsApp 消息和预约确认何时可以使用？",
    "es": "¿Cuándo funcionan los mensajes y confirmaciones por WhatsApp?",
    "ur": "واٹس ایپ پیغامات اور بکنگ کی تصدیقات کب کام کرتی ہیں؟"
  },
  "يتطلب الإرسال ربط حساب واتساب للأعمال وإكمال تسجيل الرقم لدى Meta، واختيار قالب معتمد وإعداد الخدمة. الربط وحده لا يعني أن الإرسال أصبح جاهزًا؛ راجع حالة الاتصال والقوالب داخل حسابك.": {
    "en": "Sending requires a connected WhatsApp Business account, number registration with Meta, an approved template and service setup. Connection alone does not mean sending is ready; check your connection and template status in your account.",
    "zh-CN": "发送前需连接 WhatsApp Business 账户，在 Meta 完成号码注册，选择已获批准的模板并设置服务。仅连接账户并不代表已可发送；请在账户中查看连接及模板状态。",
    "es": "Para enviar, conecta WhatsApp Business, registra el número en Meta, elige una plantilla aprobada y configura el servicio. La conexión por sí sola no garantiza que el envío esté listo; revisa sus estados en tu cuenta.",
    "ur": "بھیجنے کے لیے واٹس ایپ بزنس اکاؤنٹ کا ربط، Meta میں نمبر کی رجسٹریشن، منظور شدہ سانچہ اور سروس کی ترتیب ضروری ہے۔ صرف ربط کافی نہیں؛ اکاؤنٹ میں کنکشن اور سانچوں کی حالت دیکھیں۔"
  },
  "جارٍ التحقق من الرابط…": {
    "en": "Checking availability…",
    "zh-CN": "正在检查链接…",
    "es": "Comprobando disponibilidad…",
    "ur": "لنک کی دستیابی جانچی جا رہی ہے…"
  },
  "هذا الرابط مستخدم. جرّب اسمًا آخر مميزًا لمنشأتك.": {
    "en": "This link is already in use. Try another name for your business.",
    "zh-CN": "此链接已被使用，请尝试其他企业名称。",
    "es": "Este enlace ya está en uso. Prueba otro nombre para tu negocio.",
    "ur": "یہ لنک پہلے سے استعمال میں ہے۔ اپنے کاروبار کے لیے دوسرا نام آزمائیں۔"
  },
  "هذا الاسم محمي وغير متاح للحجز الذاتي. تخصيصه يتطلب تفويضًا ومراجعة إدارية.": {
    "en": "This name is protected and cannot be reserved through self-service. Assignment requires authorization and administrative review.",
    "zh-CN": "此名称受保护，无法自行申请。分配需要授权和管理审核。",
    "es": "Este nombre está protegido. Su asignación requiere autorización y revisión administrativa.",
    "ur": "یہ نام محفوظ ہے اور خودکار طور پر حاصل نہیں کیا جا سکتا۔ اس کے لیے اجازت اور انتظامی جائزہ ضروری ہے۔"
  },
  "اكتب 4 أحرف على الأقل باستخدام الإنجليزية والأرقام والشرطة -": {
    "en": "Enter at least 4 characters using English letters, numbers and hyphens (-).",
    "zh-CN": "请至少输入 4 个字符，可使用英文字母、数字和连字符 (-)。",
    "es": "Introduce al menos 4 caracteres con letras inglesas, números y guiones (-).",
    "ur": "کم از کم 4 حروف لکھیں؛ انگریزی حروف، اعداد اور ہائفن (-) استعمال کریں۔"
  },
  "تعذر التحقق الآن. حاول مرة أخرى بعد قليل.": {
    "en": "We couldn't check availability. Please try again shortly.",
    "zh-CN": "暂时无法检查，请稍后重试。",
    "es": "No pudimos comprobarlo. Inténtalo de nuevo en unos momentos.",
    "ur": "ابھی دستیابی معلوم نہیں ہو سکی۔ کچھ دیر بعد دوبارہ کوشش کریں۔"
  },
  "التنقل الرئيسي": {
    "en": "Main navigation",
    "zh-CN": "主导航",
    "es": "Navegación principal",
    "ur": "مرکزی نیویگیشن"
  },
  "الرئيسية": {
    "en": "Home",
    "zh-CN": "首页",
    "es": "Inicio",
    "ur": "ہوم"
  },
  "عن INFRO": {
    "en": "About INFRO",
    "zh-CN": "关于 INFRO",
    "es": "Acerca de INFRO",
    "ur": "INFRO کے بارے میں"
  },
  "المميزات": {
    "en": "Features",
    "zh-CN": "功能",
    "es": "Funciones",
    "ur": "خصوصیات"
  },
  "نماذج الصفحات": {
    "en": "Page examples",
    "zh-CN": "页面示例",
    "es": "Ejemplos de páginas",
    "ur": "صفحات کی مثالیں"
  },
  "الباقات": {
    "en": "Plans",
    "zh-CN": "套餐",
    "es": "Planes",
    "ur": "پیکیجز"
  },
  "الأسئلة الشائعة": {
    "en": "Frequently asked questions",
    "zh-CN": "常见问题",
    "es": "Preguntas frecuentes",
    "ur": "عام سوالات"
  },
  "دخول": {
    "en": "Sign in",
    "zh-CN": "登录",
    "es": "Entrar",
    "ur": "لاگ ان"
  },
  "ابدأ مجانًا": {
    "en": "Start for free",
    "zh-CN": "免费开始",
    "es": "Empieza gratis",
    "ur": "مفت شروع کریں"
  },
  "فتح القائمة": {
    "en": "Open menu",
    "zh-CN": "打开菜单",
    "es": "Abrir menú",
    "ur": "مینو کھولیں"
  },
  "قائمة التنقل": {
    "en": "Navigation menu",
    "zh-CN": "导航菜单",
    "es": "Menú de navegación",
    "ur": "نیویگیشن مینو"
  },
  "إغلاق القائمة": {
    "en": "Close menu",
    "zh-CN": "关闭菜单",
    "es": "Cerrar menú",
    "ur": "مینو بند کریں"
  },
  "التنقل على الجوال": {
    "en": "Mobile navigation",
    "zh-CN": "移动导航",
    "es": "Navegación móvil",
    "ur": "موبائل نیویگیشن"
  },
  "تسجيل الدخول": {
    "en": "Sign in",
    "zh-CN": "登录",
    "es": "Iniciar sesión",
    "ur": "لاگ ان"
  },
  "مصممة للأعمال والمنشآت": {
    "en": "Designed for businesses",
    "zh-CN": "专为企业打造",
    "es": "Diseñada para negocios",
    "ur": "کاروباروں کے لیے تیار"
  },
  "هويتك الرقمية والتسويقية.": {
    "en": "Your digital and marketing identity.",
    "zh-CN": "您的数字与营销身份。",
    "es": "Tu identidad digital y de marketing.",
    "ur": "آپ کی ڈیجیٹل اور مارکیٹنگ شناخت۔"
  },
  "في مساحة أعمال واحدة.": {
    "en": "One connected business workspace.",
    "zh-CN": "一个互联的企业工作空间。",
    "es": "Un espacio de trabajo conectado.",
    "ur": "ایک مربوط کاروباری جگہ میں۔"
  },
  "اجمع هوية منشأتك وحضورها الرقمي وتذكيرات أعمالك وتسويق واتساب في تجربة واحدة مترابطة وسهلة الإدارة.": {
    "en": "Bring your business identity, digital presence, reminders and WhatsApp marketing together in one connected, easy-to-manage experience.",
    "zh-CN": "将企业身份、数字形象、提醒和 WhatsApp 营销整合到一个互联且易于管理的平台。",
    "es": "Reúne tu identidad, presencia digital, recordatorios y marketing por WhatsApp en una experiencia conectada y fácil de gestionar.",
    "ur": "اپنی کاروباری شناخت، ڈیجیٹل موجودگی، یاد دہانیوں اور واٹس ایپ مارکیٹنگ کو ایک مربوط اور آسان نظام میں جمع کریں۔"
  },
  "تحقق من توفر اسم رابط منشأتك": {
    "en": "Check your business link availability",
    "zh-CN": "检查企业链接名称是否可用",
    "es": "Comprueba el enlace de tu negocio",
    "ur": "اپنے کاروباری لنک کی دستیابی جانچیں"
  },
  "تحقق وابدأ التسجيل": {
    "en": "Check and start registration",
    "zh-CN": "检查并开始注册",
    "es": "Comprueba y regístrate",
    "ur": "جانچیں اور رجسٹریشن شروع کریں"
  },
  "اكتب اسم منشأتك بالإنجليزية وسنتحقق من توفره مباشرة.": {
    "en": "Enter your business name in English to check its availability instantly.",
    "zh-CN": "输入企业的英文名称，即可检查是否可用。",
    "es": "Escribe el nombre de tu negocio en inglés y comprobaremos su disponibilidad.",
    "ur": "اپنے کاروبار کا نام انگریزی میں لکھیں، ہم فوراً دستیابی جانچیں گے۔"
  },
  "بدون تعقيد": {
    "en": "Simple to use",
    "zh-CN": "操作简单",
    "es": "Fácil de usar",
    "ur": "استعمال میں آسان"
  },
  "جاهزة للجوال": {
    "en": "Mobile ready",
    "zh-CN": "适配手机",
    "es": "Adaptada al móvil",
    "ur": "موبائل کے لیے تیار"
  },
  "شاهد صفحة أعمال نموذجية": {
    "en": "View a sample business page",
    "zh-CN": "查看企业页面示例",
    "es": "Ver una página de ejemplo",
    "ur": "کاروباری صفحے کی مثال دیکھیں"
  },
  "رابط مختصر": {
    "en": "Short link",
    "zh-CN": "短链接",
    "es": "Enlace corto",
    "ur": "مختصر لنک"
  },
  "سهل الحفظ والمشاركة": {
    "en": "Easy to remember and share",
    "zh-CN": "便于记忆和分享",
    "es": "Fácil de recordar y compartir",
    "ur": "یاد رکھنے اور شیئر کرنے میں آسان"
  },
  "هوية احترافية": {
    "en": "Professional identity",
    "zh-CN": "专业形象",
    "es": "Identidad profesional",
    "ur": "پیشہ ورانہ شناخت"
  },
  "تخصيص يناسب علامتك": {
    "en": "Customization for your brand",
    "zh-CN": "符合品牌的个性化设置",
    "es": "Personalización para tu marca",
    "ur": "آپ کے برانڈ کے مطابق تخصیص"
  },
  "إحصاءات واضحة": {
    "en": "Clear analytics",
    "zh-CN": "清晰的数据分析",
    "es": "Estadísticas claras",
    "ur": "واضح اعداد و شمار"
  },
  "افهم تفاعل زوارك": {
    "en": "Understand visitor engagement",
    "zh-CN": "了解访客互动",
    "es": "Entiende la interacción de tus visitantes",
    "ur": "زائرین کی دلچسپی سمجھیں"
  },
  "حضور موثوق": {
    "en": "Trusted presence",
    "zh-CN": "可信的企业形象",
    "es": "Presencia de confianza",
    "ur": "قابل اعتماد موجودگی"
  },
  "واجهة أعمال منظمة": {
    "en": "An organized business page",
    "zh-CN": "井然有序的企业页面",
    "es": "Una página de negocio organizada",
    "ur": "منظم کاروباری صفحہ"
  },
  "من نحن": {
    "en": "Who we are",
    "zh-CN": "我们是谁",
    "es": "Quiénes somos",
    "ur": "ہم کون ہیں"
  },
  "INFRO للهوية الرقمية والتسويقية": {
    "en": "INFRO for digital identity and marketing",
    "zh-CN": "INFRO 数字身份与营销",
    "es": "INFRO para identidad digital y marketing",
    "ur": "ڈیجیٹل شناخت اور مارکیٹنگ کے لیے INFRO"
  },
  "INFRO مشروع تقني سعودي يساعد المنشآت على بناء هوية أعمال رقمية وتسويقية موثوقة ومنظمة، ويجمع الحضور الرقمي وإدارة الأعمال والتواصل التسويقي في مساحة واحدة مترابطة.": {
    "en": "INFRO is a Saudi technology project that helps businesses build a trusted, organized digital and marketing identity, bringing digital presence, operations and marketing communication into one connected workspace.",
    "zh-CN": "INFRO 是沙特科技项目，帮助企业建立可信、有序的数字与营销身份，将数字形象、企业管理和营销沟通整合到一个互联的工作空间。",
    "es": "INFRO es un proyecto tecnológico saudí que ayuda a crear una identidad digital y de marketing fiable y organizada, uniendo presencia digital, gestión y comunicación en un solo espacio.",
    "ur": "INFRO ایک سعودی ٹیکنالوجی منصوبہ ہے جو کاروباروں کو معتبر اور منظم ڈیجیٹل و مارکیٹنگ شناخت بنانے میں مدد دیتا ہے، اور ڈیجیٹل موجودگی، انتظام اور مارکیٹنگ رابطے کو ایک جگہ جمع کرتا ہے۔"
  },
  "الكيان القانوني: مجموعة طلبات المعلومات لخدمات الأعمال": {
    "en": "Legal entity: Majmouat Talabat Al-Maloumat for Business Services",
    "zh-CN": "法律实体：Majmouat Talabat Al-Maloumat for Business Services",
    "es": "Entidad legal: Majmouat Talabat Al-Maloumat for Business Services",
    "ur": "قانونی ادارہ: Majmouat Talabat Al-Maloumat for Business Services"
  },
  "WhatsApp Business Platform الرسمي": {
    "en": "Official WhatsApp Business Platform",
    "zh-CN": "官方 WhatsApp Business Platform",
    "es": "WhatsApp Business Platform oficial",
    "ur": "آفیشل WhatsApp Business Platform"
  },
  "تتضمن منظومة INFRO خدمة WhatsApp Marketing المبنية حصريًا على WhatsApp Business Platform / Cloud API الرسمي من Meta، لربط كل منشأة بحساب WABA ورقمها الخاص وإدارة القوالب والحملات والمحادثات، مع احترام موافقة العملاء والخصوصية وإلغاء الاشتراك.": {
    "en": "INFRO WhatsApp Marketing uses only Meta's official WhatsApp Business Platform / Cloud API. Each business connects its own WABA account and number to manage templates, campaigns and conversations, respecting customer consent, privacy and opt-outs.",
    "zh-CN": "INFRO 的 WhatsApp 营销仅使用 Meta 官方 WhatsApp Business Platform / Cloud API。每家企业连接自己的 WABA 账户和号码，管理模板、营销活动和对话，并尊重客户同意、隐私及退订选择。",
    "es": "INFRO WhatsApp Marketing utiliza exclusivamente WhatsApp Business Platform / Cloud API oficial de Meta. Cada negocio conecta su propio WABA y número para gestionar plantillas, campañas y conversaciones, respetando el consentimiento, la privacidad y las bajas.",
    "ur": "INFRO واٹس ایپ مارکیٹنگ صرف Meta کا آفیشل WhatsApp Business Platform / Cloud API استعمال کرتی ہے۔ ہر کاروبار اپنا WABA اکاؤنٹ اور نمبر جوڑ کر سانچے، مہمات اور گفتگو سنبھالتا ہے، صارف کی رضامندی، رازداری اور ان سبسکرائب کا احترام کرتے ہوئے۔"
  },
  "بيانات التواصل": {
    "en": "Contact details",
    "zh-CN": "联系资料",
    "es": "Datos de contacto",
    "ur": "رابطے کی تفصیلات"
  },
  "التواصل والتحقق التجاري": {
    "en": "Contact and business verification",
    "zh-CN": "联系与企业核实",
    "es": "Contacto y verificación comercial",
    "ur": "رابطہ اور کاروباری تصدیق"
  },
  "يسعدنا تواصلك": {
    "en": "We'd love to hear from you",
    "zh-CN": "欢迎联系我们",
    "es": "Estamos para ayudarte",
    "ur": "ہم سے رابطہ کریں"
  },
  "للاستفسارات المتعلقة بمنصة INFRO أو خدمات WhatsApp Business الرسمية، تواصل معنا عبر الرقم المسجل في بياناتنا الرسمية.": {
    "en": "For questions about INFRO or official WhatsApp Business services, contact us at the number listed in our official business details.",
    "zh-CN": "如需咨询 INFRO 或官方 WhatsApp Business 服务，请拨打我们官方企业资料中的联系电话。",
    "es": "Para consultas sobre INFRO o los servicios oficiales de WhatsApp Business, utiliza el número registrado en nuestros datos oficiales.",
    "ur": "INFRO یا آفیشل واٹس ایپ بزنس خدمات کے متعلق سوالات کے لیے ہماری سرکاری کاروباری تفصیلات میں درج نمبر پر رابطہ کریں۔"
  },
  "التواصل عبر واتساب": {
    "en": "Contact via WhatsApp",
    "zh-CN": "通过 WhatsApp 联系",
    "es": "Contactar por WhatsApp",
    "ur": "واٹس ایپ پر رابطہ کریں"
  },
  "مساحة أعمال وليست مجرد روابط": {
    "en": "A workspace beyond links",
    "zh-CN": "不止于链接的企业空间",
    "es": "Un espacio de trabajo más allá de los enlaces",
    "ur": "لنکس سے آگے ایک کاروباری جگہ"
  },
  "اجعل عميلك يصل إلى المهم، واجعل فريقك يعرف الخطوة التالية.": {
    "en": "Help customers find what matters and your team know what comes next.",
    "zh-CN": "让客户找到重要信息，让团队明确下一步。",
    "es": "Ayuda al cliente a encontrar lo importante y a tu equipo a saber el siguiente paso.",
    "ur": "گاہک کو ضروری معلومات تک پہنچائیں اور ٹیم کو اگلا قدم واضح کریں۔"
  },
  "من أول زيارة يستطيع العميل فهم نشاطك والوصول لخدماتك، بينما تساعدك أدوات INFRO على تنظيم حضورك ومتابعة أعمالك والتواصل مع عملائك.": {
    "en": "From their first visit, customers can understand your business and access your services, while INFRO helps you organize your presence, follow up on work and stay in touch.",
    "zh-CN": "客户首次访问即可了解您的业务并获取服务，同时 INFRO 帮助您管理形象、跟进工作并与客户保持联系。",
    "es": "Desde la primera visita, tus clientes podrán conocer tu negocio y acceder a tus servicios, mientras INFRO te ayuda a organizar tu presencia, seguir el trabajo y mantener el contacto.",
    "ur": "پہلے دورے سے ہی گاہک آپ کا کاروبار سمجھ سکتا ہے اور خدمات تک پہنچ سکتا ہے، جبکہ INFRO آپ کی موجودگی، کام کی پیروی اور رابطے کو منظم کرتا ہے۔"
  },
  "الهوية الرقمية": {
    "en": "Digital identity",
    "zh-CN": "数字身份",
    "es": "Identidad digital",
    "ur": "ڈیجیٹل شناخت"
  },
  "حضور موحد وواضح": {
    "en": "One clear, consistent presence",
    "zh-CN": "统一清晰的企业形象",
    "es": "Una presencia clara y coherente",
    "ur": "یکساں اور واضح موجودگی"
  },
  "التذكيرات الذكية": {
    "en": "Smart reminders",
    "zh-CN": "智能提醒",
    "es": "Recordatorios inteligentes",
    "ur": "اسمارٹ یاد دہانیاں"
  },
  "متابعة ما يجب إنجازه": {
    "en": "Keep track of what needs doing",
    "zh-CN": "跟进待办事项",
    "es": "Sigue lo que queda por hacer",
    "ur": "ضروری کاموں کی پیروی"
  },
  "مذكرات الأعمال": {
    "en": "Business notes",
    "zh-CN": "业务笔记",
    "es": "Notas de negocio",
    "ur": "کاروباری نوٹس"
  },
  "ذاكرة تشغيلية منظمة": {
    "en": "Organized operational records",
    "zh-CN": "有序的运营记录",
    "es": "Registros operativos organizados",
    "ur": "منظم عملی ریکارڈ"
  },
  "تسويق واتساب": {
    "en": "WhatsApp marketing",
    "zh-CN": "WhatsApp 营销",
    "es": "Marketing por WhatsApp",
    "ur": "واٹس ایپ مارکیٹنگ"
  },
  "قنوات رسمية ومتوافقة": {
    "en": "Official, compliant channels",
    "zh-CN": "官方合规渠道",
    "es": "Canales oficiales y conformes",
    "ur": "آفیشل اور ضوابط کے مطابق ذرائع"
  },
  "من الفكرة إلى مساحة عملك": {
    "en": "From an idea to your workspace",
    "zh-CN": "从创意到您的工作空间",
    "es": "De la idea a tu espacio de trabajo",
    "ur": "خیال سے کاروباری جگہ تک"
  },
  "ابدأ في 3 خطوات واضحة": {
    "en": "Start in 3 clear steps",
    "zh-CN": "三个步骤，轻松开始",
    "es": "Empieza en 3 pasos claros",
    "ur": "3 آسان مراحل میں شروع کریں"
  },
  "اختر اسم رابطك": {
    "en": "Choose your link name",
    "zh-CN": "选择链接名称",
    "es": "Elige el nombre de tu enlace",
    "ur": "اپنے لنک کا نام منتخب کریں"
  },
  "تحقق من توفر اسم منشأتك ثم ابدأ التسجيل.": {
    "en": "Check your business name's availability, then start registration.",
    "zh-CN": "检查企业名称是否可用，然后开始注册。",
    "es": "Comprueba si tu nombre está disponible y empieza el registro.",
    "ur": "کاروباری نام کی دستیابی جانچیں اور رجسٹریشن شروع کریں۔"
  },
  "ابنِ هويتك": {
    "en": "Build your identity",
    "zh-CN": "建立企业身份",
    "es": "Crea tu identidad",
    "ur": "اپنی شناخت بنائیں"
  },
  "أضف بيانات منشأتك وخدماتها وفروعها ووسائل التواصل.": {
    "en": "Add your business details, services, branches and contact channels.",
    "zh-CN": "添加企业资料、服务、分店和联系方式。",
    "es": "Añade los datos, servicios, sucursales y canales de contacto de tu negocio.",
    "ur": "کاروبار کی تفصیلات، خدمات، شاخیں اور رابطے کے ذرائع شامل کریں۔"
  },
  "نظّم وتواصل": {
    "en": "Organize and connect",
    "zh-CN": "管理并保持联系",
    "es": "Organiza y conecta",
    "ur": "منظم کریں اور رابطہ رکھیں"
  },
  "استخدم مذكرات الأعمال والتذكيرات وتسويق واتساب من مركز عمل واحد.": {
    "en": "Use business notes, reminders and WhatsApp marketing from one workspace.",
    "zh-CN": "在同一工作空间使用业务笔记、提醒和 WhatsApp 营销。",
    "es": "Utiliza notas, recordatorios y marketing por WhatsApp desde un solo lugar.",
    "ur": "کاروباری نوٹس، یاد دہانیاں اور واٹس ایپ مارکیٹنگ ایک ہی جگہ استعمال کریں۔"
  },
  "INFRO / حضور يخصّك": {
    "en": "INFRO / A presence of your own",
    "zh-CN": "INFRO / 专属企业形象",
    "es": "INFRO / Tu propia presencia",
    "ur": "INFRO / آپ کی اپنی موجودگی"
  },
  "نشاطك مختلف.": {
    "en": "Your business is unique.",
    "zh-CN": "您的业务与众不同。",
    "es": "Tu negocio es único.",
    "ur": "آپ کا کاروبار منفرد ہے۔"
  },
  "وحضورك يستحق أن يعبّر عنه.": {
    "en": "Your presence should reflect it.",
    "zh-CN": "您的企业形象也应如此。",
    "es": "Tu presencia debe reflejarlo.",
    "ur": "آپ کی موجودگی بھی اس کی عکاسی کرے۔"
  },
  "صُممت INFRO لتجمع اسمك وخدماتك وفروعك في صفحة واحدة. ترتيب واضح لعميلك، ومساحة مرنة لألوان علامتك وخطها.": {
    "en": "INFRO brings your name, services and branches together on one page. A clear layout for customers, with flexibility for your brand colors and font.",
    "zh-CN": "INFRO 将企业名称、服务和分店汇集于同一页面。布局清晰，并可灵活设置品牌颜色和字体。",
    "es": "INFRO reúne tu nombre, servicios y sucursales en una página, con un diseño claro y flexibilidad para los colores y la fuente de tu marca.",
    "ur": "INFRO آپ کا نام، خدمات اور شاخیں ایک صفحے پر جمع کرتا ہے۔ گاہک کے لیے واضح ترتیب اور آپ کے برانڈ کے رنگوں اور فونٹ کی آزادی۔"
  },
  "استكشف الصفحة النموذجية": {
    "en": "Explore the demo page",
    "zh-CN": "浏览演示页面",
    "es": "Explora la página de demostración",
    "ur": "نمونہ صفحہ دیکھیں"
  },
  "نموذج توضيحي قابل للتصفح، وليس حساب عميل.": {
    "en": "An interactive demonstration, not a customer account.",
    "zh-CN": "可浏览的演示页面，非真实客户账户。",
    "es": "Una demostración interactiva, no una cuenta de cliente.",
    "ur": "قابلِ مشاہدہ نمونہ، کسی گاہک کا اکاؤنٹ نہیں۔"
  },
  "بُنيت للمنشآت السعودية": {
    "en": "Built for Saudi businesses",
    "zh-CN": "专为沙特企业打造",
    "es": "Creada para negocios saudíes",
    "ur": "سعودی کاروباروں کے لیے تیار"
  },
  "هوية رقمية وتسويقية واضحة تساعدك على إدارة حضور منشأتك وعلاقات عملائك من مكان واحد.": {
    "en": "A clear digital and marketing identity to manage your business presence and customer relationships in one place.",
    "zh-CN": "清晰的数字与营销身份，让您在一处管理企业形象和客户关系。",
    "es": "Una identidad digital y de marketing clara para gestionar tu presencia y las relaciones con clientes desde un solo lugar.",
    "ur": "واضح ڈیجیٹل اور مارکیٹنگ شناخت، تاکہ کاروباری موجودگی اور گاہکوں سے تعلق ایک جگہ سنبھال سکیں۔"
  },
  "مطاعم ومقاهي": {
    "en": "Restaurants and cafés",
    "zh-CN": "餐厅与咖啡馆",
    "es": "Restaurantes y cafeterías",
    "ur": "ریستوران اور کیفے"
  },
  "عيادات": {
    "en": "Clinics",
    "zh-CN": "诊所",
    "es": "Clínicas",
    "ur": "کلینکس"
  },
  "متاجر": {
    "en": "Stores",
    "zh-CN": "商店",
    "es": "Tiendas",
    "ur": "اسٹورز"
  },
  "شركات خدمات": {
    "en": "Service businesses",
    "zh-CN": "服务企业",
    "es": "Empresas de servicios",
    "ur": "خدماتی کاروبار"
  },
  "مكاتب مهنية": {
    "en": "Professional offices",
    "zh-CN": "专业事务所",
    "es": "Despachos profesionales",
    "ur": "پیشہ ورانہ دفاتر"
  },
  "باقات تناسب نموك": {
    "en": "Plans that grow with you",
    "zh-CN": "伴随您成长的套餐",
    "es": "Planes para tu crecimiento",
    "ur": "آپ کی ترقی کے مطابق پیکیجز"
  },
  "ابدأ مجانًا، وطوّر حضورك عند الحاجة": {
    "en": "Start free and expand when you need to",
    "zh-CN": "免费开始，按需升级",
    "es": "Empieza gratis y amplía cuando lo necesites",
    "ur": "مفت شروع کریں، ضرورت پر آگے بڑھیں"
  },
  "التسجيل يبدأ بحساب مجاني. تُعرض إمكانية الترقية وشروطها داخل الحساب عند إتاحتها، ولا يتم تفعيل اشتراك مدفوع بمجرد التسجيل.": {
    "en": "Registration starts with a free account. Upgrade availability and terms are shown in your account when offered. Registering alone does not activate a paid subscription.",
    "zh-CN": "注册后先获得免费账户。开放升级时，账户中会显示条件及可用选项。注册本身不会开通付费订阅。",
    "es": "El registro empieza con una cuenta gratuita. Las opciones y condiciones de mejora aparecerán en tu cuenta cuando estén disponibles. Registrarte no activa una suscripción de pago.",
    "ur": "رجسٹریشن مفت اکاؤنٹ سے شروع ہوتی ہے۔ اپ گریڈ کی دستیابی اور شرائط اکاؤنٹ میں دکھائی جائیں گی۔ صرف رجسٹریشن سے بامعاوضہ اشتراک فعال نہیں ہوتا۔"
  },
  "للأعمال المتنامية": {
    "en": "For growing businesses",
    "zh-CN": "适合成长型企业",
    "es": "Para negocios en crecimiento",
    "ur": "ترقی کرتے کاروباروں کے لیے"
  },
  "أنشئ حسابك المجاني": {
    "en": "Create your free account",
    "zh-CN": "创建免费账户",
    "es": "Crea tu cuenta gratuita",
    "ur": "اپنا مفت اکاؤنٹ بنائیں"
  },
  "تفاصيل الخدمات ومقارنة الميزات والخدمات المنفصلة": {
    "en": "Service details, feature comparison and standalone services",
    "zh-CN": "服务详情、功能对比和独立服务",
    "es": "Detalles, comparación de funciones y servicios individuales",
    "ur": "خدمات کی تفصیل، خصوصیات کا موازنہ اور الگ خدمات"
  },
  "اسم منشأتك يستحق رابطًا يليق بها.": {
    "en": "Your business deserves a link to match.",
    "zh-CN": "您的企业值得拥有专属链接。",
    "es": "Tu negocio merece un enlace a su altura.",
    "ur": "آپ کے کاروبار کو موزوں لنک ملنا چاہیے۔"
  },
  "تحقق من توفره الآن وابدأ بناء حضورك الرقمي والتسويقي على INFRO.": {
    "en": "Check availability and start building your digital and marketing presence on INFRO.",
    "zh-CN": "立即检查可用性，在 INFRO 建立您的数字与营销形象。",
    "es": "Comprueba su disponibilidad y empieza a crear tu presencia digital y de marketing en INFRO.",
    "ur": "دستیابی جانچیں اور INFRO پر اپنی ڈیجیٹل اور مارکیٹنگ موجودگی بنائیں۔"
  },
  "تحقق من اسم رابطك": {
    "en": "Check your link name",
    "zh-CN": "检查链接名称",
    "es": "Comprueba tu enlace",
    "ur": "اپنے لنک کا نام جانچیں"
  },
  "قبل أن تبدأ": {
    "en": "Before you begin",
    "zh-CN": "开始之前",
    "es": "Antes de empezar",
    "ur": "شروع کرنے سے پہلے"
  },
  "إجابات واضحة لخطوتك الأولى": {
    "en": "Clear answers for your first step",
    "zh-CN": "助您迈出第一步的清晰解答",
    "es": "Respuestas claras para tu primer paso",
    "ur": "پہلے قدم کے لیے واضح جوابات"
  },
  "تعرّف على ما يمكنك تخصيصه، وطريقة النشر، ومتطلبات تشغيل قنوات التواصل.": {
    "en": "Learn what you can customize, how to publish and what you need to activate communication channels.",
    "zh-CN": "了解可自定义的内容、发布方法及启用沟通渠道所需的条件。",
    "es": "Descubre qué puedes personalizar, cómo publicar y qué necesitas para activar tus canales de comunicación.",
    "ur": "جانیں کہ کیا بدل سکتے ہیں، صفحہ کیسے شائع ہوتا ہے اور رابطے کے ذرائع فعال کرنے کے لیے کیا ضروری ہے۔"
  },
  "لديك سؤال آخر؟ تواصل معنا": {
    "en": "Have another question? Contact us",
    "zh-CN": "还有问题？联系我们",
    "es": "¿Tienes otra pregunta? Contáctanos",
    "ur": "مزید سوال ہے؟ ہم سے رابطہ کریں"
  },
  "INFRO منصة سعودية لهويتك الرقمية والتسويقية. اجمع حضور منشأتك وأدوات عملك في مساحة واحدة مترابطة.": {
    "en": "INFRO is a Saudi platform for your digital and marketing identity. Bring your business presence and tools together in one connected workspace.",
    "zh-CN": "INFRO 是沙特数字身份与营销平台，将您的企业形象和业务工具整合在一个互联的工作空间。",
    "es": "INFRO es una plataforma saudí para tu identidad digital y de marketing. Reúne tu presencia y herramientas en un espacio conectado.",
    "ur": "INFRO آپ کی ڈیجیٹل اور مارکیٹنگ شناخت کے لیے سعودی پلیٹ فارم ہے۔ کاروباری موجودگی اور اوزار ایک مربوط جگہ پر جمع کریں۔"
  },
  "سياسة الخصوصية": {
    "en": "Privacy policy",
    "zh-CN": "隐私政策",
    "es": "Política de privacidad",
    "ur": "رازداری کی پالیسی"
  },
  "الشروط والأحكام": {
    "en": "Terms and conditions",
    "zh-CN": "条款与条件",
    "es": "Términos y condiciones",
    "ur": "شرائط و ضوابط"
  },
  "تواصل معنا": {
    "en": "Contact us",
    "zh-CN": "联系我们",
    "es": "Contacto",
    "ur": "ہم سے رابطہ کریں"
  },
  "معاينة صفحة العميل داخل هاتف": {
    "en": "Customer page preview inside a phone",
    "zh-CN": "手机内的客户页面预览",
    "es": "Vista previa de la página en un teléfono",
    "ur": "فون میں کاروباری صفحے کا پیش منظر"
  },
  "نموذج صفحة عميل INFRO": {
    "en": "INFRO customer page example",
    "zh-CN": "INFRO 客户页面示例",
    "es": "Ejemplo de página de cliente INFRO",
    "ur": "INFRO کے کاروباری صفحے کی مثال"
  },
  "استكشف صفحة العميل": {
    "en": "Explore the customer page",
    "zh-CN": "浏览客户页面",
    "es": "Explora la página de cliente",
    "ur": "کاروباری صفحہ دیکھیں"
  },
  "صفحة نموذجية ببيانات توضيحية": {
    "en": "A sample page with illustrative data",
    "zh-CN": "使用示例资料的演示页面",
    "es": "Página de ejemplo con datos ilustrativos",
    "ur": "نمونہ معلومات والا صفحہ"
  },
  "الهوية": {
    "en": "Identity",
    "zh-CN": "企业身份",
    "es": "Identidad",
    "ur": "شناخت"
  },
  "هوية رقمية مجانية للتعريف بنشاطك والتواصل مع عملائك.": {
    "en": "A free digital identity to introduce your business and connect with customers.",
    "zh-CN": "免费数字身份，展示企业并联系客户。",
    "es": "Una identidad digital gratuita para presentar tu negocio y conectar con clientes.",
    "ur": "کاروبار کا تعارف اور گاہکوں سے رابطے کے لیے مفت ڈیجیٹل شناخت۔"
  },
  "صفحة المنشأة والشعار والألوان والخدمات": {
    "en": "Business page, logo, colors and services",
    "zh-CN": "企业页面、标志、颜色与服务",
    "es": "Página, logotipo, colores y servicios",
    "ur": "کاروباری صفحہ، لوگو، رنگ اور خدمات"
  },
  "فرع واحد و3 منتجات": {
    "en": "1 branch and 3 products",
    "zh-CN": "1 家分店和 3 个产品",
    "es": "1 sucursal y 3 productos",
    "ur": "1 شاخ اور 3 مصنوعات"
  },
  "روابط التواصل والموقع وتحليلات أساسية": {
    "en": "Contact links, location and basic analytics",
    "zh-CN": "联系链接、位置及基础分析",
    "es": "Enlaces de contacto, ubicación y estadísticas básicas",
    "ur": "رابطے کے لنکس، مقام اور بنیادی اعداد و شمار"
  },
  "حساب المالك · دون حجز مواعيد": {
    "en": "Owner account · No appointment booking",
    "zh-CN": "所有者账户 · 不含预约",
    "es": "Cuenta del propietario · Sin reservas",
    "ur": "مالک کا اکاؤنٹ · بکنگ شامل نہیں"
  },
  "التشغيل": {
    "en": "Operations",
    "zh-CN": "运营",
    "es": "Operaciones",
    "ur": "آپریشنز"
  },
  "المواعيد والكاشير والمحاسبة لإدارة نشاطك اليومي.": {
    "en": "Appointments, POS and accounting for daily operations.",
    "zh-CN": "预约、收银与会计，管理日常业务。",
    "es": "Citas, punto de venta y contabilidad para el día a día.",
    "ur": "روزمرہ کاروبار کے لیے بکنگ، کیشئر اور حسابات۔"
  },
  "جميع ميزات الهوية + حجز المواعيد": {
    "en": "All Identity features + appointment booking",
    "zh-CN": "所有身份套餐功能 + 预约",
    "es": "Todo lo de Identidad + reservas",
    "ur": "شناخت کی تمام خصوصیات + بکنگ"
  },
  "كاشير وفواتير تتكيف مع نشاطك": {
    "en": "POS and invoices tailored to your business activity",
    "zh-CN": "适配业务类型的收银和发票",
    "es": "Punto de venta y facturas adaptados a tu actividad",
    "ur": "کاروبار کی نوعیت کے مطابق کیشئر اور بل"
  },
  "اشتراكات رصيد أو قطع أو زيارات مع إظهار المتبقي بالفاتورة": {
    "en": "Customer subscriptions by balance, items or visits, with remaining allowance on invoices",
    "zh-CN": "按余额、件数或次数管理客户订阅，并在发票上显示剩余配额",
    "es": "Suscripciones de saldo, artículos o visitas con el restante en la factura",
    "ur": "گاہکوں کے بیلنس، اشیا یا دوروں کے اشتراک، بل پر باقی مقدار کے ساتھ"
  },
  "مخزون وموردون ومشتريات وقيود وسندات وتقارير": {
    "en": "Inventory, suppliers, purchases, journal entries, vouchers and reports",
    "zh-CN": "库存、供应商、采购、会计分录、凭证和报表",
    "es": "Inventario, proveedores, compras, asientos, comprobantes e informes",
    "ur": "اسٹاک، سپلائرز، خریداری، روزنامچہ، واؤچرز اور رپورٹس"
  },
  "جاهزية وتذكيرات وطلب تقييم تلقائي بموافقة العميل": {
    "en": "Automatic ready notices, reminders and review requests with customer consent",
    "zh-CN": "经客户同意后自动发送就绪通知、提醒和评价请求",
    "es": "Avisos, recordatorios y solicitudes de valoración automáticos con consentimiento",
    "ur": "گاہک کی رضامندی سے خودکار تیاری کی اطلاع، یاد دہانیاں اور جائزے کی درخواست"
  },
  "3 مستخدمين شامل المالك · فرع واحد": {
    "en": "3 users including owner · 1 branch",
    "zh-CN": "3 位用户（含所有者）· 1 家分店",
    "es": "3 usuarios incluido el propietario · 1 sucursal",
    "ur": "مالک سمیت 3 صارفین · 1 شاخ"
  },
  "2,000 فاتورة و250 حجزًا جديدًا شهريًا": {
    "en": "2,000 invoices and 250 new bookings per month",
    "zh-CN": "每月 2,000 张发票和 250 个新预约",
    "es": "2.000 facturas y 250 reservas nuevas al mes",
    "ur": "ماہانہ 2,000 بل اور 250 نئی بکنگ"
  },
  "10,000 إشعار تشغيلي شهريًا · دون حملات تسويقية": {
    "en": "10,000 operational notifications per month · No marketing campaigns",
    "zh-CN": "每月 10,000 条运营通知 · 不含营销活动",
    "es": "10.000 avisos operativos al mes · Sin campañas de marketing",
    "ur": "ماہانہ 10,000 عملی اطلاعات · مارکیٹنگ مہمات شامل نہیں"
  },
  "النمو": {
    "en": "Growth",
    "zh-CN": "成长",
    "es": "Crecimiento",
    "ur": "ترقی"
  },
  "التشغيل مع تسويق واتساب والأتمتة وتنمية المبيعات.": {
    "en": "Operations with WhatsApp marketing, automation and sales growth.",
    "zh-CN": "运营功能，加上 WhatsApp 营销、自动化和销售增长工具。",
    "es": "Operaciones con marketing por WhatsApp, automatización y crecimiento de ventas.",
    "ur": "آپریشنز کے ساتھ واٹس ایپ مارکیٹنگ، خودکاری اور فروخت میں اضافہ۔"
  },
  "جميع ميزات التشغيل": {
    "en": "All Operations features",
    "zh-CN": "所有运营套餐功能",
    "es": "Todo lo de Operaciones",
    "ur": "آپریشنز کی تمام خصوصیات"
  },
  "حملات واتساب وصندوق الردود والأتمتة": {
    "en": "WhatsApp campaigns, shared inbox and automation",
    "zh-CN": "WhatsApp 营销活动、收件箱与自动化",
    "es": "Campañas de WhatsApp, bandeja de entrada y automatización",
    "ur": "واٹس ایپ مہمات، ان باکس اور خودکاری"
  },
  "ربط متجر مدعوم وتحليلات متقدمة": {
    "en": "Supported store integration and advanced analytics",
    "zh-CN": "支持的商店集成和高级分析",
    "es": "Integración de tienda compatible y estadísticas avanzadas",
    "ur": "معاون اسٹور کا ربط اور تفصیلی اعداد و شمار"
  },
  "5 مستخدمين شامل المالك · فرعان": {
    "en": "5 users including owner · 2 branches",
    "zh-CN": "5 位用户（含所有者）· 2 家分店",
    "es": "5 usuarios incluido el propietario · 2 sucursales",
    "ur": "مالک سمیت 5 صارفین · 2 شاخیں"
  },
  "5,000 فاتورة و1,000 حجز جديد شهريًا": {
    "en": "5,000 invoices and 1,000 new bookings per month",
    "zh-CN": "每月 5,000 张发票和 1,000 个新预约",
    "es": "5.000 facturas y 1.000 reservas nuevas al mes",
    "ur": "ماہانہ 5,000 بل اور 1,000 نئی بکنگ"
  },
  "100,000 رسالة حملات وأتمتة شهريًا + 25,000 إشعار تشغيلي": {
    "en": "100,000 campaign and automation messages per month + 25,000 operational notifications",
    "zh-CN": "每月 100,000 条营销及自动化消息 + 25,000 条运营通知",
    "es": "100.000 mensajes de campañas y automatización al mes + 25.000 avisos operativos",
    "ur": "ماہانہ 100,000 مہماتی اور خودکار پیغامات + 25,000 عملی اطلاعات"
  },
  "الشاملة": {
    "en": "Complete",
    "zh-CN": "全能",
    "es": "Integral",
    "ur": "جامع"
  },
  "تشغيل وتسويق ومشاهدة مباشرة مؤقتة للأنشطة التي تحتاجها.": {
    "en": "Operations, marketing and temporary live viewing for businesses that need it.",
    "zh-CN": "适合有需要的企业：运营、营销和临时实时观看。",
    "es": "Operaciones, marketing y visualización en directo temporal para los negocios que lo necesiten.",
    "ur": "ضرورت مند کاروباروں کے لیے آپریشنز، مارکیٹنگ اور عارضی براہِ راست مشاہدہ۔"
  },
  "جميع ميزات النمو": {
    "en": "All Growth features",
    "zh-CN": "所有成长套餐功能",
    "es": "Todo lo de Crecimiento",
    "ur": "ترقی کی تمام خصوصیات"
  },
  "ربط كاميرتين وروابط مشاهدة مؤقتة دون تسجيل": {
    "en": "Connect 2 cameras with temporary viewing links, without recording",
    "zh-CN": "连接 2 台摄像头，提供临时观看链接，不录制",
    "es": "Conexión de 2 cámaras y enlaces temporales, sin grabación",
    "ur": "2 کیمرے اور عارضی مشاہدے کے لنکس، ریکارڈنگ کے بغیر"
  },
  "45 جيجابايت شهريًا ≈ 50 ساعة مشاهدة مجمعة عند 2 ميجابت/ثانية": {
    "en": "45 GB per month ≈ 50 combined viewing hours at 2 Mbps",
    "zh-CN": "每月 45 GB ≈ 以 2 Mbps 累计观看 50 小时",
    "es": "45 GB al mes ≈ 50 horas de visualización acumulada a 2 Mbps",
    "ur": "ماہانہ 45 GB ≈ 2 Mbps پر مجموعی 50 گھنٹے مشاہدہ"
  },
  "10 مستخدمين شامل المالك · 3 فروع": {
    "en": "10 users including owner · 3 branches",
    "zh-CN": "10 位用户（含所有者）· 3 家分店",
    "es": "10 usuarios incluido el propietario · 3 sucursales",
    "ur": "مالک سمیت 10 صارفین · 3 شاخیں"
  },
  "10,000 فاتورة و3,000 حجز جديد شهريًا": {
    "en": "10,000 invoices and 3,000 new bookings per month",
    "zh-CN": "每月 10,000 张发票和 3,000 个新预约",
    "es": "10.000 facturas y 3.000 reservas nuevas al mes",
    "ur": "ماہانہ 10,000 بل اور 3,000 نئی بکنگ"
  },
  "300,000 رسالة حملات وأتمتة شهريًا + 50,000 إشعار تشغيلي": {
    "en": "300,000 campaign and automation messages per month + 50,000 operational notifications",
    "zh-CN": "每月 300,000 条营销及自动化消息 + 50,000 条运营通知",
    "es": "300.000 mensajes de campañas y automatización al mes + 50.000 avisos operativos",
    "ur": "ماہانہ 300,000 مہماتی اور خودکار پیغامات + 50,000 عملی اطلاعات"
  },
  "رسوم Meta مستقلة وتُدفع من حساب المنشأة. حصص INFRO شهرية للمعالجة وليست رصيدًا لرسوم Meta أو ضمان تسليم. حدود Meta اليومية وجودة الحساب مستقلة؛ الحصة التشغيلية منفصلة عن حصة الحملات. التذكيرات وطلبات التقييم تتطلب موافقة العميل وقوالب معتمدة ورقمًا متصلًا وتفعيل الإعدادات. الأجهزة والطابعة ومدى والكاميرات والتركيب ليست ضمن الاشتراك. الفروع للهوية والمواعيد والمحاسبة على مستوى المنشأة. المساعدة الذكية السحابية غير مشمولة في الباقات الجديدة حاليًا. حصص الشهر بتوقيت الرياض، ولا توجد رسوم تجاوز تلقائية. التوثيق بعد المراجعة، وربط الأجهزة والخدمات الخارجية يتطلب تهيئتها واختبارها.": {
    "en": "Meta fees are separate and paid through the business's account. INFRO monthly allowances cover processing, not Meta fees or guaranteed delivery. Meta daily limits and account quality are independent; operational and campaign quotas are separate. Reminders and review requests require customer consent, approved templates, a connected number and enabled settings. Devices, printers, mada terminals, cameras and installation are excluded. Branches cover identity and appointments; accounting is business-wide. Cloud AI assistance is not currently included in new plans. Monthly allowances use Riyadh time, with no automatic overage charges. Verification follows review; device and external-service integrations require setup and testing.",
    "zh-CN": "Meta 费用独立，由企业账户支付。INFRO 月度配额用于消息处理，并非 Meta 费用余额，也不保证送达。Meta 每日限额及账户质量规则独立适用；运营通知和营销配额分开计算。提醒和评价请求需要客户同意、已批准模板、已连接号码及启用设置。不含设备、打印机、mada 终端、摄像头和安装。分店用于企业身份与预约，会计按企业统一管理。新套餐目前不含云端 AI 助手。月度配额按利雅得时间计算，不自动收取超额费用。认证需审核；设备及外部服务集成需配置和测试。",
    "es": "Las tarifas de Meta son independientes y se pagan desde la cuenta del negocio. Las cuotas mensuales de INFRO cubren procesamiento, no tarifas de Meta ni entrega garantizada. Los límites diarios de Meta y la calidad de la cuenta son independientes; las cuotas operativas y de campañas están separadas. Los recordatorios y valoraciones requieren consentimiento, plantillas aprobadas, un número conectado y ajustes activos. No se incluyen dispositivos, impresoras, terminales mada, cámaras ni instalación. Las sucursales se aplican a identidad y citas; la contabilidad abarca todo el negocio. La asistencia de IA en la nube no está incluida actualmente en los nuevos planes. Las cuotas siguen la hora de Riad y no hay cargos automáticos por exceso. La verificación requiere revisión; los dispositivos y servicios externos requieren configuración y pruebas.",
    "ur": "Meta کی فیس الگ ہے اور کاروبار اپنے اکاؤنٹ سے ادا کرتا ہے۔ INFRO کا ماہانہ کوٹہ پروسیسنگ کے لیے ہے، Meta کی فیس یا پیغام پہنچنے کی ضمانت نہیں۔ Meta کی روزانہ حدود اور اکاؤنٹ کا معیار الگ ہیں؛ عملی اور مہماتی کوٹے جدا ہیں۔ یاد دہانیوں اور جائزوں کے لیے رضامندی، منظور شدہ سانچے، مربوط نمبر اور فعال ترتیبات ضروری ہیں۔ آلات، پرنٹر، mada ٹرمینل، کیمرے اور تنصیب شامل نہیں۔ شاخیں شناخت اور بکنگ کے لیے ہیں؛ حسابات پورے کاروبار کی سطح پر ہیں۔ نئے پیکیجز میں فی الحال کلاؤڈ AI معاون شامل نہیں۔ ماہانہ کوٹہ ریاض کے وقت کے مطابق ہے، اضافی استعمال کی خودکار فیس نہیں۔ تصدیق جائزے کے بعد ہوتی ہے؛ آلات اور بیرونی خدمات کے لیے ترتیب اور جانچ ضروری ہے۔"
  },
  "رائع، ir.sa/{slug} متاح الآن": {
    "en": "Great, ir.sa/{slug} is available",
    "zh-CN": "太好了，ir.sa/{slug} 可用",
    "es": "Perfecto, ir.sa/{slug} está disponible",
    "ur": "بہترین، ir.sa/{slug} دستیاب ہے"
  },
  "ر.س / شهر": {
    "en": "SAR / month",
    "zh-CN": "沙特里亚尔 / 月",
    "es": "SAR / mes",
    "ur": "ریال / ماہ"
  },
  "ابدأ الآن": {
    "en": "Start now",
    "zh-CN": "立即开始",
    "es": "Empieza ahora",
    "ur": "ابھی شروع کریں"
  },
  "INFRO © جميع الحقوق محفوظة": {
    "en": "INFRO © All rights reserved",
    "zh-CN": "INFRO © 保留所有权利",
    "es": "INFRO © Todos los derechos reservados",
    "ur": "INFRO © جملہ حقوق محفوظ ہیں"
  }
};

export function homepageText(locale: AppLocale, arabic: string): string {
  return locale === "ar" ? arabic : HOMEPAGE_TRANSLATIONS[arabic]?.[locale] ?? arabic;
}
