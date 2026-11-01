import test from 'node:test';
import assert from 'node:assert/strict';
import { callbackValue, foodicsOrigins, retailAuthorizationUrl, retailProvider, verifyFoodicsIdentity } from '../app/lib/retail-analytics/oauth-domain';
const state = 'a'.repeat(43);
const callback = 'https://ir.sa/api/retail-analytics/oauth/shopify/callback';
test('Shopify consent is read-only and restricted to a validated Shopify host', () => {
  const url = new URL(retailAuthorizationUrl({ provider: 'shopify', clientId: 'test', state, callback, shop: 'example.myshopify.com' }));
  assert.equal(url.origin, 'https://example.myshopify.com');
  assert.equal(url.searchParams.get('scope'), 'read_orders');
  assert.equal(url.searchParams.get('state'), state);
  assert.equal(url.searchParams.get('redirect_uri'), callback);
  for (const shop of ['example.myshopify.com.evil.test', 'localhost', '127.0.0.1', 'example.myshopify.com@evil.test']) {
    assert.throws(() => retailAuthorizationUrl({ provider: 'shopify', clientId: 'test', state, callback, shop }));
  }
});
test('Foodics authorization keeps sandbox and production separate', () => {
  assert.equal(foodicsOrigins('production').api, 'https://api.foodics.com');
  assert.equal(foodicsOrigins('sandbox').api, 'https://api-sandbox.foodics.com');
  for (const environment of ['production', 'sandbox']) {
    const url = new URL(retailAuthorizationUrl({ provider: 'foodics', clientId: 'test', state, callback, environment }));
    assert.equal(url.origin, foodicsOrigins(environment).console);
    assert.equal(url.pathname, '/authorize');
    assert.equal(url.searchParams.get('state'), state);
  }
  assert.throws(() => foodicsOrigins('https://attacker.test'));
  assert.throws(() => retailAuthorizationUrl({ provider: 'foodics', clientId: 'test', state, callback }));
});
test('Malformed state, duplicate callback values and unknown providers fail closed', () => {
  for (const value of ['', 'a'.repeat(42), 'a'.repeat(44), 'a'.repeat(42) + '/']) {
    assert.throws(() => retailAuthorizationUrl({ provider: 'foodics', clientId: 'test', state: value, callback, environment: 'production' }));
  }
  assert.throws(() => callbackValue(new URLSearchParams('state=a&state=b'), 'state'));
  assert.throws(() => callbackValue(new URLSearchParams('state='), 'state'));
  assert.throws(() => retailProvider('icg'));
  assert.equal(callbackValue(new URLSearchParams('state=a'), 'state'), 'a');
});
test('Foodics identity requires verified business ID and read scopes; removes owner PII', () => {
  const payload = { data: { business: { id: '12345678-1234-1234-1234-123456789012', name: 'Retail' }, scopes: ['orders.list', 'general.read'], owner: { email: 'private@example.test' } } };
  const identity = verifyFoodicsIdentity(payload);
  assert.equal(identity.externalId, payload.data.business.id);
  assert.doesNotMatch(JSON.stringify(identity), /private|email|owner/);
  assert.throws(() => verifyFoodicsIdentity({ data: { ...payload.data, scopes: ['general.read'] } }));
  assert.throws(() => verifyFoodicsIdentity({ data: { ...payload.data, business: { id: '-'.repeat(36), name: 'Retail' } } }));
  assert.throws(() => verifyFoodicsIdentity(null));
});
