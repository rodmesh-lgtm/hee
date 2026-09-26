import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) { return readFileSync(resolve(process.cwd(), path), "utf8"); }

test("public identity extras are no longer rendered as a detached bottom block", () => {
  const route = source("app/[slug]/page.tsx");
  assert.match(route, /PublicIdentityHighlights/);
  assert.doesNotMatch(route, /hasIdentityExtras/);
  assert.doesNotMatch(route, /mx-auto mb-20 w-full max-w-\[580px\]/);
});

test("identity extras mount in their intended positions inside the public canvas", () => {
  const renderer = source("components/public-business-bio.tsx");
  const highlights = source("components/public/public-identity-highlights.tsx");
  assert.match(renderer, /data-public-social-slot/);
  assert.match(renderer, /data-public-profile-slot/);
  assert.match(renderer, /data-public-transactions-slot/);
  assert.match(highlights, /attachSocialMount/);
  assert.match(highlights, /attachProfileMount/);
  assert.match(highlights, /\[data-public-social-slot\]/);
  assert.match(highlights, /\[data-public-profile-slot\]/);
  assert.match(highlights, /createPortal\(<SocialChannels/);
  assert.match(highlights, /createPortal\(<CompanyProfile/);
  assert.match(highlights, /data-public-identity-highlights/);
  assert.match(highlights, /الملف التعريفي الرسمي/);
  assert.match(highlights, /فتح الملف/);
  assert.match(highlights, /حساباتنا الرسمية/);
});

test("approved business identity hierarchy stays fixed and avoids AI visual clichés", () => {
  const renderer = source("components/public-business-bio.tsx");
  const profile = renderer.indexOf("data-public-profile-slot");
  const social = renderer.indexOf("data-public-social-slot");
  const intent = renderer.indexOf('aria-labelledby="intent-title"');
  const transactions = renderer.indexOf("data-public-transactions-slot");
  const branches = renderer.indexOf('id="branches"');
  const contacts = renderer.indexOf('id="contact"');
  const highlights = renderer.indexOf('id="highlights"');
  const destinations = renderer.indexOf('id="destinations"');
  assert.ok(profile > 0 && profile < social);
  assert.ok(social < intent && intent < transactions);
  assert.ok(transactions < branches && branches < contacts);
  assert.ok(contacts < highlights && highlights < destinations);
  assert.match(renderer, /max-w-\[520px\]/);
  assert.doesNotMatch(renderer, /Sparkles|وصول ذكي/);
  assert.doesNotMatch(renderer, /الرد خلال 5 دقائق|محدّث اليوم/);
});
test("public identity surfaces use the INFRO palette and canonical domain", () => {
  const files = [
    "components/public-business-page-v10-light.tsx",
    "components/public/public-identity-extras.tsx",
    "components/public/public-identity-highlights.tsx",
    "components/public/public-transaction-launcher.tsx",
  ];
  for (const file of files) {
    const contents = source(file);
    assert.doesNotMatch(contents, /#6f3bd2|#5d49cc|purple|violet/i, file);
    assert.doesNotMatch(contents, /hee\.sa/i, file);
  }
});

test("unfinished booking setup stays private while ready booking remains available", () => {
  const launcher = source("components/public/public-transaction-launcher.tsx");
  assert.match(launcher, /if \(!canRequest && !canBook\) return null/);
  assert.match(launcher, /canBook && !bookingInRibbon \? <button ref=\{bookingOpenerRef\}/);
  assert.match(launcher, /canBook && bookingInRibbon && ribbonTarget \? createPortal/);
  assert.doesNotMatch(launcher, /الحجز قيد الإعداد/);
  assert.doesNotMatch(launcher, /ستظهر المواعيد هنا/);
});

test("customer business page uses only the approved compact iR mark", () => {
  const renderer = source("components/public-business-page-v10-light.tsx");
  assert.match(renderer, /import \{ IrMark \}/);
  assert.equal((renderer.match(/<IrMark\b/g) || []).length, 2);
  assert.doesNotMatch(renderer, /<IrLogo\b|showTagline/);
});

test("customer identity omits the cover and keeps platform controls floating", () => {
  const renderer = source("components/public-business-page-v10-light.tsx");
  assert.match(renderer, /pointer-events-none sticky top-0/);
  assert.match(renderer, /alt=\{`شعار \${business\.name}`\}/);
  assert.match(renderer, /min-h-screen overflow-x-clip bg-\[#f7faf9\]/);
  assert.match(renderer, /fill-\[#168af6\]/);
  assert.doesNotMatch(renderer, /business\.coverUrl|صورة عرض|\bcover\?/);
  assert.doesNotMatch(renderer, /<header className="[^"]*bg-\[#061b1e\]/);
  assert.doesNotMatch(renderer, /linear-gradient\(155deg,#061b1e/);
  assert.doesNotMatch(renderer, /bg-\[linear-gradient\(180deg,#fbfdfc/);
  assert.doesNotMatch(renderer, /shadow-\[0_0_70px/);
});

test("customer identity presents a clear business profile with action-first hierarchy", () => {
  const renderer = source("components/public-business-page-v10-light.tsx");
  assert.match(renderer, /ir\.sa\/\{business\.slug\}/);
  assert.match(renderer, /aria-label="هوية المنشأة"/);
  assert.match(renderer, /aria-label="إجراءات المنشأة"/);
  assert.match(renderer, /aria-label="اعتمادات المنشأة"/);
  assert.match(renderer, /تواصل عبر واتساب/);
  assert.match(renderer, /EXPLORE/);
  assert.match(renderer, /تعرّف على المنشأة/);
  assert.match(renderer, /max-w-\[1080px\]/);
  assert.doesNotMatch(renderer, /INFRO BUSINESS PASSPORT|BUSINESS IDENTITY/);
  assert.match(renderer, /object-contain/);
  assert.doesNotMatch(renderer, /gridTemplateColumns/);
});

test("official social accounts use recognizable platform controls", () => {
  const highlights = source("components/public/public-identity-highlights.tsx");
  assert.match(highlights, /FaInstagram/);
  assert.match(highlights, /FaXTwitter/);
  assert.match(highlights, /FaTiktok/);
  assert.match(highlights, /FaSnapchat/);
  assert.match(highlights, /FaFacebookF/);
  assert.match(highlights, /socialLinks\.slice\(0,5\)/);
});
