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

test("identity highlights locate the public detail accordions and mount through the callback ref", () => {
  const highlights = source("components/public/public-identity-highlights.tsx");
  assert.match(highlights, /const attachMount = useCallback/);
  assert.match(highlights, /querySelectorAll<HTMLElement>\(\"section\"\)/);
  assert.match(highlights, /setTarget\(mount\)/);
  assert.match(highlights, /عن المنشأة/);
  assert.match(highlights, /خدماتنا/);
  assert.match(highlights, /data-public-identity-highlights/);
  assert.match(highlights, /data-public-identity-mount/);
  assert.match(highlights, /createPortal\(<Highlights/);
  assert.match(highlights, /الملف التعريفي للشركة/);
  assert.match(highlights, /حساباتنا الرسمية/);
});
