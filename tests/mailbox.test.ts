// Care Mailbox: who a patient can message, and that the page only says "verified" when the record does.
import './helpers/isolatedDb';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DEMO, DEMO_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

let srv: TestServer;
let patient: Client, doctor: Client;
before(async () => {
  srv = await startTestServer();
  patient = srv.client(); doctor = srv.client();
  assert.equal((await patient.login(DEMO.patient, DEMO_PASSWORD, 'patient')).status, 200);
  assert.equal((await doctor.login(DEMO.doctor, DEMO_PASSWORD, 'practitioner')).status, 200);
});
after(async () => { await srv.stop(); });

test('a patient sees the practitioners they have booked, each marked verified from the record', async () => {
  const r = await patient.call('GET', '/api/chats/threads');
  assert.equal(r.status, 200);
  const threads = r.data.data as { id: string; name: string; verified?: boolean }[];
  assert.ok(threads.length > 0, 'the demo patient has care-team contacts');
  const demoDoctor = threads.find(t => /Demo Physician/.test(t.name));
  assert.ok(demoDoctor, 'the demo doctor is listed');
  assert.equal(demoDoctor!.verified, true, 'verified comes from the practitioner record');
  assert.ok(threads.every(t => typeof t.verified === 'boolean'), 'every practitioner thread says verified or not; none is assumed');
});

test('a message goes both ways and shows in each person\'s mailbox', async () => {
  const threads = (await patient.call('GET', '/api/chats/threads')).data.data as { id: string; name: string }[];
  const doc = threads.find(t => /Demo Physician/.test(t.name))!;
  const sent = await patient.call('POST', '/api/chats', { receiverId: doc.id, receiverName: doc.name, text: 'Hello doctor, can I ask about my prescription?' });
  assert.equal(sent.status, 201, JSON.stringify(sent.data));

  const mine = (await patient.call('GET', '/api/chats')).data.data as { text: string }[];
  assert.ok(mine.some(m => /prescription/.test(m.text)), 'the patient sees what they sent');
  const theirs = (await doctor.call('GET', '/api/chats')).data.data as { text: string }[];
  assert.ok(theirs.some(m => /prescription/.test(m.text)), 'the doctor sees it too');
});

test('the mailbox does not claim encryption the server does not do', () => {
  // Messages are stored as ordinary database text, so the pages must not promise encryption.
  for (const file of ['src/components/SecureMessenger.tsx', 'src/components/PatientDashboard.tsx', 'src/components/VerificationTerminal.tsx']) {
    const text = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /256-bit Encrypted|End-to-end encrypted messaging|End-to-End Encrypted\"|PDPA Encrypted/i, `${file} claims message encryption`);
  }
});
