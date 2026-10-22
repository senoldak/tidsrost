import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { adayYuku, uyarlayiciKur, yerelTur, durumuTemizle } from './uyarlayici.mjs';
import { motorKimlik, kirmiziKayit, sariKayit } from './motor.mjs';
import { velg } from './viktighet.mjs';
import { finnDublett, nokkel } from './dublett.mjs';
import { slugFor } from './kortfortalt.mjs';

// Ağ, Gemini ve disk yok: kaynaklar, puanlama, kapı ve yazım sahte. Haber siteleri uydurma adlarla (haber.example.com).
mock.method(console, 'log', () => {});
mock.method(console, 'warn', () => {});
mock.method(console, 'error', () => {});

const SIMDI = new Date('2026-10-22T09:00:00Z');
const SAAT = 3_600_000;
const tarihte = (saatOnce) => new Date(SIMDI.getTime() - saatOnce * SAAT);

const sak = (title, ek = {}) => ({
  title,
  description: 'Kort ingress',
  body: 'Brødtekst. '.repeat(30),
  category: 'innenriks',
  kilde: { navn: 'Resmi Kurum', url: 'https://haber.example.com/sak' },
  produksjon: 'automatisk',
  ...ek,
});
// Aday: lag() sonucu `sonuc` (işlev ya da değer); ek: skjult/ider vb.
const aday = (id, tittel, sonuc, { saatOnce = 1, ...ek } = {}) => ({
  id,
  tid: tarihte(saatOnce),
  tittel,
  lag: async () => (typeof sonuc === 'function' ? sonuc() : sonuc),
  ...ek,
});
const kaynak = (navn, liste, ek = {}) => ({ navn, hent: async () => liste.map((k) => ({ ...k })), ...ek });

// Kapı kararı başlığa göre: sahte standart süzgeci.
const kapi = async ({ girdi }) => {
  if (girdi.baslik.includes('KIRMIZI')) return { karar: 'elendi', s: { gerekce: 'standart:kirmizi:suc' } };
  if (girdi.baslik.includes('BEKLE')) return { karar: 'bekle', hata: 'denetim calismadi' };
  if (girdi.baslik.includes('SARI')) return { karar: 'yaz', s: { karar: 'sari', gerekce: 'standart:sari:kaza' } };
  return { karar: 'yaz', s: { karar: 'temiz' } };
};

function kur({ kaynaklar, puanlar = {}, hukommelse = [], durum = {}, bag = {}, ayar = {} } = {}) {
  const tilstand = { sett: {}, feil: {}, kilder: {}, ...durum };
  const yazilan = [];
  const kayitlar = [];
  const kortSayfa = [];
  const u = uyarlayiciKur({
    tilstand,
    simdi: SIMDI,
    ayar: { rot: '.', maks: 12, sureMs: 60_000, baslangic: Date.now(), ...ayar },
    bag: {
      kaynaklar,
      vurder: async (kand) => {
        const m = new Map();
        for (const l of Object.values(kand)) for (const k of l) m.set(k, puanlar[k.tittel] ?? 90);
        return m;
      },
      lesHukommelse: async () => hukommelse,
      skrivSak: async (_rot, s) => {
        yazilan.push(s);
        return `haber-${yazilan.length}`;
      },
      leggTilKortFortalt: async (_rot, satirlar) => {
        kortSayfa.push(...satirlar);
        return satirlar.length;
      },
      yayinKapisi: kapi,
      motorKaydet: async (p) => {
        kayitlar.push(p.kayit);
        return true;
      },
      geminiPayiBitti: () => false,
      ...bag,
    },
  });
  return { u, tilstand, yazilan, kayitlar, kortSayfa };
}

const sonucu = (sonuclar, id) => sonuclar.find((s) => s.kimlik === motorKimlik(id));
const tur = async (k) => {
  const adaylar = await k.u.adaylar({});
  return k.u.isle(adaylar, {});
};

