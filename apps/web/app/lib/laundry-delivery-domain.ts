export const LAUNDRY_DELIVERY_STATES={assigned:"مسندة للمندوب",out_for_delivery:"في الطريق",delivered:"تم التسليم",failed:"تعذر التسليم"} as const;
export function laundryDeliveryTransition(current:string,next:string,owner:boolean){
 return (current==="assigned"&&next==="out_for_delivery")||(current==="out_for_delivery"&&(next==="delivered"||next==="failed"))||(owner&&current==="failed"&&next==="assigned");
}
