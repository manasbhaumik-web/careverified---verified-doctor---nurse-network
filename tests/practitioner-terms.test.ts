// The doctors' page quotes the commission and says payouts are manual. Both come from the server, so check them there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers/server';

test('the commission shown to prospective practitioners is the one in force, and payouts are reported as manual', async () => {
  const srv = await startTestServer({ PLATFORM_COMMISSION_PCT: '12' }, { seed: false });
  try {
    const anon = srv.client();
    const r = await anon.call('GET', '/api/payments/terms');
    assert.equal(r.status, 200, 'public: no sign-in needed');
    assert.equal(r.data.data.commissionPct, 12);
    assert.equal(r.data.data.payoutsAutomated, false);
    assert.equal(r.data.data.currency, 'MYR');
    assert.match(r.data.data.commissionOn, /before service tax/);
  } finally { await srv.stop(); }
});

test('the commission is limited to a sensible range', async () => {
  const srv = await startTestServer({ PLATFORM_COMMISSION_PCT: '90' }, { seed: false });
  try {
    assert.equal((await srv.client().call('GET', '/api/payments/terms')).data.data.commissionPct, 50, 'capped at 50');
  } finally { await srv.stop(); }
});
