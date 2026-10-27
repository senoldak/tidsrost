// Kaynak: mecmua/site-ortak/gemini/esleme-gomme.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// jendume ve kifobu eşlemesinde (esleme.mjs ciftleriKur → onbellekliEsle) gömme ölçümü ve ön eleme (Gemini Faz 2,
// 27 Ekim 2026). Dört siteye kopyalanır, yalnız ikisi kullanır. Kip GOMME_ON_ELEME'den (gomme.mjs gommeKipi):
//   kapali: bugünkü yol.
//   golge:  bugünkü çiftler bugünkü gibi sorulur ve uygulanır; her çiftin gömme benzerliği kararla birlikte loga
//           yazılır. Ad örtüşmesi olmayan ama çok benzeyen çiftler (ek çiftler, en çok 10) AYRI küçük bir çağrıyla
//           sorulur; kararları yalnız loga girer (durum.ayni/ayrik'e ve uygula'ya girmez). Üst eşik bununla seçilir.
//   acik:   alt eşiğin altındaki çiftler sorulmaz ve "farklı" sayılmaz (ayrik'e yazılmaz; uye çifti elenirse üye
//           kelime grubunda kalır). Üst eşik tanımlıysa ek çiftler gerçek çift olarak sorulur.
// Gömme düşerse (vektorle null) her kipte bugünkü yol. "Aynı olay" kararını her zaman Gemini verir.
// Gölgede ölçülen çiftler ayrıca yerel modellere de sorulur (yerel-model.mjs, YEREL_GOLGE=1); yalnız loga girer.
import { benzerlik, ciftleriSuz, esikler, gommeKipi, olcumSatiri, vektorle as gommeVektorle } from './gomme.mjs';
import { yerelOlcum } from './yerel-model.mjs';

export const EK_AZAMI = 10;
const OLCUM_EK_ESIGI = 0.7; // ölçümde üst eşik yoksa (256 boyut sınamasında aynı olay 0,82 çıktı)

const anahtar = (x, y) => (x < y ? `${x}|${y}` : `${y}|${x}`);

/**
 * Ad örtüşmesiyle kurulmamış ama benzerliği ≥ esik olan çiftler: grup başı ↔ yazılmış haber ve grup başı ↔ grup başı.
 * mevcut: zaten sorulacak çiftler; ayrikMi(idA, idB): daha önce "farklı" denmiş çiftler atlanır. Benzerliğe göre azalan.
 */
export function ekCiftler(gruplar, yazilmis, vek, esik, mevcut, ayrikMi, azami = EK_AZAMI) {
  const var_ = new Set(mevcut.map((c) => anahtar(c.idA, c.idB)));
  const adaylar = [];
  const ekle = (c) => {
    if (var_.has(anahtar(c.idA, c.idB)) || ayrikMi(c.idA, c.idB)) return;
    const [x, y] = [vek.get(c.a), vek.get(c.b)];
    if (!x || !y) return;
    const skor = benzerlik(x, y);
    if (skor >= esik) adaylar.push({ c, skor });
  };
  gruplar.forEach((g, i) => {
    const bas = g.uyeler[0];
    for (const h of yazilmis) ekle({ tur: 'yazili', g, h, n: 0, a: bas.baslik, b: h.metin, idA: bas.id, idB: h.id });
    for (let j = i + 1; j < gruplar.length; j++) {
      const o = gruplar[j].uyeler[0];
      ekle({ tur: 'grup', gi: i, gj: j, n: 0, a: bas.baslik, b: o.baslik, idA: bas.id, idB: o.id });
    }
  });
  return adaylar
    .sort((p, q) => q.skor - p.skor)
    .slice(0, azami)
    .map((x) => x.c);
}

/**
 * ciftler: ciftleriKur çıktısı. esle(ciftler) → Set | null (önbellekli Gemini eşlemesi); sor(ciftler) → Set | null
 * (önbelleksiz ayniOlayMi, yalnız gölgedeki ek çiftler için). Döner: { ciftler: uygula'ya verilecek liste, ayni, ozet }.
 */
export async function gommeliEsle({ ciftler, gruplar, yazilmis, ayrikMi, esle, sor, dil = () => 'tr', env = process.env, onbellek = null, vektorle = gommeVektorle, yerel = yerelOlcum, log = console.log }) {
  const kip = gommeKipi(env);
  const bugunku = async () => ({ ciftler, ayni: await esle(ciftler), ozet: null });
  if (kip === 'kapali') return bugunku();
  const { alt, ust } = esikler(env);
  const metinler = [...new Set([...ciftler.flatMap((c) => [c.a, c.b]), ...gruplar.map((g) => g.uyeler[0].baslik), ...yazilmis.map((h) => h.metin)])];
  let v = null;
  try {
    v = await vektorle(metinler, { onbellek, amac: 'esleme/gomme' });
  } catch {
    v = null;
  }
  if (!v) return bugunku();
  const vek = new Map(metinler.map((m, i) => [m, v[i]]));
  const b = (c) => {
    const [x, y] = [vek.get(c.a), vek.get(c.b)];
    return x && y ? benzerlik(x, y) : null;
  };
  const olculen = [];
  const olc = (c, tur, evet) => {
    const s = b(c);
    if (s === null) return;
    const satir = { tur, karar: evet ? 'ayni' : 'farkli', b: s, dil: dil(c.a, c.b), id: c.idA };
    log(olcumSatiri(satir));
    olculen.push({ ...satir, a: c.a, b: c.b, bg: s });
  };

  if (kip === 'golge') {
    const ayni = await esle(ciftler);
    if (ayni) ciftler.forEach((c, i) => olc(c, c.tur, ayni.has(i)));
    const ek = ekCiftler(gruplar, yazilmis, vek, ust ?? OLCUM_EK_ESIGI, ciftler, ayrikMi);
    if (ek.length) {
      try {
        const cevap = await sor(ek);
        if (cevap) ek.forEach((c, i) => olc(c, 'ek', cevap.has(i)));
      } catch {
        // ölçüm sorusu düşerse eşleme etkilenmez
      }
    }
    try {
      await yerel(olculen, { env, log });
    } catch {
      // yerel gölge düşerse eşleme etkilenmez
    }
    return { ciftler, ayni, ozet: null };
  }

  const { kalan, elenen } = ciftleriSuz(ciftler, vek, alt);
  const ek = ust !== null ? ekCiftler(gruplar, yazilmis, vek, ust, ciftler, ayrikMi) : [];
  const soru = [...kalan.map((i) => ciftler[i]), ...ek];
  const ayni = soru.length ? await esle(soru) : new Set();
  return { ciftler: soru, ayni, ozet: { soruldu: soru.length, elenen: elenen.length, ek: ek.length } };
}
