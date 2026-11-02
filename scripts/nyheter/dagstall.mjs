// Redaksjonen: botun gerçek günlük sayıları (src/data/redaksjonen/dagstall.json). Her tur sonunda o turun sayıları
// Oslo gününe eklenir. Dosyada yalnız sayılar ve sabit kodlar durur: başlık, kaynak adı, adres ya da serbest gerekçe metni
// yazılmaz (gizli kaynak listesi kuralı; gerekçe metni kaynak adı taşıyabilir).
// Sayım birimi: funnet/vurdert/avvist kaynak öğesidir (bir haber birkaç kaynak öğesinden yazılabilir); skrevet ve
// publisert benzersiz yazı (slug) sayısıdır.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export const SAKLA_GUN = 400;

// Ret gerekçesi → kod. Sıra önemlidir: ilk eşleşen kazanır. standart: kodları kural adlarıyla ayrıca sayılır.
const KODLAR = [
  [/^düşük haber değeri/, 'lav-nyhetsverdi'],
  [/^zaten yayımlandı/, 'allerede-publisert'],
  [/^bare én uavhengig kilde/, 'en-kilde'],
  [/^(for lite kildemateriale|kaynak metni yetersiz)/, 'for-lite-kildemateriale'],
  [/^(ikke egnet|krever særlig varsomhet)/, 'varsomhet'],
  [/^kontroll:/, 'faktasjekk-stopp'],
  [/^kaynakta artık yok/, 'borte-fra-kilden'],
  [/^farevarsel: dekkes/, 'dekket-av-farevarsler'],
  [/^üç denemede yazılamadı/, 'ikke-skrevet'],
  [/^yük çözülemedi/, 'teknisk'],
];

/** Ret gerekçesinin kodları: standart reddi kural başına 'standard:<kural>', öteki tek kod; bilinmeyen 'annet'. */
export function avvisningskoder(gerekce) {
  const g = String(gerekce ?? '').trim();
  const s = /^standart:kirmizi:([a-z0-9,-]+)/.exec(g);
  if (s) return s[1].split(',').filter(Boolean).map((k) => `standard:${k}`);
  return [KODLAR.find(([re]) => re.test(g))?.[1] ?? 'annet'];
}

/** Bir turun sayıları. sonuclar: uyarlayıcının sonuçları; ozet: uyarlayıcının tur özeti. */
export function turTall({ funnet = 0, sonuclar = [], ozet = {} }) {
  const avvist = {};
  for (const s of sonuclar) if (s.durum === 'elendi') for (const k of avvisningskoder(s.gerekce)) avvist[k] = (avvist[k] ?? 0) + 1;
  const skrevet = new Set(sonuclar.filter((s) => s.durum === 'yazildi' && s.slug).map((s) => s.slug)).size;
  // Taslak (utkast) ve yayımlanmayan kontrol durdurmaları (stopp) yazıldı sayılır ama yayına çıkmaz.
  const utkast = (ozet.utkastListe?.length ?? 0) + (ozet.stoppListe?.length ?? 0);
  return {
    turer: 1,
    funnet,
    vurdert: sonuclar.filter((s) => s.durum === 'yazildi' || s.durum === 'elendi').length,
    avvist,
    skrevet,
    utkast,
    publisert: Math.max(0, skrevet - utkast),
    kortfortalt: ozet.kortLagt ?? 0,
    venter: ozet.ventListe?.length ?? 0,
  };
}

/** Oslo takvim günü (YYYY-MM-DD). */
export const osloDag = (t) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(t);

/** İki sayı nesnesini toplar (iç içe avvist dahil). */
function topla(a = {}, b = {}) {
  const c = { ...a };
  for (const [k, v] of Object.entries(b)) c[k] = typeof v === 'object' && v !== null ? topla(c[k], v) : (c[k] ?? 0) + v;
  return c;
}

/** Dosyaya bu turun sayılarını ekler; SAKLA_GUN'den eski günler düşer. */
export function leggTil(data, dag, tall, oppdatert) {
  const dager = { ...(data?.dager ?? {}), [dag]: topla(data?.dager?.[dag], tall) };
  const sirali = Object.keys(dager).sort().slice(-SAKLA_GUN);
  return { oppdatert, dager: Object.fromEntries(sirali.map((d) => [d, dager[d]])) };
}

/** Uyarlayıcıyı sarar: adaylar sayısını ve isle sonuçlarını (hata ile gelen kısmi sonuçlar dahil) toplar. */
export function tellende(uyarlayici) {
  let funnet = 0;
  const sonuclar = [];
  return {
    uyarlayici: {
      ...uyarlayici,
      adaylar: async (...a) => {
        const liste = await uyarlayici.adaylar(...a);
        funnet += liste.length;
        return liste;
      },
      isle: async (...a) => {
        try {
          const r = await uyarlayici.isle(...a);
          sonuclar.push(...(r ?? []));
          return r;
        } catch (e) {
          sonuclar.push(...(e?.sonuclar ?? []));
          throw e;
        }
      },
    },
    tall: (ozet) => turTall({ funnet, sonuclar, ozet }),
  };
}

/** Turun sayılarını dosyaya yazar. Hata turu düşürmez: çağıran yakalar ve loglar. */
export async function skrivDagstall(fil, tall, naa = new Date()) {
  let data = {};
  try {
    data = JSON.parse(await readFile(fil, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  await mkdir(path.dirname(fil), { recursive: true });
  await writeFile(fil, `${JSON.stringify(leggTil(data, osloDag(naa), tall, naa.toISOString()), null, 1)}\n`, 'utf8');
}
