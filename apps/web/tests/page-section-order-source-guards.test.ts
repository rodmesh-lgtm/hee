import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) { return readFileSync(resolve(process.cwd(), path), "utf8"); }

test("customer page editor exposes touch and keyboard friendly section ordering", () => {
  const page = source("app/dashboard/my-page/page.tsx");
  const editor = source("components/dashboard/page-section-order-editor.tsx");
  assert.match(page, /PageSectionOrderEditor/);
  assert.match(page, /normalizePageModules/);
  assert.match(editor, /onPointerDown/);
  assert.match(editor, /onPointerMove/);
  assert.match(editor, /setPointerCapture/);
  assert.match(editor, /draggingRef/);
  assert.match(editor, /touch-none/);
  assert.match(editor, /moveBy/);
  assert.match(editor, /نقل \$\{LABELS\[id\]\.title\} للأعلى/);
  assert.match(editor, /نقل \$\{LABELS\[id\]\.title\} للأسفل/);
  assert.match(editor, /رتّب هويتك كما تريد/);
  assert.match(editor, /\/api\/dashboard\/page-modules\/order/);
});

test("section ordering write is ownership-scoped, serialized and bounded", () => {
  const route = source("app/api/dashboard/page-modules/order/route.ts");
  assert.match(route, /getOwnedBusinessForApiWrite/);
  assert.match(route, /readBoundedJson\(request, 8 \* 1024\)/);
  assert.match(route, /consumePublicWriteLimit/);
  assert.match(route, /pg_advisory_xact_lock/);
  assert.match(route, /ownerId: business\.ownerId/);
  assert.match(route, /normalizePageModulesForPersistence/);
  assert.match(route, /serializePageModules/);
  assert.match(route, /revalidatePath\(`\/\$\{result\}`\)/);
});
