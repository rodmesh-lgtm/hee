import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as crypto from "node:crypto";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Execute the real server module in a test VM without changing global React
// conditions for the rest of the unit suite. Only the server-only marker is stubbed.
const source = readFileSync(new URL("../../app/lib/whatsapp/commerce-credential-envelope.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleExports = {};
runInNewContext(compiled, { exports: moduleExports, Buffer, Error,
  require: (id: string) => { assert.ok(id === "server-only" || id === "node:crypto", id); return id === "node:crypto" ? crypto : {}; } });
export const encryption = moduleExports as typeof import("../../app/lib/whatsapp/commerce-credential-envelope");
