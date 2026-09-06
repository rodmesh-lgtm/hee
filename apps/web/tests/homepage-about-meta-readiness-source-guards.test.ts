import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const homepage = readFileSync(resolve(process.cwd(), "components/homepage-professional.tsx"), "utf8");
const page = readFileSync(resolve(process.cwd(), "app/page.tsx"), "utf8");
const design = readFileSync(resolve(process.cwd(), "app/lib/platform-design.ts"), "utf8");
const actions = readFileSync(
  resolve(process.cwd(), "app/actions/admin-platform-design.ts"),
  "utf8",
);
const adminDesign = readFileSync(resolve(process.cwd(), "app/admin/design/page.tsx"), "utf8");
const nextConfig = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");

test("homepage exposes a configurable, navigable INFRO about section", () => {
  assert.match(homepage, /href="#about">{d\.headerAboutLabel}/);
  assert.match(
    homepage,
    /<section\s+id="about"\s+aria-labelledby="about-title"/,
  );
  assert.match(homepage, /{d\.homeAboutTitle}/);
  assert.match(homepage, /{d\.homeAboutBody}/);
  assert.match(homepage, /الكيان القانوني: {d\.homeLegalName}/);
  assert.match(design, /INFRO مشروع تقني سعودي/);
  assert.match(design, /هوية أعمال رقمية موثوقة ومنظمة/);
  assert.match(design, /مجموعة طلبات المعلومات لخدمات الأعمال/);
});

test("About section accurately identifies the official Meta integration", () => {
  assert.match(homepage, /{d\.homeWhatsAppTitle}/);
  assert.match(homepage, /{d\.homeWhatsAppBody}/);
  assert.match(design, /WhatsApp Business Platform \/ Cloud API الرسمي من Meta/);
  assert.match(design, /حساب WABA ورقمها الخاص/);
  assert.match(design, /موافقة العملاء والخصوصية وإلغاء الاشتراك/);
  assert.doesNotMatch(design, /WhatsApp Web|رمز QR|مكتبة غير رسمية/);
  assert.match(page, /readPlatformDesign/);
  assert.match(page, /<HomepageProfessional design={await design\(\)} \/>/);
});

test("official contact number stays configurable and powers phone and WhatsApp actions", () => {
  assert.match(design, /homeContactPhone: "0564212464"/);
  assert.match(homepage, /tel:\$\{d\.homeContactPhone\.replace/);
  assert.match(homepage, /https:\/\/wa\.me\/\$\{contactInternational}/);
  assert.match(homepage, /{d\.homeContactPhone}/);
});

test("central admin controls homepage content with guarded draft and publish actions", () => {
  assert.match(adminDesign, /name="homeHeroTitleAr"/);
  assert.match(adminDesign, /name="homeAboutBody"/);
  assert.match(adminDesign, /name="footerDescription"/);
  assert.match(adminDesign, /name="trustSealToken"/);
  assert.match(actions, /await requireAdmin\(\)/);
  assert.match(actions, /PlatformDesignAudit/);
  assert.match(actions, /revalidatePath\("\/", "layout"\)/);
});

test("Saudi Business Center trust seal uses its fixed official script and a validated token", () => {
  assert.match(homepage, /className="sbc-verify-seal [^"]*"/);
  assert.match(homepage, /<footer[\s\S]*className="sbc-verify-seal [^"]*"/);
  assert.match(homepage, /موثق لدى منصة الأعمال/);
  assert.match(homepage, /المركز السعودي للأعمال/);
  assert.match(
    homepage,
    /eauthenticate\.saudibusiness\.gov\.sa\/certificate-details\/\$\{d\.trustSealCertificateNumber}/,
  );
  assert.match(homepage, /src="\/images\/sbc\.png"/);
  assert.match(homepage, /data-token={d\.trustSealToken}/);
  assert.match(homepage, /data-position="bottom-left"/);
  assert.match(
    homepage,
    /https:\/\/eauthenticate\.saudibusiness\.gov\.sa\/EAuthSealApi\/seal\.js/,
  );
  assert.match(design, /\^\[A-Za-z0-9\+\/=\]\{20,160\}\$/);
  assert.match(design, /trustSealCertificateNumber: "0000321894"/);
  assert.match(nextConfig, /https:\/\/eauthenticate\.saudibusiness\.gov\.sa/);
});
