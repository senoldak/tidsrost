// Standartlar Faz 0: haber botlarının yayın kapısındaki belirlenimci süzgeç ve acil durdurma denetimi.
// TEK KAYNAK: mecmua/standartlar/standart.mjs. Sitelerdeki kopyalar kopyala.mjs ile yazılır; sitede elle değiştirme.
//
// standartDenetle({ baslik, ozet, metin, ekler, dil, kaynakMetni }) -> { karar, kirmizi, sari, gerekce }
//   karar: 'kirmizi' (yayımlanmaz, haber düşer), 'sari' (yayımlanır, günlük özette işaretlenir) ya da 'temiz'.
//   Bulgu: { kural, ham }. gerekce: motor kaydına yazılan kısa metin ('standart:kirmizi:suc,teror').
//   dil: 'tr', 'nb' ya da 'en'. İki dilli yazı her dili ayrı çağırır.
//   Kırmızı kurallar: suc, intihar, cocuk, turkiye-devlet, teror, savas-dili, grup-genelleme, yatirim-tavsiyesi,
//   ozel-haber (yazıda ya da kaynak metinde), medya-adi (yalnız yazıda), kaynak-benzerligi (yazı kaynağa çok yakın).
//   Sarı kurallar: olum-kaza, turkiye-resmi, savas-konu, secim, grup-konu.
//   Belirsizlikte kapalı kalır: yanlış alarm kabul edilir, kaçan kırmızı edilmez.
// yayinDurduMu({ url, anahtar, site }) -> { durdu, neden }: mecmua-saat'in acil durdurma bayrağı. Saate
//   ulaşılamazsa durdu: false döner (saat zaten botu başlatan yerdir; elle başlatılan tur sürer), neden loga yazılır.
import { readFileSync } from 'node:fs';

const DILLER = ['tr', 'nb', 'en'];
const ONCE = '(?<![\\p{L}\\p{N}])';
const KUYRUK = '[\\p{L}\\p{N}]*';
const SONRA = '(?![\\p{L}\\p{N}])';
const BENZER_ARDISIK = 12; // kaynakla birebir aynı bu kadar ardışık kelime: kopya sayılır
const BENZER_PARCA = 6;
const BENZER_ORAN = 0.35; // yazının 6'lı kelime parçalarının bu oranı kaynakta da varsa: kopya sayılır
const BENZER_ASGARI = 40; // kaynak metin bundan kısaysa benzerlik ölçülmez

const kacis = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const kucult = (s, dil) => {
  let sonuc = '';
  for (const c of s) {
    const k = c.toLocaleLowerCase(dil);
    sonuc += k.length === c.length ? k : k.slice(0, c.length); // uzunluk korunur: indeksler özgün metinle ortak
  }
  return sonuc.replace(/[’‘]/g, "'");
};

function kalip(girdi, dil) {
  if (girdi.length > 2 && girdi.startsWith('/') && girdi.endsWith('/')) return new RegExp(girdi.slice(1, -1), 'giu');
  const govde = kucult(girdi, dil).trim().split(/\s+/).map(kacis).join('\\s+');
  return new RegExp(`${ONCE}${govde}${KUYRUK}`, 'gu');
}

let kurallarOnbellek = null;
function kurallar() {
  if (!kurallarOnbellek) {
    const ham = JSON.parse(readFileSync(new URL('./standart-kurallar.json', import.meta.url), 'utf8'));
    const derli = { medya: (ham.medya ?? []).map((m) => new RegExp(`${ONCE}${kacis(m)}${SONRA}`, 'gu')) };
    for (const dil of DILLER) {
      const d = ham[dil] ?? {};
      const liste = (l) => (l ?? []).map((g) => kalip(g, dil));
      derli[dil] = {
        kirmizi: Object.entries(d.kirmizi ?? {}).map(([kural, l]) => ({ kural, kaliplar: liste(l) })),
        sari: Object.entries(d.sari ?? {}).map(([kural, l]) => ({ kural, kaliplar: liste(l) })),
        birlikte: (d.birlikte ?? []).map((b) => ({ kural: b.kural, seviye: b.seviye, a: liste(b.a), b: liste(b.b) })),
        sariGruplar: d.sariGruplar ? { kural: d.sariGruplar.kural, kaliplar: liste(d.sariGruplar.a) } : null,
        yatirim: liste(d.yatirimTavsiyesi),
        yatirimBuyuk: (d.yatirimTavsiyesiBuyukHarf ?? []).map((g) => new RegExp(`${ONCE}${kacis(g)}${SONRA}`, 'gu')),
      };
    }
    kurallarOnbellek = derli;
  }
  return kurallarOnbellek;
}

