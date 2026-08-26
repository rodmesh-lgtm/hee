#!/usr/bin/env node

const required = [
  'DATABASE_URL',
  'RESTORE_DATABASE_URL',
  'PRODUCTION_BACKUP_PASSPHRASE',
  'SESSION_SECRET',
  'RESEND_API_KEY',
  'MOYASAR_PUBLISHABLE_KEY',
  'MOYASAR_SECRET_KEY',
  'MOYASAR_WEBHOOK_SECRET',
  'BILLING_TOKEN_ENCRYPTION_KEY',
  'VERCEL_TOKEN',
  'PG_POOL_MAX',
  'HEE_FROM_EMAIL',
  'BILLING_SELLER_LEGAL_NAME_AR',
  'BILLING_SELLER_ADDRESS_AR',
  'BILLING_TAX_STATUS',
  'BILLING_RENEWAL_ENABLED',
  'BILLING_OPERATIONS_READY',
  'PAID_CHECKOUT_PUBLIC_ENABLED',
  'STORAGE_DRIVER',
];

function value(name) {
  return String(process.env[name] ?? '').trim();
}

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

const workerRequired = ['BILLING_RENEWAL_ENABLED', 'BILLING_OPERATIONS_READY']
  .some((name) => value(name).toLowerCase() === 'true');
if (workerRequired) {
  for (const name of ['HETZNER_HOST', 'HETZNER_USER', 'HETZNER_SSH_PRIVATE_KEY', 'HETZNER_KNOWN_HOSTS']) {
    if (!value(name)) missing.push(name);
  }
}

if (missing.length > 0) {
  console.error(`production-config-presence: FAIL missing=${[...new Set(missing)].join(',')}`);
  process.exit(1);
}

console.log('production-config-presence: PASS');
