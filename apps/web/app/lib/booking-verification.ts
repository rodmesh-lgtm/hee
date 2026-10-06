import "server-only";
import { requireApprovedBookingAuthentication, sendBookingAuthentication, BookingProviderError } from "./booking-verification-provider";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { normalizeE164 } from "./whatsapp/contact-domain";
import { getMetaWhatsAppConfig, metaWhatsAppGraphUrl } from "./whatsapp/meta-config";
import { decryptWhatsAppCredential, type WhatsAppCredentialEnvelope } from "./whatsapp/credential-envelope";
import { assertOutboundEnabled, outboundRateLimit } from "./whatsapp/delivery-domain";
import { hasActiveBusinessSubscription } from "./subscription-entitlement";
import { writeWhatsAppAuditLog } from "./whatsapp/audit";
import { consumePublicWriteLimit, requestClientAddress } from "./rate-limit";
import { asciiDigits, bookingAccessCredential, bookingCredentialDigest, bookingDigestsEqual, bookingVerificationCode, newBookingAccessToken, newBookingVerificationCode, authenticationCopyCodeTemplate, BOOKING_VERIFICATION_TEMPLATE, BOOKING_CODE_TTL_MS, BOOKING_ACCESS_TTL_MS, BOOKING_CODE_MAX_ATTEMPTS } from "./booking-verification-domain";

