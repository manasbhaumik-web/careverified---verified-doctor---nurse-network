// Practitioner payouts, through the running server. Payments and consults are written straight into a throwaway database so the
// amounts and dates are exact; everything else (bank details, verification, batches, files, payment marking) goes through the API.
import './helpers/isolatedDb';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { bankProblem, csv, csvCell, decryptText, encryptText, normaliseAccountNumber } from '../server/payouts';
import { ADMIN_EMAIL, ADMIN_PASSWORD, DEMO, DEMO_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

// ---------- unit ----------
test('bank details: validation and normalisation', () => {
  assert.equal(normaliseAccountNumber('1234-5678 9012'), '123456789012');
  const ok = { bankName: 'Maybank', accountName: 'Dr Demo Physician', accountNumber: '1234 5678 9012' };
  assert.equal(bankProblem(ok), null);
  assert.match(bankProblem({ ...ok, bankName: '' })!, /bank/i);
  assert.match(bankProblem({ ...ok, accountName: 'A' })!, /holder/i);
  assert.match(bankProblem({ ...ok, accountNumber: '12AB' })!, /digits/);
  assert.match(bankProblem({ ...ok, accountNumber: '123' })!, /digits/);
});

test('encryption: round trip, and a tampered value is refused', () => {
  const blob = encryptText('123456789012');
  assert.ok(blob.startsWith('v1:'));
  assert.ok(!blob.includes('123456789012'));
  assert.notEqual(encryptText('123456789012'), blob, 'a fresh random IV every time');
  assert.equal(decryptText(blob), '123456789012');
  const raw = Buffer.from(blob.slice(3), 'base64'); raw[raw.length - 1] ^= 1;
  assert.throws(() => decryptText('v1:' + raw.toString('base64')));
});

test('bank file: a spreadsheet cannot run a cell as a formula', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('+1'), "'+1");
  assert.equal(csvCell('Tan, Wei'), '"Tan, Wei"');
  assert.equal(csv(['a', 'b'], [['1', '2']]), 'a,b\r\n1,2\r\n');
});

// ---------- through the server ----------
let srv: TestServer;
let admin: Client, doctor: Client, patient: Client, anon: Client;
let db: DatabaseSync;
let pid = '', patientId = '';
let seq = 0;

/** A completed on-demand consult with a paid payment. net = amount - tax - commission. */
function addConsult(opts: { endedDaysAgo?: number | null; status?: string; amount?: number; tax?: number; fee?: number; paymentStatus?: string }) {
  const n = ++seq, cid = `c-pay-${n}`, payId = `pay-${n}`;
  const ended = opts.endedDaysAgo === null ? null : daysAgo(opts.endedDaysAgo ?? 10);
  db.prepare("INSERT INTO consults (id,patient_user_id,professional_id,status,mode,symptoms,fee_sen,created_at,ended_at) VALUES (?,?,?,?, 'video','x',?,?,?)")
    .run(cid, patientId, pid, opts.status ?? 'completed', opts.amount ?? 8000, daysAgo(12), ended);
  db.prepare("INSERT INTO payments (id,user_id,kind,ref_id,professional_id,amount_sen,platform_fee_sen,currency,status,provider,description,created_at,paid_at,tax_sen) VALUES (?,?, 'consult',?,?,?,?, 'MYR',?, 'sandbox',?,?,?,?)")
    .run(payId, patientId, cid, pid, opts.amount ?? 8000, opts.fee ?? 1200, opts.paymentStatus ?? 'paid', `Consult ${n}`, daysAgo(12), daysAgo(12), opts.tax ?? 0);
  return payId;
}
const mine = async () => (await doctor.call('GET', '/api/me/payouts')).data.data;
const overview = async () => (await admin.call('GET', '/api/admin/payouts/overview')).data.data;
const bank = { bankName: 'Maybank', accountName: 'Dr Demo Physician', accountNumber: '1234 5678 9012', password: DEMO_PASSWORD };

