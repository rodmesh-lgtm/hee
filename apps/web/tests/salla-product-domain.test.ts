import { test } from "node:test";
import assert from "node:assert/strict";
import { mapSallaCampaignProduct } from "../app/lib/commerce/salla-product-domain";

const product = { id: 123, name: "منتج تجريبي", status: "sale", is_available: true, price: { amount: 100, currency: "SAR" }, taxed_price: { amount: 115, currency: "SAR" }, urls: { customer: "https://store.example.com/p123", admin: "https://s.salla.sa/private" }, cost_price: 25, private_note: "do not expose" };
test("product campaign data includes only available public fields and the returned taxed price", () => {
  assert.deepEqual(mapSallaCampaignProduct(product), { id: "123", name: "منتج تجريبي", price: "115.00 SAR", url: "https://store.example.com/p123" });
  assert.equal(mapSallaCampaignProduct({ ...product, status: "hidden" }), null);
  assert.equal(mapSallaCampaignProduct({ ...product, is_available: false }), null);
});
test("unsafe links and malformed prices cannot become campaign product values", () => {
  for (const customer of ["javascript:alert(1)", "http://store.example.com", "https://user:secret@example.com", "https://127.0.0.1/a", "https://localhost/a"]) assert.equal(mapSallaCampaignProduct({ ...product, urls: { customer } }), null);
  assert.equal(mapSallaCampaignProduct({ ...product, taxed_price: { amount: "115", currency: "SAR" } })?.price, "");
  assert.equal(mapSallaCampaignProduct({ ...product, id: "../orders" }), null);
});
