// Standartlar Faz 0: her sayfanın sonundaki tek yapay zekâ notu ve "Meld fra om feil" bağlantısı.
// Bot yazıları ve sahibin adıyla çıkan yazılar (yazar Şenol Dak ya da yazı işleri / Forklart) farklı not alır.
// Not yalnız görünür metindir; JSON-LD'ye girmez. redaksjon.json içindeki visKiMerking bu notu etkilemez.
export const EPOST = 'redaksjon@tidsrost.com';
export const REDAKTOR = 'Şenol Dak';

export const BOT_NOTAT = 'Saken er skrevet automatisk med KI.';
export const EIER_NOTAT = 'KI-verktøy er brukt til oversettelse og språkvask. Alle tall er hentet fra offisielle kilder og kontrollert.';
export const LENKE_TEKST = 'Meld fra om feil →';

// Sahibin adıyla çıkan yazı: yazar Şenol Dak ya da yazı işleri yazısı (sjanger forklart).
export const erEierSak = ({ author, sjanger } = {}) => author === REDAKTOR || sjanger === 'forklart';

// Döner: { tekst, lenkeTekst, href, eier }. url: sayfanın tam adresi.
export function kiNotat({ author, sjanger, tittel, url, epost = EPOST, bot = false } = {}) {
  const eier = !bot && erEierSak({ author, sjanger });
  const href = `mailto:${epost}?subject=${encodeURIComponent(`Feil i saken: ${tittel}`)}&body=${encodeURIComponent(url)}`;
  return { tekst: eier ? EIER_NOTAT : BOT_NOTAT, lenkeTekst: LENKE_TEKST, href, eier };
}
