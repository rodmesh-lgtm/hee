import type { Metadata } from "next";
import { AccountingWorkspacePage } from "./server-workspace";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"INFRO انفرو · إدارة المغاسل والكاشير",robots:{index:false,follow:false,noarchive:true}};
export default function LaundryPage(props:{searchParams:Promise<{q?:string;filter?:string}>}){return AccountingWorkspacePage(props);}
