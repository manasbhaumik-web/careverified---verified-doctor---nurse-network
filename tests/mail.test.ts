// Email, end to end: what is sent when, to whom, in which language; forgotten-password recovery; and delivery over real SMTP.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ADMIN_EMAIL, ADMIN_PASSWORD, DEMO, DEMO_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';
import { decodeWords, header, startFakeSmtp } from './helpers/fakeSmtp';

let srv: TestServer;
let admin: Client, anon: Client;
let db: DatabaseSync;
let seq = 0;
const newEmail = () => `person${++seq}-${Date.now() % 100000}@example.org`;
const outbox = (to: string) => db.prepare('SELECT * FROM email_outbox WHERE to_email = ? ORDER BY created_at, rowid').all(to) as any[];
const registerPractitioner = (c: Client, email: string, extra: object = {}) => c.call('POST', '/api/auth/register-practitioner', { name: 'Dr Test Person', email, password: 'Passw0rd!ok', consent: true, ...extra });
const tokenFrom = (text: string) => /reset-password\?token=([A-Za-z0-9_-]+)/.exec(text)![1];

before(async () => {
  srv = await startTestServer({ RESET_REQUEST_LIMIT: '200' });
  admin = srv.client(); anon = srv.client();
  assert.equal((await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin')).status, 200);
  db = new DatabaseSync(path.join(srv.dir, 'careverified.db'));
  db.exec('PRAGMA busy_timeout = 10000');
});
after(async () => { try { db?.close(); } catch { /* ignore */ } await srv?.stop(); });

test('a new practitioner is welcomed in the language they were using', async () => {
  const en = newEmail(), ms = newEmail(), zh = newEmail();
  assert.equal((await registerPractitioner(srv.client(), en)).status, 201);
  assert.equal((await registerPractitioner(srv.client(), ms, { lang: 'ms' })).status, 201);
  assert.equal((await registerPractitioner(srv.client(), zh, { lang: 'zh' })).status, 201);
  const [a, b, c] = [outbox(en)[0], outbox(ms)[0], outbox(zh)[0]];
  assert.equal(a.template, 'practitioner_welcome');
  assert.equal(a.subject, 'Welcome to MedCred');
  assert.equal(b.subject, 'Selamat datang ke MedCred');
  assert.equal(c.subject, '欢迎加入 MedCred');
  assert.equal(a.status, 'logged');
  assert.match(a.body_text, /Dr Test Person/);
  assert.match(a.body_text, /http:\/\/localhost:\d+\/login\?role=practitioner/);
});

test('changing language in the app changes the language of later emails', async () => {
  const to = newEmail();
  const c = srv.client();
  await registerPractitioner(c, to);
  assert.equal((await anon.call('PUT', '/api/me/language', { lang: 'zh' })).status, 401, 'signed in only');
  assert.equal((await c.call('PUT', '/api/me/language', { lang: 'ar' })).status, 400);
  assert.equal((await c.call('PUT', '/api/me/language', { lang: 'zh' })).status, 200);
  await anon.call('POST', '/api/auth/forgot-password', { email: to });
  const mail = outbox(to).find(m => m.template === 'password_reset');
  assert.match(mail.subject, /[一-鿿]/);
});

test('forgot password: the answer is the same for everyone, and only real accounts get an email', async () => {
  const real = newEmail(); await registerPractitioner(srv.client(), real);
  const a = await anon.call('POST', '/api/auth/forgot-password', { email: real });
  const b = await anon.call('POST', '/api/auth/forgot-password', { email: 'nobody-here@example.org' });
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  assert.deepEqual(a.data, b.data, 'identical answer: no way to tell who has an account');
  assert.equal(outbox('nobody-here@example.org').length, 0);
  assert.equal(outbox(real).filter(m => m.template === 'password_reset').length, 1);
  assert.equal((await anon.call('POST', '/api/auth/forgot-password', { email: 'not an email' })).status, 400);
});

test('the reset link is built from APP_URL, not from the request, so a forged Host header cannot poison it', async () => {
  const to = newEmail(); await registerPractitioner(srv.client(), to);
  await new Promise<void>((resolve, reject) => {
    const body = JSON.stringify({ email: to });
    const req = http.request(srv.base + '/api/auth/forgot-password', { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), host: 'evil.example' } }, r => { r.resume(); r.on('end', resolve); });
    req.on('error', reject); req.end(body);
  });
  const mail = outbox(to).find(m => m.template === 'password_reset');
  assert.ok(mail, 'an email was made');
  assert.ok(!/evil\.example/.test(mail.body_text), 'the attacker host is nowhere in the link');
  assert.match(mail.body_text, /http:\/\/localhost:\d+\/reset-password\?token=/);
});

