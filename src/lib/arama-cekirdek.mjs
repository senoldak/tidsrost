// Site içi arama çekirdeği: hem derlemede (dizin) hem tarayıcıda (arama) çalışır; bağımlılık yok.
// Neden kendi aramamız: Pagefind WebAssembly ister, sitenin CSP'si (script-src 'self') buna izin vermez.
// Eşleme harf ve aksan duyarsızdır: "doviz" → "döviz", "isci" → "işçi", "Ø" → "o"; her kelime başlık, spot ya da
// kategoride geçmelidir (kelime içinde de geçebilir: "enflas" → "enflasyon").

const ESLE = { ı: 'i', İ: 'i', ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c', â: 'a', î: 'i', û: 'u', ø: 'o', æ: 'ae', å: 'a', ß: 'ss' };

/** Küçük harf, aksansız, yalnız harf/rakam ve tek boşluk. */
export function normalle(metin = '') {
  return String(metin)
    .replace(/[İIıŞşĞğÜüÖöÇçÂâÎîÛûØøÆæÅåß]/g, (h) => ESLE[h] ?? ESLE[h.toLowerCase()] ?? h.toLowerCase())
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Sorgudaki kelimeler (en az 2 harf). */
export const kelimeler = (sorgu) => normalle(sorgu).split(' ').filter((k) => k.length >= 2);

/**
 * Dizin kayıtlarında arar. Kayıt: { t: başlık, d: spot, k: kategori, u: adres, z: ISO tarih }.
 * Her kelime başlık+spot+kategoride geçmeli. Puan: başlıkta geçen kelime 3, kelime başında geçen ek 1; eşitlikte yeni önce.
 * @returns kayıtlar, en iyi önce, en fazla `azami`
 */
export function ara(kayitlar, sorgu, azami = 50) {
  const ks = kelimeler(sorgu);
  if (!ks.length) return [];
  const sonuc = [];
  for (const k of kayitlar) {
    const baslik = ` ${normalle(k.t)} `;
    const tum = `${baslik}${normalle(k.d)} ${normalle(k.k)} `;
    let puan = 0;
    let tamam = true;
    for (const w of ks) {
      if (!tum.includes(w)) {
        tamam = false;
        break;
      }
      if (baslik.includes(w)) puan += 3;
      if (tum.includes(` ${w}`)) puan += 1;
    }
    if (tamam) sonuc.push({ k, puan });
  }
  return sonuc
    .sort((a, b) => b.puan - a.puan || (a.k.z < b.k.z ? 1 : -1))
    .slice(0, azami)
    .map((x) => x.k);
}
