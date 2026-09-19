import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260919173000_salla_booking_eligibility/migration.sql");
const bookingRoute = read("app/api/public/bookings/route.ts");
const webhookRoute = read("app/api/commerce/salla/webhook/route.ts");
const processor = read("app/lib/commerce/salla-webhook-processor.ts");
const orderSync = read("app/lib/commerce/salla-order-sync.ts");
const oauth = read("app/lib/commerce/salla-oauth.ts");
const oauthCallback = read("app/api/commerce/salla/callback/route.ts");
const workingHoursActions = read("app/actions/working-hours.ts");
const page = read("app/dashboard/working-hours/page.tsx");
const launchAudit = read("scripts/launch-config-audit.ts");

test("Salla order eligibility is tenant and integration scoped", () => {
  assert.match(schema, /model CommerceBookingEligibility \{/);
  assert.match(schema, /@@unique\(\[integrationId, externalOrderId\]/);
  assert.match(migration, /FOREIGN KEY \("integrationId", "businessId"\)/);
  assert.match(migration, /CommerceBookingEligibility_business_phone_idx/);
  assert.match(migration, /phoneE164" IS NULL OR "phoneE164" ~/);
});

test("public booking re-proves active subscription and paid commerce order at commit time", () => {
  assert.match(bookingRoute, /commerceBookingGate/);
  assert.match(bookingRoute, /CommerceBookingEligibility/);
  assert.match(bookingRoute, /booking_eligibility\."phoneE164" = \$\{bookingPhoneE164\}/);
  assert.match(bookingRoute, /booking_eligibility\."eligible" = true/);
  assert.match(bookingRoute, /eligibility_integration\."status" = 'active'/);
  assert.match(bookingRoute, /'salla','zid','shopify','woocommerce'/);
  assert.match(bookingRoute, /SubscriptionAccessGrant/);
  assert.match(bookingRoute, /TransactionIsolationLevel\.Serializable/);
});

test("Salla webhooks are signed, durable, leased and revocable", () => {
  assert.match(webhookRoute, /verifySallaWebhookSignature/);
  assert.match(webhookRoute, /sallaWebhookEvent\.upsert/);
  assert.match(processor, /FOR UPDATE SKIP LOCKED/);
  assert.match(processor, /retry_scheduled/);
  assert.match(processor, /eligible: mapping\.order\.eligible/);
  assert.match(processor, /providerUpdatedAt/);
});

test("Salla connection imports historical orders and supports an explicit refresh", () => {
  assert.match(orderSync, /api\.salla\.dev\/admin\/v2\/orders/);
  assert.match(orderSync, /decryptCommerceCredential/);
  assert.match(orderSync, /page <= maxPages/);
  assert.match(orderSync, /current\.providerUpdatedAt > mapping\.order\.providerUpdatedAt/);
  assert.match(oauthCallback, /after\(async \(\) =>/);
  assert.match(oauthCallback, /syncSallaBookingOrders/);
  assert.match(workingHoursActions, /syncSallaBookingOrdersAction/);
  assert.match(oauth, /pg_advisory_xact_lock\(hashtext/);
  assert.match(oauth, /SALLA_STORE_ALREADY_ASSIGNED/);
  assert.match(oauth, /externalStoreId: `pending:\$\{randomUUID\(\)\}`/);
  assert.match(oauth, /discoveringStore/);
  assert.match(oauth, /externalStoreId: store\.merchantId/);
  assert.doesNotMatch(page, /name="merchantId"/);
  assert.match(page, /سيتعرّف INFRO على المتجر المصرّح به/);
  assert.match(page, /بانتظار إكمال الموافقة داخل سلة/);
  assert.match(page, /!sallaIntegration\.externalStoreId\.startsWith\("pending:"\)/);
  assert.match(orderSync, /per_page", "30"/);
});

test("booking settings disclose when the multi-store gate becomes active without exposing order data publicly", () => {
  assert.match(page, /MULTI-STORE BOOKING ACCESS/);
  assert.match(page, /يبدأ تطبيق الشرط فقط بعد اكتمال الربط الرسمي/);
  assert.match(page, /لا تنتقل البيانات بين المنشآت/);
  assert.doesNotMatch(bookingRoute, /externalOrderId.*NextResponse/);
});

test("production cannot launch with a partially configured Salla integration", () => {
  assert.match(launchAudit, /productionSallaReadiness/);
  assert.match(launchAudit, /SALLA_CLIENT_ID/);
  assert.match(launchAudit, /SALLA_WEBHOOK_SECRET/);
  assert.match(launchAudit, /WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY/);
  assert.match(launchAudit, /fully configured or fully disabled/);
});
