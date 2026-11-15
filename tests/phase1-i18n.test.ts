import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Every user-facing phrase in the Phase 1 screens must have a Bahasa Malaysia translation. English is the lookup key, so a missing key would show English. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHASE1_SCREENS = ['src/domains/verification/PublicCredentialLookup.tsx'];

const ms: Record<string, string> = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/locales/ms.json'), 'utf8'));

function phrases(file: string): string[] {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const found = new Set<string>();
  for (const m of src.matchAll(/tx\(\s*'((?:[^'\\]|\\.)*)'/g)) found.add(m[1].replace(/\\'/g, "'"));
  for (const m of src.matchAll(/label:\s*'((?:[^'\\]|\\.)*)'/g)) found.add(m[1].replace(/\\'/g, "'")); // labels passed to tx() later
  return [...found];
}

test('Phase 1 screens: every phrase has a Bahasa Malaysia translation', () => {
  for (const file of PHASE1_SCREENS) {
    const missing = phrases(file).filter(p => !ms[p]);
    assert.deepEqual(missing, [], `${file} is missing ms translations`);
  }
});

test('Phase 1 screens: translations keep the same placeholders as the English text', () => {
  for (const file of PHASE1_SCREENS) {
    for (const p of phrases(file)) {
      const ph = (s: string) => (s.match(/\{[a-zA-Z]+\}/g) ?? []).sort().join(',');
      if (ms[p]) assert.equal(ph(ms[p]), ph(p), `placeholder mismatch in "${p}"`);
    }
  }
});

test('the app ships English and Bahasa Malaysia, with room for more languages', () => {
  const cfg = fs.readFileSync(path.join(ROOT, 'src/locale/config.ts'), 'utf8');
  assert.match(cfg, /code: 'en'/);
  assert.match(cfg, /code: 'ms'/);
  assert.equal(fs.existsSync(path.join(ROOT, 'public/locales/ms.json')), true);
});
