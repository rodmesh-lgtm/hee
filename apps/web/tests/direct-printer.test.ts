import assert from 'node:assert/strict';
import test from 'node:test';
import {bridgeRequest,parsePrinterConfig,sendDirectReceipt,PrinterError,type DirectPrinterConfig} from '../app/Laundromat/direct-printer';
import nextConfig from '../next.config';
const businessId='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const config:DirectPrinterConfig={version:1,businessId,printerName:'Evelon D10',token:Buffer.alloc(32).toString('base64'),enabled:true};
function fixture(fetcher:typeof fetch){
 const values=new Map<string,string>(),original=globalThis.fetch,windowDescriptor=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)}}});globalThis.fetch=fetcher;
 return {values,restore(){globalThis.fetch=original;if(windowDescriptor)Object.defineProperty(globalThis,'window',windowDescriptor);else Reflect.deleteProperty(globalThis,'window');}};
}
const result=(body:unknown)=>new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
test('printer credentials are scoped to one business and malformed persisted configuration fails closed',()=>{
 assert.deepEqual(parsePrinterConfig(JSON.stringify(config),businessId),config);assert.equal(parsePrinterConfig(JSON.stringify(config),other),null);assert.equal(parsePrinterConfig(JSON.stringify({...config,token:'invalid'}),businessId),null);assert.equal(parsePrinterConfig('{bad',businessId),null);
});
test('print intent is durable before transmission and success means spool acceptance, not physical output',async()=>{
 let sent=0;const f=fixture(async(url,options)=>{assert.ok(String(url).startsWith('http://127.0.0.1:17861/'));assert.equal(options?.credentials,'omit');assert.equal(options?.redirect,'error');const body=JSON.parse(String(options?.body));assert.equal(body.businessId,businessId);if(String(url).endsWith('/print')){sent++;assert.equal(f.values.size,1);assert.equal(body.png,'test-raster');return result({ok:true,status:'pending'});}return result({ok:true,status:'spooled'});});
 try{await sendDirectReceipt(config,'invoice-1','Invoice 00001',async()=>'test-raster',()=>{});assert.equal(sent,1);assert.equal(f.values.size,0);}finally{f.restore();}
});
test('lost spool acknowledgement is reconciled without another raster or print request',async()=>{
 let sent=0,renders=0;const f=fixture(async url=>{if(String(url).endsWith('/print')){sent++;throw new TypeError('Response lost after native acceptance');}return result({ok:true,status:'spooled'});});
 try{await assert.rejects(sendDirectReceipt(config,'invoice-1','Invoice 00001',async()=>{renders++;return 'test-raster';},()=>{}),PrinterError);assert.equal(f.values.size,1);await sendDirectReceipt(config,'invoice-1','Invoice 00001',async()=>{renders++;return 'test-raster';},()=>{});assert.equal(sent,1);assert.equal(renders,1);assert.equal(f.values.size,0);}finally{f.restore();}
});
test('uncertain native jobs never generate an automatic replacement print request',async()=>{
 let sent=0;const f=fixture(async url=>{if(String(url).endsWith('/print')){sent++;return result({ok:true,status:'uncertain'});}return result({ok:true,status:'uncertain'});});
 try{await assert.rejects(sendDirectReceipt(config,'invoice-1','Invoice 00001',async()=>'test-raster',()=>{}),error=>error instanceof PrinterError&&error.code==='UNCERTAIN');await assert.rejects(sendDirectReceipt(config,'invoice-1','Invoice 00001',async()=>{throw Error('Must not render another copy');},()=>{}),error=>error instanceof PrinterError&&error.code==='UNCERTAIN');assert.equal(sent,1);}finally{f.restore();}
});
test('denied browser loopback permission causes no network request',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');let requests=0;const f=fixture(async()=>{requests++;return result({ok:true});});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{permissions:{query:async()=>({state:'denied'})}}});
 try{await assert.rejects(bridgeRequest('/v1/printers',{businessId},config.token),error=>error instanceof PrinterError&&error.code==='PERMISSION');assert.equal(requests,0);}finally{f.restore();if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else Reflect.deleteProperty(globalThis,'navigator');}
});
test('loopback access is restricted to cashier route headers and a single fixed local port',async()=>{
 const entries=await nextConfig.headers!();const global=entries.find(entry=>entry.source==='/(.*)')!;assert.ok(!global.headers.some(header=>header.value.includes('127.0.0.1')));
 for(const route of ['/Accounting/:path*','/Laundromat/:path*']){
  const scoped=entries.filter(entry=>entry.source===route).flatMap(entry=>entry.headers);const csp=scoped.find(header=>header.key==='Content-Security-Policy')!.value;
  assert.ok(csp.includes('http://127.0.0.1:17861'));assert.ok(!csp.includes('http://localhost:*'));assert.ok(scoped.some(header=>header.key==='Permissions-Policy'&&header.value.includes('loopback-network=(self)')));
 }
});
