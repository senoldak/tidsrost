// Çalışmalar arası mükerrer denetimi: aynı olay bir kez yayınlandıysa sonraki çalışmalarda yeniden yazılmaz.
// sett.json sadece kaynak adreslerini hatırlar; aynı olay başka adresten (yeni bülten, başka sitenin haberi,
// yeniden yayımlanan uyarı) gelince eskiden ikinci kez yazılıyordu. Hafıza: son HUKOMMELSE_TIMER saatte
// yayınlanmış haberlerin başlığı, girişi ve anahtar terimleri (src/content/haberler'den okunur, çalışma
// içinde yazılanlar eklenir). Benzerlik deterministiktir (Gemini'siz), uavhengighet.mjs'teki likhet de kullanılır.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { likhet } from './uavhengighet.mjs';

export const HUKOMMELSE_TIMER = 72;

// Olayı ayırt etmeyen sık kelimeler (bağlaçlar, edatlar, haber fiilleri).
const STOPP = new Set(
  `og i på til for av med om etter fra som er en et ei den det de dem har hadde vil kan skal ved mot over under ut inn
  seg sin sitt sine ny nye nytt flere mer mest nå ikke men også blir ble bli får fikk gir ga sier sa at alle dette
  denne disse slik hva når hvor hvorfor kommer kom går gikk ta tar tok før enn eller bare både mellom rundt uten
  sammen igjen fortsatt fremdeles allerede mange noen andre første siste store stor stort høy høyere lav lavere
  år uke dag dager måned prosent millioner milliarder kroner tusen dette viser tallene the`.split(/\s+/),
);

// Kaba gövdeleme: "signerer"/"signerte" → "signer", "millioner" → "million". Kısa kelimelere dokunulmaz.
const EKLER = ['ene', 'ens', 'ets', 'ert', 'te', 'en', 'et', 'er', 'e', 's'];
function stamme(o) {
  if (/\d/.test(o) || o.length < 6) return o;
  for (const e of EKLER) if (o.endsWith(e) && o.length - e.length >= 4) return o.slice(0, -e.length);
  return o;
}

const ORD = /\d+(?:[.,]\d+)?|[\p{L}\d]+/gu;

/** Metnin anahtar terimleri (gövdelenmiş, durak kelimesiz). Rakam ve kodlar (A3, 92, 8,5) olduğu gibi kalır. */
export function termer(tekst = '') {
  const ut = new Set();
  for (const r of String(tekst).toLowerCase().match(ORD) ?? []) {
    const o = r.replace(',', '.');
    if (/\d/.test(o)) {
      ut.add(o);
      continue;
    }
    if (o.length < 3 || STOPP.has(o)) continue;
    ut.add(stamme(o));
  }
  return ut;
}

/** Özel isimler ve rakamlar: cümle ortasında büyük harfle başlayan kelimeler ile rakam/kod içeren terimler. */
export function enheter(tekst = '') {
  const ut = new Set();
  for (const setning of String(tekst).split(/(?<=[.!?:])\s+|\n+/)) {
    const ord = setning.match(ORD) ?? [];
    ord.forEach((w, i) => {
      if (/\d/.test(w)) ut.add(w.toLowerCase().replace(',', '.'));
      else if (i > 0 && /^\p{Lu}/u.test(w) && w.length >= 3) ut.add(stamme(w.toLowerCase()));
    });
  }
  return ut;
}

const kutt = (a, b) => [...a].filter((x) => b.has(x));
const tallKoder = (s) => new Set([...s].filter((t) => /\d/.test(t)));
// Slug sonundaki "-2" ve noktalama başlık karşılaştırmasını etkilemez.
const rentTittel = (t = '') => t.toLowerCase().replace(/[^\p{L}\d]+/gu, ' ').trim();

