import test from 'node:test';
import assert from 'node:assert/strict';

// Google 503/429 dönerse ana ve yedek model sırayla denenir; bir çağrı tümüyle düşerse sonrakiler kısa dener.
process.env.GEMINI_API_KEY = 'test';
process.env.GEMINI_ARALIK_MS = '0';
process.env.GEMINI_BEKLE_CARPAN = '0';
delete process.env.GEMINI_MODEL;
delete process.env.GEMINI_YEDEK_MODEL;
const { gemini } = await import('./lib.mjs');

const tamam = () =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }], usageMetadata: {} }));

function sahteAg(cevaplar) {
  const modeller = [];
  const gercek = globalThis.fetch;
  globalThis.fetch = async (url) => {
    modeller.push(String(url).match(/models\/([^:]+):/)[1]);
    const c = cevaplar.shift() ?? 503;
    return c === 200 ? tamam() : new Response('meşgul', { status: c });
  };
  return { modeller, geri: () => (globalThis.fetch = gercek) };
}

const cagir = () => gemini({ prompt: 'x', schema: { type: 'object' } });

test('ana model 503 dönerse yedek modelle yanıt alınır', async () => {
  const ag = sahteAg([503, 200]);
  try {
    assert.deepEqual(await cagir(), { ok: true });
    assert.deepEqual(ag.modeller, ['gemini-flash-lite-latest', 'gemini-flash-latest']);
  } finally {
    ag.geri();
  }
});

test('hep 503: 6 deneme iki model arasında döner; sonraki çağrı kısa dener, başarı sınırı sıfırlar', async () => {
  let ag = sahteAg([]);
  try {
    await assert.rejects(cagir(), /çok fazla deneme/);
    assert.equal(ag.modeller.length, 6);
    assert.deepEqual(new Set(ag.modeller), new Set(['gemini-flash-lite-latest', 'gemini-flash-latest']));
  } finally {
    ag.geri();
  }
  ag = sahteAg([]);
  try {
    await assert.rejects(cagir(), /çok fazla deneme/);
    assert.equal(ag.modeller.length, 2);
  } finally {
    ag.geri();
  }
  ag = sahteAg([200, ...Array(6).fill(503)]);
  try {
    assert.deepEqual(await cagir(), { ok: true });
    await assert.rejects(cagir(), /çok fazla deneme/);
    assert.equal(ag.modeller.length, 7);
  } finally {
    ag.geri();
  }
});
