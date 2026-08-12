import test from "node:test";
import assert from "node:assert/strict";
import { normalizePageModulesForPersistence, serializePageModules } from "../app/lib/page-modules";

test("migrates legacy module payloads to the canonical module set", () => {
  const legacyPayload = JSON.stringify([
    { id: "services", enabled: true, sortOrder: 0, config: { title: "الخدمات" } },
    { id: "contactTeam", enabled: true, sortOrder: 1, config: { salesTeam: [] } },
  ]);

  const modules = normalizePageModulesForPersistence(legacyPayload, "SERVICES");
  const serialized = serializePageModules(modules);

  const servicesModule = serialized.find((module) => module.id === "services");
  const companyProfileModule = serialized.find((module) => module.id === "companyProfile");
  const portfolioModule = serialized.find((module) => module.id === "portfolio");
  const productsModule = serialized.find((module) => module.id === "products");

  assert.ok(servicesModule);
  assert.equal(servicesModule?.config.title, "الخدمات");
  assert.ok(companyProfileModule);
  assert.equal(companyProfileModule?.config.companyProfile?.title, "الملف التعريفي");
  assert.equal(portfolioModule?.enabled, true);
  assert.equal(productsModule?.enabled, false);
});

test("preserves long contact team and portfolio arrays during normalization", () => {
  const legacyPayload = JSON.stringify([
    {
      id: "contactTeam",
      enabled: true,
      sortOrder: 0,
      config: {
        salesTeam: [
          { id: "sales-1", name: "A", sortOrder: 0 },
          { id: "sales-2", name: "B", sortOrder: 1 },
          { id: "sales-3", name: "C", sortOrder: 2 },
          { id: "sales-4", name: "D", sortOrder: 3 },
        ],
        customerServiceTeam: [
          { id: "support-1", name: "S1", sortOrder: 0 },
          { id: "support-2", name: "S2", sortOrder: 1 },
          { id: "support-3", name: "S3", sortOrder: 2 },
          { id: "support-4", name: "S4", sortOrder: 3 },
        ],
      },
    },
    {
      id: "portfolio",
      enabled: true,
      sortOrder: 1,
      config: {
        portfolioItems: [
          { id: "item-1", title: "One", sortOrder: 0 },
          { id: "item-2", title: "Two", sortOrder: 1 },
          { id: "item-3", title: "Three", sortOrder: 2 },
          { id: "item-4", title: "Four", sortOrder: 3 },
          { id: "item-5", title: "Five", sortOrder: 4 },
          { id: "item-6", title: "Six", sortOrder: 5 },
          { id: "item-7", title: "Seven", sortOrder: 6 },
        ],
      },
    },
  ]);

  const modules = normalizePageModulesForPersistence(legacyPayload, "SERVICES");
  const contactTeam = modules.find((module) => module.id === "contactTeam");
  const portfolio = modules.find((module) => module.id === "portfolio");

  assert.equal(contactTeam?.config.salesTeam?.length, 4);
  assert.equal(contactTeam?.config.customerServiceTeam?.length, 4);
  assert.equal(portfolio?.config.portfolioItems?.length, 7);
  assert.equal(portfolio?.config.portfolioItems?.[6]?.title, "Seven");
});
