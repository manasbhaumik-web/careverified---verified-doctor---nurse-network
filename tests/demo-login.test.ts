// Demo sign-in must never be a way into a real deployment: off in production, never for admin.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoEnabled } from '../server/demo';
import { ADMIN_EMAIL, ADMIN_PASSWORD, DEMO, DEMO_PASSWORD, startTestServer } from './helpers/server';

test('demo mode: on in development, off in production, with an explicit override either way', () => {
  assert.equal(demoEnabled({} as NodeJS.ProcessEnv), true);
  assert.equal(demoEnabled({ NODE_ENV: 'development' } as NodeJS.ProcessEnv), true);
  assert.equal(demoEnabled({ NODE_ENV: 'production' } as NodeJS.ProcessEnv), false);
  assert.equal(demoEnabled({ NODE_ENV: 'production', ALLOW_DEMO: 'true' } as NodeJS.ProcessEnv), true);
  assert.equal(demoEnabled({ NODE_ENV: 'development', ALLOW_DEMO: 'false' } as NodeJS.ProcessEnv), false);
  assert.equal(demoEnabled({ NODE_ENV: 'production', ALLOW_DEMO: 'yes' } as NodeJS.ProcessEnv), false, 'only the exact word true switches it on');
});

test('with demo mode on: demo sign-in works for members, but never for the admin', async () => {
  const srv = await startTestServer({ ALLOW_DEMO: 'true' }, { seed: false });
  try {
    const c = srv.client();
    const opts = (await c.call('GET', '/api/auth/options')).data.data;
    assert.equal(opts.demoLogin, true);
    assert.deepEqual(Object.keys(opts.demoAccounts).sort(), ['facility', 'patient', 'pharmacy', 'practitioner'], 'the admin is never offered');

    const admin = await c.call('POST', '/api/auth/demo', { role: 'admin' });
    assert.equal(admin.status, 403);
    assert.equal(c.cookie, '', 'no session cookie is issued');
    assert.equal((await c.call('GET', '/api/auth/me')).status, 401);
    assert.equal((await c.call('GET', '/api/admin/audit-log')).status, 401);

    const patient = await c.call('POST', '/api/auth/demo', { role: 'patient' });
    assert.equal(patient.status, 200);
    assert.equal(patient.data.data.user.role, 'patient');
    assert.equal((await c.call('GET', '/api/auth/me')).data.data.user.email, DEMO.patient);
    assert.equal((await c.call('GET', '/api/admin/audit-log')).status, 403, 'a demo member is not an admin');
  } finally { await srv.stop(); }
});

test('with demo mode off: no demo sign-in, no demo accounts, the admin still signs in normally', async () => {
  const srv = await startTestServer({ ALLOW_DEMO: 'false' }, { seed: false });
  try {
    const c = srv.client();
    const opts = (await c.call('GET', '/api/auth/options')).data.data;
    assert.equal(opts.demoLogin, false);
    assert.equal(opts.demoAccounts, undefined, 'demo credentials are not sent when demo mode is off');
    for (const role of ['patient', 'practitioner', 'pharmacy', 'admin']) {
      const r = await c.call('POST', '/api/auth/demo', { role });
      assert.equal(r.status, 404, role);
    }
    assert.equal(c.cookie, '');
    // the well-known demo password does not work because the demo accounts were never created
    assert.equal((await srv.client().login(DEMO.patient, DEMO_PASSWORD, 'patient')).status, 401);
    assert.equal((await srv.client().login(DEMO.doctor, DEMO_PASSWORD, 'practitioner')).status, 401);
    // and the real admin can still sign in with the configured password
    const admin = srv.client();
    assert.equal((await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin')).status, 200);
    assert.equal((await admin.call('GET', '/api/admin/audit-log')).status, 200);
  } finally { await srv.stop(); }
});
