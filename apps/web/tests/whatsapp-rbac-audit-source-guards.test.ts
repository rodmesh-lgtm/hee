import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260828070000_whatsapp_rbac_audit/migration.sql");
const rbac = read("app/lib/whatsapp/rbac.ts");
const audit = read("app/lib/whatsapp/audit.ts");
const actions = read("app/actions/whatsapp.ts");
const reply = read("app/lib/whatsapp/reply-queue.ts");
const signup = read("app/lib/whatsapp/embedded-signup.ts");
const auditPage = read("app/dashboard/whatsapp/audit/page.tsx");

test("business membership is tenant unique with database role and status constraints", () => {
  assert.match(schema, /model BusinessMember/);
  assert.match(schema, /@@unique\(\[businessId, userId\]/);
  assert.match(migration, /BusinessMember_role_check/);
  assert.match(migration, /'admin','marketer','support','viewer'/);
  assert.match(migration, /BusinessMember_status_check/);
});

test("RBAC derives business scope from authenticated owner or active membership", () => {
  assert.match(rbac, /getCurrentUserForWrites/);
  assert.match(rbac, /ownerId: userId/);
  assert.match(rbac, /members: \{ some: \{ userId, status: "active" \}/);
  assert.match(rbac, /roleCan\(role, permission\)/);
  assert.doesNotMatch(rbac, /businessId:\s*requested\s*\}\)/);
});

test("connection, campaign, automation, reply and audit permissions are separated", () => {
  assert.match(rbac, /"reply", "campaign\.manage", "automation\.manage", "connection\.manage", "audit\.view"/);
  assert.match(rbac, /marketer: new Set\(\["view", "reply", "campaign\.manage", "automation\.manage"\]\)/);
  assert.match(actions, /getWhatsAppWriteContext\("reply"\)/);
  assert.match(actions, /getWhatsAppWriteContext\("connection\.manage"\)/g);
  assert.match(auditPage, /getWhatsAppReadContext\("audit\.view"\)/);
});

test("WhatsApp audit storage is append-only at PostgreSQL level", () => {
  assert.match(schema, /model WhatsAppAuditLog/);
  assert.match(migration, /reject_whatsapp_audit_mutation/);
  assert.match(migration, /BEFORE UPDATE ON "WhatsAppAuditLog"/);
  assert.match(migration, /BEFORE DELETE ON "WhatsAppAuditLog"/);
  assert.match(migration, /WhatsAppAuditLog_business_created_idx/);
});

test("audit metadata strips credentials, codes, message bodies and phone data", () => {
  assert.match(audit, /token\|secret\|credential\|authorization\|code\|state\|message\|body\|phone/i);
  assert.match(audit, /slice\(0, 16\)/);
  assert.match(audit, /slice\(0, 256\)/);
  assert.doesNotMatch(auditPage, /metadata/);
});

test("sensitive successful mutations append audit evidence transactionally", () => {
  assert.match(reply, /action: "reply\.enqueue"/);
  assert.match(reply, /database: tx/);
  assert.match(signup, /action: "connection\.signup\.start"/);
  assert.match(signup, /action: "connection\.signup\.complete"/);
  assert.match(signup, /database: tx/g);
});

test("customer activity history humanizes actions without exposing internal identifiers", () => {
  assert.match(auditPage, /INFRO AUDIT TRAIL/);
  assert.match(auditPage, /actionLabel\(log\.action\)/);
  assert.match(auditPage, /actorLabel\(log\.actorType,log\.actorUser\?\.name\)/);
  assert.match(auditPage, /targetLabel\[log\.targetType\]\|\|"واتساب"/);
  assert.match(auditPage, /لا يوجد نشاط مسجل بعد/);
  assert.doesNotMatch(auditPage, /targetId: true/);
  assert.doesNotMatch(auditPage, /\|\| log\.action|\|\| log\.outcome|\|\| log\.actorType/);
  assert.doesNotMatch(auditPage, /<code/);
});
