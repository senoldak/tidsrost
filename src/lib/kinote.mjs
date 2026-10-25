// Standartlar Faz 0: her sayfanın sonundaki tek yapay zekâ notu ve "Meld fra om feil" bağlantısı.
// Bot yazıları ve sahibin adıyla çıkan yazılar (yazar Şenol Dak ya da Forklart) farklı not alır.
// Sahibin yazısı (Forklart, Analyse) "Slik er saken laget" bölümünü alır: yazar, dil ve KI, tall ve kilder,
// (Analyse'de) metode, ansvar. produksjon ki-redigert olsa da sahibin yazısı bu bölümü alır.
// Zincir notu yalnız sahibin olmayan ki-redigert yazılar için kalır.
// Not yalnız görünür metindir; JSON-LD'ye girmez. redaksjon.json içindeki visKiMerking bu notu etkilemez.
export const EPOST = 'redaksjon@tidsrost.com';
export const REDAKTOR = 'Şenol Dak';
export const KJEDE_PRODUKSJON = 'ki-redigert';

export const BOT_NOTAT = 'Saken er skrevet automatisk med KI.';
// Kısa özet (standardrapport, forfatter sayfası); makalede EIER_RADER gösterilir.
export const EIER_NOTAT =
  'Skrevet på tyrkisk av forfatteren og oversatt til norsk med KI-verktøy, som også er brukt til språkvask. KI er ikke brukt til innhold, vinkling eller tall. Alle tall er hentet fra offisielle kilder og kontrollert av forfatteren og maskinelt.';
export const EIER_TITTEL = 'Slik er saken laget';
export const EIER_RADER = [
  {
    etikett: 'Forfatter',
    tekst: `Saken er skrevet av ${REDAKTOR}, utgiver og redaktør i tidsrøst. Valg av tema, data og vinkling, og alle beregninger, er gjort av forfatteren.`,
  },
  {
    etikett: 'Språk og KI',
    tekst:
      'Saken er skrevet på tyrkisk og oversatt til norsk med KI-verktøy, som også er brukt til språkvask. Forfatteren har lest og godkjent den norske teksten og kontrollert oversettelsen med flere verktøy. KI er ikke brukt til innhold, vinkling eller tall, og er aldri en kilde.',
  },
  {
    etikett: 'Tall og kilder',
    tekst:
      'Alle tall er hentet fra offisielle kilder, som er oppført under «Kilder». Tallene er kontrollert mot kildene, både av forfatteren og maskinelt, før publisering.',
  },
];
export const METODE_RAD = { etikett: 'Metode', tekst: 'Beregningene er forklart under «Slik regnet vi».' };
export const ANSVAR_RAD = {
  etikett: 'Ansvar',
  tekst: 'Redaktøren har det redaksjonelle ansvaret for saken. tidsrøst følger Vær Varsom-plakaten som rettesnor.',
  lenke: { parca: 'Vær Varsom-plakaten', adres: '/redaksjonelle-prinsipper/' },
};
export const KI_SIDE = { tekst: 'Slik bruker vi KI →', href: '/bruk-av-ki/' };
export const KJEDE_NOTAT =
  'Saken er skrevet med KI-verktøy. Tall og sitater er kontrollert mot offisielle kilder, og redaksjonen har lest og godkjent saken før publisering.';
export const LENKE_TEKST = 'Meld fra om feil →';

// Sahibin adıyla çıkan yazı: yazar Şenol Dak ya da sjanger forklart.
export const erEierSak = ({ author, sjanger } = {}) => author === REDAKTOR || sjanger === 'forklart';

// Yazı işleri zincirinin yazısı: produksjon ki-redigert ve sahibin yazısı değil.
export const erKjedeSak = ({ produksjon, author, sjanger } = {}) =>
  produksjon === KJEDE_PRODUKSJON && !erEierSak({ author, sjanger });

// Döner: { tekst, lenkeTekst, href, eier, kjede, rader? }. url: sayfanın tam adresi.
// Sahibin yazısında rader = "Slik er saken laget" satırları (Analyse'de metode satırı da).
export function kiNotat({ author, sjanger, produksjon, tittel, url, epost = EPOST, bot = false } = {}) {
  const eier = !bot && erEierSak({ author, sjanger });
  const kjede = !bot && !eier && erKjedeSak({ produksjon, author, sjanger });
  const href = `mailto:${epost}?subject=${encodeURIComponent(`Feil i saken: ${tittel}`)}&body=${encodeURIComponent(url)}`;
  const rader = eier ? [...EIER_RADER, ...(sjanger === 'analyse' ? [METODE_RAD] : []), ANSVAR_RAD] : undefined;
  return { tekst: kjede ? KJEDE_NOTAT : eier ? EIER_NOTAT : BOT_NOTAT, lenkeTekst: LENKE_TEKST, href, eier, kjede, rader };
}
