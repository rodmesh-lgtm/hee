import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_IDENTITY_APPEARANCE, IDENTITY_PALETTES, identityAppearanceStyle, identityContrast, normalizeIdentityAppearance } from "../app/lib/public-identity-appearance";
import { applyActivityPagePreset, normalizePageModules, serializePageModules } from "../app/lib/page-modules";

test("unconfigured and malformed appearances use the shared INFRO defaults", () => {
  for (const value of [null, undefined, [], "red", {primary:"url(https://example.test)",accent:"red;display:none",background:"#fff",font:"Comic Sans"}]) assert.deepEqual(normalizeIdentityAppearance(value), DEFAULT_IDENTITY_APPEARANCE);
  assert.equal(normalizeIdentityAppearance({primary:"#AABBCC",font:"tajawal"}).primary,"#aabbcc");
});
test("text and button contrast remains readable for bright, dark and custom palettes", () => {
  const palettes = [...IDENTITY_PALETTES, ...["#000000","#ffffff","#777777","#ff0000","#00ff00","#0000ff","#ffff00"].flatMap(primary => ["#000000","#ffffff","#777777"].map(background => ({primary,background,accent:"#ffffff"})))];
  for (const palette of palettes) {
    const vars=identityAppearanceStyle(palette) as Record<string,string>;
    assert.ok(identityContrast(vars["--primary"],vars["--on-primary"])>=4.5);
    assert.ok(identityContrast(vars["--card"],vars["--ink"])>=4.5);
    assert.ok(identityContrast(vars["--card"],vars["--muted"])>=4.5);
  }
});
test("appearance survives serialization, activity changes and unrelated contact options", () => {
  const modules=normalizePageModules(null,"عيادة");
  const contact=modules.find(module=>module.id==="contact")!;
  contact.config.appearance={...DEFAULT_IDENTITY_APPEARANCE,primary:"#243b64",font:"cairo"};
  contact.config.bookingPlacement="ribbon"; contact.config.serviceRequestEnabled=false;
  const saved=serializePageModules(modules);
  for (const normalized of [normalizePageModules(saved,"عيادة"),applyActivityPagePreset(saved,"مطعم")]) {
    const config=normalized.find(module=>module.id==="contact")!.config;
    assert.deepEqual(config.appearance,contact.config.appearance);
    assert.equal(config.bookingPlacement,"ribbon"); assert.equal(config.serviceRequestEnabled,false);
  }
});
