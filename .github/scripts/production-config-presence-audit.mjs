#!/usr/bin/env node

import { appendFileSync } from 'node:fs';

// Report configuration names only; never print secret or variable values.
const required = [
  'DATABASE_URL',
  'RESTORE_DATABASE_URL',
  'PRODUCTION_BACKUP_PASSPHRASE',
  'SESSION_SECRET',
  'RESEND_API_KEY',
  'CRON_SECRET',
  'BILLING_TOKEN_ENCRYPTION_KEY',
  'VERCEL_TOKEN',
  'PG_POOL_MAX',
  'BILLING_RENEWAL_ENABLED',
  'BILLING_OPERATIONS_READY',
  'WHATSAPP_MARKETING_WORKER_ENABLED',
  'WHATSAPP_OUTBOUND_ENABLED',
  'PAID_CHECKOUT_PUBLIC_ENABLED',
  'STORAGE_DRIVER',
];

const CANONICAL_FROM_EMAIL = 'HEE <no-reply@ir.sa>';

function value(name) {
  return String(process.env[name] ?? '').trim();
}

export function assertProductionConfigPresence() {
  const missing = required.filter((name) => !value(name));

  const storage = value('STORAGE_DRIVER').toLowerCase();
  if (storage === 's3') {
    for (const name of ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) {
      if (!value(name)) missing.push(name);
    }
  }

  const google = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'].filter((name) => Boolean(value(name)));
  if (google.length === 1) missing.push('GOOGLE_OAUTH_CONFIGURATION_INCOMPLETE');

  const apple = ['APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY'].filter((name) => Boolean(value(name)));
  if (apple.length > 0 && apple.length < 4) missing.push('APPLE_OAUTH_CONFIGURATION_INCOMPLETE');

  const billingRequired = ['BILLING_RENEWAL_ENABLED', 'BILLING_OPERATIONS_READY']
    .some((name) => value(name).toLowerCase() === 'true');
  if (billingRequired) {
    for (const name of [
      'MOYASAR_PUBLISHABLE_KEY',
      'MOYASAR_SECRET_KEY',
      'MOYASAR_WEBHOOK_SECRET',
      'BILLING_SELLER_LEGAL_NAME_AR',
      'BILLING_SELLER_ADDRESS_AR',
      'BILLING_TAX_STATUS',
      'HETZNER_HOST',
      'HETZNER_USER',
      'HETZNER_SSH_PRIVATE_KEY',
      'HETZNER_KNOWN_HOSTS',
    ]) {
      if (!value(name)) missing.push(name);
    }
  }

  if (missing.length > 0) {
    console.error(`production-config-presence: FAIL missing=${[...new Set(missing)].join(',')}`);
    process.exit(1);
  }

  const githubEnv = String(process.env.GITHUB_ENV ?? '').trim();
  if (githubEnv) appendFileSync(githubEnv, `HEE_FROM_EMAIL=${CANONICAL_FROM_EMAIL}\n`, { encoding: 'utf8' });

  console.log('production-config-presence: PASS');
}

assertProductionConfigPresence();
