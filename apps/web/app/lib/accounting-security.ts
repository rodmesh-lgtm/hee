/** Incident containment. Only a reviewed release may lift this hold after
 * historical ownership and authenticated cross-business flows are verified.
 * Never read this decision from customer-editable pageModules or a request cookie.
 */
export const ACCOUNTING_SECURITY_HOLD = true;
export const ACCOUNTING_SECURITY_MESSAGE =
  "الوصول إلى الفواتير والعملاء والمحاسبة متوقف مؤقتًا لحماية سرية البيانات أثناء مراجعة ملكية السجلات. البيانات محفوظة ولم تُحذف.";
