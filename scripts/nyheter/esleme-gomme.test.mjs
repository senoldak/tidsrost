// Kaynak: mecmua/site-ortak/gemini/esleme-gomme.test.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// jendume/kifobu eşlemesinde gömme ölçümü ve ön eleme (Faz 2, 27 Ekim 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gommeliEsle, ekCiftler } from './esleme-gomme.mjs';
import { coz, kodla } from './gomme.mjs';

// Metin → vektör: aynı "konu" harfiyle başlayan metinler yakın, farklı harfler uzak.
const v = (...x) => coz(kodla(x));
const KONU = { A: v(1, 0, 0), a: v(1, 0.1, 0), B: v(0, 1, 0), b: v(0.1, 1, 0), C: v(0, 0, 1) };
const vektorle = async (metinler) => metinler.map((m) => KONU[m[0]] ?? null);

const uye = (id, baslik) => ({ id, baslik, adlar: new Set() });
// İki grup: g0 = [A1, a2] (yakın), g1 = [B1]; yazılmış: b-haber (B'ye yakın), C-haber (uzak).
const kur = () => {
  const gruplar = [{ uyeler: [uye('A1', 'A1 başlık'), uye('a2', 'a2 başlık')] }, { uyeler: [uye('B1', 'B1 başlık')] }];
  const yazilmis = [{ id: 'haber:b', metin: 'b yazılmış', adlar: new Set() }, { id: 'haber:c', metin: 'C yazılmış', adlar: new Set() }];
  // Ad örtüşmesiyle kurulmuş çiftler: üye çifti (yakın) ve A1↔C (uzak, yazili).
  const ciftler = [
    { tur: 'yazili', g: gruplar[0], h: yazilmis[1], n: 1, a: 'A1 başlık', b: 'C yazılmış', idA: 'A1', idB: 'haber:c' },
    { tur: 'uye', g: gruplar[0], u: gruplar[0].uyeler[1], n: 0, a: 'A1 başlık', b: 'a2 başlık', idA: 'A1', idB: 'a2' },
  ];
  return { gruplar, yazilmis, ciftler };
};

function yakala() {
  const satirlar = [];
  return { satirlar, log: (s) => satirlar.push(s) };
}

test('ekCiftler: ad örtüşmesi olmayan yakın çiftler, mevcut ve ayrık olanlar hariç, azami', async () => {
  const { gruplar, yazilmis, ciftler } = kur();
  const metinler = ['A1 başlık', 'B1 başlık', 'b yazılmış', 'C yazılmış'];
  const vek = new Map((await vektorle(metinler)).map((x, i) => [metinler[i], x]));
  const ek = ekCiftler(gruplar, yazilmis, vek, 0.7, ciftler, () => false);
  assert.deepEqual(ek.map((c) => [c.tur, c.idA, c.idB]), [['yazili', 'B1', 'haber:b']]);
  assert.equal(ekCiftler(gruplar, yazilmis, vek, 0.7, ciftler, (x, y) => x === 'B1' && y === 'haber:b').length, 0);
  assert.equal(ekCiftler(gruplar, yazilmis, vek, 0.7, ciftler, () => false, 0).length, 0);
});

test('kapalı: bugünkü yol, gömme çağrılmaz', async () => {
  const { gruplar, yazilmis, ciftler } = kur();
  let vekCagri = 0;
  const r = await gommeliEsle({ ciftler, gruplar, yazilmis, ayrikMi: () => false, esle: async (c) => new Set([1]), sor: async () => new Set(), env: {}, vektorle: async () => (vekCagri++, null) });
  assert.equal(vekCagri, 0);
  assert.equal(r.ciftler, ciftler);
  assert.deepEqual([...r.ayni], [1]);
});

test('gölge: ek çift kararları uygulanmaz, ayrı sorulur; ölçüm satırı metin içermez', async () => {
  const { gruplar, yazilmis, ciftler } = kur();
  const sorulan = [];
  const { satirlar, log } = yakala();
  const r = await gommeliEsle({
    ciftler, gruplar, yazilmis, ayrikMi: () => false,
    esle: async (c) => (sorulan.push(['esle', c.length]), new Set([1])),
    sor: async (c) => (sorulan.push(['sor', c.length]), new Set([0])),
    env: { GOMME_ON_ELEME: 'golge' }, vektorle, log, dil: () => 'tr-en',
  });
  assert.equal(r.ciftler, ciftler); // uygulanacak liste bugünkü
  assert.deepEqual([...r.ayni], [1]);
  assert.deepEqual(sorulan, [['esle', 2], ['sor', 1]]);
  const olcum = satirlar.filter((s) => s.startsWith('gömme-ölçüm '));
  assert.equal(olcum.length, 3);
  const j = olcum.map((s) => JSON.parse(s.slice(12)));
  assert.deepEqual(j.map((x) => [x.tur, x.karar]), [['yazili', 'farkli'], ['uye', 'ayni'], ['ek', 'ayni']]);
  assert.equal(j[0].dil, 'tr-en');
  for (const s of olcum) assert.doesNotMatch(s, /başlık|yazılmış/);
});

