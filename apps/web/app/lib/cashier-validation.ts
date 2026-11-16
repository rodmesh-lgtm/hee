type ValidationIssue = { path: PropertyKey[]; code: string };
/** Explain input failures without exposing raw values or internal schema details. */
export function cashierValidationMessage(issues: ValidationIssue[]) {
 const issue=issues[0];
 const field=String(issue?.path[0]??'');
 if(field==='customerName')return 'اسم العميل اختياري، وبحد أقصى 100 حرف';
 if(field==='phone')return 'أدخل رقم جوال صحيحًا مثل 05xxxxxxxx';
 if(field==='dueAt')return 'حدد موعد الاستلام من الخيارات السريعة أو اختر اليوم والوقت';
 if(field==='items')return 'راجع أصناف الطلب وكمياتها؛ يجب إضافة صنف واحد على الأقل';
 if(field==='commission')return 'أكمل اسم موظف العمولة وجواله وقيمة العمولة، أو أوقف إضافة العمولة';
 if(field==='discount')return 'راجع نوع الخصم وقيمته';
 if(['paid','amount','cashPaid','method'].includes(field))return 'راجع المبلغ المستلم وطريقة التحصيل والجزء النقدي إن اخترت دفعًا مختلطًا';
 if(field==='notes')return 'اختصر ملاحظات الطلب إلى 1000 حرف أو أقل';
 if(['requestId','priceToken','subscriptionToken','serviceSpeed','useSubscription','subscriptionCovered'].includes(field))return 'تعذر التحقق من بيانات الطلب؛ حدّث صفحة الكاشير ثم راجع الطلب';
 return 'راجع بيانات العملية؛ يوجد حقل ناقص أو غير صحيح';
}
