export type Label = readonly [ar: string, en: string];

export const icgGroups = [
  ['sales', 'المبيعات', 'Sales'], ['pos', 'نقاط البيع', 'Point of sale'],
  ['purchases', 'المشتريات', 'Purchases'], ['forecast', 'التوقعات', 'Forecasts'],
  ['finance', 'المالية والتحصيل', 'Finance and collections'], ['accounting', 'المحاسبة', 'Accounting'],
  ['inventory', 'الأصناف والمخزون', 'Items and inventory'], ['documents', 'المستندات والإنتاج', 'Documents and production'],
  ['master', 'البيانات الأساسية', 'Master data'], ['operations', 'الأنشطة والولاء والدوام', 'Activities, loyalty and time clock'],
  ['custom', 'التقارير المخصصة والتحليل متعدد الأبعاد', 'Custom reports and multidimensional analysis'],
] as const;
export type IcgGroup = typeof icgGroups[number][0];
type Report = { id: string; group: IcgGroup; title: Label; fields: Label; sample?: string };

function group(group: IcgGroup, entries: readonly (readonly [string, string, string, string, string, string?])[]): Report[] {
  return entries.map(([id, ar, en, fieldsAr, fieldsEn, sample]) => ({ id, group, title: [ar, en], fields: [fieldsAr, fieldsEn], sample }));
}