test('motorKimlik: sabit uzunlukta özet, adres ve kaynak adı içermez; kırmızı/sarı kayıt aynı kimliği kullanır', () => {
  const id = 'medier:abc/def?x=1 https://haber.example.com/a';
  const k = motorKimlik(id);
  assert.match(k, /^t:[0-9a-f]{24}$/);
  assert.equal(k, motorKimlik(id));
  assert.notEqual(k, motorKimlik(`${id}2`));
  assert.ok(!k.includes('example') && !k.includes('/'));
  assert.equal(kirmiziKayit(id, { gerekce: 'g' }).kimlik, k);
  assert.equal(sariKayit(id, 'slug', { gerekce: 'g' }).kimlik, k);
});

test('adayYuku: { id, kaynak, tittel, tid }', () => {
  const k = { ...aday('met:1', 'Farevarsel', null), kildeNavn: 'met' };
  assert.deepEqual(adayYuku(k), { id: 'met:1', kaynak: 'met', tittel: 'Farevarsel', tid: k.tid.toISOString() });
});

test('adayYuku: uzun başlık 300 karaktere kısalır; yük JSON 11000 bayt altında kalır', () => {
  const k = { ...aday('met:2', 'Ø'.repeat(5000), null), kildeNavn: 'met' };
  const yuk = adayYuku(k);
  assert.equal(yuk.tittel.length, 300);
  assert.ok(Buffer.byteLength(JSON.stringify(yuk)) < 11000);
});

test('adaylar: taze adayları kimlikle döner; ilk çalıştırmada 24 saatten eski olanlar sett\'e işaretlenir, alleredeSett işaretlenir', async () => {
  const eski = aday('a:eski', 'Eski haber', sak('x'), { saatOnce: 30 });
  const yeni = aday('a:yeni', 'Yeni haber', sak('y'), { saatOnce: 2 });
  const k = kaynak('a', [eski, yeni], { alleredeSett: ['a:zaten'] });
  const { u, tilstand } = kur({ kaynaklar: [k] });
  const adaylar = await u.adaylar({});
  assert.deepEqual(adaylar.map((a) => a.kimlik), [motorKimlik('a:yeni')]);
  assert.equal(adaylar[0].yuk.id, 'a:yeni');
  assert.ok(tilstand.sett['a:eski'] && tilstand.sett['a:zaten']);
  assert.equal(tilstand.sett['a:yeni'], undefined);
  assert.ok(tilstand.kilder.a);
  // Görülmüş aday bir sonraki taramada gelmez.
  tilstand.sett['a:yeni'] = 'x';
  const k2 = kaynak('a', [eski, yeni], { alleredeSett: [] });
  const { u: u2 } = kur({ kaynaklar: [k2], durum: { sett: tilstand.sett, kilder: tilstand.kilder } });
  assert.deepEqual(await u2.adaylar({}), []);
});

test('isle: makale yazıldı; grup adayının her üyesi yazildi + slug, yazi yok; üyeler sett\'e işaretlenir', async () => {
  const g = aday('medier:m1', 'Grup haberi (2 medier)', sak('Grup haberi'), { skjult: true, ider: ['medier:m1', 'medier:m2'] });
  const k = kur({ kaynaklar: [kaynak('medier', [g])] });
  const sonuclar = await tur(k);
  assert.equal(k.yazilan.length, 1);
  assert.equal(sonuclar.length, 2);
  assert.ok(sonuclar.every((s) => s.durum === 'yazildi' && s.slug === 'haber-1' && s.yazi === undefined));
  assert.deepEqual(sonuclar.map((s) => s.kimlik).sort(), [motorKimlik('medier:m1'), motorKimlik('medier:m2')].sort());
  assert.ok(k.tilstand.sett['medier:m1'] && k.tilstand.sett['medier:m2']);
});