before(async () => {
  srv = await startTestServer({ PAYOUT_HOLD_DAYS: '7', PAYOUT_MIN_MYR: '50', PAYOUT_FOUR_EYES: 'false' });
  admin = srv.client(); doctor = srv.client(); patient = srv.client(); anon = srv.client();
  assert.equal((await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin')).status, 200);
  const dl = await doctor.login(DEMO.doctor, DEMO_PASSWORD, 'practitioner');
  assert.equal(dl.status, 200);
  pid = dl.data.data.user.profileId;
  const pl = await patient.login(DEMO.patient, DEMO_PASSWORD, 'patient');
  patientId = pl.data.data.user.id;
  db = new DatabaseSync(path.join(srv.dir, 'careverified.db'));
  db.exec('PRAGMA busy_timeout = 10000'); // the server also writes (audit, notifications): wait instead of failing
});
after(async () => { try { db?.close(); } catch { /* ignore */ } await srv?.stop(); });

test('earnings: payable only after the visit is completed and the hold has passed; tax is not income', async () => {
  const base = (await mine()).summary; // the demo seed already left a paid, not yet completed booking for this doctor
  addConsult({ endedDaysAgo: 10 });                       // ready: 80.00 - 12.00 = 68.00
  addConsult({ endedDaysAgo: 10, amount: 10600, tax: 600, fee: 1500 }); // ready: 106 - 6 - 15 = 85.00
  addConsult({ endedDaysAgo: 2 });                        // inside the 7-day hold
  addConsult({ status: 'active', endedDaysAgo: null });   // visit not completed
  const m = await mine();
  assert.equal(m.summary.available - base.available, 153, 'two ready earnings: 68 + 85');
  assert.equal(m.summary.waiting - base.waiting, 136, 'two waiting earnings: 68 + 68');
  assert.equal(m.summary.paid, 0);
  assert.equal(m.terms.holdDays, 7);
  assert.deepEqual(m.upcoming.filter((u: any) => u.state === 'ready').map((u: any) => u.net).sort(), [68, 85]);
  assert.match(m.upcoming.find((u: any) => u.state === 'waiting' && /Waiting/.test(u.note)).note, /completed/);
});

test('bank details: password required, validated, stored encrypted, shown masked', async () => {
  assert.equal((await patient.call('PUT', '/api/me/payout-account', bank)).status, 403, 'only practitioners');
  assert.equal((await anon.call('PUT', '/api/me/payout-account', bank)).status, 401);
  assert.equal((await doctor.call('PUT', '/api/me/payout-account', { ...bank, password: 'wrong' })).status, 403);
  assert.equal((await doctor.call('PUT', '/api/me/payout-account', { ...bank, accountNumber: '12' })).status, 400);
  assert.equal((await doctor.call('PUT', '/api/me/payout-account', bank)).status, 200);

  const m = await mine();
  assert.deepEqual({ ...m.bank, updatedAt: undefined, verifiedAt: undefined, note: undefined }, { bankName: 'Maybank', accountName: 'Dr Demo Physician', last4: '9012', status: 'unverified', verifiedAt: undefined, note: undefined, updatedAt: undefined });
  assert.ok(!JSON.stringify(m).includes('123456789012'), 'the full number never leaves the server');
  const stored = (db.prepare('SELECT account_enc FROM payout_accounts WHERE professional_id = ?').get(pid) as any).account_enc as string;
  assert.ok(!stored.includes('123456789012') && stored.startsWith('v1:'));
});

test('nothing is paid to an unverified account, and the board sees why', async () => {
  const o = await overview();
  const row = o.preview.find((p: any) => p.professionalId === pid);
  assert.equal(row.netSen, 15300);
  assert.equal(row.willBePaid, false);
  assert.match(row.reason, /not verified/);
  const r = await admin.call('POST', '/api/admin/payout-batches', {});
  assert.equal(r.status, 400);
  assert.match(r.data.message, /Nothing is ready/);
});

test('the board must confirm the name check before verifying', async () => {
  assert.equal((await admin.call('POST', `/api/admin/payout-accounts/${pid}/verify`, { verified: true })).status, 400);
  assert.equal((await admin.call('POST', `/api/admin/payout-accounts/${pid}/verify`, { verified: false })).status, 400, 'a rejection needs a reason');
  assert.equal((await doctor.call('POST', `/api/admin/payout-accounts/${pid}/verify`, { verified: true, nameChecked: true })).status, 403, 'not for practitioners');
  assert.equal((await admin.call('POST', `/api/admin/payout-accounts/${pid}/verify`, { verified: true, nameChecked: true })).status, 200);
  assert.equal((await mine()).bank.status, 'verified');
});

let batchId = '', payoutId = '';
test('a batch snapshots what is ready, once', async () => {
  const r = await admin.call('POST', '/api/admin/payout-batches', { note: 'October' });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.data.data.payouts, 1);
  assert.equal(r.data.data.total, 153);
  batchId = r.data.data.id;
  const b = (await admin.call('GET', `/api/admin/payout-batches/${batchId}`)).data.data;
  assert.equal(b.status, 'draft');
  assert.equal(b.payouts.length, 1);
  payoutId = b.payouts[0].id;
  assert.equal(b.payouts[0].amount, 153);
  assert.equal(b.payouts[0].bank, 'Maybank ••••9012');
  // the same earnings cannot be paid twice
  assert.equal((await admin.call('POST', '/api/admin/payout-batches', {})).status, 400);
  const m = await mine();
  assert.equal(m.summary.available, 0);
  assert.equal(m.summary.inPayout, 153);
});

test('the bank file needs approval, is admin only, and holds the real account number', async () => {
  assert.equal((await admin.call('GET', `/api/admin/payout-batches/${batchId}/export.csv`)).status, 409, 'not before approval');
  assert.ok([401, 403].includes((await anon.call('POST', `/api/admin/payout-batches/${batchId}/approve`)).status));
  assert.equal((await doctor.call('POST', `/api/admin/payout-batches/${batchId}/approve`)).status, 403);
  assert.equal((await admin.call('POST', `/api/admin/payout-batches/${batchId}/approve`)).status, 200);
  assert.equal((await admin.call('POST', `/api/admin/payout-batches/${batchId}/approve`)).status, 409, 'only once');

  const base = srv.base + `/api/admin/payout-batches/${batchId}/export.csv`;
  assert.equal((await fetch(base)).status, 401, 'signed out');
  const file = await fetch(base, { headers: { cookie: admin.cookie } });
  assert.equal(file.status, 200);
  assert.match(file.headers.get('content-type')!, /text\/csv/);
  const text = await file.text();
  assert.match(text, /^Payout ID,Beneficiary name,Bank,Account number,Amount \(MYR\),Payment reference,Email/);
  assert.ok(text.includes('123456789012'), 'the bank needs the full number');
  assert.ok(text.includes('153.00'));
  assert.ok(text.includes(`MEDCRED ${payoutId}`));
  const log = (await admin.call('GET', '/api/admin/audit-log?action=payout.')).data.data as any[];
  assert.ok(log.some(l => l.action === 'payout.batch.export'));
  assert.ok(!log.some(l => /1234|5678|9012/.test(String(l.details))), 'no account number in the audit log');
});

test('marking a payout paid records the bank reference, completes the batch and tells the practitioner', async () => {
  assert.equal((await admin.call('POST', `/api/admin/payouts/${payoutId}/paid`, { reference: 'x' })).status, 400, 'a real reference is required');
  assert.equal((await admin.call('POST', `/api/admin/payouts/${payoutId}/paid`, { reference: 'MBB123456', paidOn: '2999-01-01' })).status, 400, 'not in the future');
  assert.equal((await doctor.call('POST', `/api/admin/payouts/${payoutId}/paid`, { reference: 'MBB123456' })).status, 403);
  assert.equal((await admin.call('POST', `/api/admin/payouts/${payoutId}/paid`, { reference: 'MBB123456' })).status, 200);
  assert.equal((await admin.call('POST', `/api/admin/payouts/${payoutId}/paid`, { reference: 'MBB999999' })).status, 409, 'cannot pay twice');
  assert.equal((await admin.call('GET', `/api/admin/payout-batches/${batchId}`)).data.data.status, 'completed');

  const m = await mine();
  assert.equal(m.summary.paid, 153);
  assert.equal(m.summary.inPayout, 0);
  assert.equal(m.payouts[0].status, 'paid');
  assert.equal(m.payouts[0].reference, 'MBB123456');
  const notes = (await doctor.call('GET', '/api/notifications')).data;
  assert.match(JSON.stringify(notes), /payout was sent/i);
});

test('statement: the practitioner can download itemised figures that add up; nobody else can', async () => {
  const url = srv.base + `/api/me/payouts/${payoutId}/statement.csv`;
  const res = await fetch(url, { headers: { cookie: doctor.cookie } });
  assert.equal(res.status, 200);
  const lines = (await res.text()).trim().split('\r\n');
  assert.equal(lines.length, 3, 'header and two earnings');
  const net = lines.slice(1).map(l => Number(l.split(',').pop()));
  assert.equal(net.reduce((a, b) => a + b, 0), 153);
  assert.equal((await fetch(url, { headers: { cookie: patient.cookie } })).status, 403);
  assert.equal((await fetch(url)).status, 401);
});

test('refund after payout: a negative adjustment is netted from the next payout, not clawed back by hand', async () => {
  const f = addConsult({ endedDaysAgo: 10 });  // 68.00 ready
  const g = addConsult({ endedDaysAgo: 10 });  // 68.00 ready
  // payment 1 (68.00) was already paid out; it is now refunded
  db.prepare("UPDATE payments SET status = 'refunded', refunded_at = ? WHERE id = 'pay-1'").run(iso());
  const m = await mine();
  assert.deepEqual(m.adjustments.map((a: any) => a.amount), [-68]);
  assert.equal(m.summary.available, 68 + 68 - 68);

  const r = await admin.call('POST', '/api/admin/payout-batches', {});
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.data.data.total, 68);
  const b = (await admin.call('GET', `/api/admin/payout-batches/${r.data.data.id}`)).data.data;
  assert.equal(b.payouts[0].earnings, 136);
  assert.equal(b.payouts[0].adjustments, -68);
  assert.equal(b.payouts[0].amount, 68);
  const items = db.prepare('SELECT kind, amount_sen FROM payout_items WHERE payout_id = ? ORDER BY kind, payment_id').all(b.payouts[0].id) as any[];
  assert.deepEqual(items.map(i => `${i.kind}:${i.amount_sen}`), ['adjustment:-6800', `earning:6800`, 'earning:6800']);
  assert.equal(items.reduce((s, i) => s + i.amount_sen, 0), b.payouts[0].amount * 100, 'the payout equals its items');
  // the adjustment is taken once only
  assert.equal((await mine()).adjustments.length, 0);
  assert.ok(f && g);
  // clean up for the next test: cancel releases everything
  assert.equal((await admin.call('POST', `/api/admin/payout-batches/${r.data.data.id}/cancel`)).status, 200);
  assert.equal((await mine()).adjustments.length, 1, 'cancelling gives the adjustment back to the next run');
});

