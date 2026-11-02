import test from 'node:test';
import assert from 'node:assert/strict';
import { createRefreshCycle } from '../app/lib/retail-analytics/refresh-cycle';
test('automatic refresh loads immediately, never overlaps and waits from completion', async () => {
  let clock=0,calls=0; let finish!: (ok:boolean)=>void;
  const cycle=createRefreshCycle(async()=>{calls++;return new Promise<boolean>(resolve=>{finish=resolve;});},15000,()=>clock);
  const first=cycle.tick(true); await cycle.tick(true); assert.equal(calls,1);
  clock=4000; finish(true); await first; assert.equal(cycle.remaining(),15);
  clock=18000; await cycle.tick(true); assert.equal(calls,1);
  clock=19000; const second=cycle.tick(true); assert.equal(calls,2); finish(true); await second;cycle.dispose();
});
test('hidden/offline/paused pages do not fetch; failures back off instead of hammering provider', async()=>{
  let clock=0,calls=0; const cycle=createRefreshCycle(async()=>{calls++;return false;},15000,()=>clock);
  await cycle.tick(false); assert.equal(calls,0); await cycle.tick(true); assert.equal(cycle.remaining(),60);
  clock=15000; await cycle.tick(true); assert.equal(calls,1); clock=60000; await cycle.tick(false); assert.equal(calls,1);
  await cycle.tick(true); assert.equal(calls,2);cycle.dispose();
});
test('scope cleanup aborts the active request and prevents later reads',async()=>{
  let signal:AbortSignal|undefined,calls=0; const cycle=createRefreshCycle(async s=>{signal=s;calls++;return true;},15000);
  await cycle.tick(true);cycle.dispose();assert.equal(signal?.aborted,true);await cycle.tick(true);assert.equal(calls,1);
});
test('exceptions back off and release the in-flight guard',async()=>{
  let clock=0,calls=0;const cycle=createRefreshCycle(async()=>{calls++;throw Error('offline');},15000,()=>clock);
  await cycle.tick(true);assert.equal(cycle.remaining(),60);clock=60000;await cycle.tick(true);assert.equal(calls,2);cycle.dispose();
});