test('isle: sarı kapı kararı yazılır ve motor kaydı gider', async () => {
  const k = kur({ kaynaklar: [kaynak('a', [aday('a:1', 'SARI haber', sak('SARI haber'))])] });
  const sonuclar = await tur(k);
  assert.equal(sonuclar[0].durum, 'yazildi');
  assert.deepEqual(k.kayitlar, [sariKayit('a:1', 'haber-1', { gerekce: 'standart:sari:kaza' })]);
});

test('isle: kort -> Kort fortalt satırı, günlük sayfa slug\'ı ile yazildi; sayfa döngüden sonra bir kez yazılır', async () => {
  const kort = { kort: { tittel: 'Kısa duyuru', ingress: 'x', kilde: { navn: 'Kurum', url: 'https://haber.example.com/k' } } };
  const k = kur({ kaynaklar: [kaynak('a', [aday('a:1', 'Kısa duyuru', kort)])] });
  const sonuclar = await tur(k);
  assert.equal(sonuclar.length, 1);
  assert.equal(sonuclar[0].durum, 'yazildi');
  assert.equal(sonuclar[0].slug, slugFor(new Date()));
  assert.equal(k.kortSayfa.length, 1);
  assert.ok(k.tilstand.sett['a:1']);
  assert.equal(k.u.ozet.antall, 1); // sayfa değişti: iş akışı derleme yapsın
});

test('isle: kort satırı kırmızıysa elendi; kapı bekle derse sonuç yok ve sett işaretlenmez', async () => {
  const kortlu = (t) => ({ kort: { tittel: t, ingress: '', kilde: { navn: 'K', url: 'https://haber.example.com/k' } } });
  const k = kur({ kaynaklar: [kaynak('a', [aday('a:1', 'KIRMIZI kort', kortlu('KIRMIZI kort')), aday('a:2', 'BEKLE kort', kortlu('BEKLE kort'))])] });
  const sonuclar = await tur(k);
  assert.equal(sonucu(sonuclar, 'a:1').durum, 'elendi');
  assert.equal(sonucu(sonuclar, 'a:1').gerekce, 'standart:kirmizi:suc');
  assert.equal(sonucu(sonuclar, 'a:2'), undefined);
  assert.ok(k.tilstand.sett['a:1']);
  assert.equal(k.tilstand.sett['a:2'], undefined);
  assert.equal(k.kortSayfa.length, 0);
});

test("isle: kort null (kaynak yetmedi) elendi, sett'e işaretlenir", async () => {
  const k = kur({ kaynaklar: [kaynak('a', [aday('a:1', 'Kısa', { kort: null })])] });
  const sonuclar = await tur(k);
  assert.equal(sonuclar[0].durum, 'elendi');
  assert.ok(k.tilstand.sett['a:1']);
});

test("isle: puan < 70 elendi 'düşük haber değeri (p)', sett'e işaretlenir; yazım yok", async () => {
  const k = kur({ kaynaklar: [kaynak('a', [aday('a:1', 'Düşük haber', sak('x'))])], puanlar: { 'Düşük haber': 40 } });
  const sonuclar = await tur(k);
  assert.deepEqual(sonuclar, [{ kimlik: motorKimlik('a:1'), durum: 'elendi', gerekce: 'düşük haber değeri (40)' }]);
  assert.ok(k.tilstand.sett['a:1']);
  assert.equal(k.yazilan.length, 0);
});

