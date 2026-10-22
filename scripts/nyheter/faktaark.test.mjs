import test from 'node:test';
import assert from 'node:assert/strict';

// Faktaark: kaynağa yakın taslak, kaynak metni görülmeden olgu listesinden yeniden yazılır.
process.env.GEMINI_API_KEY = 'test';
process.env.GEMINI_ARALIK_MS = '0';
process.env.GEMINI_BEKLE_CARPAN = '0';
const { naerhet, kildefriOmskriving } = await import('./faktaark.mjs');

const kilde = [
  'Statens vegvesen opplyser at 106 personer omkom i trafikkulykker i fjor, mot 87 året før.',
  'Økningen var størst blant motorsyklister, syklister og fotgjengere, ifølge den foreløpige statistikken.',
  'Vegdirektøren sier etaten vil se nærmere på hvorfor tallene gikk opp etter flere år med nedgang.',
  'Antallet hardt skadde steg fra 578 til 645 i samme periode, og flest ulykker skjedde på landeveier.',
].join(' ');
const kopi = 'Statens vegvesen opplyser at 106 personer omkom i trafikkulykker i fjor, mot 87 året før. Økningen var størst blant motorsyklister, syklister og fotgjengere.';
const egen = 'I fjor døde 106 mennesker på norske veier, 19 flere enn året før. Det er motorsyklister, syklister og fotgjengere som står for mesteparten av økningen.';

test('naerhet: ordrett kopi utløser', () => {
  const n = naerhet(kopi, kilde);
  assert.equal(n.tetik, true);
  assert.ok(n.ardisik >= 9);
});

test('naerhet: egne setninger utløser ikke', () => {
  assert.equal(naerhet(egen, kilde).tetik, false);
});

test('naerhet: lange sitater regnes ikke med', () => {
  const sitat = `${egen} – «Vi vil se nærmere på hvorfor tallene gikk opp etter flere år med nedgang», sier vegdirektøren.`;
  assert.equal(naerhet(sitat, kilde).tetik, false);
});

test('naerhet: kort kilde måles ikke', () => {
  assert.deepEqual(naerhet(kopi, 'Kort kilde med få ord.'), { ardisik: 0, oran: 0, tetik: false });
});

const sak = { title: 'Flere omkom i trafikken i fjor', description: kopi, body: kopi, category: 'innenriks' };
const ark = { fakta: ['106 omkom i trafikkulykker i fjor (Statens vegvesen)', '87 omkom året før'], sitater: [] };

async function kjor(svarListe, opts = {}) {
  const kall = [];
  const gercek = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    kall.push(JSON.parse(init.body).contents[0].parts[0].text);
    const svar = svarListe[kall.length - 1];
    if (svar === undefined) return new Response(JSON.stringify({ candidates: [], usageMetadata: {} }));
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(svar) }] } }], usageMetadata: {} }));
  };
  try {
    return { r: await kildefriOmskriving(sak, kilde, { sjekk: () => [], ...opts }), kall };
  } finally {
    globalThis.fetch = gercek;
  }
}

test('kildefri: to kall; skriveledeteksten inneholder ikke kildeteksten', async () => {
  const { r, kall } = await kjor([ark, { title: 'Flere døde på veiene i fjor', description: egen, body: egen }]);
  assert.equal(kall.length, 2);
  assert.match(kall[0], /Vegdirektøren sier etaten/);
  assert.doesNotMatch(kall[1], /Vegdirektøren sier etaten/);
  assert.match(kall[1], /106 omkom i trafikkulykker i fjor/);
  assert.equal(r.sak.body, egen);
  assert.equal(r.sak.category, 'innenriks');
  assert.ok(r.oranFoer > r.oranEtter);
});

test('kildefri: Gemini uten svar gir null', async () => {
  const { r } = await kjor([]);
  assert.equal(r, null);
});

test('kildefri: ny tekst som fortsatt er kopi gir null', async () => {
  const { r } = await kjor([ark, { title: 'Flere døde', description: kopi, body: kopi }]);
  assert.equal(r, null);
});

test('kildefri: flere sikre feil enn før gir null', async () => {
  const { r } = await kjor([ark, { title: 'Flere døde på veiene i fjor', description: egen, body: egen }], { sjekk: (s) => (s.body === egen ? ['Tall finnes ikke i kilden'] : []) });
  assert.equal(r, null);
});