test('reset: one use, strong password only, signs out every session, clears a lockout, and tells the owner', async () => {
  const to = newEmail(); const c = srv.client();
  await registerPractitioner(c, to);
  assert.equal((await c.call('GET', '/api/auth/me')).status, 200, 'signed in after registering');
  // lock the account with bad passwords
  for (let i = 0; i < 5; i++) await srv.client().login(to, 'wrong', 'practitioner');
  assert.match((await srv.client().login(to, 'Passw0rd!ok', 'practitioner')).data.message, /Too many/);

  await anon.call('POST', '/api/auth/forgot-password', { email: to });
  const token = tokenFrom(outbox(to).find(m => m.template === 'password_reset').body_text);
  assert.equal((await anon.call('GET', `/api/auth/reset-password/check?token=${token}`)).data.data.valid, true);
  assert.equal((await anon.call('GET', '/api/auth/reset-password/check?token=nonsense')).data.data.valid, false);
  assert.equal((await anon.call('POST', '/api/auth/reset-password', { token: 'nonsense', password: 'NewPassw0rd!x' })).status, 400);
  assert.equal((await anon.call('POST', '/api/auth/reset-password', { token, password: 'weak' })).status, 400, 'a weak password does not use up the link');
  assert.equal((await anon.call('GET', `/api/auth/reset-password/check?token=${token}`)).data.data.valid, true);

  assert.equal((await anon.call('POST', '/api/auth/reset-password', { token, password: 'NewPassw0rd!x' })).status, 200);
  assert.equal((await anon.call('POST', '/api/auth/reset-password', { token, password: 'Another1Passw0rd!' })).status, 400, 'the link works once');
  assert.equal((await c.call('GET', '/api/auth/me')).status, 401, 'old sessions are gone');
  assert.equal((await srv.client().login(to, 'Passw0rd!ok', 'practitioner')).status, 401, 'old password no longer works');
  assert.equal((await srv.client().login(to, 'NewPassw0rd!x', 'practitioner')).status, 200, 'new password works, and the lockout was cleared');
  assert.ok(outbox(to).some(m => m.template === 'password_changed'), 'the owner is told');
  const log = (await admin.call('GET', '/api/admin/audit-log?action=auth.password.reset')).data.data as any[];
  assert.ok(log.some(l => l.action === 'auth.password.reset'));
  assert.ok(!log.some(l => String(l.details).includes(token)), 'the token is never logged');
});

test('reset: an expired link is refused, and the token is stored only as a hash', async () => {
  const to = newEmail(); await registerPractitioner(srv.client(), to);
  await anon.call('POST', '/api/auth/forgot-password', { email: to });
  const token = tokenFrom(outbox(to).find(m => m.template === 'password_reset').body_text);
  const stored = db.prepare('SELECT token_hash FROM password_resets').all() as any[];
  assert.ok(stored.length > 0 && !stored.some(r => r.token_hash === token), 'not stored in the clear');
  db.prepare("UPDATE password_resets SET expires_at = ? WHERE user_id = (SELECT id FROM users WHERE email = ?)").run(new Date(Date.now() - 60_000).toISOString(), to);
  assert.equal((await anon.call('GET', `/api/auth/reset-password/check?token=${token}`)).data.data.valid, false);
  assert.equal((await anon.call('POST', '/api/auth/reset-password', { token, password: 'NewPassw0rd!x' })).status, 400);
});

test('reset: a newer request replaces the older link; at most three a hour per account', async () => {
  const to = newEmail(); await registerPractitioner(srv.client(), to);
  for (let i = 0; i < 5; i++) await anon.call('POST', '/api/auth/forgot-password', { email: to });
  const mails = outbox(to).filter(m => m.template === 'password_reset');
  assert.equal(mails.length, 3, 'only three emails in an hour');
  const [first, last] = [tokenFrom(mails[0].body_text), tokenFrom(mails[2].body_text)];
  assert.equal((await anon.call('GET', `/api/auth/reset-password/check?token=${first}`)).data.data.valid, false, 'older link replaced');
  assert.equal((await anon.call('GET', `/api/auth/reset-password/check?token=${last}`)).data.data.valid, true);
});

