// Facebook/Instagram'a gidecek haberler ve paylaşım metni (sahibin kararı 2026-10-18: her tam haber post + story).
// Seçim kuralı Telegram'la aynı: taslak değil, yayın saati gelmiş, son PENCERE içinde ve arama motorlarına açık
// (çok kısa haberler noindex'tir ve paylaşılmaz). Bağlantı yalnız Facebook metninde; kaynak/haber sitesi adı eklenmez.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { indekserbar } from '../../src/lib/ordtelling.mjs';

export const DIZIN = 'src/content/haberler';
export const SITE = 'https://tidsrost.com';
export const PENCERE_MS = 24 * 3600e3;

const KATEGORI_ETIKET = { innenriks: 'innenriks', utenriks: 'utenriks', okonomi: 'økonomi', sport: 'sport', kultur: 'kultur', teknologi: 'teknologi' };

/** Markdown dosyasından haber kaydı; frontmatter yoksa null. */
export function sakOku(id, md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  const fm = parse(m[1]) ?? {};
  return {
    id,
    tittel: fm.title,
    ingress: fm.description ?? '',
    punkter: Array.isArray(fm.key_points) ? fm.key_points : [],
    kategori: fm.category,
    forfatter: fm.author,
    sjanger: fm.sjanger,
    dato: new Date(fm.date),
    taslak: fm.draft === true,
    // Editoryal kapak değilse (harita, grafik) sosyal görselde üstte kullanılır.
    gorselKapak: fm.cover === './cover.png' && fm.coverKreditt !== 'Illustrasjon: tidsrøst',
    indeks: indekserbar(m[2]),
    nyhetsverdi: Number.isInteger(fm.nyhetsverdi) ? fm.nyhetsverdi : null,
  };
}

/** Paylaşılabilir mi: yayında, pencerenin içinde, tam haber. */
export const paylasilir = (s, simdi = Date.now(), pencere = PENCERE_MS) =>
  Boolean(s && !s.taslak && s.indeks && s.tittel && s.dato.getTime() <= simdi && s.dato.getTime() > simdi - pencere);

// Farevarsel (MET/NVE) haberleri akışı boğuyordu (18 Ekim: 10 paylaşımın 6'sı). Gult hiç gitmez, oransje 24 saatte
// en çok bir, rødt her zaman gider.
export const VARSEL_GUNLUK = 1;
export const varselSeviye = (s) => {
  const m = /^(gult|oransje|rødt|rodt)[- ]farevarsel/i.exec(s.tittel || s.id || '');
  return m ? m[1].toLowerCase().replace('rodt', 'rødt') : null;
};

/**
 * Sıradaki haberlerden farevarsel kuralına uymayanları ayıklar.
 * @param {object[]} saker paylaşılmamış adaylar (eskiden yeniye)
 * @param {number} son24Varsel son 24 saatte paylaşılmış oransje farevarsel sayısı
 */
export function varselSuz(saker, son24Varsel = 0) {
  const kalan = Math.max(VARSEL_GUNLUK - son24Varsel, 0);
  // Kota varsa en yenisi gider: aynı hava olayının en güncel uyarısı.
  const oransje = kalan ? saker.filter((s) => varselSeviye(s) === 'oransje').slice(-kalan) : [];
  return saker.filter((s) => {
    const v = varselSeviye(s);
    return !v || v === 'rødt' || oransje.includes(s);
  });
}

export async function sakerOku(dizin = DIZIN) {
  const out = [];
  for (const f of await readdir(dizin, { recursive: true })) {
    if (!f.endsWith('index.md')) continue;
    const id = path.dirname(f).split(path.sep).join('/');
    const s = sakOku(id, await readFile(path.join(dizin, f), 'utf8'));
    if (s) out.push(s);
  }
  return out.sort((a, b) => a.dato - b.dato || a.id.localeCompare(b.id));
}

/** Haberin adresi; Facebook'ta ölçüm için kanal parametreleriyle. */
export const sakUrl = (id, kanal) => `${SITE}/artikkel/${id}/${kanal ? `?utm_source=${kanal}&utm_medium=social` : ''}`;

// Norveç kitlesine ulaşmak için (sahibin isteği 2026-10-19): haberde geçen şehir etiket ve konum olur.
export const BYER = ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Tromsø', 'Kristiansand', 'Bodø', 'Ålesund', 'Drammen', 'Fredrikstad'];
// Instagram/Facebook konum etiketi: şehrin Facebook yer sayfası kimliği. Graph API yer aramasına izin vermediği için
// elle bulunur: Sayfanın "Yaşadığı şehir" kutusunun önerilerinden (2026-10-19). del.mjs --kontrol listedekileri sınar.
export const YERLER = {
  Oslo: '110848678937314',
  Bergen: '106562399381316',
  Trondheim: '110429825645017',
  Stavanger: '115341461813501',
  Tromsø: '113908368625565',
  Kristiansand: '110737722288187',
  Bodø: '114686248548744',
  Ålesund: '105840952789550',
  Drammen: '111988662160584',
  Fredrikstad: '108211792532249',
};