export class BookingVerificationError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
function secret() { const value=process.env.SESSION_SECRET??""; if(value.length<24) throw new BookingVerificationError(503,"التحقق غير جاهز الآن"); return value; }
export function verificationPhone(value: unknown) { return typeof value === "string" ? normalizeE164(asciiDigits(value), "966") : null; }
export async function verificationBusiness(slug: string) {
  const business = await db.business.findFirst({where:{slug,deletedAt:null,isPublished:true,bookingAvailable:true,owner:{deletedAt:null,emailVerifiedAt:{not:null}}},select:{id:true}});
  if(!business || !await hasActiveBusinessSubscription({businessId:business.id})) throw new BookingVerificationError(409,"تعديل الموعد غير متاح حاليًا لدى المنشأة");
  return business;
}
async function limited(businessId:string, request:Request, identity:string, scope:string, limit:number) {
  const result=await consumePublicWriteLimit({businessId,identity,scope,limit,windowSeconds:600});
  if(!result.allowed) throw new BookingVerificationError(429,"طلبات كثيرة؛ انتظر قبل المحاولة التالية");
}
export async function requestBookingVerification(slug:string, rawPhone:unknown, consent:unknown, request:Request) {
  const phone=verificationPhone(rawPhone);
  if(!phone || consent!==true) throw new BookingVerificationError(400,"أدخل رقم واتساب ووافق على استلام رمز تعديل الموعد");
  const digestSecret=secret();
  const business=await verificationBusiness(slug);
  await limited(business.id,request,requestClientAddress(request)||"unknown","booking-verification-ip",10);
  await limited(business.id,request,phone,"booking-verification-phone",3);
  assertOutboundEnabled();
  const config=getMetaWhatsAppConfig();
  const template=await db.whatsAppTemplate.findFirst({where:{businessId:business.id,provider:"meta",name:BOOKING_VERIFICATION_TEMPLATE,language:"ar",category:"authentication",status:"approved",connection:{businessId:business.id,provider:"meta",status:"connected",disabledAt:null,bookingEnabled:true}},include:{connection:true}});
  if(!template || !authenticationCopyCodeTemplate(template.components)) throw new BookingVerificationError(409,"رمز واتساب غير جاهز لدى المنشأة؛ يلزم قالب تحقق معتمد من Meta");
  const token=decryptWhatsAppCredential({envelope:template.connection.credentialEnvelope as unknown as WhatsAppCredentialEnvelope,encryptionKeyBase64:config.META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY,businessId:business.id});
  // Re-prove approval from the official provider immediately before a send. Never retry POST.
  try { await requireApprovedBookingAuthentication({url:`${metaWhatsAppGraphUrl(config,template.providerTemplateId)}?fields=id,name,language,status,category,components`,token,id:template.providerTemplateId,name:template.name}); }
  catch { throw new BookingVerificationError(409,"قالب التحقق غير معتمد حاليًا؛ راجع المنشأة"); }
  const challengeId=randomUUID();
  const digits=phone.slice(1);
  const rows=await db.$queryRaw<Array<{id:string;updatedAt:Date}>>`
    SELECT b."id",b."updatedAt" FROM "Booking" b JOIN "Customer" c ON c."id"=b."customerId" AND c."businessId"=b."businessId"
    LEFT JOIN "BookingDurationSnapshot" snapshot ON snapshot."bookingId"=b."id" LEFT JOIN "Service" s ON s."id"=b."serviceId"
    WHERE b."businessId"=${business.id} AND b."status" IN ('pending','confirmed')
    AND regexp_replace(c."phone",'[^0-9]','','g') IN (${digits},${digits.startsWith("966")?`0${digits.slice(3)}`:digits},${`00${digits}`})
    AND ((b."bookingDate"||' '||b."bookingTime")::timestamp AT TIME ZONE 'Asia/Riyadh') + make_interval(mins=>COALESCE(snapshot."durationMinutes",CASE WHEN s."durationMinutes" BETWEEN 5 AND 1440 THEN s."durationMinutes" ELSE 30 END)) > CURRENT_TIMESTAMP
    ORDER BY b."createdAt" DESC,b."id" DESC LIMIT 1`;
  const booking=rows[0];
  // Uniform success shape for absent bookings and suppression; no visitor information before proof.
  const receipt={challengeId,expiresInSeconds:BOOKING_CODE_TTL_MS/1000};
  if(!booking) return receipt;
  const contact=await db.whatsAppContact.findUnique({where:{businessId_phoneE164:{businessId:business.id,phoneE164:phone}},select:{deletedAt:true,optedOutAt:true}});
  const consentRow=await db.whatsAppConsent.findUnique({where:{businessId_phoneE164:{businessId:business.id,phoneE164:phone}},select:{revokedAt:true}});
  if(contact?.deletedAt || contact?.optedOutAt || consentRow?.revokedAt) return receipt;
  const code=newBookingVerificationCode();
  const digest=bookingCredentialDigest("code",challengeId,code,digestSecret);
  const created=await db.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`booking-verification:${business.id}:${booking.id}`}))`;
    const recent=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "BookingVisitorVerification" WHERE "businessId"=${business.id} AND "bookingId"=${booking.id} AND "createdAt">CURRENT_TIMESTAMP-INTERVAL '60 seconds' LIMIT 1`;
    if(recent.length) return false;
    await tx.$executeRaw`UPDATE "BookingVisitorVerification" SET "status"='invalidated' WHERE "businessId"=${business.id} AND "bookingId"=${booking.id} AND "status" IN ('pending','accepted','verified')`;
    await tx.$executeRaw`INSERT INTO "BookingVisitorVerification" ("id","businessId","bookingId","bookingUpdatedAt","codeDigest","expiresAt","consentedAt") VALUES (${challengeId},${business.id},${booking.id},${booking.updatedAt},${digest},CURRENT_TIMESTAMP+INTERVAL '5 minutes',CURRENT_TIMESTAMP)`;
    await writeWhatsAppAuditLog({database:tx,businessId:business.id,actorType:"system",action:"booking.visitor.verification.requested",targetType:"booking",targetId:booking.id,outcome:"success",metadata:{purpose:"visitor_requested_appointment_edit"}});
    return true;
  });
  if(!created) return receipt;
  try {
    const current=await db.whatsAppConnection.findFirst({where:{id:template.connectionId,businessId:business.id,status:"connected",disabledAt:null,bookingEnabled:true},select:{id:true}});
    if(!current || !await hasActiveBusinessSubscription({businessId:business.id})) throw new Error("UNAVAILABLE");
    assertOutboundEnabled();
    const now=new Date();const windowStart=new Date(Math.floor(now.getTime()/60000)*60000);const limit=outboundRateLimit();
    const slot=await db.$queryRaw<Array<{sentCount:number}>>`INSERT INTO "WhatsAppSendRateBucket" ("connectionId","businessId","windowStart","sentCount","updatedAt") VALUES (${current.id},${business.id},${windowStart},1,${now}) ON CONFLICT ("connectionId","windowStart") DO UPDATE SET "sentCount"="WhatsAppSendRateBucket"."sentCount"+1,"updatedAt"=${now} WHERE "WhatsAppSendRateBucket"."businessId"=${business.id} AND "WhatsAppSendRateBucket"."sentCount"<${limit} RETURNING "sentCount"`;
    if(!slot.length) throw new Error("RATE_LIMITED");
    const messageId=await sendBookingAuthentication({url:metaWhatsAppGraphUrl(config,`${template.connection.phoneNumberId}/messages`),token,name:template.name,phone,code});
    await db.$executeRaw`UPDATE "BookingVisitorVerification" SET "status"='accepted',"providerMessageId"=${messageId} WHERE "id"=${challengeId} AND "businessId"=${business.id} AND "status"='pending' AND "expiresAt">CURRENT_TIMESTAMP`;
  } catch(error) {
    await db.$executeRaw`UPDATE "BookingVisitorVerification" SET "status"='failed' WHERE "id"=${challengeId} AND "businessId"=${business.id} AND "status"='pending'`;
    await writeWhatsAppAuditLog({businessId:business.id,actorType:"system",action:"booking.visitor.verification.send",targetType:"booking",targetId:booking.id,outcome:"failed",metadata:{reason:error instanceof BookingProviderError?error.reason:"provider_acceptance_unconfirmed_no_retry"}});
  }
  return receipt;
}
export type BookingAccess = { challengeId:string; bookingId:string; bookingUpdatedAt:Date; accessDigest:string; status:string; };
export async function readBookingAccess(database:Prisma.TransactionClient, businessId:string, value:unknown, lock=false, replayKey:string|null=null):Promise<BookingAccess|null> {
  const credential=bookingAccessCredential(value);if(!credential)return null;
  const rows=await database.$queryRaw<Array<BookingAccess>>(Prisma.sql`SELECT v."id" AS "challengeId",v."bookingId",v."bookingUpdatedAt",v."accessDigest",v."status" FROM "BookingVisitorVerification" v
    JOIN "Booking" b ON b."id"=v."bookingId" AND b."businessId"=v."businessId"
    LEFT JOIN "BookingDurationSnapshot" snapshot ON snapshot."bookingId"=b."id" LEFT JOIN "Service" s ON s."id"=b."serviceId"
    WHERE v."id"=${credential.challengeId} AND v."businessId"=${businessId}
    AND (v."status"='consumed' AND v."consumedRequestId"=${replayKey} OR v."status"='verified' AND b."updatedAt"=v."bookingUpdatedAt" AND b."status" IN ('pending','confirmed')
      AND ((b."bookingDate"||' '||b."bookingTime")::timestamp AT TIME ZONE 'Asia/Riyadh') + make_interval(mins=>COALESCE(snapshot."durationMinutes",CASE WHEN s."durationMinutes" BETWEEN 5 AND 1440 THEN s."durationMinutes" ELSE 30 END))>CURRENT_TIMESTAMP)
    AND v."accessExpiresAt">CURRENT_TIMESTAMP ${lock?Prisma.sql`FOR UPDATE OF v,b`:Prisma.empty}`);
  const row=rows[0];return row && bookingDigestsEqual(row.accessDigest,bookingCredentialDigest("access",credential.challengeId,credential.token,secret()))?row:null;
}
export async function verifyBookingChallenge(slug:string, id:unknown, rawCode:unknown, request:Request) {
  if(typeof id!=="string" || !/^[0-9a-f-]{36}$/i.test(id)) throw new BookingVerificationError(400,"رمز التحقق غير صالح أو انتهت صلاحيته");
  const code=bookingVerificationCode(rawCode);if(!code)throw new BookingVerificationError(400,"أدخل رمز التحقق المكون من ستة أرقام");
  const business=await verificationBusiness(slug);
  await limited(business.id,request,requestClientAddress(request)||"unknown","booking-verification-check",30);
  const accessToken=newBookingAccessToken();
  const result=await db.$transaction(async tx=>{
    const rows=await tx.$queryRaw<Array<{bookingId:string;bookingUpdatedAt:Date;codeDigest:string;attemptCount:number;valid:boolean}>>`SELECT "bookingId","bookingUpdatedAt","codeDigest","attemptCount",("status"='accepted' AND "expiresAt">CURRENT_TIMESTAMP) AS valid FROM "BookingVisitorVerification" WHERE "id"=${id} AND "businessId"=${business.id} FOR UPDATE`;
    const row=rows[0];if(!row?.valid || row.attemptCount>=BOOKING_CODE_MAX_ATTEMPTS)return null;
    const matches=bookingDigestsEqual(row.codeDigest,bookingCredentialDigest("code",id,code,secret()));
    await tx.$executeRaw`UPDATE "BookingVisitorVerification" SET "attemptCount"="attemptCount"+1 WHERE "id"=${id} AND "businessId"=${business.id}`;
    if(!matches)return null;
    const booking=await tx.booking.findFirst({where:{id:row.bookingId,businessId:business.id,updatedAt:row.bookingUpdatedAt,status:{in:["pending","confirmed"]}},select:{id:true,bookingDate:true,bookingTime:true,branchId:true,serviceId:true,customer:{select:{name:true,phone:true}},service:{select:{name:true}}}});
    if(!booking)return null;
    const future=await tx.$queryRaw<Array<{id:string}>>`SELECT b."id" FROM "Booking" b LEFT JOIN "BookingDurationSnapshot" snapshot ON snapshot."bookingId"=b."id" LEFT JOIN "Service" s ON s."id"=b."serviceId" WHERE b."id"=${booking.id} AND b."businessId"=${business.id} AND ((b."bookingDate"||' '||b."bookingTime")::timestamp AT TIME ZONE 'Asia/Riyadh')+make_interval(mins=>COALESCE(snapshot."durationMinutes",CASE WHEN s."durationMinutes" BETWEEN 5 AND 1440 THEN s."durationMinutes" ELSE 30 END))>CURRENT_TIMESTAMP`;
    if(!future.length)return null;
    const digest=bookingCredentialDigest("access",id,accessToken,secret());
    await tx.$executeRaw`UPDATE "BookingVisitorVerification" SET "status"='verified',"accessDigest"=${digest},"accessExpiresAt"=CURRENT_TIMESTAMP+INTERVAL '10 minutes',"verifiedAt"=CURRENT_TIMESTAMP WHERE "id"=${id} AND "businessId"=${business.id}`;
    await writeWhatsAppAuditLog({database:tx,businessId:business.id,actorType:"system",action:"booking.visitor.verified",targetType:"booking",targetId:booking.id,outcome:"success"});
    return booking;
  });
  if(!result)throw new BookingVerificationError(400,"رمز التحقق غير صالح أو انتهت صلاحيته؛ اطلب رمزًا جديدًا");
  return {booking:result,access:`${id}.${accessToken}`,expiresInSeconds:BOOKING_ACCESS_TTL_MS/1000};
}
