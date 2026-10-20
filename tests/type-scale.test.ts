// One type scale for the whole app: Tailwind's steps plus text-2xs (10px) for pill badges, never a hand-set pixel size.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const files: string[] = [];
const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(tsx?|css)$/.test(e.name)) files.push(p); } };
walk('src');

test('no component sets its own pixel or rem font size (text-[Npx])', () => {
  const hits = files.filter(f => !f.endsWith('.css')).flatMap(f => (fs.readFileSync(f, 'utf8').match(/\btext-\[\d+(\.\d+)?(px|rem|em)\]/g) ?? []).map(m => `${f}: ${m}`));
  assert.deepEqual(hits, []);
});

test('nothing is smaller than 10px (text-2xs pill badges), and no step outside the scale is used (no text-5xl and up)', () => {
  const hits = files.filter(f => !f.endsWith('.css')).flatMap(f => (fs.readFileSync(f, 'utf8').match(/\btext-(5xl|6xl|7xl|8xl|9xl)\b/g) ?? []).map(m => `${f}: ${m}`));
  assert.deepEqual(hits, []);
  const css = fs.readFileSync('src/index.css', 'utf8');
  assert.match(css, /--text-2xs: 0\.625rem/);
  assert.match(css, /--text-xs: 0\.75rem/);
  const small = [...css.matchAll(/font-size:\s*(0?\.\d+)rem/g)].filter(m => parseFloat(m[1]) < 0.625).map(m => m[0]);
  assert.deepEqual(small, [], 'no CSS rule sets a font size under 10px');
});
