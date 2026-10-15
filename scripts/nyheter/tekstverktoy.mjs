// Gemini'siz metin araçları (saf fonksiyonlar):
//   lokalRett   — kesin kontrollerin yakaladığı basit sorunları (göreli zaman, medya atfı) yerelde siler;
//                 böylece sırf bunlar için Gemini düzeltme çağrısı yapılmaz.
//   ilgiliKisim — taslak varken uzun kaynağı baştan kesmek yerine taslakla örtüşen paragrafları seçer.
// Kesin kontroller (rakam/alıntı doğrulama) her zaman TAM kaynağı kullanır; kırpma sadece istem içindir.
import { hemmeligeMedienavn } from './hemmelig.mjs';

// Göreli zaman ifadeleri (sjekkRelativTid ile aynı liste).
export const RELATIV_TID = /(?<!\p{L})(i går|i dag|i morgen|i forgårs|i kveld|i natt)(?!\p{L})/giu;

// Medya adları (sjekkMedier ile aynı liste). Genel liste alfabetiktir (regex parçaları); botun okuduğu akışların
// site adları çalışma anında şifreli listeden eklenir (bkz. hemmelig.mjs). Alternatiflerde en uzun ad önce denenir.
const GENEL_MEDIER = [
  'Adresseavisen',
  'AFP',
  'Aftenposten',
  'Al Jazeera',
  'ANB',
  'Avisenes Nyhetsbyrå',
  'BBC',
  'Bergens Tidende',
  'Bloomberg',
  'CNN',
  'Dagbladet',
  'Dagens Næringsliv',
  'Dagsavisen',
  'DN\\.no',
  'E24',
  'Financial Times',
  'Fædrelandsvennen',
  'iTromsø',
  'Klassekampen',
  'Nettavisen',
  'New York Times',
  'Nordlys',
  'NRK',
  'NTB',
  'Reuters',
  'Romsdals Budstikke',
  'Sky News',
  'Stavanger Aftenblad',
  'The Guardian',
  'TV ?2',
  'VG',
  'Wall Street Journal',
  'Washington Post',
];
const regexKilde = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const MEDIE_NAVN = [...new Set([...GENEL_MEDIER, ...hemmeligeMedienavn().map(regexKilde)])]
  .sort((a, b) => b.length - a.length)
  .join('|');
export const MEDIER = new RegExp(`(?<![\\p{L}\\d])(${MEDIE_NAVN})(?![\\p{L}\\d])`, 'gu');

// Log ve durum dosyası için: metindeki medya adlarını maskeler (açık Actions loglarına ad düşmesin).
export const maskerMedier = (tekst) => String(tekst).replace(MEDIER, '[medie]');

// ── lokalRett ──────────────────────────────────────────────────────────

// Cümle ortasındaki göreli zaman: önünde harf/rakam + boşluk olmalı (cümle başı V2 kelime sırası yüzünden
// Gemini'ye kalır). "til i dag", "fra i morgen" gibi edatlı kullanımlar silinirse cümle bozulur; atlanır.
const RELATIV_MIDT = /(?<=[\p{L}\d])( +)(i går|i dag|i morgen|i forgårs|i kveld|i natt)(?!\p{L})/gu;
const PREP_FOER = /(?:^|\s)(til|fra|frem|fram|siden|enn|før|etter|inntil|natt|innen|av|for|om|og|eller)$/iu;

// Sadece cümle sonundaki atıf kalıbı: ", ifølge <medie>." / ", skriver <medie> og <medie>." / " ifølge <medie>."
const MEDIE_ATTR = new RegExp(
  `(?:,\\s*|\\s+)ifølge (?:${MEDIE_NAVN})(?:\\s+og\\s+(?:${MEDIE_NAVN}))?(?=[.!?])` +
    `|,\\s*(?:skriver|melder|rapporterer|opplyser) (?:${MEDIE_NAVN})(?:\\s+og\\s+(?:${MEDIE_NAVN}))?(?=[.!?])`,
  'gu',
);