test('a refund between preparing and approving blocks the batch; cancelling releases the rest', async () => {
  const before = (await mine()).summary.available;
  const i = addConsult({ endedDaysAgo: 10 });
  const r = await admin.call('POST', '/api/admin/payout-batches', {});
  assert.equal(r.status, 201, JSON.stringify(r.data));
  db.prepare("UPDATE payments SET status = 'refunded', refunded_at = ? WHERE id = ?").run(iso(), i);
  const a = await admin.call('POST', `/api/admin/payout-batches/${r.data.data.id}/approve`);
  assert.equal(a.status, 409);
  assert.match(a.data.message, /refunded/);
  assert.equal((await admin.call('POST', `/api/admin/payout-batches/${r.data.data.id}/cancel`)).status, 200);
  assert.equal((await mine()).summary.available, before, 'the refunded payment is not payable, the others are back');
});

test('a failed transfer releases the money, unverifies the account and tells the practitioner', async () => {
  const r = await admin.call('POST', '/api/admin/payout-batches', {});
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const bid = r.data.data.id;
  assert.equal((await admin.call('POST', `/api/admin/payout-batches/${bid}/approve`)).status, 200);
  const b = (await admin.call('GET', `/api/admin/payout-batches/${bid}`)).data.data;
  const failing = b.payouts[0].id;
  assert.equal((await admin.call('POST', `/api/admin/payouts/${failing}/failed`, {})).status, 400, 'a reason is required');
  assert.equal((await admin.call('POST', `/api/admin/payouts/${failing}/failed`, { reason: 'Account closed' })).status, 200);
  assert.equal((await admin.call('GET', `/api/admin/payout-batches/${bid}`)).data.data.status, 'completed');
  const m = await mine();
  assert.equal(m.payouts[0].status, 'failed');
  assert.equal(m.bank.status, 'unverified');
  assert.ok(m.summary.available > 0, 'the earnings are payable again');
  // while unverified nothing more is paid
  assert.equal((await admin.call('POST', '/api/admin/payout-batches', {})).status, 400);
  assert.equal((await admin.call('POST', `/api/admin/payout-accounts/${pid}/verify`, { verified: true, nameChecked: true })).status, 200);
  assert.equal((await admin.call('POST', '/api/admin/payout-batches', {})).status, 201);
});

