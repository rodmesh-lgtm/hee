import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { normalizeAccountPhone } from "./account-profile-domain";
import { LaundryInputError } from "./laundry-domain";
export function laundryCustomerPhone(raw:string){
 try {const phone=normalizeAccountPhone(raw);if(phone)return phone;}catch{}
 throw new LaundryInputError("أدخل جوالًا صحيحًا مثل 05xxxxxxxx أو رقمًا دوليًا مع رمز الدولة");
}
// All callers hold the same per-business laundry advisory lock.
export async function ensureLaundryCustomer(tx:Prisma.TransactionClient,businessId:string,name:string,rawPhone:string){
 const phone=laundryCustomerPhone(rawPhone);
 const rows=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "LaundryCustomer" WHERE "businessId"=${businessId} AND phone=${phone}`;
 if(rows[0])return {id:rows[0].id,phone};
 const id=randomUUID();
 await tx.$executeRaw`INSERT INTO "LaundryCustomer" (id,"businessId",name,phone) VALUES (${id},${businessId},${name},${phone})`;
 return {id,phone};
}
