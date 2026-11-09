/** Rasterize the existing Arabic receipt so printer code pages cannot reorder it. */
export async function receiptPng(receipt:HTMLElement):Promise<string>{
 const {toCanvas}=await import('html-to-image');
 const width=72*96/25.4;
 const host=document.createElement('div');host.className='laundry ld-direct-print-host';host.setAttribute('aria-hidden','true');
 Object.assign(host.style,{position:'fixed',left:'-10000px',top:'0',width:`${width}px`,background:'#fff',color:'#000',pointerEvents:'none',minHeight:'0'});
 const clone=receipt.cloneNode(true) as HTMLElement;clone.dir=getComputedStyle(receipt).direction;clone.style.fontFamily=getComputedStyle(receipt).fontFamily;clone.classList.remove('a4');clone.classList.add('thermal');
 Object.assign(clone.style,{width:`${width}px`,maxWidth:'none',margin:'0',padding:'0',background:'#fff',color:'#000'});host.appendChild(clone);document.body.appendChild(host);
 try{
  await document.fonts.ready;
  await Promise.all(Array.from(clone.querySelectorAll('img')).map(async image=>{image.loading='eager';try{await image.decode();}catch{throw new Error('تعذر تحميل شعار الفاتورة؛ أعد المحاولة أو استخدم طباعة المتصفح');}}));
  const height=Math.ceil(clone.getBoundingClientRect().height),pixels=Math.ceil(height*576/width);
  if(pixels<1||pixels>30000)throw new Error('الفاتورة أطول من الحد المدعوم للطباعة المباشرة');
  const canvas=await toCanvas(clone,{width,height,canvasWidth:576,canvasHeight:pixels,pixelRatio:1,skipAutoScale:true,backgroundColor:'#fff',preferredFontFormat:'woff2',cacheBust:false});
  const context=canvas.getContext('2d');if(!context)throw new Error('تعذر تجهيز صورة الفاتورة');
  const image=context.getImageData(0,0,canvas.width,canvas.height);
  for(let i=0;i<image.data.length;i+=4){const value=(image.data[i]*299+image.data[i+1]*587+image.data[i+2]*114)/1000;const ink=value<180?0:255;image.data[i]=image.data[i+1]=image.data[i+2]=ink;image.data[i+3]=255;}
  context.putImageData(image,0,0);
  return canvas.toDataURL('image/png').split(',')[1];
 }finally{host.remove();}
}