test('changing bank details resets verification and alerts the board', async () => {
  const before = (await overview()).accounts.find((a: any) => a.professionalId === pid);
  assert.equal(before.status, 'verified');
  assert.equal((await doctor.call('PUT', '/api/me/payout-account', { ...bank, accountNumber: '9999 8888 7777' })).status, 200);
  const after = (await overview()).accounts.find((a: any) => a.professionalId === pid);
  assert.equal(after.status, 'unverified');
  assert.equal(after.last4, '7777');
  const log = (await admin.call('GET', '/api/admin/audit-log?action=payout.account')).data.data as any[];
  assert.ok(log.some(l => l.action === 'payout.account.update'));
});

test('small balances roll over instead of being paid', async () => {
  assert.equal((await admin.call('POST', `/api/admin/payout-accounts/${pid}/verify`, { verified: true, nameChecked: true })).status, 200);
  // clear every open batch so their payments are released, then make everything else unpayable
  for (const b of (await overview()).batches.filter((x: any) => ['draft', 'approved', 'exported'].includes(x.status))) await admin.call('POST', `/api/admin/payout-batches/${b.id}/cancel`);
  db.prepare("INSERT OR IGNORE INTO payout_items (payout_id,payment_id,kind,amount_sen) VALUES ('PO-SETTLED','pay-1','adjustment',-6800)").run();
  db.prepare("UPDATE payments SET status = 'refunded', refunded_at = ? WHERE status = 'paid' AND id NOT IN (SELECT payment_id FROM payout_items WHERE kind = 'earning')").run(iso());
  addConsult({ endedDaysAgo: 10, amount: 4000, fee: 600 }); // 34.00 net, under the RM 50 minimum
  const row = (await overview()).preview.find((p: any) => p.professionalId === pid);
  assert.equal(row.netSen, 3400);
  assert.match(row.reason, /minimum/);
  assert.equal((await admin.call('POST', '/api/admin/payout-batches', {})).status, 400);
  assert.equal((await mine()).summary.belowMinimum, true);
});

