import assert from 'node:assert/strict';
import test from 'node:test';
import { activeWorkspaceRoute, matchesWorkspaceSearch } from '../lib/workspace-navigation';
const routes = ['/admin', '/admin/whatsapp', '/admin/whatsapp/reminders', '/admin/customers'];
test('nested sections have one active destination', () => {
  assert.equal(activeWorkspaceRoute('/admin/whatsapp/reminders/123', routes, '/admin'), '/admin/whatsapp/reminders');
  assert.equal(activeWorkspaceRoute('/admin/whatsapp/templates', routes, '/admin'), '/admin/whatsapp');
  assert.equal(activeWorkspaceRoute('/admin/', routes, '/admin'), '/admin');
  assert.equal(activeWorkspaceRoute('/admin/customers-other', routes, '/admin'), null);
});
test('search matches Arabic spelling variations, translated labels and all words', () => {
  assert.equal(matchesWorkspaceSearch('ادارة', 'إدارة المنصة'), true);
  assert.equal(matchesWorkspaceSearch('  BILLING ', 'الاشتراكات', 'Billing'), true);
  assert.equal(matchesWorkspaceSearch('عملاء حسابات', 'العملاء والحسابات'), true);
  assert.equal(matchesWorkspaceSearch('عملاء مفقود', 'العملاء والحسابات'), false);
  assert.equal(matchesWorkspaceSearch(' ', 'المنشآت'), true);
});