// Veri haberinin geçerlilik süresi ("Varselet gjelder fra … til …"); verilmişse kaynak kimliği (kildeId) öncelikli.
// Aynı bölgeye sonraki dönem için çıkan yeni uyarı aynı başlığı taşır, ama ayrı haberdir ve yayınlanmalıdır.
export function periode(tekst = '') {
  const m = String(tekst ?? '').match(/gjelder\s+(fra\s[^\n]*?\btil\s[^\n]*?)\.?\s*$/im);
  return m ? m[1].replace(/\s+/g, ' ').trim().toLowerCase() : undefined;
}

// Haberin ilk iki paragrafı (olay en açık burada anlatılır).
const ledd = (tekst = '') => String(tekst ?? '').replace(/^\s+/, '').split(/\n\s*\n/).slice(0, 2).join(' ');

/** Karşılaştırılacak kayıt: { tittel, ingress?, tekst?, kildeId?, tid? }. Hafızada termler bir kez hesaplanır. */
export function nokkel(sak) {
  const tittel = sak.tittel ?? '';
  const ingress = sak.ingress ?? '';
  return {
    ...sak,
    _tittel: rentTittel(tittel),
    _periode: sak.kildeId ?? periode(sak.tekst),
    _tT: termer(tittel),
    _tD: termer(`${tittel} ${ingress}`),
    _e: enheter(`${tittel}. ${ingress}`),
    // Başlık + giriş + ilk iki paragraftaki özel isimler (rakamsız): nadir isim çakışması için (bkz. finnDublett).
    _eL: new Set([...enheter(`${tittel}. ${ingress}. ${ledd(sak.tekst)}`)].filter((t) => !/\d/.test(t))),
  };
}

/**
 * Aynı olay mı? Kurallar (hepsi başlık ve giriş üzerinden):
 *  - Başlıklar aynı → aynı olay (yeniden yayımlanan uyarılar).
 *  - Başlıklardaki rakam/kodlar tamamen farklıysa (A2 ↔ A3, 92 ↔ 75) → farklı olay.
 *  - En az 3 başlık terimi ortak ve kısa başlığın terimlerinin en az %75'i ortak → aynı olay; oran %60–75
 *    arasındaysa başlık+girişte en az 3 ortak özel isim/rakam da gerekir (aynı şehre yapılan farklı saldırılar
 *    gibi "aynı konu, farklı olay" çiftleri çoğunlukla bu aralıkta kalır). Ortak başlık terimlerinden en az
 *    ikisi ayırt edici olmalı (özel isim, rakam ya da 9+ harfli kelime); "drept, angrep, Kyiv" yetmez.
 *  - Başlık+girişte en az 3 ortak özel isim/rakam ve terimlerin yarısı ortak → aynı olay.
 *  - Girişler büyük ölçüde aynı metin (likhet ≥ 0,5) → aynı olay.
 * strengt: başlık aynı VE geçerlilik süresi (ya da kaynak kimliği) aynı. Şablonla yazılan veri haberlerinde
 * (produksjon: automatisk; uyarı, kur, istatistik) hep böyledir: aynı türden uyarıların ortak kelimeleri çoktur ama
 * farklı bölge farklı olaydır; aynı bölgeye sonraki dönem için çıkan uyarı da yeni haberdir.
 */
export function sammeHendelse(x, y, { strengt = false } = {}) {
  const a = x._tT ? x : nokkel(x);
  const b = y._tT ? y : nokkel(y);
  const data = strengt || a.produksjon === 'automatisk' || b.produksjon === 'automatisk';
  if (a._tittel && a._tittel === b._tittel) return !data || a._periode === b._periode;
  if (data) return false;
  const na = tallKoder(a._tT);
  const nb = tallKoder(b._tT);
  if (na.size && nb.size && !kutt(na, nb).length) return false;

  const felles = kutt(a._tT, b._tT);
  const fellesEnheter = kutt(a._e, b._e);
  const minT = Math.min(a._tT.size, b._tT.size);
  const oran = minT ? felles.length / minT : 0;
  const ayirt = felles.filter((t) => a._e.has(t) || b._e.has(t) || /\d/.test(t) || t.length >= 9).length;
  if (felles.length >= 3 && ayirt >= 2 && (oran >= 0.75 || (oran >= 0.6 && fellesEnheter.length >= 3))) return true;

  const fellesD = kutt(a._tD, b._tD).length;
  const unionD = new Set([...a._tD, ...b._tD]).size;
  if (fellesEnheter.length >= 3 && unionD && fellesD / unionD >= 0.5) return true;

  if (a.ingress && b.ingress && likhet(a.ingress, b.ingress) >= 0.5) return true;
  // Kısa başlığın bütün terimleri uzun başlıkta da varsa (aynı kurumun "legger fram ny strategi" / "legger fram ny
  // europeisk strategi" başlıkları) tek ayırt edici terim yeter.
  if (oran === 1 && felles.length >= 4 && ayirt >= 1) return true;
  return false;
}

