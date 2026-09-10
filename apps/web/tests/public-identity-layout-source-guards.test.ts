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

test("identity highlights mount in the explicit public-page slot", () => {
  const renderer = source("components/public-business-page-v10-light.tsx");
  const highlights = source("components/public/public-identity-highlights.tsx");
  assert.match(renderer, /data-public-highlights-slot/);
  assert.match(highlights, /const attachMount = useCallback/);
  assert.match(highlights, /\[data-public-highlights-slot\]/);
  assert.match(highlights, /slot\.append\(mount\)/);
  assert.doesNotMatch(highlights, /details\.prepend\(mount\)/);
  assert.match(highlights, /setTarget\(mount\)/);
  assert.match(highlights, /data-public-identity-highlights/);
  assert.match(highlights, /data-public-identity-mount/);
  assert.match(highlights, /createPortal\(<Highlights/);
  assert.match(highlights, /الملف التعريفي للشركة/);
  assert.match(highlights, /حساباتنا الرسمية/);
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
