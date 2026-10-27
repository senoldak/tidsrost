// Kaynak: mecmua/site-ortak/gemini/yerel-model.test.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Yerel model gölgesi (28 Ekim 2026).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { cevapCoz, sec, yerelOlcum, yerelSatiri, yerelSifirla, GOMME_ADRESI, SOHBET_ADRESI } from './yerel-model.mjs';

beforeEach(() => yerelSifirla());

const json = (j, status = 200) => ({ ok: status < 400, status, json: async () => j });
// Gömme: metnin ilk harfi konu (A/a yakın, B uzak). Sohbet: A'nın ilk harfi = B'nin ilk harfi (büyük/küçük ayrımsız) ise YES.
const sahteSunucu = (cagri = []) => async (url, { body }) => {
  const g = JSON.parse(body);
  cagri.push(url);
  if (url.startsWith(GOMME_ADRESI)) {
    const v = (m) => (m.slice(m.indexOf('query: ') + 7)[0].toLowerCase() === 'a' ? [1, 0.1] : [0, 1]);
    return json({ data: g.input.map((m, index) => ({ index, embedding: v(m) })) });
  }
  const s = g.messages[1].content;
  const [a, b] = [s.match(/A: (.)/)[1], s.match(/B: (.)/)[1]];
  return json({ choices: [{ message: { content: a.toLowerCase() === b.toLowerCase() ? 'YES' : 'NO' } }] });
};
const env = { YEREL_GOLGE: '1' };
const cift = (a, b, karar, ek = {}) => ({ tur: 'uye', karar, a, b, bg: 0.81234, dil: 'tr', id: `id-${a}`, ...ek });

test('cevapCoz: son evet/hayır sözcüğü, dillerden bağımsız', () => {
  assert.equal(cevapCoz('YES'), true);
  assert.equal(cevapCoz('no.'), false);
  assert.equal(cevapCoz('Nei'), false);
  assert.equal(cevapCoz('thinking: maybe yes... final: NO'), false);
  assert.equal(cevapCoz('belki'), null);
  assert.equal(cevapCoz(undefined), null);
});

test('sec: aynılara en az yarı yer, toplam azami', () => {
  const ayni = Array.from({ length: 20 }, (_, i) => cift(`a${i}`, 'x', 'ayni'));
  const farkli = Array.from({ length: 20 }, (_, i) => cift(`f${i}`, 'x', 'farkli'));
  const r = sec([...ayni, ...farkli], 30);
  assert.equal(r.length, 30);
  assert.equal(r.filter((c) => c.karar === 'ayni').length, 15);
  assert.equal(sec([...ayni.slice(0, 3), ...farkli], 30).filter((c) => c.karar === 'ayni').length, 3);
  assert.equal(sec([...ayni, ...farkli.slice(0, 2)], 30).filter((c) => c.karar === 'farkli').length, 2);
});

test('yerelSatiri: metin yok, kimlik kısaltılmış, sayılar yuvarlanmış', () => {
  const s = yerelSatiri({ tur: 'uye', karar: 'ayni', bg: 0.81234, yb: 0.7777, gemma: 'ayni', ms: 812, dil: 'no', id: 'Gizlimedya başlığı' });
  const j = JSON.parse(s.slice('yerel-ölçüm '.length));
  assert.deepEqual(Object.keys(j), ['tur', 'karar', 'bg', 'yb', 'gemma', 'ms', 'dil', 'id']);
  assert.equal(j.bg, 0.81);
  assert.equal(j.yb, 0.78);
  assert.equal(j.id.length, 8);
  assert.doesNotMatch(s, /Gizlimedya/);
});

test('yerelOlcum: kapalıyken hiçbir istek yok', async () => {
  const cagri = [];
  assert.equal(await yerelOlcum([cift('A1', 'a2', 'ayni')], { env: {}, fetchFn: sahteSunucu(cagri), log: () => {} }), null);
  assert.equal(cagri.length, 0);
});

test('yerelOlcum: her çifte satır, uyum sayılır, metin loga girmez', async () => {
  const satirlar = [];
  const ciftler = [cift('A gizli', 'a gizli', 'ayni'), cift('A gizli', 'B gizli', 'farkli'), cift('A gizli', 'B gizli', 'ayni')];
  const ozet = await yerelOlcum(ciftler, { env, fetchFn: sahteSunucu(), log: (s) => satirlar.push(s) });
  assert.deepEqual({ n: ozet.n, uyum: ozet.uyum, yanitsiz: ozet.yanitsiz }, { n: 3, uyum: 2, yanitsiz: 0 });
  const olcum = satirlar.filter((s) => s.startsWith('yerel-ölçüm ')).map((s) => JSON.parse(s.slice(12)));
  assert.equal(olcum.length, 3);
  assert.equal(olcum[0].gemma, 'ayni');
  assert.ok(olcum[0].yb > 0.9);
  assert.ok(olcum[1].yb < 0.2);
  assert.ok(satirlar.some((s) => s.startsWith('yerel-özet ')));
  for (const s of satirlar) assert.doesNotMatch(s, /gizli/);
});

test('yerelOlcum: sunucu yoksa tek satır, süreçte kapanır', async () => {
  const satirlar = [];
  let n = 0;
  const yok = async () => {
    n++;
    throw new TypeError('fetch failed');
  };
  assert.equal(await yerelOlcum([cift('A', 'a', 'ayni')], { env, fetchFn: yok, log: (s) => satirlar.push(s) }), null);
  assert.equal(await yerelOlcum([cift('A', 'a', 'ayni')], { env, fetchFn: yok, log: (s) => satirlar.push(s) }), null);
  assert.equal(n, 1);
  assert.equal(satirlar.length, 1);
  assert.match(satirlar[0], /gölge bu süreçte kapalı/);
});

test('yerelOlcum: sohbet üç kez üst üste düşerse bırakır', async () => {
  const satirlar = [];
  const gomme = sahteSunucu();
  const fetchFn = async (url, o) => (url.startsWith(SOHBET_ADRESI) ? json({}, 503) : gomme(url, o));
  const ciftler = Array.from({ length: 6 }, (_, i) => cift(`A${i}`, 'a', 'ayni'));
  const ozet = await yerelOlcum(ciftler, { env, fetchFn, log: (s) => satirlar.push(s) });
  assert.equal(ozet.n, 2);
  assert.equal(ozet.yanitsiz, 2);
  assert.ok(satirlar.some((s) => /gölge bu süreçte kapalı/.test(s)));
});

test('yerelOlcum: süre bütçesi aşılınca kalan çiftler atlanır', async () => {
  let t = 0;
  const saat = () => (t += 100_000);
  const ciftler = Array.from({ length: 5 }, (_, i) => cift(`A${i}`, 'a', 'ayni'));
  const ozet = await yerelOlcum(ciftler, { env, fetchFn: sahteSunucu(), log: () => {}, saat });
  assert.ok(ozet.atlanan > 0);
  assert.equal(ozet.n + ozet.atlanan, 5);
});
