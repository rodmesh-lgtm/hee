import { chromium } from "playwright";

type HandoffResult = {
  previewUrl: string;
  qaUrl: string;
  qaTarget: string;
  qaExpiresIn: string;
  readOnly: boolean;
  previewOnly: boolean;
  productionBlocked: boolean;
  noindex: boolean;
};

function getArg(name: string) {
  const token = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(token));
  return found ? found.slice(token.length) : null;
}

async function registerAndOnboard(previewUrl: string) {
  const unique = Date.now();
  const email = `qa.handoff.${unique}@example.com`;
  const password = "Aa!12345";

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${previewUrl}/register`, { waitUntil: "networkidle" });
  await page.fill('input[name="name"]', "QA Handoff");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="confirmPassword"]', password);
  await page.check('input[name="agreed"]');
  await page.getByRole("button", { name: "إنشاء الحساب" }).click();
  await page.waitForURL("**/onboarding");

  await page.getByRole("button", { name: "مؤسسة" }).click();
  await page.fill('input[placeholder="مثال: كانتابي"]', `كيان ${unique}`);
  await page.fill('input[placeholder="مثال: جدة"]', "الرياض");
  await page.getByRole("button", { name: "مطاعم ومقاهي" }).click();
  await page.getByRole("button", { name: "التالي" }).click();
  await page.fill('textarea[placeholder="عرّف عملاءك بنشاطك وخدماتك باختصار."]', "وصف للمعاينة");
  await page.fill('input[placeholder="+9665xxxxxxxx"]', "+966555555555");
  await page.getByRole("button", { name: "إنشاء صفحتي" }).click();
  await page.waitForURL("**/dashboard/my-page");

  return { browser, context, page };
}

async function mintQaUrl(page: import("playwright").Page, target: string) {
  const minted = await page.evaluate(async (path) => {
    const response = await fetch("/api/qa/dashboard-audit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path }),
    });

    const text = await response.text();
    return {
      status: response.status,
      body: text,
    };
  }, target);

  if (minted.status !== 200) {
    throw new Error(`Failed to mint QA URL (status=${minted.status})`);
  }

  const parsed = JSON.parse(minted.body) as {
    url?: string;
    expiresAt?: string;
    expiresInMinutes?: number;
    readOnly?: boolean;
    previewOnly?: boolean;
  };

  if (!parsed.url || !parsed.expiresAt || !parsed.expiresInMinutes) {
    throw new Error("Mint endpoint returned incomplete handoff payload");
  }

  return {
    url: parsed.url,
    expiresAt: parsed.expiresAt,
    expiresInMinutes: parsed.expiresInMinutes,
    readOnly: Boolean(parsed.readOnly),
    previewOnly: Boolean(parsed.previewOnly),
  };
}

async function validateQaUrl(previewUrl: string, qaUrl: string, target: string, productionUrl?: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  await page.goto(qaUrl, { waitUntil: "networkidle" });
  const finalUrl = page.url();
  const body = await page.locator("body").innerText();

  const targetPath = target || "/dashboard/my-page";
  const expectedTarget = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;
  const targetReached = finalUrl.includes(expectedTarget);
  const realPageVisible = body.includes("محتوى صفحتك") || body.includes("صفحتي");

  const autosave = await page.evaluate(async () => {
    const response = await fetch("/api/dashboard/my-page/autosave", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fields: { name: "قراءة فقط" } }),
    });
    return response.status;
  });

  const noindexResponse = await fetch(qaUrl, { method: "HEAD", redirect: "manual" });
  const robotsTag = noindexResponse.headers.get("x-robots-tag") || "";
  const noindex = robotsTag.toLowerCase().includes("noindex");

  let productionBlocked = true;
  if (productionUrl) {
    const source = new URL(qaUrl);
    const prod = new URL(productionUrl);
    const productionCandidate = `${prod.origin}${source.pathname}${source.search}`;
    const prodResponse = await fetch(productionCandidate, { method: "HEAD", redirect: "manual" });
    productionBlocked = prodResponse.status === 404;
  }

  await browser.close();

  return {
    targetReached,
    realPageVisible,
    readOnly: autosave === 403,
    noindex,
    previewOnly: qaUrl.startsWith(previewUrl),
    productionBlocked,
  };
}

async function main() {
  const previewUrl = getArg("preview") || process.env.PREVIEW_URL;
  const qaTarget = getArg("target") || process.env.QA_TARGET || "/dashboard/my-page";
  const productionUrl = getArg("production") || process.env.PRODUCTION_URL || "https://web-one-psi-15.vercel.app";

  if (!previewUrl) {
    throw new Error("Missing preview URL. Use --preview=<url> or PREVIEW_URL env var.");
  }

  const { browser, page } = await registerAndOnboard(previewUrl);

  try {
    const minted = await mintQaUrl(page, qaTarget);

    if (!minted.url) {
      throw new Error("QA URL mint response did not include a URL");
    }

    const checks = await validateQaUrl(previewUrl, minted.url, qaTarget, productionUrl);

    if (!checks.targetReached || !checks.realPageVisible) {
      throw new Error("QA URL did not open the expected real dashboard target");
    }

    const result: HandoffResult = {
      previewUrl,
      qaUrl: minted.url,
      qaTarget,
      qaExpiresIn: `${minted.expiresInMinutes} minutes`,
      readOnly: checks.readOnly,
      previewOnly: checks.previewOnly,
      productionBlocked: checks.productionBlocked,
      noindex: checks.noindex,
    };

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
}

void main();