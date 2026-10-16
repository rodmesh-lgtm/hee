export function laundryReportRange(from:string,to:string){
 const parse=(s:string)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw new Error("حدد تاريخ البداية والنهاية");const d=new Date(`${s}T00:00:00Z`);if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==s)throw new Error("التاريخ غير صالح");return d.getTime();};
 const start=parse(from),end=parse(to);
 if(end<start||end-start>366*86400000)throw new Error("اختر فترة مرتبة لا تتجاوز سنة");
 return {start:new Date(start-3*3600000),end:new Date(end+86400000-3*3600000)};
}
export function laundryCsv(rows:Array<Array<string|number>>){
 return "\uFEFF"+rows.map(row=>row.map(value=>{const raw=String(value);const safe=/^[\s]*[=+@-]/.test(raw)?`'${raw}`:raw;return `"${safe.replace(/"/g,'""')}"`;}).join(",")).join("\r\n");
}
export type LaundryReport={from:string;to:string;invoiced:number;orders:number;cash:number;card:number;transfer:number;expenses:number;openingReceivables:number;closingReceivables:number;movementCount:number;movements:Array<{id:string;kind:string;description:string;method:string;amount:number;createdAt:string}>};
