"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { OnboardingFlow } from "../../components/onboarding-flow";

function OnboardingPageContent() {
  const searchParams = useSearchParams();
  const requestedStep = searchParams.get("step") === "page-setup" ? "page-setup" : "business";

  return <OnboardingFlow initialStep={requestedStep} initialBusiness={null} />;
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f8fb] p-6 text-center text-slate-700">جارٍ التحميل...</div>}>
      <OnboardingPageContent />
    </Suspense>
  );
}
