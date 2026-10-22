// Standartlar Faz 0: her sayfanın sonundaki tek yapay zekâ notu ve "Meld fra om feil" bağlantısı.
// Bot yazıları ve sahibin adıyla çıkan yazılar (yazar Şenol Dak ya da yazı işleri / Forklart) farklı not alır.
// Yazı işleri zincirinin yazısı (produksjon: ki-redigert; yerleştirme yazar) her kuraldan önce zincir notunu alır:
// imzası Şenol Dak ve sjanger forklart olsa da çeviri/dil düzeltmesi notunu almaz.
// Not yalnız görünür metindir; JSON-LD'ye girmez. redaksjon.json içindeki visKiMerking bu notu etkilemez.
export const EPOST = 'redaksjon@tidsrost.com';
export const REDAKTOR = 'Şenol Dak';
export const KJEDE_PRODUKSJON = 'ki-redigert';

export const BOT_NOTAT = 'Saken er skrevet automatisk med KI.';
export const EIER_NOTAT = 'KI-verktøy er brukt til oversettelse og språkvask. Alle tall er hentet fra offisielle kilder og kontrollert.';
export const KJEDE_NOTAT =
  'Saken er skrevet med KI-verktøy. Tall og sitater er kontrollert mot offisielle kilder, og redaksjonen har lest og godkjent saken før publisering.';
export const LENKE_TEKST = 'Meld fra om feil →';

// Sahibin adıyla çıkan yazı: yazar Şenol Dak ya da yazı işleri yazısı (sjanger forklart).
export const erEierSak = ({ author, sjanger } = {}) => author === REDAKTOR || sjanger === 'forklart';

// Yazı işleri zincirinin yazısı: produksjon ki-redigert.
export const erKjedeSak = ({ produksjon } = {}) => produksjon === KJEDE_PRODUKSJON;

// Döner: { tekst, lenkeTekst, href, eier, kjede }. url: sayfanın tam adresi.
export function kiNotat({ author, sjanger, produksjon, tittel, url, epost = EPOST, bot = false } = {}) {
  const kjede = !bot && erKjedeSak({ produksjon });
  const eier = !bot && !kjede && erEierSak({ author, sjanger });
  const href = `mailto:${epost}?subject=${encodeURIComponent(`Feil i saken: ${tittel}`)}&body=${encodeURIComponent(url)}`;
  return { tekst: kjede ? KJEDE_NOTAT : eier ? EIER_NOTAT : BOT_NOTAT, lenkeTekst: LENKE_TEKST, href, eier, kjede };
}
