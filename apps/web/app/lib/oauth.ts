import "server-only";

import { Prisma } from "@prisma/client";
import { createHash, createPrivateKey, createPublicKey, randomBytes, sign as cryptoSign, verify as cryptoVerify } from "node:crypto";
import { db } from "./db";

export type OAuthProvider = "google" | "apple";

type IdentityClaims = {
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  nonce?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
};

const GOOGLE_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const APPLE_ISSUER = "https://appleid.apple.com";
const OAUTH_FETCH_TIMEOUT_MS = 7000;

function base64url(input: Buffer | string) { return Buffer.from(input).toString("base64url"); }
function randomToken(bytes = 32) { return randomBytes(bytes).toString("base64url"); }
function safeRedirectPath(value?: string | null) {
  const path = String(value ?? "").trim();
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : "/dashboard";
}

export function providerConfigured(provider: OAuthProvider) {
  if (provider === "google") return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY);
}

function oauthOrigin() {
  if (process.env.VERCEL_ENV === "production") return "https://ir.sa";
  const candidate = String(process.env.AUTH_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();
  try {
    const url = new URL(candidate);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const preview = url.hostname.endsWith(".vercel.app") || url.hostname.endsWith(".app.github.dev");
    if ((url.protocol === "https:" && (preview || url.hostname === "ir.sa" || url.hostname === "www.ir.sa")) || (local && url.protocol === "http:")) return url.origin;
  } catch {
    // Fall through to the canonical origin.
  }
  return "https://ir.sa";
}

export function oauthCallbackUrl(provider: OAuthProvider) {
  return `${oauthOrigin()}/api/auth/oauth/${provider}/callback`;
}

export async function createOAuthAuthorization(provider: OAuthProvider, redirectTo?: string | null) {
  if (!providerConfigured(provider)) throw new Error("provider-not-configured");
  const state = randomToken(32);
  const nonce = randomToken(32);
  const codeVerifier = provider === "google" ? randomToken(48) : null;
  await db.oAuthState.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.oAuthState.create({ data: { state, provider, nonce, codeVerifier, redirectTo: safeRedirectPath(redirectTo), expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });

  const callback = oauthCallbackUrl(provider);
  if (provider === "google") {
    const challenge = base64url(createHash("sha256").update(codeVerifier!).digest());
    const params = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: callback, response_type: "code", scope: "openid email profile", state, nonce, code_challenge: challenge, code_challenge_method: "S256", prompt: "select_account" });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  const params = new URLSearchParams({ client_id: process.env.APPLE_CLIENT_ID!, redirect_uri: callback, response_type: "code", response_mode: "form_post", scope: "name email", state, nonce });
  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

export async function consumeOAuthState(provider: OAuthProvider, state: string) {
  if (!state || state.length > 256) throw new Error("invalid-oauth-state");
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`oauth-state:${state}`}))`;
    const record = await tx.oAuthState.findUnique({ where: { state } });
    if (!record || record.provider !== provider || record.expiresAt < new Date()) {
      if (record) await tx.oAuthState.deleteMany({ where: { id: record.id } });
      throw new Error("invalid-oauth-state");
    }
    const consumed = await tx.oAuthState.deleteMany({ where: { id: record.id, state } });
    if (consumed.count !== 1) throw new Error("oauth-state-reused");
    return record;
  });
}

function decodeJwtPart<T>(value: string): T { return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T; }

async function verifyRs256Jwt(token: string, jwksUrl: string) {
  if (token.length > 20_000) throw new Error("invalid-id-token");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("invalid-id-token");
  const header = decodeJwtPart<{ alg?: string; kid?: string }>(parts[0]);
  if (header.alg !== "RS256" || !header.kid || header.kid.length > 256) throw new Error("invalid-id-token-header");
  const response = await fetch(jwksUrl, { cache: "no-store", signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error("jwks-unavailable");
  const jwks = await response.json() as { keys?: Array<Record<string, unknown> & { kid?: string }> };
  const jwk = jwks.keys?.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("signing-key-not-found");
  const normalizedJwk: Record<string, string> = {};
  for (const [key, value] of Object.entries(jwk)) if (typeof value === "string") normalizedJwk[key] = value;
  const key = createPublicKey({ key: normalizedJwk, format: "jwk" });
  const valid = cryptoVerify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], "base64url"));
  if (!valid) throw new Error("invalid-id-token-signature");
  return decodeJwtPart<IdentityClaims>(parts[1]);
}

function assertCommonClaims(claims: IdentityClaims, provider: OAuthProvider, nonce: string) {
  const clientId = provider === "google" ? process.env.GOOGLE_CLIENT_ID! : process.env.APPLE_CLIENT_ID!;
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!claims.sub || claims.sub.length > 512 || !audiences.includes(clientId)) throw new Error("invalid-id-token-audience");
  if (!claims.exp || claims.exp * 1000 <= Date.now()) throw new Error("expired-id-token");
  if (claims.nonce !== nonce) throw new Error("invalid-id-token-nonce");
  if (provider === "google" && !GOOGLE_ISSUERS.has(String(claims.iss))) throw new Error("invalid-id-token-issuer");
  if (provider === "apple" && claims.iss !== APPLE_ISSUER) throw new Error("invalid-id-token-issuer");
}

function appleClientSecret() {
  const teamId = process.env.APPLE_TEAM_ID!;
  const clientId = process.env.APPLE_CLIENT_ID!;
  const keyId = process.env.APPLE_KEY_ID!;
  const privateKey = process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const payload = base64url(JSON.stringify({ iss: teamId, iat: now, exp: now + 5 * 60, aud: APPLE_ISSUER, sub: clientId }));
  const signingInput = `${header}.${payload}`;
  const signature = cryptoSign("sha256", Buffer.from(signingInput), { key: createPrivateKey(privateKey), dsaEncoding: "ieee-p1363" });
  return `${signingInput}.${base64url(signature)}`;
}

export async function exchangeOAuthCode(provider: OAuthProvider, code: string, stateRecord: { nonce: string; codeVerifier: string | null }) {
  if (!providerConfigured(provider) || !code || code.length > 4096) throw new Error("oauth-provider-unavailable");
  const callback = oauthCallbackUrl(provider);
  const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: callback, client_id: provider === "google" ? process.env.GOOGLE_CLIENT_ID! : process.env.APPLE_CLIENT_ID! });
  let tokenUrl: string;
  if (provider === "google") {
    tokenUrl = "https://oauth2.googleapis.com/token";
    body.set("client_secret", process.env.GOOGLE_CLIENT_SECRET!);
    if (stateRecord.codeVerifier) body.set("code_verifier", stateRecord.codeVerifier);
  } else {
    tokenUrl = "https://appleid.apple.com/auth/token";
    body.set("client_secret", appleClientSecret());
  }
  const response = await fetch(tokenUrl, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body, cache: "no-store", signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error("oauth-code-exchange-failed");
  const tokens = await response.json() as { id_token?: string };
  if (!tokens.id_token) throw new Error("missing-id-token");
  const claims = provider === "google"
    ? await verifyRs256Jwt(tokens.id_token, "https://www.googleapis.com/oauth2/v3/certs")
    : await verifyRs256Jwt(tokens.id_token, "https://appleid.apple.com/auth/keys");
  assertCommonClaims(claims, provider, stateRecord.nonce);
  return claims;
}

function assertActiveUser<T extends { deletedAt?: Date | null }>(user: T | null) {
  if (!user || user.deletedAt) throw new Error("oauth-account-unavailable");
  return user;
}

function assertOauthEmailAutoLinkSafe<T extends { passwordHash?: string | null; emailVerifiedAt?: Date | null }>(user: T | null) {
  if (user?.passwordHash && !user.emailVerifiedAt) throw new Error("oauth-password-account-link-required");
  return user;
}

export async function resolveOAuthUser(provider: OAuthProvider, claims: IdentityClaims, fallbackName?: string | null) {
  const subject = String(claims.sub ?? "");
  const email = String(claims.email ?? "").trim().toLowerCase();
  const verified = claims.email_verified === true || claims.email_verified === "true";
  if (!subject || subject.length > 512 || !email || email.length > 254 || !verified) throw new Error("verified-email-required");

  const identityWhere = { provider_providerSubject: { provider, providerSubject: subject } } as const;
  const linked = await db.authIdentity.findUnique({ where: identityWhere, include: { user: true } });
  if (linked) return assertActiveUser(linked.user);

  try {
    return await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`oauth-user:${provider}:${subject}`}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`oauth-email:${email}`}))`;
      const existingIdentity = await tx.authIdentity.findUnique({ where: identityWhere, include: { user: true } });
      if (existingIdentity) return assertActiveUser(existingIdentity.user);
      const existingUser = await tx.user.findUnique({ where: { email } });
      if (existingUser?.deletedAt) throw new Error("oauth-account-unavailable");
      assertOauthEmailAutoLinkSafe(existingUser);
      const user = existingUser ?? await tx.user.create({ data: { name: String(claims.name || fallbackName || email.split("@")[0]).trim().slice(0, 120), email, passwordHash: null } });
      await tx.authIdentity.create({ data: { userId: user.id, provider, providerSubject: subject, providerEmail: email } });
      return user;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const racedIdentity = await db.authIdentity.findUnique({ where: identityWhere, include: { user: true } });
      if (racedIdentity) return assertActiveUser(racedIdentity.user);
      const racedUser = await db.user.findUnique({ where: { email } });
      const activeUser = assertActiveUser(racedUser);
      assertOauthEmailAutoLinkSafe(activeUser);
      try {
        const identity = await db.authIdentity.create({ data: { userId: activeUser.id, provider, providerSubject: subject, providerEmail: email }, include: { user: true } });
        return assertActiveUser(identity.user);
      } catch (linkError) {
        if (linkError instanceof Prisma.PrismaClientKnownRequestError && linkError.code === "P2002") {
          const finalIdentity = await db.authIdentity.findUnique({ where: identityWhere, include: { user: true } });
          if (finalIdentity) return assertActiveUser(finalIdentity.user);
        }
        throw linkError;
      }
    }
    throw error;
  }
}

export function parseAppleUser(raw?: string | null) {
  if (!raw || raw.length > 10_000) return null;
  try {
    const parsed = JSON.parse(raw) as { name?: { firstName?: string; lastName?: string } };
    return [parsed.name?.firstName, parsed.name?.lastName].filter(Boolean).join(" ").trim().slice(0, 120) || null;
  } catch { return null; }
}

export function postAuthRedirectPath(business: { onboardingCompleted: boolean; onboardingStep: string | null; isPublished: boolean } | null, fallback?: string | null) {
  if (!business || !business.onboardingCompleted || !business.isPublished) return "/onboarding";
  return safeRedirectPath(fallback || "/dashboard");
}
