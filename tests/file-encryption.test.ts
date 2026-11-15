import './helpers/isolatedDb';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { encryptFile, decryptFile, isEncrypted } from '../server/fileCrypto';
import { DEMO, DEMO_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

test('encrypt then decrypt returns the original bytes; the stored bytes do not contain them', () => {
  const plain = Buffer.from('%PDF-1.4 SECRET-LICENCE-NUMBER-12345 ' + 'x'.repeat(500));
  const stored = encryptFile(plain);
  assert.equal(isEncrypted(stored), true);
  assert.equal(stored.includes(Buffer.from('SECRET-LICENCE-NUMBER')), false);
  assert.deepEqual(decryptFile(stored), plain);
  assert.notDeepEqual(encryptFile(plain), stored, 'a fresh random IV each time');
});

test('a tampered file is refused, and a file stored before encryption existed is read unchanged', () => {
  const stored = encryptFile(Buffer.from('hello world, this is a document'));
  const bad = Buffer.from(stored); bad[bad.length - 1] ^= 0xff;
  assert.throws(() => decryptFile(bad));
  const legacy = Buffer.from('%PDF-1.4 an old, unencrypted upload');
  assert.deepEqual(decryptFile(legacy), legacy);
});

let srv: TestServer;
let doctor: Client, patient: Client;
before(async () => {
  srv = await startTestServer();
  doctor = srv.client(); patient = srv.client();
  assert.equal((await doctor.login(DEMO.doctor, DEMO_PASSWORD, 'practitioner')).status, 200);
  assert.equal((await patient.login(DEMO.patient, DEMO_PASSWORD, 'patient')).status, 200);
});
after(async () => { await srv?.stop(); });

test('uploaded documents are encrypted on disk, come back intact for the owner, and stay private', async () => {
  const content = '%PDF-1.4\nCONFIDENTIAL-CERTIFICATE-TEXT\n';
  const form = new FormData();
  form.set('kind', 'certificate');
  form.set('file', new Blob([content], { type: 'application/pdf' }), 'cert.pdf');
  const up = await fetch(`${srv.base}/api/documents`, { method: 'POST', headers: { cookie: doctor.cookie }, body: form });
  assert.equal(up.status, 201);
  const id = (await up.json()).data.id as string;

  const dir = path.join(srv.dir, 'uploads');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));
  assert.ok(files.length >= 1);
  for (const f of files) assert.equal(fs.readFileSync(path.join(dir, f)).includes(Buffer.from('CONFIDENTIAL-CERTIFICATE-TEXT')), false, 'plaintext must not be on disk');

  const mine = await fetch(`${srv.base}/api/documents/${id}/download`, { headers: { cookie: doctor.cookie } });
  assert.equal(mine.status, 200);
  assert.equal(await mine.text(), content);

  assert.equal((await fetch(`${srv.base}/api/documents/${id}/download`, { headers: { cookie: patient.cookie } })).status, 404, 'another user cannot read it');
  assert.equal((await fetch(`${srv.base}/api/documents/${id}/download`)).status, 401, 'public cannot read it');
});
