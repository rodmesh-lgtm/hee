import { readPrinterConfig,reportPrintStatus,sendDirectReceipt } from "./direct-printer";
const pendingReceipts=new WeakSet<HTMLElement>();

/** Wait for receipt assets before opening the browser print dialog. */
export async function printCashierReceipt(receipt:HTMLElement|null,title:string){
 if(!receipt||pendingReceipts.has(receipt))return;
 pendingReceipts.add(receipt);
 try{
 const invoiceId=receipt.dataset.invoiceId;
 const images=Array.from(receipt.querySelectorAll('img'));
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  await Promise.race([
   Promise.all([document.fonts?.ready,...images.map(image=>image.decode().catch(()=>undefined))]),
   new Promise<void>(resolve=>{timer=setTimeout(resolve,3000);}),
  ]);
 }finally{clearTimeout(timer);}
 // Closing or switching invoices while assets load cancels that print request.
 if(!receipt.isConnected||receipt.dataset.invoiceId!==invoiceId||!receipt.closest('dialog')?.open)return;
 const businessId=receipt.dataset.businessId;
 const config=businessId?readPrinterConfig(businessId):null;
 if(config?.enabled&&receipt.classList.contains('thermal')){
  const notify=(message:string,kind:'busy'|'success'|'error'='busy')=>reportPrintStatus({businessId:config.businessId,documentId:invoiceId??'',kind,message});
  try{
   if(!invoiceId)throw new Error('الفاتورة غير محددة');
   notify('جارٍ تجهيز الفاتورة للطباعة المباشرة…');
   await sendDirectReceipt(config,invoiceId,title,async()=>{
    const {receiptPng}=await import('./receipt-raster');const png=await receiptPng(receipt);
    if(!receipt.isConnected||receipt.dataset.invoiceId!==invoiceId||!receipt.closest('dialog')?.open)throw new Error('أُغلقت الفاتورة قبل إرسالها إلى الطابعة');
    return png;
   },message=>notify(message));
   notify('أُرسلت الفاتورة إلى طابور الطباعة في ويندوز','success');
  }catch(error){notify(error instanceof Error?error.message:'تعذر إكمال الطباعة المباشرة','error');}
  return;
 }
 const previousTitle=document.title;
 document.title=title.replace(/[\\/:*?"<>|]/g,' ').replace(/\s+/g,' ').trim();
 try{window.print();}finally{document.title=previousTitle;}
 }finally{pendingReceipts.delete(receipt);}
}
