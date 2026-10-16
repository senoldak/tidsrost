// Haber gövdesinin kelime sayısı: derlemede (noindex, site haritaları) ve botta (taslak uzunluğu) aynı ölçü.
// Düz JavaScript; hem Astro sayfaları ve astro.config.mjs hem de scripts/nyheter içindeki Node betikleri kullanır.

// Bu sayının altındaki haberler arama motorlarına kapalıdır (noindex, follow) ve site haritalarına girmez:
// kısa haberler okura yine açıktır, ama "ince içerik" olarak sitenin bütününü aşağı çekmesin.
export const MIN_ORD_INDEKS = 120;

/**
 * Markdown gövdesindeki kelime sayısı. Kaynak satırı ("*Kilde: …*"), link adresleri, resimler, HTML ve
 * tablo çizgileri sayılmaz; içinde harf ya da rakam olan her boşlukla ayrılmış parça bir kelimedir.
 * @param {string | undefined} body
 * @returns {number}
 */
export function ordtelling(body = '') {
  const tekst = String(body ?? '')
    .replace(/^---\r?\n[\s\S]*?\r?\n---/, '')
    .replace(/^\s*\*Kilder?:.*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[|#>*_`]/g, ' ');
  return tekst.split(/\s+/).filter((o) => /[\p{L}\d]/u.test(o)).length;
}

/**
 * Arama motorlarına açık mı? Kısa haber (MIN_ORD_INDEKS altı) noindex olur ve site haritalarından çıkarılır.
 * @param {string | undefined} body
 */
export const indekserbar = (body) => ordtelling(body) >= MIN_ORD_INDEKS;

/**
 * Lesetid i minutter (200 ord i minuttet, minst 1). Vises bare når den er 2 minutter eller mer:
 * korte nyhetssaker er alle «1 min» og forteller leseren ingenting.
 * @param {string | undefined} body
 */
export const lesetid = (body) => Math.max(1, Math.round(ordtelling(body) / 200));
