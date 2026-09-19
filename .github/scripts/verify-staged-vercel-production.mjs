import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

// Vercel's official automation-bypass API, also used by `vercel curl`.
// Keep credentials in memory and never follow redirects with either credential.
export async function verifyStagedProduction({
  deploymentUrl, projectId, teamId, releaseSha, token,
  expectedMaintenance = false,
  fetchImpl = fetch, wait = delay,
}) {
  const url = new URL(deploymentUrl);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.vercel.app') ||
      url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Invalid staged Vercel deployment URL');
  }
  if (!projectId || !teamId || !token || !/^[a-f0-9]{40}$/.test(releaseSha) || typeof expectedMaintenance !== 'boolean') {
    throw new Error('Missing or invalid production verification configuration');
  }

  async function api(path, body) {
    const response = await fetchImpl(`https://api.vercel.com${path}?teamId=${encodeURIComponent(teamId)}`, {
      method: body ? 'PATCH' : 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: 'manual', signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Vercel project verification API failed (HTTP ${response.status})`);
    return response.json();
  }

  const deployment = await api(`/v13/deployments/${encodeURIComponent(url.hostname)}`);
  if (String(deployment.projectId ?? deployment.project?.id ?? '') !== projectId ||
      String(deployment.state ?? deployment.readyState ?? '') !== 'READY' || deployment.target !== 'production' ||
      deployment.url !== url.hostname) {
    throw new Error('Staged deployment identity or readiness mismatch before authenticated probe');
  }
  const project = await api(`/v9/projects/${encodeURIComponent(projectId)}`);
  if (project.id !== projectId || project.accountId !== teamId) {
    throw new Error('Unexpected Vercel project or team');
  }
  function automationSecret(settings) {
    return Object.keys(settings ?? {}).find(key => settings[key]?.scope === 'automation-bypass');
  }
  let secret = automationSecret(project.protectionBypass);
  if (!secret) {
    const generated = await api(`/v1/projects/${encodeURIComponent(projectId)}/protection-bypass`, {
      generate: { note: 'GitHub production readiness checks' },
    });
    secret = automationSecret(generated.protectionBypass);
    if (!secret) throw new Error('Vercel did not return an automation credential');
    // Allow Vercel's newly created credential to propagate before its first use.
    await wait(1000);
  }

  async function probe(path, { json = false, text = false, expectedStatus = 200, method = 'GET', body } = {}) {
    const response = await fetchImpl(new URL(path, url).href, {
      method,
      headers: {
        'x-vercel-protection-bypass': secret,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body }),
      redirect: 'manual', signal: AbortSignal.timeout(20_000),
    });
    if (response.status !== expectedStatus) throw new Error(`Staged probe ${path} failed (HTTP ${response.status})`);
    if (json) {
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error(`Staged probe ${path} did not return JSON`);
      }
      return response.json();
    }
    if (text) return response.text();
    await response.body?.cancel();
  }
  async function probeGoogleOAuth() {
    const response = await fetchImpl(new URL('/api/auth/oauth/google', url).href, {
      headers: { 'x-vercel-protection-bypass': secret },
      redirect: 'manual', signal: AbortSignal.timeout(20_000),
    });
    if (![302, 303, 307, 308].includes(response.status)) {
      throw new Error(`Staged Google OAuth start failed (HTTP ${response.status})`);
    }
    const location = response.headers.get('location');
    if (!location) throw new Error('Staged Google OAuth start omitted its redirect');
    const authorization = new URL(location);
    if (authorization.origin !== 'https://accounts.google.com' || authorization.pathname !== '/o/oauth2/v2/auth' ||
        !authorization.searchParams.get('client_id')?.endsWith('.apps.googleusercontent.com') ||
        authorization.searchParams.get('redirect_uri') !== 'https://ir.sa/api/auth/oauth/google/callback' ||
        authorization.searchParams.get('response_type') !== 'code' ||
        authorization.searchParams.get('code_challenge_method') !== 'S256' ||
        !authorization.searchParams.get('state') || !authorization.searchParams.get('nonce')) {
      throw new Error('Staged Google OAuth authorization redirect is invalid');
    }
    await response.body?.cancel();
  }
  const release = await probe('/api/release', { json: true });
  const status = await probe('/api/maintenance/status', { json: true });
  const webReady = expectedMaintenance ? null : await probe('/api/health/web-ready', { json: true });
  if (release.releaseSha !== releaseSha || release.environment !== 'production') {
    throw new Error('Staged release provenance mismatch');
  }
  if (status.releaseSha !== releaseSha || status.environment !== 'production' || status.maintenance !== expectedMaintenance) {
    throw new Error(`Staged Production must be exact-SHA and ${expectedMaintenance ? 'in' : 'out of'} maintenance`);
  }
  if (expectedMaintenance) {
    const ui = await probe('/register', { text: true, expectedStatus: 503 });
    const write = await probe('/api/public/orders', { text: true, expectedStatus: 503, method: 'POST', body: '{}' });
    if (!ui.includes('صيانة مجدولة') || !write.includes('صيانة مجدولة')) {
      throw new Error('Staged maintenance response body is missing');
    }
    return;
  }
  if (webReady.ready !== true) throw new Error('Staged Production core web runtime is not ready');
  await probeGoogleOAuth();
  for (const path of ['/', '/register', '/login', '/terms', '/privacy', '/contact', '/demo']) {
    await probe(path);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const mode = process.argv[3] ?? 'live';
    if (!['live', 'maintenance'].includes(mode)) throw new Error('Invalid staged verification mode');
    await verifyStagedProduction({
      deploymentUrl: readFileSync(process.argv[2], 'utf8').trim(),
      projectId: process.env.VERCEL_PROJECT_ID,
      teamId: process.env.VERCEL_ORG_ID,
      releaseSha: process.env.GITHUB_SHA,
      token: process.env.VERCEL_TOKEN,
      expectedMaintenance: mode === 'maintenance',
    });
    console.log(`staged-production-smoke: PASS for ${process.env.GITHUB_SHA}; ${mode === 'maintenance' ? 'maintenance gate proven' : 'core web runtime ready'}; canonical domain is still unchanged`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Staged verification failed');
    process.exitCode = 1;
  }
}
