// Haber değeri: seçimden önce bütün adaylar tek Gemini çağrısıyla 1–100 puanlanır.
// MIN_VIKTIGHET altındakiler yazılmaz; kalanlar puan sırasıyla seçilir (eşit puanda kaynaklar arasında sırayla).
// Şablonla yazılan veri kaynakları (uyarılar, kur, istatistik) puanlanmaz: kendi eşikleri var.
import { createHash } from 'node:crypto';
import { gemini } from './lib.mjs';

// 2026-10-17 site sahibinin kararıyla ölçek 1–5'ten 1–100'e geçti, eşik 3/5'ten 3,5/5'e, yani 70/100'e çıktı
// (tam sayılı 1–5'te 3,5 pratikte 4 olurdu).
export const MIN_VIKTIGHET = 70;
export const UTEN_VURDERING = new Set(['met', 'nve', 'norgesbank', 'udi']);
// Puanlanmayan veri kaynakları (resmî uyarılar vb.) sıralamada sıradan bir haberin önünde durur.
const DATA_POENG = 80;
const MAKS_I_KALL = 150;

// Katman 2.3 (Gemini kota planı): puanlanan haber sonraki turlarda yeniden sorulmaz (kimliğe göre saklanır, 3 gün geçerli).
// Puanlama istemi ya da eşik değişince PUAN_VERSJON değişir ve eski kayıtlar geçersiz sayılır.
export const PUAN_ISTEM = `Du er vaktsjef i en norsk nettavis for et bredt publikum. Gi hver sak under en nyhetsverdi fra 1 til 100:
90–100 = stor nyhet de fleste i Norge bør få med seg (vedtak med bred virkning, store hendelser, viktige tall).
70–89 = klar nyhet med betydning for mange.
50–69 = nyttig nyhet for en tydelig gruppe lesere.
30–49 = smal eller rutinepreget (tilsettinger, arrangementer, høringer uten nytt innhold, mindre tilskudd).
1–29 = ingen nyhetsverdi for allmennheten (interne saker, påminnelser, generell informasjon).
Finjuster innenfor intervallet. 70 eller mer publiseres: gi det bare til saker leserne virkelig bør få med seg, og gi ikke 70 hvis du er usikker.
Vurder bare nyhetsverdien, ikke kilden. Svar med ett poeng per nummer.`;
export const PUAN_VERSJON = createHash('sha256').update(`${PUAN_ISTEM}|${MIN_VIKTIGHET}`).digest('hex').slice(0, 12);
export const PUAN_GECERLI_MS = 3 * 864e5;

const SKJEMA = {
  type: 'object',
  properties: {
    poeng: {
      type: 'array',
      items: { type: 'object', properties: { nr: { type: 'integer' }, poeng: { type: 'integer' } }, required: ['nr', 'poeng'] },
    },
  },
  required: ['poeng'],
};

// medier adaylarının başlığında site sayısı parantez içinde durur; modele gösterilmez.
const rentTittel = (k) => k.tittel.replace(/\s*\([^)]*\)\s*$/, '');

/**
 * hukommelse: kalıcı puan önbelleği { id: { p, v, t } } (çağıran durum dosyasında saklar; bu fonksiyon yeni puanları yazar).
 * kandidater: { kildenavn: [kandidat] }. Döner: Map(kandidat → puan), ya da Gemini cevap vermezse null
 * (o zaman puanlanan haberler bu tur yazılmaz).
 */
