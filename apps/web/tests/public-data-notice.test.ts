import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PublicDataNotice} from '../components/public/public-data-notice';

test('booking notice identifies the destination business and links privacy without manufacturing consent',()=>{
 const html=renderToStaticMarkup(createElement(PublicDataNotice,{businessName:'<script>foreign</script>'}));
 assert.match(html,/INFRO/);assert.match(html,/href="\/privacy"/);assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>|checkbox|واتساب/);
});
test('WhatsApp-only inquiry explains the handoff without claiming INFRO stores the inquiry',()=>{
 const html=renderToStaticMarkup(createElement(PublicDataNotice,{businessName:'متجر',storeRequest:false,whatsapp:true,dark:true}));
 assert.match(html,/واتساب/);assert.doesNotMatch(html,/تُسجّل بيانات/);assert.match(html,/rel="noopener noreferrer"/);
});
