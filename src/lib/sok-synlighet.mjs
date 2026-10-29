// Hangi haberler arama motorlarına açık? Derlemede (robots etiketi, site haritaları) aynı ölçü kullanılır.
// Düz JavaScript; hem Astro sayfaları hem astro.config.mjs kullanır. IndexNow listesini dist/news-sitemap.xml'den
// aldığı için buradan kapanan haber oraya da gitmez.
//
// 29.10.2026 (sahibinin kararı): Google 21 Ekim'de siteyi toplu taradıktan sonra en yeni yazıların hiçbirini
// dizine almadı ("taranmış, dizine eklenmemiş"). Okurun neredeyse tamamı Facebook'tan geliyor. Başka medyanın
// haberinden yeniden yazılan haberler (produksjon: ki-medier) ve günlük farevarsel derlemeleri sitede ve
// paylaşımlarda kalır, ama arama motorlarına kapatılır (noindex, follow) ve site haritalarına girmez.
// Google siteyi resmî kaynaklı haberler, Forklart ve Analyse üzerinden tartsın. Geri almak için
// SKJULT_PRODUKSJON'u boşalt ve erFarevarsel kontrolünü kaldır.
import { indekserbar } from './ordtelling.mjs';

export const SKJULT_PRODUKSJON = new Set(['ki-medier']);

/** Günlük farevarsel derlemesi (farevarsler-<dag>) ya da başlığı "Gult/Oransje/Rødt … varsel" olan tekil uyarı. */
export const erFarevarsel = ({ id = '', title = '' } = {}) =>
  String(id).split('/').pop().startsWith('farevarsler-') || /^(gult|oransje|rødt)\b.*varsel/i.test(String(title));

/** İçerik türü yüzünden arama motorlarına kapalı mı (uzunluktan bağımsız)? */
export const skjultForSok = ({ produksjon, id, title } = {}) =>
  SKJULT_PRODUKSJON.has(String(produksjon ?? '').trim()) || erFarevarsel({ id, title });

/** Arama motorlarına açık mı? Kısa haber (src/lib/ordtelling.mjs) ya da kapalı içerik türü değilse açıktır. */
export const apenForSok = ({ body, produksjon, id, title } = {}) =>
  indekserbar(body) && !skjultForSok({ produksjon, id, title });
