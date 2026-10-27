// Kaynak: mecmua/site-ortak/gemini/gomme.test.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Gömme çekirdeği (Faz 2, 27 Ekim 2026).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

process.env.GEMINI_API_KEY = 'test';
const g = await import('./gomme.mjs');
const { ayrintiSifirla, gommeEkle, modelHarcamasi } = await import('./kullanim.mjs');

const birim = (i, n = g.BOYUT) => Array.from({ length: n }, (_, k) => (k === i ? 1 : 0));
// Metnin ilk harfinden tekrarlanabilir bir vektör: aynı harfle başlayan metinler aynı vektörü alır.
const vektorOf = (metin) => birim(metin.charCodeAt(0) % g.BOYUT);

function ag(cevap = (govde) => ({ embeddings: govde.requests.map((r) => ({ values: vektorOf(r.content.parts[0].text) })) })) {
  const istekler = [];
  const fetchFn = async (url, sec) => {
    const govde = JSON.parse(sec.body);
    istekler.push({ url: String(url), govde });
    const c = cevap(govde);
    if (typeof c === 'number') return new Response('x', { status: c });
    if (c instanceof Error) throw c;
    return new Response(JSON.stringify(c));
  };
  return { istekler, fetchFn };
}

beforeEach(() => ayrintiSifirla());

test('kodla/coz/benzerlik: aynı vektör ~1, dik vektörler ~0', () => {
  const a = g.coz(g.kodla([0.3, 0.5, -0.2, 0.1]));
  assert.ok(g.benzerlik(a, a) >= 0.999);
  assert.ok(Math.abs(g.benzerlik(g.coz(g.kodla(birim(0))), g.coz(g.kodla(birim(1))))) < 0.02);
  assert.equal(g.coz(g.kodla(birim(3))).length, g.BOYUT);
});

test('vektorle: 150 metin 100+50 iki çağrı, 256 boyut; ikinci turda önbellekten (istek yok)', async () => {
  const onbellek = g.onbellekYukle(null);
  const metinler = Array.from({ length: 150 }, (_, i) => `m${i}`);
  const a = ag();
  const v = await g.vektorle(metinler, { onbellek, amac: 't', fetchFn: a.fetchFn });
  assert.equal(v.length, 150);
  assert.ok(v.every((x) => x instanceof Int8Array));
  assert.equal(a.istekler.length, 2);
  assert.deepEqual(a.istekler.map((i) => i.govde.requests.length), [100, 50]);
  assert.equal(a.istekler[0].govde.requests[0].outputDimensionality, 256);
  assert.match(a.istekler[0].url, /gemini-embedding-2:batchEmbedContents/);
  assert.equal(modelHarcamasi(g.GOMME_MODELI), 150);
  const b = ag();
  const v2 = await g.vektorle(metinler, { onbellek, amac: 't', fetchFn: b.fetchFn });
  assert.equal(b.istekler.length, 0);
  assert.deepEqual([...v2[7]], [...v[7]]);
});

test('vektorle: 429, 503, ağ hatası ve eksik gövde null döner', async () => {
  for (const c of [429, 503, new TypeError('ağ'), {}]) {
    const a = ag(() => c);
    assert.equal(await g.vektorle(['x'], { onbellek: g.onbellekYukle(null), amac: 't', fetchFn: a.fetchFn }), null);
  }
  assert.equal(modelHarcamasi(g.GOMME_MODELI), 2); // 429 ve 503 sayılır, ağ hatası Google'a ulaşmadı
});

test('vektorle: günlük 900 sınırı; kalanlar null, tek çağrı', async () => {
  gommeEkle(890, 'once');
  const a = ag();
  const metinler = Array.from({ length: 20 }, (_, i) => `s${i}`);
  const v = await g.vektorle(metinler, { onbellek: g.onbellekYukle(null), amac: 't', fetchFn: a.fetchFn });
  assert.equal(a.istekler.length, 1);
  assert.equal(v.filter(Boolean).length, 10);
  assert.ok(v.slice(10).every((x) => x === null));
});

