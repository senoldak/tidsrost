import test from 'node:test';
import assert from 'node:assert/strict';

// Kaynak benzerliği yeniden yazımı (omskrivNærKilde): tek Gemini çağrısı; kesin kontrolde kötüleşen metin kullanılmaz.
process.env.GEMINI_API_KEY = 'test';
process.env.GEMINI_ARALIK_MS = '0';
process.env.GEMINI_BEKLE_CARPAN = '0';
const { omskrivNærKilde } = await import('./redaktor.mjs');

const avsnitt = 'Regjeringen la fram forslaget onsdag og la vekt på at ordningen skal gjelde alle kommuner i landet fra neste år. ';
const body = avsnitt.repeat(20).trim();
const kilde = `${body}\n\nKilde.`;
const sak = { title: 'Regjeringen foreslår ny ordning for kommunene', description: 'Forslaget gjelder alle kommuner.', body };
const egen = 'Alle kommuner i landet skal omfattes av ordningen regjeringen foreslo onsdag, og den gjelder fra neste år. '.repeat(20).trim();

async function kjor(svar) {
  const kall = [];
  const gercek = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    kall.push(JSON.parse(init.body).contents[0].parts[0].text);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(svar) }] } }], usageMetadata: {} }));
  };
  try {
    return { r: await omskrivNærKilde(sak, kilde, ['la vekt på at ordningen skal gjelde alle kommuner']), kall };
  } finally {
    globalThis.fetch = gercek;
  }
}

test('omskriving: ny tekst brukes; utdraget og regelen står i ledeteksten', async () => {
  const { r, kall } = await kjor({ title: 'Ny ordning for alle kommuner', description: 'Forslaget gjelder alle kommuner.', body: egen });
  assert.equal(kall.length, 1);
  assert.match(kall[0], /«la vekt på at ordningen skal gjelde alle kommuner»/);
  assert.match(kall[0], /mer enn 8 ord/);
  assert.equal(r.body, egen);
});

test('omskriving: tall som ikke står i kilden gjør at null returneres', async () => {
  const { r } = await kjor({ title: 'Ny ordning for alle kommuner', description: 'Forslaget gjelder 356 kommuner.', body: egen });
  assert.equal(r, null);
});
