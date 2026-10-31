import { YAYINLAR } from './kunye.mjs';
import { REDAKTOR_NAVN } from './forfatter.mjs';

// <script type="application/ld+json" set:html={...}> için JSON metni. set:html içeriği kaçırmaz; JSON.stringify de
// "<" ve ">" karakterlerine dokunmaz, bu yüzden başlıktaki bir "</script>" öğeyi bitirip kalanını HTML yapardı.
// Bu karakterler ve U+2028/U+2029 satır ayırıcıları \uXXXX yazılır: çıktı aynı değeri veren geçerli JSON olarak kalır.
const KACIRILAN = ['<', '>', '&', String.fromCharCode(0x2028), String.fromCharCode(0x2029)];
const KACIS = Object.fromEntries(KACIRILAN.map((c) => [c, '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')]));
const DESEN = new RegExp(`[${KACIRILAN.join('')}]`, 'g');

export function jsonLdMetni(veri) {
  return JSON.stringify(veri).replace(DESEN, (c) => KACIS[c]);
}

// ---- NewsArticle alanları (haber sayfası) ----
export const KI_REDAKSJON_NAVN = 'tidsrøst KI-redaksjon';
// /redaksjonen/ sayfası açılınca yalnız bu sabit değişir.
export const KI_REDAKSJON_URL = 'https://tidsrost.com/om-oss/';
export const EIER_URL = 'https://tidsrost.com/forfatter/senol-dak/';
const BOT_PRODUKSJON = ['ki-medier', 'ki-kontrollert', 'automatisk', 'ki-automatisk'];

const tarih = (d) => {
  const t = d instanceof Date ? d : new Date(d);
  return Number.isNaN(t.getTime()) ? undefined : t.toISOString();
};
const sayi = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

export function kiRedaksjon() {
  return { '@type': 'Organization', name: KI_REDAKSJON_NAVN, url: KI_REDAKSJON_URL };
}

export function eierKisi(beskrivelse) {
  return {
    '@type': 'Person',
    name: REDAKTOR_NAVN,
    url: EIER_URL,
    jobTitle: 'Journalist',
    ...(beskrivelse ? { description: beskrivelse } : {}),
    // sameAs betyr «samme enhet»; yayın ana sayfaları kişiyle aynı şey değil, bu yüzden worksFor. Kişisel profil adresi yok.
    worksFor: Object.entries(YAYINLAR).map(([name, url]) => ({ '@type': 'NewsMediaOrganization', name, url })),
  };
}

/**
 * Haber düğümüne eklenecek alanlar. Veri yoksa alan hiç yazılmaz.
 * girdi: { produksjon, kilder, sted, rettelse, oppdatert, date, forfatter (görünen kişi adı ya da boş), forfatterBeskrivelse }
 * Dönüş: { dateModified, author?, isBasedOn?, contentLocation?, correction? } (author yoksa sayfa kendi varsayılanını kullanır).
 */
export function haberAlanlari({ produksjon, kilder, sted, rettelse, oppdatert, date, forfatter, forfatterBeskrivelse } = {}) {
  const ut = {};
  const yayin = tarih(date);
  const endret = oppdatert ? tarih(oppdatert) : undefined;
  ut.dateModified = endret && yayin && endret > yayin ? endret : yayin;

  if (BOT_PRODUKSJON.includes(produksjon)) ut.author = kiRedaksjon();
  else if (forfatter === REDAKTOR_NAVN) ut.author = eierKisi(forfatterBeskrivelse);
  else if (forfatter) ut.author = { '@type': 'Person', name: forfatter };

  const medya = produksjon === 'ki-medier';
  const kaynaklar = (Array.isArray(kilder) ? kilder : []).filter((k) => k?.navn && k?.url);
  if (kaynaklar.length) {
    ut.isBasedOn = kaynaklar.map((k) => ({
      '@type': medya ? 'NewsArticle' : 'CreativeWork',
      url: k.url,
      publisher: { '@type': medya ? 'NewsMediaOrganization' : 'Organization', name: k.navn },
    }));
  }

  const lat = sayi(sted?.lat);
  const lon = sayi(sted?.lon);
  if (sted?.navn) {
    ut.contentLocation = {
      '@type': 'Place',
      name: sted.navn,
      ...(lat !== undefined && lon !== undefined ? { geo: { '@type': 'GeoCoordinates', latitude: lat, longitude: lon } } : {}),
    };
  }

  if (typeof rettelse === 'string' && rettelse.trim()) {
    ut.correction = { '@type': 'CorrectionComment', text: rettelse.trim(), ...(endret ? { datePublished: endret } : {}) };
  }
  return ut;
}
