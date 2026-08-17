"use server";

import { redirect } from "next/navigation";
import { updateBusinessBrandingImagesAction } from "./business";

export async function updateBrandingImagesFromDashboardAction(formData: FormData) {
  const result = await updateBusinessBrandingImagesAction({}, formData);
  if (result.error) redirect(`/dashboard/branding?images=error&message=${encodeURIComponent(result.error)}`);
  redirect("/dashboard/branding?images=saved");
}
