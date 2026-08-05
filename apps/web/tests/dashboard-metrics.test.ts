import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboardSummary, completionPercent } from "../app/lib/dashboard-metrics";

test("completionPercent counts the filled business fields", () => {
  const result = completionPercent({
    name: "متجر",
    businessType: "مقهى",
    shortDescription: "وصف مختصر",
    logoUrl: null,
    coverUrl: "https://example.com/cover.jpg",
    phone: "0500000000",
    whatsapp: null,
    city: "الرياض",
    website: "https://example.com",
  });

  assert.equal(result, 78);
});

test("buildDashboardSummary exposes real counts for the dashboard cards", () => {
  const summary = buildDashboardSummary({
    businessName: "متجر",
    productsCount: 4,
    servicesCount: 2,
    ordersCount: 8,
    customersCount: 12,
    bookingsCount: 3,
    analyticsCount: 56,
    teamMembersCount: 2,
  });

  assert.equal(summary.metrics[0].value, 4);
  assert.equal(summary.metrics[1].value, 2);
  assert.equal(summary.metrics[2].value, 8);
  assert.equal(summary.teamMembersCount, 2);
  assert.equal(summary.completionPercent, 100);
});
