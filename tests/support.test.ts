import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SUPPORT_HOURS, MACROS, MACRO_LANGS, describeHours, fillMacro, firstName, parseSupportHours, supportStatus } from '../src/supportMy';

// Malaysia time is UTC+8. Monday 12 Oct 2026 10:00 MYT = 02:00 UTC.
const myt = (iso: string) => new Date(iso + '+08:00');

test('hours: open during the working day in Malaysia time, whatever the server clock', () => {
  const s = supportStatus(DEFAULT_SUPPORT_HOURS, myt('2026-10-12T10:00:00'));
  assert.equal(s.open, true);
  assert.equal(s.nextChange, myt('2026-10-12T18:00:00').toISOString());
});

test('hours: closed before opening and after closing, with the next opening time', () => {
  const early = supportStatus(DEFAULT_SUPPORT_HOURS, myt('2026-10-12T08:30:00'));
  assert.equal(early.open, false);
  assert.equal(early.nextChange, myt('2026-10-12T09:00:00').toISOString());
  const late = supportStatus(DEFAULT_SUPPORT_HOURS, myt('2026-10-12T18:00:00'));
  assert.equal(late.open, false);
  assert.equal(late.nextChange, myt('2026-10-13T09:00:00').toISOString());
});

test('hours: Friday evening reopens on Monday', () => {
  const s = supportStatus(DEFAULT_SUPPORT_HOURS, myt('2026-10-16T19:00:00'));
  assert.equal(s.open, false);
  assert.equal(s.nextChange, myt('2026-10-19T09:00:00').toISOString());
});

test('hours: a UTC evening that is already tomorrow in Malaysia counts as tomorrow', () => {
  // Sunday 11 Oct 2026 17:00 UTC = Monday 12 Oct 01:00 MYT, still before opening
  const s = supportStatus(DEFAULT_SUPPORT_HOURS, new Date('2026-10-11T17:00:00Z'));
  assert.equal(s.open, false);
  assert.equal(s.nextChange, myt('2026-10-12T09:00:00').toISOString());
});

test('hours: SUPPORT_HOURS is parsed, and bad values fall back to the default', () => {
  assert.deepEqual(parseSupportHours('1-6 08:30-20:00'), { days: [1, 2, 3, 4, 5, 6], open: '08:30', close: '20:00' });
  assert.deepEqual(parseSupportHours('0,6 10:00-14:00'), { days: [0, 6], open: '10:00', close: '14:00' });
  assert.deepEqual(parseSupportHours('5-1 09:00-17:00').days, [5, 6, 0, 1]);
  for (const bad of ['', undefined, 'always', '1-5 18:00-09:00', '1-5 09:00-09:00', '1-5 09:99-18:00', '1-9 09:00-18:00']) {
    assert.deepEqual(parseSupportHours(bad as any), DEFAULT_SUPPORT_HOURS, String(bad));
  }
});

test('hours: described in each language with the time zone', () => {
  assert.equal(describeHours(DEFAULT_SUPPORT_HOURS, 'en'), 'Mon-Fri 09:00-18:00 Malaysia time');
  assert.match(describeHours(DEFAULT_SUPPORT_HOURS, 'ms'), /waktu Malaysia$/);
  assert.match(describeHours(DEFAULT_SUPPORT_HOURS, 'zh'), /马来西亚时间$/);
  assert.equal(describeHours({ days: [0, 6], open: '10:00', close: '14:00' }, 'en'), 'Sun, Sat 10:00-14:00 Malaysia time');
});

test('macros: every macro has English, Malay and Chinese text', () => {
  for (const m of MACROS) {
    for (const l of MACRO_LANGS) assert.ok(m.text[l.code]?.length > 20, `${m.id} / ${l.code}`);
  }
  assert.equal(new Set(MACROS.map(m => m.id)).size, MACROS.length, 'macro ids are unique');
});

test('macros: every placeholder is one we fill', () => {
  for (const m of MACROS) for (const l of MACRO_LANGS) {
    const left = fillMacro(m, l.code, { name: 'Aisyah Rahman' }).match(/\{[^}]*\}/g);
    assert.equal(left, null, `${m.id} / ${l.code} leaves ${left}`);
  }
});

test('macros: the greeting uses the first name; without one it still reads well', () => {
  const m = MACROS.find(x => x.id === 'received')!;
  assert.match(fillMacro(m, 'en', { name: 'Aisyah Rahman' }), /^Hello Aisyah,/);
  assert.match(fillMacro(m, 'ms', { name: 'Aisyah Rahman' }), /^Helo Aisyah,/);
  assert.match(fillMacro(m, 'zh', { name: 'Aisyah Rahman' }), /^Aisyah，您好/);
  assert.match(fillMacro(m, 'en', { name: '' }), /^Hello, thank you/);
  assert.match(fillMacro(m, 'zh', { name: null }), /^您好/);
  assert.equal(firstName('  Tan   Wei '), 'Tan');
});

test('macros: the hours are filled in for the chosen language', () => {
  const m = MACROS.find(x => x.id === 'out-of-hours')!;
  assert.match(fillMacro(m, 'en', { name: 'A' }), /Mon-Fri 09:00-18:00 Malaysia time/);
  assert.match(fillMacro(m, 'zh', { name: 'A' }), /周一-周五 09:00-18:00 马来西亚时间/);
});

test('macros: safety messages give the Malaysian emergency number in every language', () => {
  for (const id of ['received', 'first-visit', 'out-of-hours']) {
    for (const l of MACRO_LANGS) assert.match(MACROS.find(m => m.id === id)!.text[l.code], /999/, `${id} / ${l.code}`);
  }
});

test('macros: the medical certificate reply says it needs an in-person visit', () => {
  const m = MACROS.find(x => x.id === 'mc-teleconsult')!;
  assert.match(m.text.en, /in person/);
  assert.match(m.text.ms, /bersemuka/);
  assert.match(m.text.zh, /亲自/);
});