function rettSegment(s) {
  let ut = s.replace(RELATIV_MIDT, (hel, _mell, _uttr, off, str) => (PREP_FOER.test(str.slice(0, off)) ? hel : ''));
  ut = ut.replace(MEDIE_ATTR, '');
  return ut.replace(/ {2,}/g, ' ').replace(/ +([,.!?;:])/g, '$1');
}

// Alıntılar (« » içi, "…" içi ve tireyle başlayan replik satırları) hiç değişmez.
export function lokalRettTekst(tekst) {
  if (!tekst) return tekst;
  return tekst
    .split('\n')
    .map((linje) => {
      if (/^\s*[–-]/.test(linje)) return linje;
      return linje
        .split(/(«[^»]*»|“[^”]*”|"[^"]*")/)
        .map((del, i) => (i % 2 ? del : rettSegment(del)))
        .join('');
    })
    .join('\n');
}

export const lokalRett = (sak) => ({
  ...sak,
  title: lokalRettTekst(sak.title),
  description: lokalRettTekst(sak.description),
  body: lokalRettTekst(sak.body),
});

// ── ilgiliKisim ────────────────────────────────────────────────────────

const ÅPNING = 1500;
const SKILLE = '\n\n[…]\n\n';

// 1.250 / 1,250 / 1 250 / 1250 → "1250" (kaba normalleştirme; sadece puanlama için).
const tallNøkler = (t) =>
  new Set((t.match(/\d[\d.,  ]*\d|\d/g) ?? []).map((x) => x.replace(/\D/g, '')).filter((x) => x.length >= 2));
const navnNøkler = (t) => new Set((t.match(/\p{Lu}[\p{L}-]{2,}/gu) ?? []).map((w) => w.toLowerCase()));
const langeOrd = (t) => new Set((t.match(/\p{L}{8,}/gu) ?? []).map((w) => w.toLowerCase()));
const sitatBiter = (t) =>
  [...t.matchAll(/«([^»]{15,})»|“([^”]{15,})”|"([^"]{15,})"/g)].map((m) => (m[1] ?? m[2] ?? m[3]).toLowerCase().slice(0, 40));

function biter(kilde) {
  const avsnitt = kilde.split(/\n\s*\n/);
  // Çok uzun paragraflar cümlelere bölünür.
  return avsnitt.flatMap((a) => (a.length > 3000 ? a.split(/(?<=[.!?])\s+/) : [a])).filter((a) => a.trim());
}

export function ilgiliKisim(kilde, taslakMetni, sinir) {
  if (!kilde || kilde.length <= sinir) return kilde;
  const deler = biter(kilde);
  const tall = tallNøkler(taslakMetni);
  const navn = navnNøkler(taslakMetni);
  const ord = langeOrd(taslakMetni);
  const sitater = sitatBiter(taslakMetni);

  const valgt = new Set();
  let brukt = 0;
  // Açılış her zaman kalır.
  for (let i = 0; i < deler.length && brukt < ÅPNING; i++) {
    if (brukt + deler[i].length > sinir) break;
    valgt.add(i);
    brukt += deler[i].length + SKILLE.length;
  }

  const poeng = deler.map((d, i) => {
    if (valgt.has(i)) return { i, p: -1 };
    const lav = d.toLowerCase();
    let p = 0;
    for (const t of tallNøkler(d)) if (tall.has(t)) p += 5;
    for (const n of navnNøkler(d)) if (navn.has(n)) p += 3;
    for (const w of langeOrd(d)) if (ord.has(w)) p += 1;
    for (const s of sitater) if (lav.includes(s)) p += 10;
    return { i, p: p / Math.sqrt(Math.max(d.length, 200) / 200) };
  });
  for (const { i, p } of poeng.filter((x) => x.p > 0).sort((a, b) => b.p - a.p)) {
    if (brukt + deler[i].length > sinir) continue;
    valgt.add(i);
    brukt += deler[i].length + SKILLE.length;
  }

  const idx = [...valgt].sort((a, b) => a - b);
  if (!idx.length) return kilde.slice(0, sinir);
  let ut = deler[idx[0]];
  for (let k = 1; k < idx.length; k++) ut += (idx[k] === idx[k - 1] + 1 ? '\n\n' : SKILLE) + deler[idx[k]];
  return ut;
}
