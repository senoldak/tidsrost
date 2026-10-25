import test from 'node:test';
import assert from 'node:assert/strict';

// Gölge denetim: ana karar yayına girer; Gemma'nın kararı yalnız sayılır. Hak ve aralık dolunca Gemma'ya gidilmez.
process.env.GEMINI_API_KEY = 'test';
process.env.GEMINI_ARALIK_MS = '0';
process.env.GEMINI_BEKLE_CARPAN = '0';
delete process.env.GEMINI_MODEL;
delete process.env.GEMINI_DENETIM_YEDEK_MODEL;
const { gemini, DENETIM_YEDEK_MODEL } = await import('./lib.mjs');
const { golgeKur } = await import('./golge.mjs');
const { istemciSifirla } = await import('./istemci.mjs');
istemciSifirla();

function sahteAg(cevap) {
  const modeller = [];
  const gercek = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const m = String(url).match(/models\/([^:]+):/)[1];
    modeller.push(m);
    const c = cevap(m);
    if (typeof c === 'number') return new Response('x', { status: c });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(c) }] } }], usageMetadata: {} }));
  };
  return { modeller, geri: () => (globalThis.fetch = gercek) };
}

const denetle = () => gemini({ prompt: 'x', schema: { type: 'object' }, denetim: true });

test('gölge: denetim kararı Gemma\'ya da sorulur, ana karar döner, ayrılık sayılır', async () => {
  const sayac = golgeKur(1);
  const ag = sahteAg((m) => (m === DENETIM_YEDEK_MODEL ? { onay: false } : { onay: true }));
  try {
    assert.deepEqual(await denetle(), { onay: true });
    assert.deepEqual(ag.modeller, ['gemini-3.5-flash-lite', DENETIM_YEDEK_MODEL]);
    assert.deepEqual(sayac, { karar: 1, ayni: 0, anaEvet: 1, anaHayir: 0 });
    // hak bitti: ikinci denetim Gemma'ya gitmez
    assert.deepEqual(await denetle(), { onay: true });
    assert.equal(ag.modeller.length, 3);
  } finally {
    ag.geri();
  }
});

test('gölge: hak yoksa ya da çağrı denetim değilse Gemma\'ya gidilmez; Gemma 429 dönerse ana karar etkilenmez', async () => {
  golgeKur(0);
  let ag = sahteAg(() => ({ onay: true }));
  try {
    await denetle();
    await gemini({ prompt: 'x', schema: { type: 'object' } });
    assert.deepEqual(ag.modeller, ['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite']);
  } finally {
    ag.geri();
  }
  const sayac = golgeKur(1);
  ag = sahteAg((m) => (m === DENETIM_YEDEK_MODEL ? 429 : { onay: true }));
  try {
    assert.deepEqual(await denetle(), { onay: true });
    assert.deepEqual(ag.modeller, ['gemini-3.5-flash-lite', DENETIM_YEDEK_MODEL]); // tek deneme
    assert.equal(sayac.karar, 0);
  } finally {
    ag.geri();
  }
});
