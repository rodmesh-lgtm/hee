export const PRINT_BRIDGE_URL='http://127.0.0.1:17861';
export const PRINT_CONFIG_EVENT='infro:cashier-printer-config';
export const PRINT_STATUS_EVENT='infro:cashier-printer-status';
export type DirectPrinterConfig={version:1;businessId:string;token:string;printerName:string;enabled:boolean};
export type PrintStatus={businessId:string;documentId:string;kind:'busy'|'success'|'error';message:string};
export class PrinterError extends Error{constructor(public code:string,message:string){super(message);}}
const configKey=(businessId:string)=>`infro:cashier:direct-printer:${businessId}`;
const pendingKey=(businessId:string,documentId:string)=>`infro:cashier:pending-print:${businessId}:${documentId}`;
export function printerConfigText(businessId:string){try{return window.localStorage.getItem(configKey(businessId))??'';}catch{return '';}}
export function parsePrinterConfig(value:string,businessId:string):DirectPrinterConfig|null{
 try{const config=JSON.parse(value) as DirectPrinterConfig;if(config.version!==1||config.businessId!==businessId||typeof config.token!=='string'||!/^[A-Za-z0-9+/]{43}=$/.test(config.token)||typeof config.printerName!=='string'||config.printerName.length>300||typeof config.enabled!=='boolean')return null;return config;}catch{return null;}
}
export function readPrinterConfig(businessId:string){return parsePrinterConfig(printerConfigText(businessId),businessId);}
export function savePrinterConfig(config:DirectPrinterConfig|null,businessId:string){
 if(config&&!parsePrinterConfig(JSON.stringify(config),businessId))throw new PrinterError('SCOPE','إعداد الطابعة لا يخص هذه المنشأة');
 try{if(config)window.localStorage.setItem(configKey(businessId),JSON.stringify(config));else window.localStorage.removeItem(configKey(businessId));window.dispatchEvent(new Event(PRINT_CONFIG_EVENT));}
 catch{throw new PrinterError('STORAGE','اسمح بحفظ إعداد الطابعة في هذا المتصفح');}
}
export function reportPrintStatus(status:PrintStatus){window.dispatchEvent(new CustomEvent(PRINT_STATUS_EVENT,{detail:status}));}
const errorMessages:Record<string,string>={PAIR_REQUIRED:'أعد ربط الكاشير ببرنامج INFRO على هذا الجهاز',PAIR_EXPIRED:'أنشئ رمز ربط جديدًا من برنامج INFRO على ويندوز',PAIR_INVALID:'رمز الربط غير صحيح',PRINTER_MISSING:'اختر طابعة Evelon D10 المثبتة في ويندوز',QUEUE_BUSY:'طابور الطباعة مشغول؛ انتظر ثم تحقق من العملية',JOB_EXPIRED:'طلب قديم غير مؤكد؛ راجع طابور ويندوز قبل إعادة الطباعة',JOB_MISMATCH:'طلب الطباعة محفوظ بمحتوى مختلف؛ راجع طابور ويندوز',ORIGIN_DENIED:'افتح الكاشير من ir.sa لربط الطابعة',INVALID_IMAGE_SIZE:'الفاتورة أطول من الحد المدعوم للطباعة المباشرة'};
type BridgeResult={ok:boolean;code?:string;version?:string;token?:string;printers?:string[];printerName?:string;jobId?:string;status?:string};
export async function bridgeRequest(path:'/v1/pair'|'/v1/printers'|'/v1/select'|'/v1/revoke'|'/v1/status'|'/v1/print',body:Record<string,unknown>,token?:string):Promise<BridgeResult>{
 // Never probe loopback on page load. Call only from setup/print user actions.
 if(typeof navigator!=='undefined'&&navigator.permissions?.query){try{const permission=await navigator.permissions.query({name:'loopback-network' as PermissionName});if(permission.state==='denied')throw new PrinterError('PERMISSION','اسمح لـ ir.sa بالاتصال برابط الطباعة من إعدادات المتصفح');}catch(error){if(error instanceof PrinterError)throw error;}}
 try{
  const options:RequestInit&{targetAddressSpace:'loopback'}={method:'POST',mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json',...(token?{'X-Infro-Token':token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(12000),targetAddressSpace:'loopback'};
  const response=await fetch(`${PRINT_BRIDGE_URL}${path}`,options);const result=await response.json() as BridgeResult;
  if(!response.ok||result.ok!==true)throw new PrinterError(result.code??'BRIDGE',errorMessages[result.code??'']??'تعذر إكمال الطلب؛ راجع برنامج ربط الطابعة');
  if(((path==='/v1/pair'||path==='/v1/printers')&&result.version!=='1.0.0')||(result.version&&result.version!=='1.0.0'))throw new PrinterError('VERSION','حدّث برنامج ربط الطابعة ثم أعد المحاولة');
  return result;
 }catch(error){if(error instanceof PrinterError)throw error;throw new PrinterError('CONNECTION','افتح برنامج INFRO على ويندوز واسمح للمتصفح بالاتصال به، ثم تحقق من الطابعة');}
}
export type PendingPrint={jobId:string;createdAt:string};
export function parsePendingPrint(value:string|null):PendingPrint|null{
 if(value===null)return null;
 try{const pending=JSON.parse(value) as PendingPrint;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pending.jobId)||!Number.isFinite(Date.parse(pending.createdAt)))throw Error();return pending;}catch{throw new PrinterError('PENDING_INVALID','تعذر قراءة طلب الطباعة السابق؛ راجع طابور ويندوز قبل إعادة الطباعة');}
}
export async function sendDirectReceipt(config:DirectPrinterConfig,documentId:string,title:string,render:()=>Promise<string>,notify:(message:string)=>void){
 let pending:PendingPrint|null;
 try{pending=parsePendingPrint(window.localStorage.getItem(pendingKey(config.businessId,documentId)));}catch(error){if(error instanceof PrinterError)throw error;throw new PrinterError('STORAGE','اسمح بحفظ إعداد الطابعة في هذا المتصفح');}
 const body={businessId:config.businessId};
 const finish=(status:string)=>{
  if(status==='spooled'){window.localStorage.removeItem(pendingKey(config.businessId,documentId));return true;}
  if(status==='uncertain')throw new PrinterError('UNCERTAIN','تعذر تأكيد الإرسال؛ راجع طابور ويندوز قبل طلب نسخة أخرى');
  return false;
 };
 if(pending){const state=await bridgeRequest('/v1/status',{...body,jobId:pending.jobId},config.token);if(finish(state.status??''))return;if(state.status!=='not-found')return poll(pending);if(Date.now()-Date.parse(pending.createdAt)>10*60000)throw new PrinterError('EXPIRED',errorMessages.JOB_EXPIRED);}
 const png=await render();if(!png||png.length>8000000)throw new PrinterError('IMAGE_SIZE','الفاتورة أطول من الحد المدعوم للطباعة المباشرة');
 pending??={jobId:crypto.randomUUID(),createdAt:new Date().toISOString()};
 // Persist intent before transmission. A timeout is reconciled using the same ID.
 try{window.localStorage.setItem(pendingKey(config.businessId,documentId),JSON.stringify(pending));}catch{throw new PrinterError('STORAGE','اسمح بحفظ إعداد الطابعة في هذا المتصفح');}
 notify('جارٍ إرسال الفاتورة إلى الطابعة…');
 const result=await bridgeRequest('/v1/print',{...body,...pending,documentId,title,png},config.token);
 if(!finish(result.status??''))await poll(pending);
 async function poll(job:PendingPrint){
  for(let attempt=0;attempt<20;attempt++){
   const state=await bridgeRequest('/v1/status',{...body,jobId:job.jobId},config.token);
   if(finish(state.status??''))return;
   if(state.status==='not-found')throw new PrinterError('UNCERTAIN','تعذر تأكيد الإرسال؛ راجع طابور ويندوز قبل طلب نسخة أخرى');
   await new Promise(resolve=>setTimeout(resolve,500));
  }
  throw new PrinterError('PENDING','طلب الطباعة قيد المتابعة؛ تحقق من طابور ويندوز ثم اضغط طباعة للتحقق منه');
 }
}