function ilkEslesme(metin, kaliplar) {
  for (const re of kaliplar) {
    re.lastIndex = 0;
    const e = re.exec(metin);
    if (e && e[0].length) return { bas: e.index, son: e.index + e[0].length };
  }
  return null;
}

const cumleler = (metin) => metin.split(/(?<=[.!?…])\s+|\n+/u).filter((c) => c.trim());

// "Bu yazı yatırım tavsiyesi değildir." gibi sorumluluk reddi cümleleri tavsiye taramasına girmez.
const REDDI = /yatırım\s+tavsiye\S*(?:\s+\S+){0,8}?\s+(?:değil|içermez|teşkil\s+etmez|sayılmaz|niteliği\s+taşımaz)|not\s+(?:financial|investment)\s+advice|ikke\s+(?:et\s+)?investeringsråd/iu;

function kelimeler(s) {
  return (s.toLocaleLowerCase('tr').match(/[\p{L}\p{N}]+/gu) ?? []);
}
function parcalar(k, n) {
  const p = new Set();
  for (let i = 0; i + n <= k.length; i++) p.add(k.slice(i, i + n).join(' '));
  return p;
}
export function kaynakBenzerligi(metin, kaynak) {
  const km = kelimeler(metin);
  const kk = kelimeler(kaynak);
  if (kk.length < BENZER_ASGARI || km.length < BENZER_PARCA) return { kopya: false, oran: 0, ardisik: false };
  const kaynakUzun = parcalar(kk, BENZER_ARDISIK);
  let ardisik = null;
  for (let i = 0; i + BENZER_ARDISIK <= km.length; i++) {
    const p = km.slice(i, i + BENZER_ARDISIK).join(' ');
    if (kaynakUzun.has(p)) {
      ardisik = p;
      break;
    }
  }
  const yp = parcalar(km, BENZER_PARCA);
  const kp = parcalar(kk, BENZER_PARCA);
  let ortak = 0;
  for (const p of yp) if (kp.has(p)) ortak++;
  const oran = yp.size ? ortak / yp.size : 0;
  return { kopya: Boolean(ardisik) || oran >= BENZER_ORAN, oran: Math.round(oran * 100) / 100, ardisik };
}

