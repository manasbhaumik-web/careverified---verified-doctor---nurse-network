import './helpers/isolatedDb';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAIL_LANGS, TEMPLATES, escapeHtml, pickMailLang, renderEmail, type TemplateName } from '../server/mailTemplates';
import { appBase, mailMode } from '../server/mail';

const BASE = 'https://app.example.org';
const VARS: Record<string, any> = {
  name: 'Aisyah Rahman', note: 'Please send a clearer copy.', until: '2027-10-15', reason: 'Licence expired on 2026-10-01.', what: 'Your licence expires on 2026-11-01.',
  org: 'Farmasi Sihat', ref: 'ENQ-ABC123', kind: 'pharmacy', city: 'Shah Alam', amount: '153.00', bank: 'Maybank ••••9012', reference: 'MBB123456',
  minutes: 30, url: BASE + '/reset-password?token=abc', subject: 'Cannot see my earnings',
};
const names = Object.keys(TEMPLATES) as TemplateName[];

test('every template renders in every language with a subject, text and HTML and no leftovers', () => {
  assert.ok(names.length >= 15);
  for (const t of names) for (const l of MAIL_LANGS) {
    const r = renderEmail(t, l, VARS, BASE);
    const where = `${t}/${l}`;
    assert.ok(r.subject.length > 3, where);
    assert.ok(r.text.length > 30 && r.html.length > 200, where);
    assert.ok(!/undefined|\[object|NaN|\{\{/.test(r.subject + r.text), `${where} has a leftover`);
    assert.ok(!r.subject.includes('\n'), `${where} subject is one line`);
    assert.match(r.html, new RegExp(`<html lang="${l}">`));
  }
});

test('languages really differ: Malay and Chinese are not English copies', () => {
  for (const t of names) {
    const en = renderEmail(t, 'en', VARS, BASE).subject;
    assert.notEqual(renderEmail(t, 'ms', VARS, BASE).subject, en, `${t} ms`);
    assert.notEqual(renderEmail(t, 'zh', VARS, BASE).subject, en, `${t} zh`);
    assert.match(renderEmail(t, 'zh', VARS, BASE).subject, /[一-鿿]/, `${t} zh has Chinese`);
  }
});

test('links are absolute, appear in the text and the HTML, and carry the app address', () => {
  const r = renderEmail('verification_approved', 'en', VARS, BASE);
  assert.equal(r.link, BASE + '/login?role=practitioner');
  assert.ok(r.text.includes(r.link!));
  assert.ok(r.html.includes(`href="${r.link}"`));
  const reset = renderEmail('password_reset', 'en', VARS, BASE);
  assert.equal(reset.link, VARS.url, 'a full URL is kept as it is');
  assert.equal(renderEmail('payout_paid', 'en', VARS, BASE + '/').link, BASE + '/login?role=practitioner', 'a trailing slash is not doubled');
});

test('without an app address there are no relative or invented links', () => {
  const r = renderEmail('verification_approved', 'en', VARS, null);
  assert.equal(r.link, null);
  assert.ok(!/href=/.test(r.html));
  assert.ok(!/login\?role/.test(r.text));
});

test('text from people is escaped in HTML and cannot break the subject', () => {
  const evil = { ...VARS, note: '<script>alert(1)</script> & "quotes"', subject: 'Hi\r\nBcc: attacker@evil.example', org: 'A<b>B' };
  const r = renderEmail('verification_info_needed', 'en', evil, BASE);
  assert.ok(!r.html.includes('<script>'));
  assert.ok(r.html.includes('&lt;script&gt;'));
  const s = renderEmail('support_reply', 'en', evil, BASE);
  assert.ok(!s.subject.includes('\n') && !s.subject.includes('\r'));
  assert.ok(!/\r|\n/.test(renderEmail('partner_enquiry_received', 'en', { ...evil, ref: 'X\nY' }, BASE).subject));
  assert.equal(escapeHtml(`<a href="x">'&`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
});

test('every email carries the safety line and never asks for secrets', () => {
  for (const t of names) for (const l of MAIL_LANGS) {
    const r = renderEmail(t, l, VARS, BASE);
    assert.ok(/MedCred/.test(r.text));
    assert.ok(!/(enter|send|reply with) your password/i.test(r.text), `${t}/${l}`);
  }
  assert.match(renderEmail('payout_paid', 'en', VARS, BASE).text, /never asks for your password or bank details/);
  const paid = renderEmail('payout_paid', 'en', VARS, BASE).text;
  assert.ok(!/\d{9,}/.test(paid), 'no long account number in a payout email');
});

test('the password reset email says it works once and when it expires', () => {
  for (const l of MAIL_LANGS) {
    const t = renderEmail('password_reset', l, VARS, BASE).text;
    assert.ok(t.includes('30'), l);
    assert.ok(t.includes(VARS.url), l);
  }
});

test('language choice: only ms and zh are special, anything else is English', () => {
  assert.equal(pickMailLang('ms'), 'ms');
  assert.equal(pickMailLang('zh'), 'zh');
  assert.equal(pickMailLang('en'), 'en');
  assert.equal(pickMailLang('ar'), 'en');
  assert.equal(pickMailLang(undefined), 'en');
});

test('mail mode: log outside production, off in production until SMTP is set, explicit setting wins', () => {
  assert.equal(mailMode({} as NodeJS.ProcessEnv), 'log');
  assert.equal(mailMode({ NODE_ENV: 'production' } as NodeJS.ProcessEnv), 'off');
  assert.equal(mailMode({ NODE_ENV: 'production', SMTP_HOST: 'smtp.example.org' } as NodeJS.ProcessEnv), 'smtp');
  assert.equal(mailMode({ NODE_ENV: 'production', MAIL_TRANSPORT: 'log' } as NodeJS.ProcessEnv), 'log');
  assert.equal(mailMode({ MAIL_TRANSPORT: 'smtp' } as NodeJS.ProcessEnv), 'smtp');
  assert.equal(mailMode({ MAIL_TRANSPORT: 'nonsense' } as NodeJS.ProcessEnv), 'log');
});

test('app address: from APP_URL only, never guessed in production', () => {
  assert.equal(appBase({ APP_URL: 'https://medcred.example.org/' } as NodeJS.ProcessEnv), 'https://medcred.example.org');
  assert.equal(appBase({ APP_URL: 'MY_APP_URL' } as NodeJS.ProcessEnv), 'http://localhost:3000', 'the placeholder in .env.example is ignored in development');
  assert.equal(appBase({ APP_URL: 'MY_APP_URL', NODE_ENV: 'production' } as NodeJS.ProcessEnv), null, 'and there is no fallback in production');
  assert.equal(appBase({ NODE_ENV: 'production' } as NodeJS.ProcessEnv), null);
  assert.equal(appBase({ PORT: '3456' } as NodeJS.ProcessEnv), 'http://localhost:3456');
});