test('isle: hopp elendi, gerekçede adres yok; kırmızı standart elendi; mükerrer elendi', async () => {
  const hafiza = [nokkel({ slug: 'eski-haber', tittel: 'Zaten yayınlanmış haber başlığı', ingress: 'i', tekst: 't', tid: Date.now(), produksjon: 'manuell' })];
  const k = kur({
    kaynaklar: [
      kaynak('a', [
        aday('a:1', 'Hopp haberi', { hopp: 'bare én kilde https://haber.example.com/x?k=1' }),
        aday('a:2', 'KIRMIZI haber', sak('KIRMIZI haber')),
        aday('a:3', 'Zaten yayınlanmış haber başlığı', sak('Zaten yayınlanmış haber başlığı')),
        aday('a:4', 'Tamamen başka aday başlığı burada', sak('Zaten yayınlanmış haber başlığı')),
      ]),
    ],
    hukommelse: hafiza,
  });
  const sonuclar = await tur(k);
  const h = sonucu(sonuclar, 'a:1');
  assert.equal(h.durum, 'elendi');
  assert.ok(!h.gerekce.includes('example.com'), h.gerekce);
  assert.equal(sonucu(sonuclar, 'a:2').gerekce, 'standart:kirmizi:suc');
  assert.match(sonucu(sonuclar, 'a:3').gerekce, /zaten yayımlandı \(eski-haber\)/);
  assert.match(sonucu(sonuclar, 'a:4').gerekce, /zaten yayımlandı/);
  assert.ok(['a:1', 'a:2', 'a:3', 'a:4'].every((id) => k.tilstand.sett[id]));
  assert.equal(k.yazilan.length, 0);
});

test('isle: bekle ve anahtarsız null için sonuç yok, sett işaretlenmez', async () => {
  const k = kur({
    kaynaklar: [kaynak('a', [aday('a:1', 'Onay yok', { bekle: 'vaktsjef-onay alınamadı' }), aday('a:2', 'Anahtarsız', null)])],
  });
  const sonuclar = await tur(k);
  assert.deepEqual(sonuclar, []);
  assert.equal(k.tilstand.sett['a:1'], undefined);
  assert.equal(k.tilstand.sett['a:2'], undefined);
  assert.equal(k.u.ozet.ventListe.length, 1);
});

test('isle: habere özgü hata — 3. denemeden önce bekliyor + Error (adres yok), 3. de elendi; eski sayısal feil okunur', async () => {
  const hata = () => {
    throw new Error('baglanti https://haber.example.com/x?k=1 koptu');
  };
  for (const [onceki, beklenen] of [[undefined, 'bekliyor'], [{ antall: 1 }, 'bekliyor'], [{ antall: 2 }, 'elendi'], [2, 'elendi']]) {
    const durum = { feil: onceki === undefined ? {} : { 'a:1': onceki } };
    const k = kur({ kaynaklar: [kaynak('a', [aday('a:1', 'Hatalı', hata)])], durum });
    const sonuclar = await tur(k);
    const s = sonucu(sonuclar, 'a:1');
    assert.equal(s.durum, beklenen, JSON.stringify(onceki));
    if (beklenen === 'bekliyor') {
      assert.ok(s.hata instanceof Error);
      assert.ok(!s.hata.message.includes('haber.example.com'), s.hata.message);
      assert.equal(k.tilstand.sett['a:1'], undefined);
      assert.ok(k.tilstand.feil['a:1'].antall >= 1);
    } else {
      assert.equal(s.gerekce, 'üç denemede yazılamadı');
      assert.ok(k.tilstand.sett['a:1']);
      assert.equal(k.tilstand.feil['a:1'], undefined);
    }
  }
});

test('isle: konfig hatası deneme saymaz (sayısı artmaz), sonuç sayilmaz işaretli', async () => {
  const k = kur({ kaynaklar: [kaynak('a', [aday('a:1', 'Konfig', () => { throw Object.assign(new Error('401'), { konfig: true }); })])], durum: { feil: { 'a:1': { antall: 1 } } } });
  const s = sonucu(await tur(k), 'a:1');
  assert.equal(s.durum, 'bekliyor');
  assert.equal(s.sayilmaz, true);
  assert.equal(k.tilstand.feil['a:1'].antall, 1);
});

