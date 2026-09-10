import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) { return readFileSync(new URL(`../${path}`, import.meta.url), "utf8"); }

test("customer creation and availability checks reject protected slugs on the server", () => {
  const policy = source("app/lib/public-url.ts");
  const create = source("app/api/business/create/route.ts");
  const check = source("app/api/business/check-slug/route.ts");
  const availability = source("app/api/public/slug-availability/route.ts");
  assert.match(policy, /PROTECTED_PUBLIC_SLUGS/);
  assert.match(policy, /"facebook"/);
  assert.match(policy, /"instagram"/);
  assert.match(create, /isValidPublicSlug/);
  assert.match(check, /isReservedPublicSlug/);
  assert.match(availability, /isProtectedPublicSlug/);
  assert.match(availability, /reason: "protected"/);
});

test("protected slug exceptions are admin-only, serialized, and audited", () => {
  const action = source("app/actions/admin-protected-slug.ts");
  const control = source("components/admin/protected-slug-control.tsx");
  assert.match(action, /requireAdmin\(\)/);
  assert.match(action, /pg_advisory_xact_lock/);
  assert.match(action, /TransactionIsolationLevel\.Serializable/);
  assert.match(action, /authorizationReference/);
  assert.match(action, /assignedByUserId/);
  assert.match(action, /assignedByEmail/);
  assert.match(action, /PROTECTED_SLUG_GRANT_EVENT/);
  assert.match(control, /assignProtectedSlugAdminAction/);
  assert.match(control, /مرجع التفويض/);
});

test("publishing and public rendering require the server-side admin grant", () => {
  const publication = source("app/actions/publication.ts");
  const publicPage = source("app/[slug]/page.tsx");
  const grant = source("app/lib/protected-public-slug.ts");
  assert.match(publication, /canBusinessUsePublicSlug/);
  assert.match(publicPage, /canBusinessUsePublicSlug/);
  assert.match(grant, /metadata"->>'slug'/);
  assert.match(grant, /admin_protected_slug_assigned/);
});
