import test from "node:test";
import assert from "node:assert/strict";
import { normalizePageModulesInput } from "../app/lib/page-modules";

test("normalizes JSON page module payloads from form input", () => {
  const payload = JSON.stringify([
    { id: "products", enabled: true, sortOrder: 0, config: { title: "المنتجات" } },
    { id: "services", enabled: false, sortOrder: 1, config: { title: "الخدمات" } },
  ]);

  const modules = normalizePageModulesInput(payload, "RESTAURANT");

  assert.equal(modules.find((module) => module.id === "products")?.enabled, true);
  assert.equal(modules.find((module) => module.id === "products")?.config.title, "المنتجات");
  assert.equal(modules.find((module) => module.id === "services")?.enabled, false);
  assert.equal(modules.find((module) => module.id === "services")?.sortOrder, 1);
});

test("sanitizes unsafe business and careers URLs in contact module config", () => {
  const payload = JSON.stringify([
    {
      id: "contact",
      enabled: true,
      sortOrder: 0,
      config: {
        businessLinkEnabled: true,
        businessLinkType: "website",
        businessLinkUrl: "javascript:alert(1)",
        careersEnabled: true,
        careersExternalUrl: "data:text/html,boom",
      },
    },
  ]);

  const modules = normalizePageModulesInput(payload, "SERVICES");
  const contact = modules.find((module) => module.id === "contact");

  assert.equal(contact?.config.businessLinkUrl, "");
  assert.equal(contact?.config.careersExternalUrl, "");
});
