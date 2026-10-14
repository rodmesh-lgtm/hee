import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const source=(path:string)=>readFileSync(path,'utf8');
test('customer hero and appearance preview omit the internal business category',()=>{
  assert.doesNotMatch(source('components/public-business-bio.tsx'),/styles\.category|clean\(business\.businessCategory\)/);
  assert.doesNotMatch(source('components/dashboard/identity-appearance-editor.tsx'),/\{category\}/);
  assert.match(source('components/public-business-bio.tsx'),/\{business\.name\}/);
  assert.match(source('components/public-business-bio.tsx'),/\{summary\}/);
});
test('platform mark has a sticky nonblocking dock below transaction dialogs',()=>{
  const css=source('components/public-business-bio.module.css');
  assert.match(css,/\.brandDock \{ position:sticky;[^}]*z-index:30;[^}]*height:0;[^}]*pointer-events:none/);
  assert.match(css,/\.brandDock \.brand \{[^}]*pointer-events:auto/);
  assert.match(css,/scroll-margin-top:80px/);
});
test('homepage explains fixed identity, staff permissions and WhatsApp prerequisites honestly',()=>{
  const home=source('components/homepage-professional.tsx');
  assert.match(home,/id="faq"/);
  assert.match(home,/إكمال تسجيل الرقم لدى Meta/);
  assert.match(home,/لا يتم تفعيل اشتراك مدفوع بمجرد التسجيل/);
  assert.doesNotMatch(home,/الأكثر اختيارًا/);
  assert.match(source('app/dashboard/page.tsx'),/Shortcut href="\/dashboard\/branding"/);
});