test('isle: velg sınırı (maks) ve süre dolması için sonuç yok', async () => {
  const liste = [aday('a:1', 'Birinci', sak('Birinci'), { saatOnce: 1 }), aday('a:2', 'Ikinci', sak('Ikinci'), { saatOnce: 2 })];
  const k1 = kur({ kaynaklar: [kaynak('a', liste)], ayar: { maks: 1 } });
  const s1 = await tur(k1);
  assert.equal(s1.length, 1);
  assert.equal(k1.yazilan.length, 1);
  const k2 = kur({ kaynaklar: [kaynak('a', liste)], ayar: { sureMs: -1 } });
  assert.deepEqual(await tur(k2), []);
  assert.equal(k2.yazilan.length, 0);
  const k3 = kur({ kaynaklar: [kaynak('a', liste)], bag: { geminiPayiBitti: () => true } });
  assert.deepEqual(await tur(k3), []);
  // Motor payı: surVar yanıt vermezse yazım başlamaz.
  const k4 = kur({ kaynaklar: [kaynak('a', liste)] });
  assert.deepEqual(await k4.u.isle(await k4.u.adaylar({}), { surVar: () => false }), []);
});

test("isle: eski aday taze karşılığı yoksa elendi 'kaynakta artık yok'; taze karşılığı varsa işlenir", async () => {
  const k = kur({ kaynaklar: [kaynak('a', [aday('a:1', 'Hala var', sak('Hala var'))])] });
  const taze = await k.u.adaylar({});
  const eski = [
    { kimlik: motorKimlik('a:gitti'), yuk: { id: 'a:gitti', kaynak: 'a', tittel: 't', tid: SIMDI.toISOString() }, eski: true },
    { ...taze[0], eski: true },
  ];
  const sonuclar = await k.u.isle(eski, {});
  assert.deepEqual(sonucu(sonuclar, 'a:gitti'), { kimlik: motorKimlik('a:gitti'), durum: 'elendi', gerekce: 'kaynakta artık yok' });
  assert.equal(sonucu(sonuclar, 'a:1').durum, 'yazildi');
});

test('isle: turu durduran hata e.sonuclar ile fırlatılır; önceki sonuçlar ve Kort fortalt satırı kaybolmaz', async () => {
  const kortlu = { kort: { tittel: 'Kısa duyuru', ingress: '', kilde: { navn: 'K', url: 'https://haber.example.com/k' } } };
  const k = kur({
    kaynaklar: [
      kaynak('a', [
        aday('a:1', 'Kısa duyuru', kortlu, { saatOnce: 1 }),
        aday('a:2', 'Anahtar geçersiz', () => { throw Object.assign(new Error('anahtar gecersiz'), { ayar: true }); }, { saatOnce: 2 }),
      ]),
    ],
  });
  await assert.rejects(
    () => tur(k),
    (e) => {
      assert.equal(e.ayar, true);
      assert.equal(e.sonuclar.length, 1);
      assert.equal(e.sonuclar[0].kimlik, motorKimlik('a:1'));
      assert.equal(e.sonuclar[0].durum, 'yazildi');
      return true;
    },
  );
  assert.equal(k.kortSayfa.length, 1); // kısmi yolda da yazıldı
});

test('isle: üst üste iki "çok fazla deneme" turu erken bitirir', async () => {
  const kes = () => { throw new Error('çok fazla deneme'); };
  const liste = [1, 2, 3].map((i) => aday(`a:${i}`, `Haber ${i}`, kes, { saatOnce: i }));
  const k = kur({ kaynaklar: [kaynak('a', liste)] });
  const sonuclar = await tur(k);
  assert.equal(sonuclar.length, 2);
  assert.equal(k.tilstand.feil['a:3'], undefined);
});

