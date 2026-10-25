import test from 'node:test';
import assert from 'node:assert/strict';

// Gemini yönlendirici (Faz 1): sitenin gemini() sarmalayıcısı ortak çekirdeğe (istemci.mjs) bu sitenin imzası ve
// ayarıyla gider. Çekirdeğin kendi ayrıntılı testi istemci.test.mjs'te.
process.env.GEMINI_API_KEY = 'test';
process.env.GEMINI_ARALIK_MS = '0';
process.env.GEMINI_BEKLE_CARPAN = '0';
for (const k of ['GEMINI_MODEL', 'GEMINI_YEDEK_MODEL', 'GEMINI_DENETIM_YEDEK_MODEL', 'GEMINI_ZINCIR']) delete process.env[k];
const { gemini } = await import('./lib.mjs');
const { istemciSifirla } = await import('./istemci.mjs');

const tamam = () =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }], usageMetadata: {} }));

function sahteAg(cevaplar) {
  const modeller = [];
  const govdeler = [];
  const gercek = globalThis.fetch;
  globalThis.fetch = async (url, sec) => {
    modeller.push(String(url).match(/models\/([^:]+):/)[1]);
    govdeler.push(JSON.parse(sec.body));
    const c = cevaplar.shift() ?? 503;
    return c === 200 ? tamam() : new Response('meşgul', { status: c });
  };
  return { modeller, govdeler, geri: () => (globalThis.fetch = gercek) };
}

const cagir = (ek = {}) => gemini({ prompt: 'x', schema: { type: 'object' }, ...ek });

test('503: zincirde sıradaki modele; sitenin sıcaklığı ve istemi gider', async () => {
  istemciSifirla();
  const ag = sahteAg([503, 200]);
  try {
    assert.deepEqual(await cagir(), { ok: true });
    assert.deepEqual(ag.modeller, ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
    assert.equal(ag.govdeler[1].generationConfig.temperature, 0.3);
    assert.equal(ag.govdeler[1].contents[0].parts[0].text, 'x');
  } finally {
    ag.geri();
  }
});

test('denetim zincirinin son halkası Gemma; yazımınki Flash', async () => {
  istemciSifirla();
  let ag = sahteAg([503, 503, 200]);
  try {
    await cagir({ denetim: true });
    assert.deepEqual(ag.modeller, ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemma-4-26b-a4b-it']);
  } finally {
    ag.geri();
  }
  istemciSifirla();
  ag = sahteAg([503, 503, 200]);
  try {
    await cagir();
    assert.deepEqual(ag.modeller, ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.6-flash']);
  } finally {
    ag.geri();
  }
});

test('400: ayar hatası bu sitede e.konfig ile işaretlenir, zincir denenmez', async () => {
  istemciSifirla();
  const ag = sahteAg([400]);
  try {
    await assert.rejects(cagir(), (e) => e.konfig === true);
    assert.equal(ag.modeller.length, 1);
  } finally {
    ag.geri();
  }
});

test('GEMINI_ZINCIR=0: eski düzen (ana model + tek yedek)', async () => {
  istemciSifirla();
  process.env.GEMINI_ZINCIR = '0';
  const ag = sahteAg([503, 200]);
  try {
    await cagir();
    assert.deepEqual(ag.modeller, ['gemini-flash-lite-latest', 'gemini-flash-latest']);
  } finally {
    ag.geri();
    delete process.env.GEMINI_ZINCIR;
  }
});