test('vektorle: anahtar yoksa null, istek yok', async () => {
  const k = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const a = ag();
  assert.equal(await g.vektorle(['x'], { onbellek: g.onbellekYukle(null), amac: 't', fetchFn: a.fetchFn }), null);
  process.env.GEMINI_API_KEY = k;
  assert.equal(a.istekler.length, 0);
});

test('ciftleriSuz: vektörsüz çift kalır, eşik altı elenir', () => {
  const yakin = g.coz(g.kodla([1, 0.9, 0]));
  const x = g.coz(g.kodla([1, 0, 0]));
  const uzak = g.coz(g.kodla([0, 0, 1]));
  const vek = new Map([['A', x], ['B', yakin], ['C', uzak], ['D', null]]);
  const r = g.ciftleriSuz([{ a: 'A', b: 'B' }, { a: 'A', b: 'C' }, { a: 'A', b: 'D' }, { a: 'A', b: 'Z' }], vek, 0.55);
  assert.deepEqual(r.kalan, [0, 2, 3]);
  assert.deepEqual(r.elenen, [1]);
  assert.ok(r.benzerlikler[0] > 0.7);
  assert.equal(r.benzerlikler[2], null);
});

test('bilesenler ve komsusuzlar', () => {
  const v = [[1, 0.95, 0], [1, 1, 0], [0, 0, 1], [0, 1, -1]].map((x) => g.coz(g.kodla(x)));
  assert.deepEqual(g.bilesenler(v, 0.8), [[0, 1], [2], [3]]);
  assert.deepEqual([...g.komsusuzlar(v, [], 0.8)].sort(), [2, 3]);
  assert.deepEqual([...g.komsusuzlar([...v, null], [g.coz(g.kodla([0, 0, 1]))], 0.8)], [3]);
});

test('gommeKipi ve esikler', () => {
  assert.equal(g.gommeKipi({}), 'kapali');
  assert.equal(g.gommeKipi({ GOMME_ON_ELEME: 'golge' }), 'golge');
  assert.equal(g.gommeKipi({ GOMME_ON_ELEME: '1', GOMME_ALT_ESIK: '0.5' }), 'acik');
  assert.equal(g.gommeKipi({ GOMME_ON_ELEME: '1' }), 'golge'); // eşiksiz açılmaz
  assert.equal(g.gommeKipi({ GOMME_ON_ELEME: '1', GOMME_ALT_ESIK: 'abc' }), 'golge');
  assert.deepEqual(g.esikler({ GOMME_ALT_ESIK: '0.52', GOMME_UST_ESIK: '' }), { alt: 0.52, ust: null });
});

test('olcumSatiri: yalnız izinli alanlar, kimlik 8 karakter, metin yok', () => {
  const s = g.olcumSatiri({ tur: 'grup', karar: 'ayni', b: 0.81234, dil: 'tr-en', id: 'haber:çok-uzun-bir-slug', baslik: 'Gizli başlık' });
  assert.match(s, /^gömme-ölçüm \{/);
  const j = JSON.parse(s.slice('gömme-ölçüm '.length));
  assert.deepEqual(Object.keys(j).sort(), ['b', 'dil', 'id', 'karar', 'tur']);
  assert.equal(j.b, 0.81);
  assert.equal(j.id.length, 8);
  assert.doesNotMatch(s, /Gizli/);
});

test('önbellek: kaydet/yükle, 3 günden eski kayıt atılır, bozuk dosya boş', async () => {
  const dizin = mkdtempSync(path.join(tmpdir(), 'gomme-'));
  const dosya = path.join(dizin, 'o.json');
  const simdi = new Date('2026-10-27T12:00:00Z');
  const o = g.onbellekYukle(dosya);
  await g.vektorle(['eski', 'yeni'], { onbellek: o, amac: 't', fetchFn: ag().fetchFn, simdi: new Date('2026-10-23T12:00:00Z') });
  o.kayitlar[g.metinAnahtari('yeni')].z = simdi.toISOString();
  g.onbellekKaydet(o, dosya, simdi);
  const j = JSON.parse(readFileSync(dosya, 'utf8'));
  assert.deepEqual(Object.keys(j.kayitlar), [g.metinAnahtari('yeni')]);
  writeFileSync(dosya, '{bozuk');
  assert.deepEqual(g.onbellekYukle(dosya).kayitlar, {});
});
