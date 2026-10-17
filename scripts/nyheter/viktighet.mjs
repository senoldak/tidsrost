// Haber değeri: seçimden önce bütün adaylar tek Gemini çağrısıyla 1–100 puanlanır.
// MIN_VIKTIGHET altındakiler yazılmaz; kalanlar puan sırasıyla seçilir (eşit puanda kaynaklar arasında sırayla).
// Şablonla yazılan veri kaynakları (uyarılar, kur, istatistik) puanlanmaz: kendi eşikleri var.
import { gemini } from './lib.mjs';

// 2026-10-17 site sahibinin kararıyla ölçek 1–5'ten 1–100'e geçti, eşik 3/5'ten 3,5/5'e, yani 70/100'e çıktı
// (tam sayılı 1–5'te 3,5 pratikte 4 olurdu).
export const MIN_VIKTIGHET = 70;
export const UTEN_VURDERING = new Set(['met', 'nve', 'norgesbank', 'udi']);
const STANDARD = 70;
// Puanlanmayan veri kaynakları (resmî uyarılar vb.) sıralamada sıradan bir haberin önünde durur.
const DATA_POENG = 80;
const MAKS_I_KALL = 150;

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
 * kandidater: { kildenavn: [kandidat] }. Döner: Map(kandidat → puan), ya da Gemini cevap vermezse null
 * (o zaman çağıran eski usulle, puansız seçer).
 */
export async function vurder(kandidater, { kall = gemini } = {}) {
  const liste = Object.entries(kandidater)
    .filter(([navn]) => !UTEN_VURDERING.has(navn))
    .flatMap(([navn, l]) => l.map((k) => ({ navn, k })))
    .slice(0, MAKS_I_KALL);
  const poeng = new Map();
  if (!liste.length) return poeng;
  const svar = await kall({
    schema: SKJEMA,
    tenkning: 'minimal',
    prompt: `Du er vaktsjef i en norsk nettavis for et bredt publikum. Gi hver sak under en nyhetsverdi fra 1 til 100:
90–100 = stor nyhet de fleste i Norge bør få med seg (vedtak med bred virkning, store hendelser, viktige tall).
70–89 = klar nyhet med betydning for mange.
50–69 = nyttig nyhet for en tydelig gruppe lesere.
30–49 = smal eller rutinepreget (tilsettinger, arrangementer, høringer uten nytt innhold, mindre tilskudd).
1–29 = ingen nyhetsverdi for allmennheten (interne saker, påminnelser, generell informasjon).
Finjuster innenfor intervallet. 70 eller mer publiseres: gi det bare til saker leserne virkelig bør få med seg, og gi ikke 70 hvis du er usikker.
Vurder bare nyhetsverdien, ikke kilden. Svar med ett poeng per nummer.

${liste.map(({ navn, k }, i) => `${i}. [${navn}] ${rentTittel(k)}`).join('\n')}`,
  });
  if (!svar?.poeng) return null;
  for (const { nr, poeng: p } of svar.poeng) {
    if (Number.isInteger(nr) && liste[nr] && Number.isInteger(p)) poeng.set(liste[nr].k, Math.min(100, Math.max(1, p)));
  }
  return poeng;
}

/**
 * Seçim. poeng null ise eski usul (sadece sırayla). Döner: { valgt, forkastet }.
 * forkastet: eşiğin altında kalan adaylar (çağıran bunları görüldü işaretler).
 */
export function velg(kandidater, poeng, maks) {
  const kopi = Object.fromEntries(Object.entries(kandidater).map(([n, l]) => [n, [...l]]));
  // Kaynaklar arasında sırayla dizilmiş tam liste (biri diğerlerini bastırmasın).
  const sirali = [];
  while (Object.values(kopi).some((l) => l.length)) {
    for (const [navn, l] of Object.entries(kopi)) if (l.length) sirali.push({ navn, k: l.shift() });
  }
  const puan = ({ navn, k }) => (UTEN_VURDERING.has(navn) ? DATA_POENG : !poeng ? STANDARD : poeng.get(k) ?? STANDARD);
  const forkastet = poeng ? sirali.filter((x) => puan(x) < MIN_VIKTIGHET).map((x) => x.k) : [];
  const valgt = sirali
    .map((x, i) => ({ ...x, i, p: puan(x) }))
    .filter((x) => x.p >= MIN_VIKTIGHET)
    .sort((a, b) => b.p - a.p || a.i - b.i)
    .slice(0, maks)
    .map((x) => x.k);
  return { valgt, forkastet };
}
