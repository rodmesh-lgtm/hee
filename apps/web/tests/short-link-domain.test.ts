import assert from "node:assert/strict";
import test from "node:test";
import { longLinksInText, shortLinkDestination, shortLinkCsvCell, shouldCountShortLinkClick, shortLinkFilters } from "../app/lib/short-link-domain";

test("short links preserve full public destinations and reject unsafe protocols, credentials and loops", () => {
  const original = "https://example.com/products/42?utm_campaign=summer&name=%D8%B9#details";
  assert.equal(shortLinkDestination(original), original);
  for (const value of ["javascript:alert(1)", "http://example.com", "https://user:pass@example.com", "https://127.0.0.1/", "https://[::1]/", "https://secret.internal/", "https://ir.sa/s/123456789012", "https://ir.sa/api/whatsapp/campaign-link/a"]) assert.equal(shortLinkDestination(value), null, value);
});
test("automatic extraction handles repeated URLs and Arabic punctuation without shortening existing links", () => {
  const link = "https://example.com/products/summer?utm_source=whatsapp";
  assert.deepEqual(longLinksInText(`احجز الآن: ${link}، أو (${link}). https://ir.sa/s/123456789012`), [link]);
  assert.deepEqual(longLinksInText("https://ir.sa/sada بدون روابط طويلة"), []);
  assert.deepEqual(longLinksInText("(https://example.com/products/item(large))"), ["https://example.com/products/item(large)"]);
});
test("click counting excludes HEAD, previews and known bots", () => {
  assert.equal(shouldCountShortLinkClick("GET", "Mozilla/5.0 Mobile Safari/537.36"), true);
  for (const agent of ["", "Googlebot", "facebookexternalhit/1.1", "WhatsApp-preview", "curl/8"]) assert.equal(shouldCountShortLinkClick("GET", agent), false);
  assert.equal(shouldCountShortLinkClick("HEAD", "Mozilla/5.0"), false);
});
test("CSV escapes quotes, newlines and spreadsheet formula injection", () => {
  assert.equal(shortLinkCsvCell('مرحبا "عميل"'), '"مرحبا ""عميل"""');
  assert.equal(shortLinkCsvCell(" =HYPERLINK(1)"), '"\' =HYPERLINK(1)"');
  assert.equal(shortLinkCsvCell("\t+1"), '"\'\t+1"');
});
test("list pagination normalizes malformed input and bounds reads", () => {
  assert.deepEqual(shortLinkFilters({ page: "-1", size: "9000", q: " test " }), { page: 1, size: 10, q: "test" });
  assert.equal(shortLinkFilters({ page: "Infinity" }).page, 100000);
});
