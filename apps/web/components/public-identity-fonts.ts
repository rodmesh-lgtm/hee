import { Cairo, Tajawal } from "next/font/google";
const cairo = Cairo({ variable: "--font-identity-cairo", subsets: ["arabic", "latin"], display: "swap", preload: false });
const tajawal = Tajawal({ variable: "--font-identity-tajawal", subsets: ["arabic", "latin"], weight: ["400", "500", "700", "800"], display: "swap", preload: false });
export const identityFontVariables = `${cairo.variable} ${tajawal.variable}`;
