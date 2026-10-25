import {getPlanEntitlements} from "../plan-entitlements";
export type WhatsAppServiceAccess={allowed:boolean;marketing:boolean;bookings:boolean;cashier:boolean;liveView:boolean};
export function whatsappServicePolicy(code?:string|null,marketingAddon=false):WhatsAppServiceAccess{
 const p=getPlanEntitlements(code),marketing=p.whatsappMarketing||marketingAddon;
 return {allowed:marketing||p.bookings||p.cashier||p.liveView,marketing,bookings:p.bookings,cashier:p.cashier,liveView:p.liveView};
}
/** Management access does not grant a sending entitlement or campaign access. */
export function serviceTemplateAllowed(a:WhatsAppServiceAccess,t:{name:string;category:string}){
 if(!a.allowed)return false;if(a.marketing)return true;
 const category=t.category.toLowerCase();
 if(a.bookings&&((category==="authentication"&&["infro_booking_verification","infro_verification_code"].includes(t.name))||(category==="utility"&&t.name==="infro_booking_confirmation")))return true;
 if(a.cashier&&["infro_laundry_ready","infro_pickup_reminder","infro_payment_reminder"].includes(t.name)&&category==="utility")return true;
 if(a.cashier&&t.name==="infro_order_review"&&["utility","marketing"].includes(category))return true;
 return a.liveView&&t.name==="infro_live_view_v1"&&category==="utility";
}