/** Başlıkta ya da özette geçen ilk şehir. Yalnız ana noktada geçen şehir haberin şehri sayılmaz (ulusal haberde örnek olabilir). */
export function sakBy(s) {
  const metin = [s.tittel, s.ingress].join(' ');
  return BYER.find((b) => new RegExp(`(^|[^\\p{L}])${b}([^\\p{L}]|$)`, 'u').test(metin)) ?? null;
}
export const sakYeri = (s) => YERLER[sakBy(s)] ?? null;

// Sonda kısa soru: yorum en güçlü dağıtım sinyali. Ölüm, kaza, suç ve açlık haberlerinde sorulmaz (saygısız durur).
const SORULAR = ['Hva tenker du om dette?', 'Hva mener du? Skriv gjerne i kommentarfeltet.', 'Hvordan påvirker dette deg?'];
const HASSAS = /(^|[^\p{L}])(omkom|død|døde|dødsfall|drept|drap|ulykke|savnet|skadd|skadet|overgrep|selvmord|skyting|knivstikk|menneskeliv|tap av liv|mistet livet|sult)/iu;
export function sakSorusu(s) {
  if (HASSAS.test(`${s.tittel} ${s.ingress}`)) return null;
  let h = 0;
  for (const c of String(s.id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return SORULAR[h % SORULAR.length];
}

/** Instagram etiketleri: en çok 5, Norveççe. */
export function etiketler(s) {
  const by = sakBy(s);
  return ['#nyheter', '#norge', KATEGORI_ETIKET[s.kategori] && `#${KATEGORI_ETIKET[s.kategori]}`, by && `#${by.toLocaleLowerCase('nb-NO')}`, s.sjanger === 'forklart' && '#forklart']
    .filter(Boolean).slice(0, 5);
}

/**
 * Paylaşım metni: başlık, özet, ana noktalar, soru ve yönlendirme.
 * Instagram'da bağlantı tıklanmadığı için adres yok, sonda etiketler var; Facebook'ta haberin bağlantısı var,
 * etiket yok (sahibin isteği 2026-10-18: Facebook'a bağlantı gitsin, Instagram'a gitmesin).
 * @param {'instagram'|'facebook'} kanal
 */
export function bildetekst(s, kanal = 'instagram') {
  const satirlar = [s.tittel, '', s.ingress];
  if (s.punkter.length) satirlar.push('', ...s.punkter.slice(0, 3).map((p) => `• ${p}`));
  const soru = sakSorusu(s);
  if (soru) satirlar.push('', soru);
  if (kanal === 'facebook') {
    satirlar.push('', `Les hele saken: ${sakUrl(s.id, 'facebook')}`);
  } else {
    satirlar.push('', 'Les hele saken på tidsrost.com', '', etiketler(s).join(' '));
  }
  return satirlar.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Yayında servis edilen görsellerin adı (bilder.mjs üretir, public/sosial/). */
export const bildeFil = (id, bicim) => `${id.replace(/\//g, '-')}-${bicim}.png`;
export const bildeUrl = (id, bicim) => `${SITE}/sosial/${bildeFil(id, bicim)}`;

// Reels (sahibin kararı 2026-10-19): günde 1–2, en güçlü haberler. İki dilim, Oslo saatiyle ve Norveç'te en çok
// bakılan saatlerde: sabah 07–09 her gün bir Reels (en iyi aday), akşam 19–21 yalnız güçlü bir aday varsa. İmzalı yazılar (Forklart) sitenin vitrini olduğu için öne alınır;
// puanı olmayan eski haberler eşik değeri (70) sayılır. Farevarsel Reels olmaz (rødt bile: video üretimi sürerken eskir).
export const REELS_DILIMLERI = [
  { ad: 'morgen', bas: 7, son: 9, esik: 70 },
  { ad: 'kveld', bas: 19, son: 21, esik: 80 },
];
export const reelsPuan = (s) => (s.forfatter ? 90 : s.nyhetsverdi ?? 70);

const osloParca = (t) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
  .formatToParts(new Date(t)).map((p) => [p.type, p.value]));

/** Şu anki Reels dilimi ve günü; dilim dışındaysa null. */
export function reelsDilimi(simdi = Date.now()) {
  const p = osloParca(simdi);
  const saat = Number(p.hour);
  const d = REELS_DILIMLERI.find((x) => saat >= x.bas && saat < x.son);
  return d ? { ...d, gun: `${p.year}-${p.month}-${p.day}` } : null;
}

/**
 * Bu dilimin Reels haberi: penceredeki, daha önce Reels olmamış, eşiği geçen en yüksek puanlı haber (eşitlikte en yeni).
 * Dilimde zaten bir Reels gittiyse null.
 * @param {object[]} saker paylaşılabilir haberler
 * @param {Record<string, {reels?: {gun: string, dilim: string}}>} delt paylaşım durumu
 */
export function reelsSec(saker, delt, dilim) {
  if (!dilim) return null;
  if (Object.values(delt).some((k) => k?.reels?.gun === dilim.gun && k.reels.dilim === dilim.ad)) return null;
  const aday = saker
    .filter((s) => !delt[s.id]?.reels && !varselSeviye(s) && reelsPuan(s) >= dilim.esik)
    .sort((a, b) => reelsPuan(b) - reelsPuan(a) || b.dato - a.dato);
  return aday[0] ?? null;
}
