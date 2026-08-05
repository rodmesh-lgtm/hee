import test from "node:test";
import assert from "node:assert/strict";
import { isPreviewQaEnvironment, isQaAuditTokenValid } from "../app/lib/qa-audit";

test("preview-only QA guard is disabled outside preview", () => {
  const previous = process.env.VERCEL_ENV;
  const previousSecret = process.env.QA_AUDIT_SECRET;
  const previousEmail = process.env.QA_AUDIT_USER_EMAIL;
  process.env.VERCEL_ENV = "development";
  process.env.QA_AUDIT_SECRET = "preview-secret";
  process.env.QA_AUDIT_USER_EMAIL = "audit@example.com";

  try {
    assert.equal(isPreviewQaEnvironment(), false);
  } finally {
    if (previous === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = previous;
    }

    if (previousSecret === undefined) {
      delete process.env.QA_AUDIT_SECRET;
    } else {
      process.env.QA_AUDIT_SECRET = previousSecret;
    }

    if (previousEmail === undefined) {
      delete process.env.QA_AUDIT_USER_EMAIL;
    } else {
      process.env.QA_AUDIT_USER_EMAIL = previousEmail;
    }
  }
});

test("QA token validation requires preview secret and QA user email", () => {
  const previousSecret = process.env.QA_AUDIT_SECRET;
  const previousEmail = process.env.QA_AUDIT_USER_EMAIL;
  const previousVercelEnv = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "preview";
  process.env.QA_AUDIT_SECRET = "top-secret-token";
  delete process.env.QA_AUDIT_USER_EMAIL;

  try {
    assert.equal(isPreviewQaEnvironment(), false);
    assert.equal(isQaAuditTokenValid("top-secret-token"), false);
  } finally {
    if (previousSecret === undefined) {
      delete process.env.QA_AUDIT_SECRET;
    } else {
      process.env.QA_AUDIT_SECRET = previousSecret;
    }

    if (previousEmail === undefined) {
      delete process.env.QA_AUDIT_USER_EMAIL;
    } else {
      process.env.QA_AUDIT_USER_EMAIL = previousEmail;
    }

    if (previousVercelEnv === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = previousVercelEnv;
    }
  }
});

test("QA token validation accepts the preview secret only", () => {
  const previousSecret = process.env.QA_AUDIT_SECRET;
  const previousEmail = process.env.QA_AUDIT_USER_EMAIL;
  const previousVercelEnv = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "preview";
  process.env.QA_AUDIT_SECRET = "preview-secret";
  process.env.QA_AUDIT_USER_EMAIL = "audit@example.com";

  try {
    assert.equal(isPreviewQaEnvironment(), true);
    assert.equal(isQaAuditTokenValid("preview-secret"), true);
    assert.equal(isQaAuditTokenValid("wrong-token"), false);
  } finally {
    if (previousSecret === undefined) {
      delete process.env.QA_AUDIT_SECRET;
    } else {
      process.env.QA_AUDIT_SECRET = previousSecret;
    }

    if (previousEmail === undefined) {
      delete process.env.QA_AUDIT_USER_EMAIL;
    } else {
      process.env.QA_AUDIT_USER_EMAIL = previousEmail;
    }

    if (previousVercelEnv === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = previousVercelEnv;
    }
  }
});
