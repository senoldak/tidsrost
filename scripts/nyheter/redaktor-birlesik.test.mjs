import test from 'node:test';
import assert from 'node:assert/strict';

// Katman 2.4 (Gemini kota planı): son onay ve redaksiyon tek çağrıda; kesin kontroller ve geri dönüşler korunur.
process.env.GEMINI_API_KEY = 'test';
process.env.GEMINI_ARALIK_MS = '0';
process.env.GEMINI_BEKLE_CARPAN = '0';
const { redigerSak } = await import('./redaktor.mjs');

const avsnitt = 'Regjeringen la fram forslaget onsdag og la vekt på at ordningen skal gjelde alle kommuner i landet fra neste år. ';
const body = avsnitt.repeat(20).trim();
const kilde = `${body}\n\nKilde.`;
const sak = { title: 'Regjeringen foreslår ny ordning for kommunene', description: 'Forslaget gjelder alle kommuner.', body };

async function kjor(svarFn) {
  const kall = [];
  const gercek = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const prompt = JSON.parse(init.body).contents[0].parts[0].text;
    kall.push(prompt);
    const svar = svarFn(kall.length, prompt);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(svar) }] } }], usageMetadata: {} }));
  };
  try {
    const r = await redigerSak(sak, kilde, {});
    return { r, kall };
  } finally {
    globalThis.fetch = gercek;
  }
}

test('godkjent sak: ett kall gir både dom og språkvasket tekst', async () => {
  const redigert = { ...sak, body: body.replace('la vekt på', 'understreket') };
  const { r, kall } = await kjor(() => ({ godkjent: true, problemer: [], redigert }));
  assert.equal(kall.length, 1);
  assert.match(r.sak.body, /understreket/);
  assert.equal(r.stopp.length, 0);
});

test('redigert tekst som bryter lengderegelen forkastes; godkjent råtekst beholdes uten ekstra kall', async () => {
  const { r, kall } = await kjor(() => ({ godkjent: true, problemer: [], redigert: { ...sak, body: 'For kort.' } }));
  assert.equal(kall.length, 1);
  assert.equal(r.sak.body, body);
});

test('redigert tekst med påfunnet tall forkastes', async () => {
  const { r, kall } = await kjor(() => ({ godkjent: true, problemer: [], redigert: { ...sak, body: `${body} Det gjelder 4 827 kommuner.` } }));
  assert.equal(kall.length, 1);
  assert.equal(r.sak.body, body);
});

test('avvist sak: rett, ny kontroll med vask; redigert tekst fra avvisningen brukes ikke', async () => {
  const { r, kall } = await kjor((n) => {
    if (n === 1) return { godkjent: false, problemer: ['Feil i fakta'], redigert: { ...sak, body: 'skal ikke brukes '.repeat(60) } };
    if (n === 2) return sak; // rett()
    return { godkjent: true, problemer: [], redigert: sak };
  });
  assert.equal(kall.length, 3);
  assert.equal(r.sak.body, body);
  assert.deepEqual(r.merknader, ['Feil i fakta']);
});