test("yerelTur: yalnız karar verilen üyeler sett'e işaretlenir; bekleyen (null, bekle) işaretlenmez", async () => {
  const k = kur({
    kaynaklar: [
      kaynak('a', [
        aday('a:ok', 'Yazılacak', sak('Yazılacak'), { saatOnce: 1 }),
        aday('a:dusuk', 'Düşük', sak('x'), { saatOnce: 2 }),
        aday('a:bekle', 'Bekleyen', { bekle: 'x' }, { saatOnce: 3 }),
        aday('a:null', 'Anahtarsız', null, { saatOnce: 4 }),
      ]),
    ],
    puanlar: { Düşük: 20 },
  });
  const { sonuclar, ayarHatasi } = await yerelTur(k.u, k.tilstand);
  assert.equal(ayarHatasi, null);
  assert.equal(sonuclar.length, 2);
  assert.ok(k.tilstand.sett['a:ok'] && k.tilstand.sett['a:dusuk']);
  assert.equal(k.tilstand.sett['a:bekle'], undefined);
  assert.equal(k.tilstand.sett['a:null'], undefined);
});

test("durumuTemizle: 90 günden eski sett kayıtları silinir, puan önbelleği temizlenir", () => {
  const t = { sett: { eski: new Date(SIMDI - 91 * 864e5).toISOString(), yeni: SIMDI.toISOString() }, puan: { x: { p: 80, v: 'eski-surum', t: SIMDI.toISOString() } } };
  durumuTemizle(t, SIMDI);
  assert.deepEqual(Object.keys(t.sett), ['yeni']);
  assert.deepEqual(t.puan, {});
});

// ── Yerel eşitlik: bölmeden önceki akışın (hent-nyheter.mjs'nin eski gövdesi) birebir kopyası ──
async function eskiAkis({ tilstand, KILDER, puanlar, hukommelse, maks = 12 }) {
  const yazilan = [];
  const kortListe = [];
  let antall = 0;
  const merkSett = (k) => {
    for (const id of k.ider ?? [k.id]) tilstand.sett[id] = SIMDI.toISOString();
  };
  const kandidater = {};
  for (const kilde of KILDER) {
    let liste = (await kilde.hent({ sett: tilstand.sett })).filter((k) => !tilstand.sett[k.id]);
    for (const id of kilde.alleredeSett ?? []) tilstand.sett[id] = SIMDI.toISOString();
    liste.sort((a, b) => b.tid - a.tid);
    for (const k of liste) k.kildeNavn = kilde.navn;
    if (!tilstand.kilder[kilde.navn]) {
      const grense = SIMDI.getTime() - 24 * 36e5;
      const forste = liste.filter((k) => k.tid.getTime() >= grense);
      for (const k of liste) if (!forste.includes(k)) merkSett(k);
      liste = forste;
      tilstand.kilder[kilde.navn] = SIMDI.toISOString();
    }
    kandidater[kilde.navn] = liste;
  }
  const poeng = new Map();
  for (const l of Object.values(kandidater)) for (const k of l) poeng.set(k, puanlar[k.tittel] ?? 90);
  const { valgt, forkastet } = velg(kandidater, poeng, maks);
  for (const k of forkastet) merkSett(k);
  for (const k of valgt) {
    const forDublett = finnDublett(hukommelse, { tittel: k.tittel.replace(/\s*\([^)]*\)\s*$/, '') });
    if (forDublett) {
      merkSett(k);
      continue;
    }
    try {
      const s = await k.lag();
      if (!s) continue;
      if ('kort' in s) {
        if (s.kort) {
          const kp = await kapi({ girdi: { baslik: s.kort.tittel } });
          if (kp.karar === 'bekle') continue;
          merkSett(k);
          if (kp.karar === 'elendi') continue;
          kortListe.push(s.kort);
        } else merkSett(k);
        continue;
      }
      if (s.bekle) continue;
      if (s.hopp) {
        merkSett(k);
        continue;
      }
      const d = finnDublett(hukommelse, { tittel: s.title, ingress: s.description, tekst: s.body }, { strengt: s.produksjon === 'automatisk' });
      if (d) {
        merkSett(k);
        continue;
      }
      const kp = await kapi({ girdi: { baslik: s.title } });
      if (kp.karar === 'bekle') continue;
      if (kp.karar === 'elendi') {
        merkSett(k);
        continue;
      }
      yazilan.push(s.title);
      merkSett(k);
      delete tilstand.feil[k.id];
      antall++;
    } catch (e) {
      const forrige = tilstand.feil[k.id];
      const ant = (typeof forrige === 'number' ? forrige : forrige?.antall ?? 0) + 1;
      tilstand.feil[k.id] = { antall: ant };
      if (ant >= 3) {
        merkSett(k);
        delete tilstand.feil[k.id];
      }
    }
  }
  if (kortListe.length) antall++;
  return { yazilan, kort: kortListe.map((x) => x.tittel), antall };
}

