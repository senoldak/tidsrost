import test from 'node:test';
import assert from 'node:assert/strict';

// 429 disiplini (Gemini kota planı): Google 429 cevabında hangi sınırın dolduğunu söyler. Günlük sınır (PerDay)
// dolduysa model bu süreçte bir daha denenmez; dakikalık sınırda bir dakika beklenip aynı model bir kez daha denenir.
// Yeni habere ancak iki Flash-Lite da dolunca başlanmaz (yönlendirici Faz 1).
process.env.GEMINI_API_KEY = 'test';
process.env.GEMINI_ARALIK_MS = '0';
process.env.GEMINI_BEKLE_CARPAN = '0';
for (const k of ['GEMINI_MODEL', 'GEMINI_YEDEK_MODEL', 'GEMINI_ZINCIR']) delete process.env[k];
const { gemini } = await import('./lib.mjs');
const { geminiPayiBitti } = await import('./butce.mjs');
const { istemciSifirla } = await import('./istemci.mjs');

const kota = (sinir) =>
  new Response(JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', details: [{ violations: [{ quotaId: `GenerateRequests${sinir}PerProjectPerModel-FreeTier` }] }] } }), { status: 429 });
const tamam = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }], usageMetadata: {} }));

async function ag(cevaplar, fn) {
  const modeller = [];
  const gercek = globalThis.fetch;
  globalThis.fetch = async (url) => {
    modeller.push(String(url).match(/models\/([^:]+):/)[1]);
    return (cevaplar.shift() ?? tamam)();
  };
  try {
    await fn();
  } finally {
    globalThis.fetch = gercek;
  }
  return modeller;
}
const cagir = () => gemini({ prompt: 'x', schema: { type: 'object' } });
istemciSifirla();

test('dakikalık 429 modeli kapatmaz: aynı model bir kez daha', async () => {
  assert.deepEqual(await ag([() => kota('PerMinute'), tamam], cagir), ['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite']);
  assert.deepEqual(await ag([tamam], cagir), ['gemini-3.5-flash-lite']);
  assert.equal(geminiPayiBitti(), false);
});

test('günlük 429 alan model bu süreçte bir daha denenmez; öbür Flash-Lite açıkken yeni habere devam', async () => {
  assert.deepEqual(await ag([() => kota('PerDay'), tamam], cagir), ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
  assert.deepEqual(await ag([tamam], cagir), ['gemini-3.1-flash-lite']);
  assert.equal(geminiPayiBitti(), false);
  await ag([() => kota('PerDay'), tamam], cagir);
  assert.equal(geminiPayiBitti(), true);
});

test('bütün modellerin günlük kotası doluysa hemen kota hatası', async () => {
  let hata;
  const modeller = await ag([() => kota('PerDay'), () => kota('PerDay')], () => cagir().catch((e) => (hata = e)));
  assert.deepEqual(modeller, ['gemini-3.6-flash', 'gemini-3-flash-preview']);
  assert.match(hata.message, /günlük kotası dolu/);
  assert.equal(hata.kota, true);
});