test('gölge: ölçülen çiftler metinleriyle yerel gölgeye gider; yerel düşerse eşleme etkilenmez', async () => {
  const { gruplar, yazilmis, ciftler } = kur();
  let giden = null;
  const r = await gommeliEsle({
    ciftler, gruplar, yazilmis, ayrikMi: () => false,
    esle: async () => new Set([1]),
    sor: async () => new Set([0]),
    env: { GOMME_ON_ELEME: 'golge' }, vektorle, log: () => {},
    yerel: async (c) => {
      giden = c;
      throw new Error('sunucu yok');
    },
  });
  assert.deepEqual([...r.ayni], [1]);
  assert.deepEqual(giden.map((c) => [c.tur, c.karar, c.a, c.b]), [
    ['yazili', 'farkli', 'A1 başlık', 'C yazılmış'],
    ['uye', 'ayni', 'A1 başlık', 'a2 başlık'],
    ['ek', 'ayni', 'B1 başlık', 'b yazılmış'],
  ]);
  assert.ok(giden.every((c) => typeof c.bg === 'number'));
});

test('açık: alt eşik altındaki çift sorulmaz ve ayrık sayılmaz; üye elenirse grupta kalır', async () => {
  const { gruplar, yazilmis, ciftler } = kur();
  let soru = null;
  const r = await gommeliEsle({
    ciftler, gruplar, yazilmis, ayrikMi: () => false,
    esle: async (c) => ((soru = c), new Set()),
    sor: async () => assert.fail('ek ayrı sorulmaz'),
    env: { GOMME_ON_ELEME: '1', GOMME_ALT_ESIK: '0.5' }, vektorle, log: () => {},
  });
  assert.deepEqual(soru.map((c) => c.idB), ['a2']); // A1↔C (uzak) elendi, üst eşik yok: ek çift yok
  assert.equal(r.ciftler, soru);
  assert.deepEqual(r.ozet, { soruldu: 1, elenen: 1, ek: 0 });
});

test('açık + üst eşik: ek çift gerçek çift olarak sorulur', async () => {
  const { gruplar, yazilmis, ciftler } = kur();
  let soru = null;
  const r = await gommeliEsle({
    ciftler, gruplar, yazilmis, ayrikMi: () => false,
    esle: async (c) => ((soru = c), new Set([soru.length - 1])),
    sor: async () => assert.fail('ayrı sorulmaz'),
    env: { GOMME_ON_ELEME: '1', GOMME_ALT_ESIK: '0.5', GOMME_UST_ESIK: '0.8' }, vektorle, log: () => {},
  });
  assert.deepEqual(soru.map((c) => [c.tur, c.idB]), [['uye', 'a2'], ['yazili', 'haber:b']]);
  assert.deepEqual([...r.ayni], [1]);
});

test('gömme yoksa (null) açıkken de bugünkü yol', async () => {
  const { gruplar, yazilmis, ciftler } = kur();
  let soru = null;
  const r = await gommeliEsle({
    ciftler, gruplar, yazilmis, ayrikMi: () => false,
    esle: async (c) => ((soru = c), new Set()),
    sor: async () => new Set(),
    env: { GOMME_ON_ELEME: '1', GOMME_ALT_ESIK: '0.5' }, vektorle: async () => null, log: () => {},
  });
  assert.equal(soru, ciftler);
  assert.equal(r.ciftler, ciftler);
});

test('gölge: ek çift sorusu düşerse ana sonuç yine döner', async () => {
  const { gruplar, yazilmis, ciftler } = kur();
  const r = await gommeliEsle({
    ciftler, gruplar, yazilmis, ayrikMi: () => false,
    esle: async () => new Set([0]),
    sor: async () => { throw new Error('503'); },
    env: { GOMME_ON_ELEME: 'golge' }, vektorle, log: () => {},
  });
  assert.deepEqual([...r.ayni], [0]);
});
