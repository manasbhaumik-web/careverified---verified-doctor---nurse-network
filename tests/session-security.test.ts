// Sessions: a forged token must never work, and ending someone's sessions must really end them.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ADMIN_EMAIL, ADMIN_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

let srv: TestServer;
let admin: Client;
let db: DatabaseSync;

/** A session token as this app makes them, signed with whatever key the caller believes the server uses. */
const forge = (userId: string, secret: string, issuedAt = Date.now()) => {
  const payload = Buffer.from(JSON.stringify({ u: userId, e: Date.now() + 86_400_000, n: 'x', i: issuedAt })).toString('base64url');
  return `${payload}.${crypto.createHmac('sha256', secret).update(payload).digest('base64url')}`;
};
const withCookie = (token: string) => async (url: string) => (await fetch(srv.base + url, { headers: { cookie: `cv_session=${token}` } })).status;

before(async () => {
  srv = await startTestServer({ SESSION_SECRET: '' }, { seed: false }); // no secret configured, as on a careless deployment
  admin = srv.client();
  assert.equal((await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin')).status, 200);
  db = new DatabaseSync(path.join(srv.dir, 'careverified.db'));
  db.exec('PRAGMA busy_timeout = 10000');
});
after(async () => { try { db?.close(); } catch { /* ignore */ } await srv?.stop(); });

test('a token signed with the old built-in key, which was readable in the source, is refused', async () => {
  const adminId = (db.prepare("SELECT id FROM users WHERE role = 'admin'").get() as any).id;
  const old = forge(adminId, 'medcred-vercel-session-secret-2026');
  assert.equal(await withCookie(old)('/api/admin/audit-log'), 401);
  assert.equal(await withCookie(old)('/api/auth/me'), 401);
});

test('other guessable keys and a bad signature are refused too', async () => {
  const adminId = (db.prepare("SELECT id FROM users WHERE role = 'admin'").get() as any).id;
  for (const secret of ['', 'secret', 'changeme', 'medcred']) assert.equal(await withCookie(forge(adminId, secret))('/api/auth/me'), 401, `key "${secret}"`);
  const good = admin.cookie.split('=')[1];
  assert.equal(await withCookie(good + 'x')('/api/auth/me'), 401, 'a changed signature');
  assert.equal(await withCookie('not-a-token')('/api/auth/me'), 401);
});

test('a real session still works', async () => {
  assert.equal((await admin.call('GET', '/api/auth/me')).status, 200);
});
