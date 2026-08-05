export function resolveOnboardingRedirect(businessStep: string | null | undefined, isPublished: boolean | null | undefined) {
  if (isPublished) {
    return "/dashboard";
  }

  if (!businessStep || businessStep === "account_created") {
    return "/onboarding";
  }

  if (businessStep === "business_type_completed" || businessStep === "business_details_completed") {
    return "/onboarding?step=page-setup";
  }

  if (businessStep === "page_setup_completed" || businessStep === "preview_completed" || businessStep === "published") {
    return "/onboarding?step=preview";
  }

  return "/onboarding";
}