test('yerel eşitlik: aynı sahte bağımlılıklarla eski akış ve yerelTur aynı yazıları ve aynı sett farkını üretir', async () => {
  const hukommelse = [nokkel({ slug: 'eski', tittel: 'Daha önce yayınlanan haber', ingress: 'i', tekst: 't', tid: Date.now(), produksjon: 'manuell' })];
  const kortlu = (t) => ({ kort: { tittel: t, ingress: '', kilde: { navn: 'K', url: 'https://haber.example.com/k' } } });
  const olustur = () => [
    kaynak('medier', [
      aday('medier:g1', 'Grup olayı (2 medier)', sak('Grup olayı'), { skjult: true, ider: ['medier:g1', 'medier:g2'], saatOnce: 1 }),
      aday('medier:p1', 'Düşük puanlı olay (2 medier)', sak('x'), { skjult: true, ider: ['medier:p1', 'medier:p2'], saatOnce: 2 }),
    ]),
    kaynak('regjeringen', [
      aday('r:1', 'Resmi haber bir', sak('Resmi haber bir'), { saatOnce: 3 }),
      aday('r:2', 'Daha önce yayınlanan haber', sak('Daha önce yayınlanan haber'), { saatOnce: 4 }),
      aday('r:3', 'Hatalı olay', () => { throw new Error('gecici'); }, { saatOnce: 5 }),
      aday('r:eski', 'Eski birikim', sak('Eski birikim'), { saatOnce: 40 }),
    ], { alleredeSett: ['r:zaten'] }),
    kaynak('stortinget', [
      aday('s:1', 'Kısa karar', kortlu('Kısa karar'), { saatOnce: 6 }),
      aday('s:2', 'KIRMIZI karar', sak('KIRMIZI karar'), { saatOnce: 7 }),
      aday('s:3', 'Onay bekleyen', { bekle: 'x' }, { saatOnce: 8 }),
      aday('s:4', 'Anahtarsız', null, { saatOnce: 9 }),
      aday('s:5', 'Hopp edilen', { hopp: 'az kaynak' }, { saatOnce: 10 }),
    ]),
  ];
  const puanlar = { 'Düşük puanlı olay (2 medier)': 30 };
  const eskiDurum = { sett: {}, feil: { 'r:3': 1 }, kilder: {}, puan: {} };
  const yeniDurum = JSON.parse(JSON.stringify(eskiDurum));

  const eski = await eskiAkis({ tilstand: eskiDurum, KILDER: olustur(), puanlar, hukommelse });
  const k = kur({ kaynaklar: olustur(), puanlar, hukommelse, durum: yeniDurum });
  await yerelTur(k.u, k.tilstand);

  assert.deepEqual(k.yazilan.map((s) => s.title), eski.yazilan);
  assert.deepEqual(k.kortSayfa.map((x) => x.tittel), eski.kort);
  assert.equal(k.u.ozet.antall, eski.antall);
  assert.deepEqual(Object.keys(k.tilstand.sett).sort(), Object.keys(eskiDurum.sett).sort());
  assert.deepEqual(
    Object.fromEntries(Object.entries(k.tilstand.feil).map(([id, v]) => [id, v.antall])),
    Object.fromEntries(Object.entries(eskiDurum.feil).map(([id, v]) => [id, v.antall ?? v])),
  );
  assert.deepEqual(Object.keys(k.tilstand.kilder).sort(), Object.keys(eskiDurum.kilder).sort());
});
