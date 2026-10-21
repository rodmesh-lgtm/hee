import { LaundryInputError } from "./laundry-domain";
export const LAUNDRY_STOCK_UNITS={piece:"قطعة",liter:"لتر",kg:"كجم"} as const;
export function laundryStockQuantity(value:string,unit:string){
 const text=value.trim();
 if(!/^\d{1,6}(\.\d{1,3})?$/.test(text))throw new LaundryInputError("أدخل كمية موجبة أو صفرًا بثلاث منازل عشرية كحد أقصى");
 const [whole,fraction=""]=text.split(".");const n=Number(whole)*1000+Number(fraction.padEnd(3,"0"));
 if(n>1e9||(unit==="piece"&&n%1000!==0))throw new LaundryInputError("كمية القطع يجب أن تكون عددًا صحيحًا، ضمن الحد المسموح");
 return n;
}
export function laundryStockChange(current:number,quantity:number,kind:"receipt"|"issue"|"count"){
 if(!Number.isSafeInteger(current)||current<0||!Number.isSafeInteger(quantity)||quantity<0)throw new LaundryInputError("كمية غير صالحة");
 const delta=kind==="count"?quantity-current:kind==="issue"?-quantity:quantity;
 const after=current+delta;
 if(after<0)throw new LaundryInputError("الرصيد غير كافٍ؛ لا يمكن صرف أو تحويل كمية أكبر من المتاح");
 if(!Number.isSafeInteger(after)||after>1e12||Math.abs(delta)>1e9)throw new LaundryInputError("الكمية أكبر من الحد المسموح");
 return {delta,after};
}
export const laundryStockFormat=(n:number)=>new Intl.NumberFormat("ar-SA",{maximumFractionDigits:3}).format(n/1000);
// Quantities are thousandths; value is halalas. BigInt avoids multiplication rounding.
export function laundryStockCost(quantity:number,value:number,removed:number){
 if(![quantity,value,removed].every(Number.isSafeInteger)||quantity<=0||value<0||removed<0||removed>quantity||quantity>1e12||value>1e12)throw new LaundryInputError("كمية أو قيمة المخزون غير صالحة للتقييم");
 if(removed===quantity)return value;
 return Number((BigInt(value)*BigInt(removed)+BigInt(quantity)/2n)/BigInt(quantity));
}
