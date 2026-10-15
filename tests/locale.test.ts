import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DICTS, translate } from '../src/locale/i18n';
import { getLocale, setLocale } from '../src/locale/store';
import { LANGUAGES, REGIONS, DEFAULT_REGION } from '../src/locale/config';

test('locale: Malaysia is the default region, in English', () => {
  assert.equal(DEFAULT_REGION, 'MY');
  assert.equal(getLocale().region, 'MY');
  assert.equal(getLocale().lang, 'en');
});

test('locale: switching language updates the store', () => {
  const seen: string[] = [];
  setLocale({ lang: 'ms' });
  seen.push(getLocale().lang);
  setLocale({ lang: 'zh' });
  seen.push(getLocale().lang);
  setLocale({ lang: 'en' });
  seen.push(getLocale().lang);
  assert.deepEqual(seen, ['ms', 'zh', 'en']);
});

test('locale: switching region keeps the language and vice versa', () => {
  setLocale({ region: 'INTL', lang: 'zh' });
  assert.deepEqual(getLocale(), { region: 'INTL', lang: 'zh' });
  setLocale({ region: 'MY' });
  assert.deepEqual(getLocale(), { region: 'MY', lang: 'zh' });
  setLocale({ lang: 'en' });
});

test('locale: every region has a currency, time zone and a language we ship', () => {
  for (const r of Object.values(REGIONS)) {
    assert.ok(r.currency && r.timeZone);
    assert.ok(LANGUAGES.some(l => l.code === r.defaultLang));
  }
  assert.equal(REGIONS.MY.timeZone, 'Asia/Kuala_Lumpur');
});

test('translate: returns the text in the chosen language', () => {
  assert.equal(translate('en', 'nav.verify'), 'Verify a Licence');
  assert.equal(translate('ms', 'nav.verify'), 'Semak Lesen');
  assert.equal(translate('zh', 'nav.verify'), '核实执业证书');
});

test('translate: a language we have no text for falls back to English, then to the key', () => {
  assert.equal(translate('ar', 'nav.verify'), 'Verify a Licence');
  assert.equal(translate('id', 'nav.verify'), 'Verify a Licence');
  assert.equal(translate('ms', 'no.such.key'), 'no.such.key');
});

test('translate: Malay and Chinese cover every English key', () => {
  const keys = Object.keys(DICTS.en!);
  for (const lang of ['ms', 'zh'] as const) {
    const missing = keys.filter(k => !DICTS[lang]?.[k]);
    assert.deepEqual(missing, [], `${lang} is missing: ${missing.join(', ')}`);
  }
});

test('translate: no language has keys English lacks (typos)', () => {
  const en = new Set(Object.keys(DICTS.en!));
  for (const lang of ['ms', 'zh'] as const) {
    const extra = Object.keys(DICTS[lang]!).filter(k => !en.has(k));
    assert.deepEqual(extra, [], `${lang} has unknown keys: ${extra.join(', ')}`);
  }
});

test('locale: right-to-left is flagged for Arabic only', () => {
  assert.deepEqual(LANGUAGES.filter(l => l.rtl).map(l => l.code), ['ar']);
});
