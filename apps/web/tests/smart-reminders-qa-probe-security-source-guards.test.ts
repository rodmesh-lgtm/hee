import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routePath=new URL("../app/api/qa/smart-reminders/run/route.ts",import.meta.url);

test("preview reminder execution probe requires a strong bearer secret before confirmation or worker execution",async()=>{
  const source=await readFile(routePath,"utf8");
  assert.match(source,/secret\.length < 32/);
  assert.match(source,/timingSafeEqual\(supplied, expected\)/);
  assert.match(source,/if \(!isAuthorized\(request\)\)/);

  const authorizationIndex=source.indexOf("if (!isAuthorized(request))");
  const confirmationIndex=source.indexOf('url.searchParams.get("confirm")');
  const schedulerIndex=source.indexOf("runSmartReminderScheduler({ limit: 250 })");
  assert.ok(authorizationIndex>=0);
  assert.ok(confirmationIndex>authorizationIndex);
  assert.ok(schedulerIndex>confirmationIndex);
});

test("QA reminder execution remains restricted to the approved preview branch",async()=>{
  const source=await readFile(routePath,"utf8");
  assert.match(source,/VERCEL_ENV !== "preview"/);
  assert.match(source,/VERCEL_GIT_COMMIT_REF !== APPROVED_PREVIEW_REF/);
  assert.match(source,/const APPROVED_PREVIEW_REF = "infro-business-memory-2026"/);
});