export const icgReports = [
  ...group('sales', [
    ['sales-summary', 'المبيعات التراكمية والتفصيلية', 'Accumulated sales and invoice detail', 'الفاتورة، الشركة، الفرع، الإجمالي والخصم والمرتجع', 'Invoice, company, branch, gross, discounts and refunds', 'invoices'],
    ['sales-daily', 'المبيعات اليومية وحسب أيام الأسبوع', 'Daily sales and weekdays', 'تاريخ العمل، مبيعات ومرتجعات', 'Business date, sales and returns', 'daily'],
    ['sales-monthly', 'المبيعات الشهرية والأسبوعية حسب الشركة', 'Monthly and weekly company sales', 'فترة العمل، الشركة والفرع', 'Business period, company and branch', 'weekly'],
    ['sales-hour', 'المبيعات حسب الساعة', 'Hourly sales', 'وقت الفاتورة والمنطقة الزمنية', 'Invoice timestamp and time zone', 'hourly'],
    ['sales-area', 'المبيعات حسب منطقة العمل', 'Sales by business area', 'منطقة العمل والفاتورة', 'Business area and invoice'],
    ['sales-branch', 'مقارنة مبيعات الفروع', 'Branch sales comparison', 'الفاتورة والفرع', 'Invoice and branch', 'branches'],
    ['sales-brand', 'المبيعات حسب العلامة والخط والقسم', 'Sales by brand, line and department', 'سطر الفاتورة، القسم، العلامة، الخط', 'Invoice line, department, brand and line', 'brands'],
    ['sales-seller', 'المبيعات حسب البائع واليوم والصنف والعميل', 'Sales by seller, day, item and customer', 'معرّف البائع والتاريخ والعميل والصنف', 'Seller ID, day, customer ID and item', 'sellers'],
    ['sales-client', 'المبيعات حسب العميل والمسار', 'Sales by customer and route', 'معرّف العميل الداخلي ومساره وسطور البيع', 'Internal customer ID, route and sales lines', 'clients'],
    ['sales-item', 'ملخص وتفاصيل مبيعات الأصناف', 'Item sales summary and detail', 'الصنف والكمية وصافي سطر الفاتورة', 'Item, quantity and net invoice line', 'items'],
    ['sales-margin', 'هامش الربح الشهري والسنوي', 'Monthly and annual gross margin', 'صافي المبيعات وتكلفة البضاعة من المصدر', 'Net sales and actual COGS from the source'],
  ]),
  ...group('pos', [
    ['pos-close', 'إقفالات الصندوق اليومية والأسبوعية', 'Daily and weekly till closings', 'الصندوق والوردية والمبلغ المتوقع والمعدود', 'Till, shift, expected and counted amounts', 'tills'],
    ['pos-safe', 'حركة الخزائن', 'Safe movements', 'الخزينة ونوع الحركة وتاريخها', 'Safe, movement type and timestamp'],
    ['pos-payment', 'المبيعات حسب وسيلة الدفع', 'Sales by payment method', 'وسيلة الدفع وسطور التحصيل، بما فيها الدفعات المجزأة', 'Tender and collection lines, including split tenders', 'payments'],
    ['pos-refunds', 'المرتجعات وأسباب الخصومات', 'Returns and discount reasons', 'المستند الأصلي والسبب وقيمة التسوية', 'Original document, reason and adjustment amount', 'exceptions'],
    ['pos-price', 'فروقات أسعار البيع', 'Sales price exceptions', 'السعر الفعلي والمرجعي والخصم', 'Actual price, reference price and discount'],
    ['pos-service', 'متوسط وقت الخدمة', 'Average service time', 'وقت بدء الخدمة وانتهائها', 'Service start and completion timestamps'],
  ]),
  ...group('purchases', [
    ['purchase-month', 'المشتريات الشهرية حسب القسم والعلامة', 'Monthly purchases by department and brand', 'المورد والقسم والعلامة وتاريخ التوريد', 'Supplier, department, brand and supply date'],
    ['purchase-supplier', 'المشتريات حسب المورد والمورد × الصنف', 'Purchases by supplier and supplier × item', 'فاتورة الشراء والمورد والصنف والتكلفة', 'Purchase invoice, supplier, item and cost', 'purchases'],
    ['purchase-item', 'المشتريات حسب الصنف ومنطقة العمل', 'Purchases by item and business area', 'صنف الشراء والكمية والتكلفة ومنطقة العمل', 'Purchase item, quantity, cost and business area', 'purchase-items'],
  ]),
  ...group('forecast', [
    ['forecast-sales', 'المبيعات الفعلية مقابل التوقع', 'Actual sales vs forecast', 'خطة مبيعات معتمدة لنفس الفترة والفرع', 'Approved sales targets for matching periods and branches', 'targets'],
    ['forecast-purchases', 'المشتريات الفعلية مقابل التوقع', 'Actual purchases vs forecast', 'خطة المشتريات والمشتريات الفعلية', 'Purchase plan and actual purchases'],
    ['forecast-prepurchase', 'ما قبل الشراء حسب المورد والصنف', 'Prepurchase by supplier and item', 'سطور ما قبل الشراء والمورد والصنف والكمية', 'Prepurchase lines, supplier, item and quantity'],
    ['forecast-presale', 'ما قبل البيع حسب العميل والصنف', 'Presale by customer and item', 'سطور ما قبل البيع ومعرّف العميل والصنف والكمية', 'Presale lines, customer ID, item and quantity'],
    ['forecast-budget', 'ملخص وتفاصيل التوقعات مع الهوامش', 'Forecast summary and detail with margins', 'نسخة الموازنة وتوقعات المبيعات والتكلفة المعتمدة', 'Budget version and approved sales and cost forecasts'],
    ['forecast-cash', 'توقع التحصيلات والمدفوعات البنكية', 'Bank collection and payment forecast', 'تاريخ الاستحقاق والمبالغ المتبقية والبنك', 'Due date, outstanding amounts and bank'],
  ]),
  ...group('finance', [
    ['finance-cashflow', 'التدفق النقدي المسوّى والمعلّق', 'Settled and pending cash flow', 'نوع الحركة، المبلغ، حالة التسوية والاستحقاق', 'Movement type, amount, settlement and due dates', 'cashflow'],
    ['finance-collection', 'التحصيلات حسب العميل واليوم والبنك', 'Collections by customer, day and bank', 'حركة التحصيل والعميل والبنك والحالة', 'Collection entry, customer, bank and status', 'collections'],
    ['finance-payments', 'مدفوعات الموردين وتسوياتها', 'Supplier payments and settlements', 'حركة السداد والمورد والحالة', 'Payment entry, supplier and status', 'outgoing'],
    ['finance-advance', 'الدفعات المقدّمة والسندات', 'Advances and vouchers', 'السند والجهة واتجاه الحركة', 'Voucher, counterparty and movement direction'],
    ['finance-aging', 'أعمار الذمم للعملاء والموردين', 'Customer and supplier aging', 'المبلغ المفتوح، الاستحقاق وتاريخ القطع', 'Open balance, due date and as-of date'],
  ]),
  ...group('accounting', [
    ['accounting-balance', 'الميزانية العمومية', 'Balance sheet', 'أرصدة افتتاحية، شجرة الحسابات وقيود مرحّلة', 'Opening balances, chart and posted entries'],
    ['accounting-profit', 'الأرباح والخسائر', 'Profit and loss', 'تصنيف حسابات الإيرادات والمصروفات وقيود مرحّلة', 'Income and expense account classification and posted entries'],
    ['accounting-tax', 'دفتر الفواتير وتقرير الضريبة', 'Invoice register and tax report', 'التسجيل الضريبي وفئات الضريبة ومبالغها', 'Tax registration, categories and amounts'],
    ['accounting-journal', 'دفتر اليومية', 'Journal', 'رقم القيد والحساب والمدين والدائن', 'Journal reference, account, debit and credit', 'journal'],
    ['accounting-ledger', 'دفتر الأستاذ والحسابات الفرعية', 'General ledger and subaccounts', 'دليل الحسابات والقيود والأرصدة', 'Chart of accounts, entries and balances', 'ledger'],
    ['accounting-accrued', 'الحسابات المستحقة', 'Accrued accounts', 'نوع الاستحقاق والحساب والتاريخ', 'Accrual type, account and date'],
    ['accounting-budget', 'مقارنة الموازنة', 'Budget comparison', 'الموازنة المعتمدة والحساب ومركز التكلفة', 'Approved budgets, accounts and cost centers'],
    ['accounting-assets', 'الإهلاك والتدقيق', 'Depreciation and audit', 'سجل الأصول وأحداث التدقيق المسموح بها', 'Asset register and authorized audit events'],
    ['accounting-local', 'إقرارات محلية حسب بلد الشركة', 'Country-specific accounting declarations', 'بلد الشركة ودعم النماذج 347 و349 إن انطبقت', 'Company country and applicable 347/349 forms'],
  ]),
  ...group('inventory', [
    ['stock-on-hand', 'المخزون حسب الصنف والمستودع', 'Stock by item and warehouse', 'الصنف والمستودع والرصيد وتاريخ اللقطة', 'Item, warehouse, on-hand quantity and snapshot date', 'stock'],
    ['stock-threshold', 'الحد الأدنى والأقصى والطلبات', 'Minimum, maximum and orders', 'رصيد الصنف والسياسات والطلبات المفتوحة', 'On hand, thresholds and open orders', 'thresholds'],
    ['stock-transfer', 'التحويلات والاستهلاك والحركة', 'Transfers, consumption and movements', 'السجل والكمية والمستودع المصدر والوجهة', 'Movement, quantity, source and destination warehouse', 'transfers'],
    ['stock-count', 'الجرد وفروقات العد بين الفترات', 'Stock count and date discrepancies', 'الكمية الدفترية والمعدودة وتاريخ الجرد', 'Expected and counted quantities and count date', 'counts'],
    ['stock-orders', 'الطلبات والمبيعات والمشتريات والمخزون', 'Orders, sales, purchases and stock', 'حركات الأصناف والطلبات حسب التاريخ', 'Dated item movements and orders'],
    ['stock-dimension', 'المخزون والأصناف حسب الأقسام والعلامات والمواسم', 'Items and stock by department, brand and season', 'الصنف وأبعاده التنظيمية ورصيد المخزون', 'Item dimensions and stock snapshot'],
    ['stock-price', 'أسعار البيع والشراء وتغييراتها', 'Sale and purchase price changes', 'سعر الصنف وتاريخ سريانه', 'Item price and effective date'],
    ['stock-yield', 'المردود والمكونات والتكلفة', 'Yields, components and costs', 'تعريف المكونات والاستهلاك والتكلفة وإصدار الوصفة', 'Components, consumption, cost and recipe revision'],
    ['stock-trade', 'الاستيراد والتصدير (Intrastat)', 'Intrastat imports and exports', 'بلد الشركة وحركة التجارة وفئة المنتج', 'Company country, trade movement and commodity class'],
  ]),
  ...group('documents', [
    ['docs-sales', 'مستندات ما قبل البيع والبيع والفواتير', 'Presale, sales and invoice documents', 'نوع المستند، رقمه، حالته وسطور الفاتورة', 'Document type, reference, state and lines', 'invoices'],
    ['docs-purchases', 'مستندات ما قبل الشراء والشراء والفواتير', 'Prepurchase, purchase and invoice documents', 'مستند الشراء والمورد والفاتورة', 'Purchase document, supplier and invoice', 'purchases'],
    ['docs-movement', 'مستندات تحويل المستودعات', 'Warehouse transfer documents', 'مرجع التحويل والمستودعات والأصناف', 'Transfer reference, warehouses and items', 'transfers'],
    ['docs-production', 'أوامر التصنيع والمنتجات واستهلاك المكونات', 'Manufacturing orders, products and component use', 'أمر الإنتاج والمكونات والكميات والتكلفة', 'Production order, components, quantities and cost'],
    ['docs-kitchen', 'تحليل الإنتاج والمطبخ', 'Production and kitchen analysis', 'أحداث الإنتاج ومحطة العمل والأزمنة', 'Production events, station and timing'],
  ]),
  ...group('master', [
    ['master-structure', 'المستودعات والأقسام والعلامات', 'Warehouses, departments and brands', 'معرّفات المستودعات وتصنيف الأصناف', 'Warehouse IDs and item taxonomy', 'master'],
    ['master-customer', 'العملاء والموردون والبائعون ومسارات العملاء', 'Customers, suppliers, sellers and customer routes', 'المعرّفات الداخلية والعلاقات المصرح بقراءتها', 'Internal IDs and authorized relationships'],
    ['master-payments', 'طرق الدفع وقوائم أسعار الشراء', 'Payment methods and purchase rates', 'معرّف الطريقة وقائمة الأسعار والعملة', 'Tender ID, rate list and currency'],
    ['master-audit', 'أنواع الأنشطة وسجل التدقيق', 'Activity types and audit history', 'نوع النشاط وأحداث التدقيق المصرح بها', 'Activity category and authorized audit events'],
  ]),
  ...group('operations', [
    ['operations-activities', 'الأنشطة والتخطيط', 'Activities and planning', 'النشاط والحالة والتاريخ', 'Activity, status and date'],
    ['operations-clock', 'ساعات العمل والورديات وسجل الحضور', 'Time clock, shifts and attendance', 'معرّف الموظف والوردية وأوقات الحضور', 'Employee ID, shift and clock times'],
    ['operations-loyalty', 'بطاقات الولاء والنقاط ومبيعات الأعضاء', 'Loyalty cards, points and member sales', 'معرّف عضوية داخلي والحركات دون بيانات التواصل', 'Internal membership ID and movements without contact details', 'loyalty'],
  ]),
  ...group('custom', [
    ['custom-views', 'تقاريري والتقارير المخصصة للمنشأة', 'My reports and organization-specific reports', 'تعريف التقرير والصلاحيات والحقول المحسوبة', 'Report definition, permissions and calculated fields'],
    ['custom-cubes', 'تحليل متعدد الأبعاد للمبيعات والمشتريات', 'Multidimensional sales and purchasing analysis', 'الأبعاد المصرح بها وتعريف المؤشرات', 'Authorized dimensions and measure definitions', 'cube'],
  ]),
];
