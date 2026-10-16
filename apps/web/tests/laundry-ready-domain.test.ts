import assert from "node:assert/strict";
import test from "node:test";
import {laundryReadyEvent,laundryReadyParameters,laundryReadyTemplateSupported,LAUNDRY_READY_TEMPLATE_EXAMPLE} from "../app/lib/whatsapp/laundry-ready-domain";
import {automationMatchesEvent,WHATSAPP_CONFIGURABLE_TRIGGER_TYPES} from "../app/lib/whatsapp/automation-domain";
test("ready notice accepts only trusted laundry ready source, never generic external events",()=>{
 const e={triggerType:"laundry_ready",source:"laundry.ready",subjectType:"laundry.ticket.ready"};
 assert.equal(laundryReadyEvent(e),true);
 for(const change of [{source:"tenant.api"},{subjectType:"laundry.ticket.delivered"},{triggerType:"api_event"}])assert.equal(laundryReadyEvent({...e,...change}),false);
 assert.equal((WHATSAPP_CONFIGURABLE_TRIGGER_TYPES as readonly string[]).includes("laundry_ready"),false);
 assert.equal(automationMatchesEvent({triggerType:"laundry_ready",triggerConfig:{version:1},subjectType:"laundry.ticket.ready"}),true);
});
test("ready template maps customer, establishment and ticket to exact approved placeholders",()=>{
 assert.equal(laundryReadyTemplateSupported([{type:"BODY",text:LAUNDRY_READY_TEMPLATE_EXAMPLE}],"POSITIONAL"),true);
 assert.equal(laundryReadyTemplateSupported([{type:"BODY",text:"{{1}} {{2}}"}],"POSITIONAL"),false);
 assert.equal(laundryReadyTemplateSupported([{type:"BODY",text:LAUNDRY_READY_TEMPLATE_EXAMPLE},{type:"BUTTONS",buttons:[]}]),false);
 assert.deepEqual(laundryReadyParameters(" أحمد\nمحمد ","مغسلة","42"),[{type:"body",parameters:[{type:"text",text:"أحمد محمد"},{type:"text",text:"مغسلة"},{type:"text",text:"42"}]}]);
});
