import test from 'node:test';
import assert from 'node:assert/strict';

// redigerSak + faktaark: kaynağa yakın taslak redaksiyondan önce kaynaksız yeniden yazılır; temiz taslağa dokunulmaz.
process.env.GEMINI_API_KEY = 'test';
process.env.GEMINI_ARALIK_MS = '0';
process.env.GEMINI_BEKLE_CARPAN = '0';
const { redigerSak } = await import('./redaktor.mjs');

const kildeAvsnitt =
  'Statens vegvesen opplyser at 106 personer omkom i trafikkulykker i fjor, mot 87 året før. Økningen var størst blant motorsyklister, syklister og fotgjengere, ifølge den foreløpige statistikken. Vegdirektøren sier etaten vil se nærmere på hvorfor tallene gikk opp etter flere år med nedgang. ';
const kilde = kildeAvsnitt.repeat(10).trim();
const kopiBody = kildeAvsnitt.repeat(8).trim();
const egenAvsnitt = 'I fjor døde 106 mennesker på norske veier, mens tallet året før var 87. Mest økte det for dem som kjører motorsykkel, sykler eller går. Etaten skal nå finne ut hva som ligger bak oppgangen. ';
const egenBody = egenAvsnitt.repeat(8).trim();
const tittel = 'Flere omkom i trafikken i fjor enn året før';

async function kjor(utkastBody, env = {}) {
  const kall = [];
  const gercek = globalThis.fetch;
  const gamle = { ...process.env };
  Object.assign(process.env, env);
  globalThis.fetch = async (url, init) => {
    const p = JSON.parse(init.body).contents[0].parts[0].text;
    kall.push(p);
    let svar;
    if (p.includes('Lag et faktaark')) svar = { fakta: ['106 omkom i trafikkulykker i fjor', '87 omkom året før'], sitater: [] };
    else if (p.includes('Du har ikke kilden')) svar = { title: tittel, description: 'Trafikkdødsfallene økte i fjor.', body: egenBody };
    else svar = { godkjent: true, problemer: [], redigert: null };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(svar) }] } }], usageMetadata: {} }));
  };
  try {
    const r = await redigerSak({ title: tittel, description: 'Trafikkdødsfallene økte i fjor.', body: utkastBody }, kilde, { medier: true });
    return { r, kall };
  } finally {
    globalThis.fetch = gercek;
    for (const k of Object.keys(env)) if (k in gamle) process.env[k] = gamle[k]; else delete process.env[k];
  }
}

test('rediger: kopiert utkast skrives om fra faktaark før vaktsjefen', async () => {
  const { r, kall } = await kjor(kopiBody);
  assert.match(kall[0], /Lag et faktaark/);
  assert.match(kall[1], /Du har ikke kilden/);
  assert.equal(r.sak.body, egenBody);
  assert.equal(r.bekle, false);
});

test('rediger: FAKTAARK=0 slår av omskrivingen', async () => {
  const { kall } = await kjor(kopiBody, { FAKTAARK: '0' });
  assert.ok(kall.every((p) => !p.includes('Lag et faktaark')));
});

test('rediger: utkast med egne ord sendes rett til vaktsjefen', async () => {
  const { r, kall } = await kjor(egenBody);
  assert.ok(kall.every((p) => !p.includes('Lag et faktaark')));
  assert.equal(r.sak.body, egenBody);
});
