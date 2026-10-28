import type { CashierActivityId } from "./cashier-activity";
import { LaundryInputError, type LaundryServiceSpeed } from "./laundry-domain";
export type CashierWorkflow = {
 scheduleTitle:string;dateLabel:string;timeLabel:string;summaryLabel:string;
 shortcuts:Array<{label:string;hours:number}>;
 notesPlaceholder:string;vehicleFields:boolean;
};
const shortcuts=(hours:number[])=>hours.map(hours=>({hours,label:hours===0.25?"بعد 15 دقيقة":hours===0.5?"بعد نصف ساعة":hours===1?"بعد ساعة":hours===2?"بعد ساعتين":hours===4?"بعد 4 ساعات":hours===24?"غدًا في هذا الوقت":hours===48?"بعد يومين":hours===72?"بعد 3 أيام":`بعد ${hours} ساعات`}));
/** Workflow defaults describe the current business activity, never another
 * business's catalogue, names or settings. Owner urgency opt-in stays separate. */
export function cashierWorkflow(id:CashierActivityId,speed:LaundryServiceSpeed="normal"):CashierWorkflow {
 const base:CashierWorkflow={scheduleTitle:"متى يستلم العميل طلبه؟",dateLabel:"يوم التسليم",timeLabel:"ساعة التسليم",summaryLabel:"موعد التسليم:",shortcuts:shortcuts([4,24,48]),notesPlaceholder:"تفاصيل الطلب وتعليمات العميل…",vehicleFields:false};
 if(id==="laundry")return {...base,scheduleTitle:"موعد استلام الملابس",shortcuts:shortcuts(speed==="urgent"?[1,2,4]:[4,24,48]),notesPlaceholder:"لون القطعة، بقعة، تعليمات خاصة…"};
 if(id==="workshop")return {...base,scheduleTitle:"موعد جاهزية المركبة المتوقع",dateLabel:"يوم جاهزية المركبة",timeLabel:"ساعة جاهزية المركبة",summaryLabel:"موعد جاهزية المركبة:",shortcuts:shortcuts(speed==="urgent"?[4,24,48]:[24,48,72]),notesPlaceholder:"العطل، أعمال الصيانة المطلوبة، ملاحظات الفحص…",vehicleFields:true};
 if(id==="car_wash")return {...base,scheduleTitle:"موعد انتهاء العناية بالمركبة",shortcuts:shortcuts([0.5,1,2]),notesPlaceholder:"نوع المركبة وتعليمات التنظيف والعناية…",vehicleFields:true};
 if(id==="restaurant")return {...base,scheduleTitle:"موعد تجهيز الطلب",dateLabel:"يوم تجهيز الطلب",timeLabel:"ساعة تجهيز الطلب",summaryLabel:"موعد تجهيز الطلب:",shortcuts:shortcuts([0.25,0.5,1]),notesPlaceholder:"تعليمات التحضير والإضافات…"};
 if(id==="retail"||id==="grocery")return {...base,scheduleTitle:"موعد استلام المنتجات",shortcuts:shortcuts([0.25,1,24]),notesPlaceholder:"تعليمات تجهيز المنتجات أو الاستلام…"};
 if(id==="salon"||id==="clinic")return {...base,scheduleTitle:"موعد تقديم الخدمة",dateLabel:"يوم تقديم الخدمة",timeLabel:"ساعة تقديم الخدمة",summaryLabel:"موعد تقديم الخدمة:",shortcuts:shortcuts([0.5,1,24]),notesPlaceholder:"تعليمات الخدمة وملاحظات العميل…"};
 return base;
}
export function cashierOrderNotes(id:CashierActivityId,input:{notes:string;vehicleModel?:string;vehiclePlate?:string;vehicleMileage?:string}):string {
 const model=(input.vehicleModel||"").trim(),plate=(input.vehiclePlate||"").trim(),mileage=(input.vehicleMileage||"").trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776));
 if((model||plate||mileage)&&!cashierWorkflow(id).vehicleFields)throw new LaundryInputError("بيانات المركبة متاحة لأنشطة المركبات فقط؛ حدّث الكاشير بعد تغيير النشاط.");
 if(model.length>80||plate.length>30||(mileage&&!/^\d{1,7}$/.test(mileage)))throw new LaundryInputError("راجع نوع المركبة واللوحة وقراءة العداد.");
 const notes=[model?`المركبة: ${model}`:"",plate?`اللوحة: ${plate}`:"",mileage?`قراءة العداد: ${mileage} كم`:"",input.notes.trim()].filter(Boolean).join("\n");
 if(notes.length>1000)throw new LaundryInputError("اختصر الملاحظات لتتسع لبيانات المركبة ضمن 1000 حرف.");
 return notes;
}
