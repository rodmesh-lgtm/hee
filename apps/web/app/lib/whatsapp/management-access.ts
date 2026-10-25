import "server-only";
import {getEffectiveSubscription} from "../subscription-entitlement";
import {hasActiveWhatsAppMarketingEntitlement} from "./feature-entitlement";
import {whatsappServicePolicy} from "./service-policy";
export async function whatsappManagementAccess(businessId:string){
 const [subscription,marketing]=await Promise.all([getEffectiveSubscription({businessId}),hasActiveWhatsAppMarketingEntitlement({businessId})]);
 return whatsappServicePolicy(subscription?.plan.code,marketing);
}
