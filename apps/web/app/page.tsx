import type { Metadata } from "next";
import { HomepageProfessional } from "../components/homepage-professional";
const description="INFRO منصة سعودية لهوية الأعمال الرقمية والتسويقية تجمع معلومات المنشأة وخدماتها وفروعها وطرق التواصل، وتطور حلول WhatsApp Business Platform الرسمية للأعمال.";
export const metadata:Metadata={title:"INFRO | هويتك الرقمية والتسويقية",description,openGraph:{title:"INFRO | هويتك الرقمية والتسويقية",description,url:"/",siteName:"INFRO",locale:"ar_SA",type:"website"},alternates:{canonical:"/"}};
export default function Home(){return <HomepageProfessional/>}
