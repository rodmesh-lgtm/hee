import assert from "node:assert/strict";
import test from "node:test";
import { workspaceSearchMatches } from "../app/lib/whatsapp/workspace-search";

test("workspace search matches Arabic marks, hamza forms, elongation and reordered words", () => {
  assert.equal(workspaceSearchMatches("تقارير الأداء والروابط المختصرة", "  الاداء   تقارير  "), true);
  assert.equal(workspaceSearchMatches("إنشاء الروابط المختصرة", "إنْشَاء روابـط"), true);
  assert.equal(workspaceSearchMatches("متابعة العملاء في INFRO", "infro العملاء"), true);
  assert.equal(workspaceSearchMatches("تقارير الأداء", "تقارير الفواتير"), false);
  assert.equal(workspaceSearchMatches("الأدوات", ""), true);
});
