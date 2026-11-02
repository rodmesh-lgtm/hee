import assert from 'node:assert/strict';
import test from 'node:test';
import { readSchemaWithRetry } from '../app/lib/reminders/schema-read-retry';

test('schema probe retries one transient connection failure and returns fresh readiness', async () => {
  for (const error of [{code:'P2024'}, {code:'08P01'}, {code:'ECONNRESET'}]) {
    let attempts = 0; const delays: number[] = [];
    const result = await readSchemaWithRetry(async () => { if (++attempts === 1) throw error; return [{ready:true}]; }, async ms => {delays.push(ms);});
    assert.deepEqual(result, [{ready:true}]); assert.equal(attempts,2); assert.deepEqual(delays,[500]);
  }
});
test('persistent connection failure propagates after two reads', async () => {
  let attempts = 0; const error = {code:'P2024'};
  await assert.rejects(readSchemaWithRetry(async () => {attempts++; throw error;}, async () => {}), e => e === error);
  assert.equal(attempts,2);
});
test('missing schema, authorization and programming failures are never retried', async () => {
  for (const error of [{code:'P2021'}, new Error('UNAUTHENTICATED'), new TypeError('invalid probe')]) {
    let attempts = 0;
    await assert.rejects(readSchemaWithRetry(async () => {attempts++; throw error;}, async () => assert.fail('unexpected wait')), e => e === error);
    assert.equal(attempts,1);
  }
});
test('successful or negative schema results do not wait or get replaced with success', async () => {
  for (const value of [true,false]) assert.equal(await readSchemaWithRetry(async () => value, async () => assert.fail('unexpected retry')),value);
});