test('admin accounts, closed accounts and demo addresses are never sent a reset', async () => {
  const before = (db.prepare('SELECT COUNT(*) AS n FROM email_outbox').get() as any).n;
  assert.equal((await anon.call('POST', '/api/auth/forgot-password', { email: ADMIN_EMAIL })).status, 200);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM email_outbox').get() as any).n, before, 'nothing for the admin');

  const gone = newEmail(); await registerPractitioner(srv.client(), gone);
  db.prepare("UPDATE users SET status = 'deleted' WHERE email = ?").run(gone);
  await anon.call('POST', '/api/auth/forgot-password', { email: gone });
  assert.equal(outbox(gone).filter(m => m.template === 'password_reset').length, 0);

  await anon.call('POST', '/api/auth/forgot-password', { email: DEMO.patient });
  const demo = outbox(DEMO.patient).find(m => m.template === 'password_reset');
  assert.equal(demo.status, 'skipped', 'the demo domain can never receive mail');
  assert.match(demo.error, /Reserved/);
});

test('a reset does not get round two-factor: the next sign-in still asks for the code', async () => {
  const to = newEmail(); await registerPractitioner(srv.client(), to);
  db.prepare("UPDATE users SET totp_enabled = 1, totp_secret = 'JBSWY3DPEHPK3PXP' WHERE email = ?").run(to);
  await anon.call('POST', '/api/auth/forgot-password', { email: to });
  const token = tokenFrom(outbox(to).find(m => m.template === 'password_reset').body_text);
  assert.equal((await anon.call('POST', '/api/auth/reset-password', { token, password: 'NewPassw0rd!x' })).status, 200);
  const r = await srv.client().login(to, 'NewPassw0rd!x', 'practitioner');
  assert.equal(r.status, 401);
  assert.equal(r.data.needsCode, true);
});

test('a partner enquiry confirms to the sender and alerts the board', async () => {
  const to = newEmail();
  const r = await anon.call('POST', '/api/partner-enquiries', { kind: 'clinic', orgName: 'Klinik Mel', contactName: 'Lee', email: to, phone: '03-1234 5678', city: 'Ipoh', state: 'Perak', consent: true, lang: 'ms' });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const confirm = outbox(to)[0];
  assert.equal(confirm.template, 'partner_enquiry_received');
  assert.equal(confirm.lang, 'ms');
  assert.ok(confirm.body_text.includes(r.data.data.id));
  const alert = outbox(ADMIN_EMAIL).find(m => m.template === 'partner_enquiry_admin' && m.body_text.includes(r.data.data.id));
  assert.ok(alert, 'the board is emailed');
  assert.ok(!alert.body_text.includes(to), 'the contact address is not in the alert: open the enquiry in the admin screen');
});

test('support replies and payouts raise an email (to a demo address the mail is skipped, which proves the hook fired)', async () => {
  const pat = srv.client();
  await pat.login(DEMO.patient, DEMO_PASSWORD, 'patient');
  const cats = (await pat.call('GET', '/api/support/categories')).data.data;
  const t = await pat.call('POST', '/api/support/tickets', { category: cats[0].name, subject: 'Need help with a booking', body: 'Please help me with my booking.' });
  assert.equal(t.status, 201);
  assert.equal((await admin.call('POST', `/api/support/tickets/${t.data.data.id}/reply`, { body: 'We are looking into it.' })).status, 201);
  const rows = outbox(DEMO.patient).filter(m => m.template === 'support_reply');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'skipped');
  assert.ok(!(rows[0].body_text ?? '').includes('We are looking into it'), 'the reply text is not put in the email');
});

test('the board can see email status and send itself a test; others cannot', async () => {
  assert.ok([401, 403].includes((await anon.call('GET', '/api/admin/email/status')).status));
  const pr = srv.client(); await registerPractitioner(pr, newEmail());
  assert.equal((await pr.call('GET', '/api/admin/email/status')).status, 403);
  assert.equal((await pr.call('POST', '/api/admin/email/test', {})).status, 403);
  const s = (await admin.call('GET', '/api/admin/email/status')).data.data;
  assert.equal(s.mode, 'log');
  assert.ok(s.counts.logged > 0);
  assert.ok(Array.isArray(s.recent) && s.recent.every((r: any) => !('body' in r) && !('body_text' in r)), 'bodies are never shown');
  const t = await admin.call('POST', '/api/admin/email/test', { lang: 'ms' });
  assert.equal(t.status, 200);
  assert.equal(t.data.data.status, 'logged');
  assert.equal(outbox(ADMIN_EMAIL).filter(m => m.template === 'test_email').length, 1);
});