export function standartDenetle({ baslik = '', ozet = '', metin = '', ekler = [], dil, kaynakMetni = '' } = {}) {
  if (!DILLER.includes(dil)) throw new Error(`standart: dil desteklenmiyor: ${dil}`);
  const k = kurallar();
  const s = k[dil];
  const yazi = [baslik, ozet, metin, ...[ekler].flat()].filter((x) => typeof x === 'string' && x.trim()).join('\n\n');
  const kucuk = kucult(yazi, dil);
  const kirmizi = [];
  const sari = [];
  const ekle = (liste, kural, kaynakMetin, e) => liste.push({ kural, ham: kaynakMetin.slice(e.bas, e.son).slice(0, 80) });

  for (const { kural, kaliplar } of s.kirmizi) {
    const e = ilkEslesme(kucuk, kaliplar);
    if (e) ekle(kirmizi, kural, yazi, e);
  }
  const cumleListesi = cumleler(yazi);
  for (const b of s.birlikte) {
    for (const c of cumleListesi) {
      const kc = kucult(c, dil);
      const ea = ilkEslesme(kc, b.a);
      if (ea && ilkEslesme(kc, b.b)) {
        ekle(b.seviye === 'sari' ? sari : kirmizi, b.kural, c, { bas: 0, son: c.length });
        break;
      }
    }
  }
  // Yatırım tavsiyesi: sorumluluk reddi cümleleri çıkarılarak.
  const tavsiyeMetni = cumleListesi.filter((c) => !REDDI.test(c)).join('\n');
  const tk = kucult(tavsiyeMetni, dil);
  const et = ilkEslesme(tk, s.yatirim) ?? null;
  if (et) ekle(kirmizi, 'yatirim-tavsiyesi', tavsiyeMetni, et);
  else {
    const eb = ilkEslesme(tavsiyeMetni, s.yatirimBuyuk);
    if (eb) ekle(kirmizi, 'yatirim-tavsiyesi', tavsiyeMetni, eb);
  }
  // Medya adı: büyük/küçük harf duyarlı, yalnız yazıda (kaynak metinde zaten geçer).
  const em = ilkEslesme(yazi, k.medya);
  if (em) ekle(kirmizi, 'medya-adi', yazi, em);
  // Tek bir yayının özel haberi: kaynak metin de taranır.
  if (kaynakMetni && !kirmizi.some((b) => b.kural === 'ozel-haber')) {
    const ozelHaber = s.kirmizi.find((x) => x.kural === 'ozel-haber');
    const kaynakKucuk = kucult(String(kaynakMetni), dil);
    const eo = ozelHaber && ilkEslesme(kaynakKucuk, ozelHaber.kaliplar);
    if (eo) ekle(kirmizi, 'ozel-haber', String(kaynakMetni), eo);
  }
  if (kaynakMetni) {
    const b = kaynakBenzerligi([ozet, metin].join('\n'), String(kaynakMetni));
    if (b.kopya) kirmizi.push({ kural: 'kaynak-benzerligi', ham: b.ardisik ? b.ardisik.slice(0, 80) : `oran ${b.oran}` });
  }

  for (const { kural, kaliplar } of s.sari) {
    const e = ilkEslesme(kucuk, kaliplar);
    if (e) ekle(sari, kural, yazi, e);
  }
  if (s.sariGruplar && !kirmizi.some((b) => b.kural === 'grup-genelleme')) {
    const e = ilkEslesme(kucuk, s.sariGruplar.kaliplar);
    if (e) ekle(sari, s.sariGruplar.kural, yazi, e);
  }

  const karar = kirmizi.length ? 'kirmizi' : sari.length ? 'sari' : 'temiz';
  const adlar = (l) => [...new Set(l.map((b) => b.kural))].join(',');
  const gerekce = karar === 'temiz' ? '' : `standart:${karar}:${adlar(karar === 'kirmizi' ? kirmizi : sari)}`;
  return { karar, kirmizi, sari, gerekce };
}

// İki dilli yazı (jendume): her dil ayrı denetlenir, en ağır karar geçerlidir.
export function standartBirlestir(...sonuclar) {
  const kirmizi = sonuclar.flatMap((s) => s.kirmizi);
  const sari = sonuclar.flatMap((s) => s.sari);
  const karar = kirmizi.length ? 'kirmizi' : sari.length ? 'sari' : 'temiz';
  const adlar = (l) => [...new Set(l.map((b) => b.kural))].join(',');
  return { karar, kirmizi, sari, gerekce: karar === 'temiz' ? '' : `standart:${karar}:${adlar(karar === 'kirmizi' ? kirmizi : sari)}` };
}

// Okunur tek satır (log ve Telegram için).
export const standartOzeti = (s) =>
  s.karar === 'temiz' ? 'standart: temiz' : `standart: ${s.karar} — ${[...s.kirmizi, ...s.sari].map((b) => `${b.kural} «${b.ham}»`).join('; ').slice(0, 300)}`;

export async function yayinDurduMu({ url, anahtar, site, fetchFn = fetch } = {}) {
  if (!url || !anahtar) return { durdu: false, neden: 'motor ayarı yok' };
  try {
    const res = await fetchFn(`${String(url).replace(/\/$/, '')}/motor/${site}/durum`, {
      headers: { Authorization: `Bearer ${anahtar}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { durdu: false, neden: `saat ${res.status} döndü` };
    const j = await res.json();
    return { durdu: j?.durdu === true, neden: j?.durdu ? `acil durdurma (${j?.zaman ?? '?'})` : 'açık' };
  } catch (e) {
    return { durdu: false, neden: `saate ulaşılamadı: ${String(e?.message ?? e).slice(0, 100)}` };
  }
}
