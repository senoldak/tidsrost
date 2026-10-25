// Kaynak: mecmua/site-ortak/gemini/modeller.test.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Gemini yönlendirici (Faz 1): model tablosu ve iş türüne göre zincir seçimi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODELLER, ZINCIRLER, KAPASITE, TAKMA_ADLAR, UZUN_ESIK, zincirSec } from './modeller.mjs';

test('zincirSec: yazım, denetim ve uzun istem', () => {
  assert.deepEqual(zincirSec({ denetim: false, uzunluk: 100, env: {} }), ZINCIRLER.yazim);
  assert.deepEqual(zincirSec({ denetim: true, uzunluk: 100, env: {} }), ZINCIRLER.denetim);
  // Uzunluk denetimden önce gelir: uzun istem Gemma'nın dakikalık token sınırına sığmaz.
  assert.deepEqual(zincirSec({ denetim: true, uzunluk: UZUN_ESIK + 1, env: {} }), ZINCIRLER.uzun);
  assert.deepEqual(zincirSec({ denetim: false, uzunluk: 60_000, env: {} }), ZINCIRLER.uzun);
});

test('zincirSec: GEMINI_MODEL zincirin ilk halkası olur', () => {
  assert.deepEqual(zincirSec({ denetim: false, uzunluk: 1, env: { GEMINI_MODEL: 'x' } }), ['x', ...ZINCIRLER.yazim]);
  assert.deepEqual(zincirSec({ denetim: false, uzunluk: 1, env: { GEMINI_MODEL: 'gemini-3.1-flash-lite' } }), [
    'gemini-3.1-flash-lite',
    ...ZINCIRLER.yazim.filter((m) => m !== 'gemini-3.1-flash-lite'),
  ]);
});

test('zincirSec: GEMINI_ZINCIR=0 eski düzen (ana model + tek yedek)', () => {
  const env = { GEMINI_ZINCIR: '0' };
  assert.deepEqual(zincirSec({ denetim: false, uzunluk: 1, env }), ['gemini-flash-lite-latest', 'gemini-flash-latest']);
  assert.deepEqual(zincirSec({ denetim: true, uzunluk: 1, env }), ['gemini-flash-lite-latest', 'gemma-4-26b-a4b-it']);
  assert.deepEqual(
    zincirSec({ denetim: false, uzunluk: 1, env: { ...env, GEMINI_MODEL: 'a', GEMINI_YEDEK_MODEL: 'b' } }),
    ['a', 'b'],
  );
  assert.deepEqual(zincirSec({ denetim: true, uzunluk: 1, env: { ...env, GEMINI_DENETIM_YEDEK_MODEL: 'c' } }), ['gemini-flash-lite-latest', 'c']);
});

test('tablo: zincirlerdeki ve kapasitedeki her model tanımlı; takma ad kapasite modeline gider', () => {
  for (const zincir of Object.values(ZINCIRLER)) for (const m of zincir) assert.ok(MODELLER[m], m);
  for (const m of KAPASITE) assert.ok(MODELLER[m], m);
  assert.deepEqual(KAPASITE, ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
  assert.equal(TAKMA_ADLAR['gemini-flash-lite-latest'], 'gemini-3.5-flash-lite');
  assert.equal(MODELLER['gemma-4-26b-a4b-it'].semasiz, true);
  assert.ok(!ZINCIRLER.uzun.includes('gemma-4-26b-a4b-it'));
});
