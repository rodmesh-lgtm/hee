import { authenticationCopyCodeTemplate, bookingAuthenticationParameters } from "./booking-verification-domain";
export class BookingProviderError extends Error {
  constructor(public readonly reason: string) { super("BOOKING_VERIFICATION_PROVIDER_FAILED"); }
}
function officialUrl(value:string) { const url=new URL(value);if(url.protocol!=="https:" || url.hostname!=="graph.facebook.com" || url.username || url.password || !/^\/v\d+\.\d+\/\d+(?:\/messages)?$/.test(url.pathname))throw new BookingProviderError("invalid_provider_url");return url.toString(); }
export async function requireApprovedBookingAuthentication(input:{url:string;token:string;id:string;name:string;fetcher?:typeof fetch}) {
 const response=await (input.fetcher??fetch)(officialUrl(input.url),{headers:{authorization:`Bearer ${input.token}`},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(15000)});
 const value=await response.json().catch(()=>null);
 if(!response.ok || value?.id!==input.id || value?.name!==input.name || value?.language!=="ar" || value?.status!=="APPROVED" || value?.category!=="AUTHENTICATION" || !authenticationCopyCodeTemplate(value?.components))throw new BookingProviderError("template_not_approved");
}
export async function sendBookingAuthentication(input:{url:string;token:string;name:string;phone:string;code:string;fetcher?:typeof fetch}) {
 let response:Response;
 try { response=await (input.fetcher??fetch)(officialUrl(input.url),{method:"POST",cache:"no-store",redirect:"error",headers:{authorization:`Bearer ${input.token}`,"content-type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to:input.phone.slice(1),type:"template",template:{name:input.name,language:{code:"ar"},components:bookingAuthenticationParameters(input.code)}}),signal:AbortSignal.timeout(15000)}); }
 catch { throw new BookingProviderError("acceptance_uncertain_no_retry"); }
 const value=await response.json().catch(()=>null);const id=value?.messages?.[0]?.id;
 if(!response.ok || typeof id!=="string" || !id || id.length>256)throw new BookingProviderError(Number.isSafeInteger(value?.error?.code)?`meta_${value.error.code}`:"acceptance_unconfirmed_no_retry");
 return id;
}