export async function vurder(kandidater, { kall = gemini, hukommelse = {}, na = Date.now() } = {}) {
  const liste = Object.entries(kandidater)
    .filter(([navn]) => !UTEN_VURDERING.has(navn))
    .flatMap(([navn, l]) => l.map((k) => ({ navn, k })))
    .slice(0, MAKS_I_KALL);
  const poeng = new Map();
  if (!liste.length) return poeng;
  // Önbellek: geçerli ve aynı sürümde puanı olanlar sorulmaz.
  const gecerli = (k) => {
    const e = hukommelse[k.id];
    return e && e.v === PUAN_VERSJON && Number.isInteger(e.p) && na - Date.parse(e.t) < PUAN_GECERLI_MS ? e : null;
  };
  const sor = [];
  for (const { navn, k } of liste) {
    const e = gecerli(k);
    if (e) poeng.set(k, e.p);
    else sor.push({ navn, k });
  }
  if (!sor.length) return poeng;
  const svar = await kall({
    schema: SKJEMA,
    tenkning: 'minimal',
    prompt: `${PUAN_ISTEM}

${sor.map(({ navn, k }, i) => `${i}. [${navn}] ${rentTittel(k)}`).join('\n')}`,
  });
  if (!svar?.poeng) return null;
  for (const { nr, poeng: p } of svar.poeng) {
    if (Number.isInteger(nr) && sor[nr] && Number.isInteger(p)) {
      const verdi = Math.min(100, Math.max(1, p));
      poeng.set(sor[nr].k, verdi);
      hukommelse[sor[nr].k.id] = { p: verdi, v: PUAN_VERSJON, t: new Date(na).toISOString() };
    }
  }
  return poeng;
}

/**
 * Seçim. Standartlar: puanı olmayan aday seçilmez (puanlama çökerse ya da adayı atlarsa haber yayımlanmaz).
 * poeng null ise yalnız puanlanmayan veri kaynakları (UTEN_VURDERING) seçilir; diğerleri havuzda kalır.
 * Döner: { valgt, forkastet }. forkastet: puanı eşiğin altında kalan adaylar (çağıran bunları görüldü işaretler);
 * puansız adaylar ne seçilir ne forkastet sayılır, sonraki turda yeniden puanlanır.
 */
// Bir turda en çok VARSEL_TAVAN farevarsel (MET/NVE) haberi yazılır; fazlası seçilmez, havuzda kalır ve sonraki turlara gider
// (aynı fırtına için tek turda 9 uyarı çıkmıştı, 23 Ekim). Geçerliliği biten uyarı sonraki turda kaynaktan zaten düşer.
export const VARSEL_KAYNAKLAR = new Set(['met', 'nve']);
export const VARSEL_TAVAN = 3;

export function velg(kandidater, poeng, maks, { varselTavan = VARSEL_TAVAN } = {}) {
  const kopi = Object.fromEntries(Object.entries(kandidater).map(([n, l]) => [n, [...l]]));
  // Kaynaklar arasında sırayla dizilmiş tam liste (biri diğerlerini bastırmasın).
  const sirali = [];
  while (Object.values(kopi).some((l) => l.length)) {
    for (const [navn, l] of Object.entries(kopi)) if (l.length) sirali.push({ navn, k: l.shift() });
  }
  const puan = ({ navn, k }) => (UTEN_VURDERING.has(navn) ? DATA_POENG : poeng?.get(k) ?? null);
  const forkastet = sirali.filter((x) => puan(x) !== null && puan(x) < MIN_VIKTIGHET).map((x) => x.k);
  let varselSayisi = 0;
  const valgt = sirali
    .map((x, i) => ({ ...x, i, p: puan(x) }))
    .filter((x) => x.p !== null && x.p >= MIN_VIKTIGHET)
    .sort((a, b) => b.p - a.p || a.i - b.i)
    .filter((x) => {
      if (!VARSEL_KAYNAKLAR.has(x.navn)) return true;
      return ++varselSayisi <= varselTavan;
    })
    .slice(0, maks)
    .map((x) => x.k);
  return { valgt, forkastet };
}

// Süresi geçmiş ya da başka sürümden kalan önbellek kayıtlarını siler.
export function puanTemizle(hukommelse, na = Date.now()) {
  for (const [id, e] of Object.entries(hukommelse)) {
    if (!e || e.v !== PUAN_VERSJON || !(na - Date.parse(e.t) < PUAN_GECERLI_MS)) delete hukommelse[id];
  }
}
