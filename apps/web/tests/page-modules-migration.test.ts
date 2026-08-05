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
