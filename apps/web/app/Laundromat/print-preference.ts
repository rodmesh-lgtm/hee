"use client";
import {useSyncExternalStore} from 'react';
const event='infro-cashier-print-preference';
function subscribe(notify:()=>void){window.addEventListener('storage',notify);window.addEventListener(event,notify);return()=>{window.removeEventListener('storage',notify);window.removeEventListener(event,notify);};}
export function useCashierPrintSize(businessId:string):[string,(value:string)=>void]{
 const key=`infro:cashier:print:${businessId}`;
 const value=useSyncExternalStore(subscribe,()=>{try{return window.localStorage.getItem(key)==='thermal'?'thermal':'a4';}catch{return 'a4';}},()=> 'a4');
 return [value,next=>{try{window.localStorage.setItem(key,next==='thermal'?'thermal':'a4');window.dispatchEvent(new Event(event));}catch{}}];
}
