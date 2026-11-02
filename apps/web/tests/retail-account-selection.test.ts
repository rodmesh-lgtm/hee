import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAccountSelection, inventoryAccountSelection } from '../app/lib/retail-analytics/account-selection';
const accounts = [{ id: 'owned', status: 'active' }, { id: 'disconnected', status: 'disconnected' }];
test('account deep links select only an active account from the authorized scope', () => {
  assert.equal(resolveAccountSelection(undefined, accounts), 'all');
  assert.equal(resolveAccountSelection('owned', accounts), 'owned');
  for (const id of ['foreign', 'disconnected', '', 'all']) assert.throws(() => resolveAccountSelection(id, accounts), /ACCOUNT_UNAVAILABLE/);
});
test('repeated account parameters and accounts removed on workspace change fail closed', () => {
  assert.throws(() => resolveAccountSelection(['owned', 'foreign'], accounts), /ACCOUNT_UNAVAILABLE/);
  assert.throws(() => resolveAccountSelection('owned', []), /ACCOUNT_UNAVAILABLE/);
});

test('inventory preserves the chosen account and never silently falls back from an unavailable account', () => {
  const scope = [{id:'first', status:'active'}, {id:'second', status:'active'}, {id:'old', status:'disconnected'}];
  assert.equal(inventoryAccountSelection('second', scope), 'second');
  assert.equal(inventoryAccountSelection('all', scope), 'first');
  for (const id of ['foreign', 'old', '']) assert.equal(inventoryAccountSelection(id, scope), '');
  assert.equal(inventoryAccountSelection('all', []), '');
  assert.equal(inventoryAccountSelection('all', [{id:'old', status:'disconnected'}]), '');
});