// ---------- real SMTP ----------
test('over SMTP: the message arrives complete, with text and HTML, sensible headers, and no body kept in the outbox', async () => {
  const smtp = await startFakeSmtp();
  const s2 = await startTestServer({ MAIL_TRANSPORT: 'smtp', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.port), SMTP_REQUIRE_TLS: 'false', SMTP_USER: 'mailer', SMTP_PASS: 'secret', MAIL_FROM: 'MedCred <no-reply@mail.example.org>', MAIL_REPLY_TO: 'help@example.org', MAIL_RETRY_MS: '50,50' }, { seed: false });
  try {
    const to = `zh${Date.now() % 100000}@example.org`;
    assert.equal((await registerPractitioner(s2.client(), to, { lang: 'zh' })).status, 201);
    for (let i = 0; i < 200 && smtp.received.length === 0; i++) await new Promise(r => setTimeout(r, 100));
    assert.equal(smtp.received.length, 1, 'one message delivered');
    const m = smtp.received[0];
    assert.equal(m.auth, true, 'it logged in');
    assert.equal(m.from, 'no-reply@mail.example.org');
    assert.deepEqual(m.to, [to]);
    assert.equal(decodeWords(header(m.data, 'Subject')!), '欢迎加入 MedCred');
    assert.match(header(m.data, 'From')!, /MedCred/);
    assert.equal(header(m.data, 'Reply-To'), 'help@example.org');
    assert.equal(header(m.data, 'Auto-Submitted'), 'auto-generated');
    assert.match(m.data, /Content-Type: multipart\/alternative/i);
    assert.match(m.data, /Content-Type: text\/plain/i);
    assert.match(m.data, /Content-Type: text\/html/i);

    const d = new DatabaseSync(path.join(s2.dir, 'careverified.db')); d.exec('PRAGMA busy_timeout = 10000');
    // the server learns the send finished a moment after the message arrives here: wait for the record
    let row: any;
    for (let i = 0; i < 100; i++) {
      row = d.prepare('SELECT status, attempts, body_text FROM email_outbox WHERE to_email = ?').get(to);
      if (row?.status === 'sent') break;
      await new Promise(r => setTimeout(r, 100));
    }
    d.close();
    assert.equal(row.status, 'sent');
    assert.equal(row.attempts, 1);
    assert.equal(row.body_text, null, 'a real server keeps no copy of the message');
  } finally { await s2.stop(); await smtp.close(); }
});

test('over SMTP: a refused mailbox is retried, then recorded as failed with the reason', async () => {
  const smtp = await startFakeSmtp(); smtp.rejectRecipients = true;
  const s2 = await startTestServer({ MAIL_TRANSPORT: 'smtp', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.port), SMTP_REQUIRE_TLS: 'false', MAIL_FROM: 'MedCred <no-reply@mail.example.org>', MAIL_RETRY_MS: '50,50' }, { seed: false });
  try {
    const to = `bounce${Date.now() % 100000}@example.org`;
    const c = s2.client();
    assert.equal((await registerPractitioner(c, to)).status, 201, 'the request itself is not held up or failed by a mail problem');
    const a2 = s2.client(); await a2.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');
    let row: any;
    for (let i = 0; i < 200; i++) {
      row = (await a2.call('GET', '/api/admin/email/status')).data.data.recent.find((r: any) => r.to === to);
      if (row?.status === 'failed') break;
      await new Promise(r => setTimeout(r, 100));
    }
    assert.equal(row.status, 'failed');
    assert.equal(row.attempts, 3);
    assert.match(row.error, /550|mailbox/i);
    const st = (await a2.call('GET', '/api/admin/email/status')).data.data;
    assert.equal(st.mode, 'smtp');
    assert.ok(st.counts.failed >= 1);
  } finally { await s2.stop(); await smtp.close(); }
});

test('email switched off: nothing is sent, the board is told why, and password reset still gives the same answer', async () => {
  const s2 = await startTestServer({ MAIL_TRANSPORT: 'off' }, { seed: false });
  try {
    const a2 = s2.client(); await a2.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');
    const to = `off${Date.now() % 100000}@example.org`;
    assert.equal((await registerPractitioner(s2.client(), to)).status, 201, 'registering works without email');
    assert.equal((await s2.client().call('POST', '/api/auth/forgot-password', { email: to })).status, 200);
    const st = (await a2.call('GET', '/api/admin/email/status')).data.data;
    assert.equal(st.mode, 'off');
    assert.ok(st.problems.some((p: string) => /Email is off/.test(p)), 'the board sees a plain warning');
    const mine = st.recent.filter((r: any) => r.to === to);
    assert.ok(mine.length >= 2 && mine.every((r: any) => r.status === 'skipped' && /not configured/.test(r.error)));
  } finally { await s2.stop(); }
});
