// Sitenin metin ve grafikleri CC BY-NC 4.0 (logo/marka hariç); medya kaynaklı haberde adsız kaynak satırı.
export const LISENS_URL = 'https://creativecommons.org/licenses/by-nc/4.0/deed.no';
export const LISENS_JSONLD_URL = 'https://creativecommons.org/licenses/by-nc/4.0/';

// Medya adı hiçbir yerde yazılmaz; resmî kaynaklı haberdeki "*Kilde: [Ad](url)*" satırıyla aynı görsel düzen (italik paragraf).
export const MEDIA_KILDE_TEKST = 'Kilde: saker i flere uavhengige nyhetsmedier (navngis ikke).';

// Yalnız ki-medier haberi, Forklart ve resmî kaynak satırı olmayanlarda.
export function visMedieKilde({ produksjon, forklart, harOffentligKilde }) {
  return produksjon === 'ki-medier' && !forklart && !harOffentligKilde;
}
