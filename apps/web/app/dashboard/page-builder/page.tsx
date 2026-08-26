import { redirect } from "next/navigation";

// The old 11-step builder created unnecessary cognitive load for customers.
// Keep the route as a compatibility entry point, but send customers to the
// single page editor where changes are autosaved and grouped by section.
export default function DashboardPageBuilderPage() {
  redirect("/dashboard/my-page?edit=1");
}