test('only the board can run any of it', async () => {
  for (const [method, url] of [['GET', '/api/admin/payouts/overview'], ['POST', '/api/admin/payout-batches'], ['GET', '/api/admin/payout-batches/PB-X'], ['POST', '/api/admin/payouts/PO-X/paid']] as const) {
    assert.ok([401, 403].includes((await anon.call(method, url, method === 'GET' ? undefined : {})).status), `${method} ${url} signed out`);
    assert.equal((await doctor.call(method, url, method === 'GET' ? undefined : {})).status, 403, `${method} ${url} as practitioner`);
    assert.equal((await patient.call(method, url, method === 'GET' ? undefined : {})).status, 403, `${method} ${url} as patient`);
  }
  assert.ok([401, 403].includes((await anon.call('GET', '/api/me/payouts')).status));
  assert.equal((await patient.call('GET', '/api/me/payouts')).status, 403);
});

test('closing an account: bank details are removed, payout records stay without the name and number', async () => {
  const del = await admin.call('DELETE', `/api/admin/payout-accounts/${pid}`);
  // a batch may still be open from earlier tests: the board must finish or cancel it first
  if (del.status === 409) {
    for (const b of (await overview()).batches.filter((x: any) => ['draft', 'approved', 'exported'].includes(x.status))) await admin.call('POST', `/api/admin/payout-batches/${b.id}/cancel`);
  }
  assert.ok([200, 409].includes(del.status));
  assert.equal((await doctor.call('DELETE', `/api/admin/payout-accounts/${pid}`)).status, 403);
  if (del.status === 409) assert.equal((await admin.call('DELETE', `/api/admin/payout-accounts/${pid}`)).status, 200);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM payout_accounts WHERE professional_id = ?').get(pid) as any).n, 0);
  const rec = db.prepare("SELECT account_enc, account_name, last4, reference, amount_sen FROM payouts WHERE professional_id = ? AND status = 'paid'").get(pid) as any;
  assert.equal(rec.account_enc, 'erased');
  assert.equal(rec.account_name, 'Deleted');
  assert.equal(rec.last4, '9012', 'the last four digits stay for the accounting record');
  assert.equal(rec.reference, 'MBB123456');
  assert.equal((await admin.call('DELETE', `/api/admin/payout-accounts/${pid}`)).status, 404);
});