// Aynı olayın farklı kaleme alınmış anlatımları (Zelenskyj'in Oslo ziyareti: üç başlık, üç haber) başlık/giriş
// terimlerinden yakalanamaz, ama olaya özgü nadir özel isimleri (Stubb, Witkoff, Kushner…) paylaşırlar. Sürekli
// konuların sık isimleri (Zelenskyj, Ukraina, Trump) nadir sayılmaz; böylece "aynı konu, farklı olay" çiftleri geçmez.
export const SJELDEN_MAKS_DF = 4;
export const SJELDEN_MIN_FELLES = 7;
export const SJELDEN_TIMER = 48;

/** Hafıza: son `timer` saatin yayınlanmış haberleri (taslaklar dahil değil). */
export async function lesHukommelse(rot, { timer = HUKOMMELSE_TIMER, naa = Date.now() } = {}) {
  const base = path.join(rot, 'src/content/haberler');
  const grense = naa - timer * 36e5;
  const ut = [];
  for (const slug of await readdir(base).catch(() => [])) {
    // "Kort fortalt" günün kısa duyurularının listesidir, tek bir olay değil; içindeki bir duyuru daha sonra
    // tam haber olabilir (bkz. kortfortalt.mjs).
    if (slug.startsWith('kort-fortalt-')) continue;
    const md = await readFile(path.join(base, slug, 'index.md'), 'utf8').catch(() => '');
    const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
    if (!fm || /^draft:\s*true/m.test(fm)) continue;
    const felt = (k) => {
      const v = fm.match(new RegExp(`^${k}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? '';
      try {
        return v.startsWith('"') ? JSON.parse(v) : v.replace(/^'|'$/g, '');
      } catch {
        return v.replace(/^"|"$/g, '');
      }
    };
    const tid = Date.parse(felt('date'));
    if (!(tid >= grense)) continue;
    const tekst = md.slice(md.indexOf('---', 3) + 3);
    ut.push(nokkel({ slug, tittel: felt('title'), ingress: felt('description'), tekst, tid, produksjon: felt('produksjon') || 'manuell' }));
  }
  return ut;
}

/** Hafızada aynı olayı anlatan haber varsa onu döner, yoksa undefined. */
export function finnDublett(hukommelse, sak, opts) {
  const n = nokkel(sak);
  const direkte = hukommelse.find((h) => sammeHendelse(h, n, opts));
  if (direkte || opts?.strengt || n.produksjon === 'automatisk' || n._eL.size < SJELDEN_MIN_FELLES) return direkte;
  // Nadir özel isim çakışması: yalnız son 48 saatteki, şablonsuz haberlerle. df: isim → (hafıza + aday) haber sayısı.
  const naa = opts?.naa ?? Date.now();
  const son = hukommelse.filter((h) => h.produksjon !== 'automatisk' && h._eL && !(naa - h.tid > SJELDEN_TIMER * 36e5));
  const df = new Map();
  for (const h of [...son, n]) for (const t of h._eL) df.set(t, (df.get(t) ?? 0) + 1);
  const sjelden = (h) => [...h._eL].filter((t) => n._eL.has(t) && df.get(t) <= SJELDEN_MAKS_DF).length;
  return son.find((h) => sjelden(h) >= SJELDEN_MIN_FELLES);
}
