import { NextResponse } from "next/server";
import { getCashierSubscriptions } from "../../../Laundromat/package-actions";
export async function POST(request:Request) {
 try{const result=await getCashierSubscriptions(await request.json());return NextResponse.json(result,{status:result.ok?200:400,headers:{"Cache-Control":"private, no-store"}});}
 catch{return NextResponse.json({ok:false,error:"تعذر قراءة اشتراكات العميل"},{status:400,headers:{"Cache-Control":"private, no-store"}});}
}