function iso() { return new Date().toISOString(); }

test('four-eyes: with PAYOUT_FOUR_EYES the person who prepared a batch cannot approve it', async () => {
  const s2 = await startTestServer({ PAYOUT_FOUR_EYES: 'true', PAYOUT_HOLD_DAYS: '0', PAYOUT_MIN_MYR: '1' });
  try {
    const a2 = s2.client(), d2 = s2.client(), p2 = s2.client();
    await a2.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');
    const dl = await d2.login(DEMO.doctor, DEMO_PASSWORD, 'practitioner');
    const pl = await p2.login(DEMO.patient, DEMO_PASSWORD, 'patient');
    const d = new DatabaseSync(path.join(s2.dir, 'careverified.db'));
    d.exec('PRAGMA busy_timeout = 10000');
    d.prepare("INSERT INTO consults (id,patient_user_id,professional_id,status,mode,symptoms,fee_sen,created_at,ended_at) VALUES ('c-f','" + pl.data.data.user.id + "','" + dl.data.data.user.profileId + "','completed','video','x',8000,?,?)").run(daysAgo(3), daysAgo(2));
    d.prepare("INSERT INTO payments (id,user_id,kind,ref_id,professional_id,amount_sen,platform_fee_sen,currency,status,provider,description,created_at,paid_at,tax_sen) VALUES ('pay-f','" + pl.data.data.user.id + "','consult','c-f','" + dl.data.data.user.profileId + "',8000,1200,'MYR','paid','sandbox','x',?,?,0)").run(daysAgo(3), daysAgo(3));
    d.close();
    assert.equal((await d2.call('PUT', '/api/me/payout-account', bank)).status, 200);
    assert.equal((await a2.call('POST', `/api/admin/payout-accounts/${dl.data.data.user.profileId}/verify`, { verified: true, nameChecked: true })).status, 200);
    const r = await a2.call('POST', '/api/admin/payout-batches', {});
    assert.equal(r.status, 201, JSON.stringify(r.data));
    const a = await a2.call('POST', `/api/admin/payout-batches/${r.data.data.id}/approve`);
    assert.equal(a.status, 403);
    assert.match(a.data.message, /different admin/);
  } finally { await s2.stop(); }
});
