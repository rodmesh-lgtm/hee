import { createHash, randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const adminEmail = "rc-platform-admin@hee.test";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

test("mailbox proof persists emailVerifiedAt and unlocks the allowlisted admin console", async ({ page }) => {
  test.setTimeout(90_000);
  const connectionString = String(process.env.DATABASE_URL ?? "").trim();
  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (!String(process.env.HEE_ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).includes(adminEmail)) {
    throw new Error(`HEE_ADMIN_EMAILS must include ${adminEmail}`);
  }

  const pool = new Pool({ connectionString, max: 2 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const sessionToken = crypto.randomUUID();

  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: { name: "RC Platform Admin", deletedAt: null, emailVerifiedAt: null },
    create: { name: "RC Platform Admin", email: adminEmail, passwordHash: "rc-only", emailVerifiedAt: null },
  });

  try {
    await db.session.deleteMany({ where: { userId: admin.id } });
    await db.oAuthState.deleteMany({ where: { provider: "email-verification", nonce: admin.id } });
    await db.session.create({ data: { token: sessionToken, userId: admin.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    await db.oAuthState.create({
      data: {
        state: tokenHash,
        provider: "email-verification",
        nonce: admin.id,
        redirectTo: adminEmail,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await page.context().addCookies([{ name: "hee_session", value: sessionToken, url: baseUrl }]);

    const denied = await page.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
    expect(denied?.status()).toBe(404);
    expect((await db.user.findUnique({ where: { id: admin.id }, select: { emailVerifiedAt: true } }))?.emailVerifiedAt).toBeNull();

    await page.goto(`${baseUrl}/verify-email?token=${rawToken}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("البريد لم يُفعّل بعد", { exact: false })).toBeVisible();
    expect((await db.user.findUnique({ where: { id: admin.id }, select: { emailVerifiedAt: true } }))?.emailVerifiedAt).toBeNull();

    await page.getByRole("button", { name: "تأكيد البريد والمتابعة" }).click();
    await page.waitForURL("**/admin", { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "إدارة المنصة" })).toBeVisible();

    const verified = await db.user.findUnique({ where: { id: admin.id }, select: { emailVerifiedAt: true } });
    expect(verified?.emailVerifiedAt).toBeTruthy();
    expect(await db.oAuthState.count({ where: { provider: "email-verification", nonce: admin.id } })).toBe(0);
  } finally {
    await db.oAuthState.deleteMany({ where: { provider: "email-verification", nonce: admin.id } });
    await db.session.deleteMany({ where: { userId: admin.id } });
    const adminBusinesses = await db.business.count({ where: { ownerId: admin.id } });
    if (adminBusinesses === 0) await db.user.delete({ where: { id: admin.id } }).catch(() => undefined);
    await db.$disconnect();
    await pool.end();
  }
});
