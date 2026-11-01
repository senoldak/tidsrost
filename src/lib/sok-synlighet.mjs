// Hangi haberler arama motorlarına açık? Derlemede (robots etiketi, site haritaları) aynı ölçü kullanılır.
// Düz JavaScript; hem Astro sayfaları hem astro.config.mjs kullanır. IndexNow listesini dist/news-sitemap.xml'den
// aldığı için buradan kapanan haber oraya da gitmez.
//
// 29.10.2026 (sahibinin kararı): Google 21 Ekim'de siteyi toplu taradıktan sonra en yeni yazıların hiçbirini
// dizine almadı ("taranmış, dizine eklenmemiş"). Okurun neredeyse tamamı Facebook'tan geliyor. Başka medyanın
// haberinden yeniden yazılan haberler (produksjon: ki-medier) ve günlük farevarsel derlemeleri sitede ve
// paylaşımlarda kalır, ama Google'a kapatılır (googlebot: noindex, follow) ve site haritalarına girmez.
// Aynı gün: kapatma yalnız Google'a özel yapıldı; ChatGPT, Perplexity, Bing gibi aramalar bu haberleri görmeye devam eder.
// Google siteyi resmî kaynaklı haberler, Forklart ve Analyse üzerinden tartsın. Geri almak için
// SKJULT_PRODUKSJON'u boşalt ve erFarevarsel kontrolünü kaldır.
//
// 1.11.2026 Google denemesi (sahibinin onayı): ki-medier haberi, ALTI koşulun hepsi varsa Google'a yeniden açılır:
// en az 3 kaynak (kilder), toplu haber değil (nyheter-* ya da "… og N andre saker") ve en az bir kendi katkı
// (yer haritası sted.webp + visKart, ya da datakortFor kartı, ya da boş olmayan "Tidligere i saken").
// Tidligere i saken bütün koleksiyona baktığı için uygun haberlerin kümesi derlemede BİR kez hesaplanır
// (src/lib/google-test.mjs googleTestIder) ve sayfa, site haritası (astro.config.mjs, news-sitemap.xml.ts) ve IndexNow
// (news-sitemap'ten okur) aynı kümeyi kullanır. Bu dosya yalnız saf kuralı taşır (kanApnesForGoogle).
// Kısa haber ve farevarsel derlemesi bu denemede de kapalı kalır. Geri alma: ortam değişkeni GOOGLE_TEST=0
// (derleme ortamına, örn. yayinla.yml env) denemeyi kapatır; hiçbir haber yeniden açılmaz.
import { indekserbar } from './ordtelling.mjs';

export const SKJULT_PRODUKSJON = new Set(['ki-medier']);

/** Günlük farevarsel derlemesi (farevarsler-<dag>) ya da başlığı "Gult/Oransje/Rødt … varsel" olan tekil uyarı. */
export const erFarevarsel = ({ id = '', title = '' } = {}) =>
  String(id).split('/').pop().startsWith('farevarsler-') || /^(gult|oransje|rødt)\b.*varsel/i.test(String(title));

export const MIN_KILDER = 3;

/** GOOGLE_TEST=0 denemeyi kapatır (varsayılan: açık). */
export const googleTestPa = (env = process.env) => String(env?.GOOGLE_TEST ?? '').trim() !== '0';

/** Toplu haber: nyheter-<gün> sayfası ya da "… og N andre saker" başlığı. */
export const erSamlesak = ({ id = '', title = '' } = {}) =>
  /^nyheter-/.test(String(id).split('/').pop()) || / og \d+ (?:andre saker|annen sak)\b/u.test(String(title));

/**
 * Google denemesi: kapalı ki-medier haberi yeniden açılabilir mi?
 * @param {{ id?: string, title?: string, produksjon?: string, antallKilder?: number, harBidrag?: boolean }} sak
 */
export const kanApnesForGoogle = ({ id, title, produksjon, antallKilder = 0, harBidrag = false } = {}, env = process.env) =>
  googleTestPa(env) &&
  SKJULT_PRODUKSJON.has(String(produksjon ?? '').trim()) &&
  antallKilder >= MIN_KILDER &&
  !erSamlesak({ id, title }) &&
  !erFarevarsel({ id, title }) &&
  !!harBidrag;

/** İçerik türü yüzünden arama motorlarına kapalı mı (uzunluktan bağımsız)? apnet: Google denemesinde açılan haber. */
export const skjultForSok = ({ produksjon, id, title, apnet = false } = {}) =>
  (SKJULT_PRODUKSJON.has(String(produksjon ?? '').trim()) && !apnet) || erFarevarsel({ id, title });

/** Arama motorlarına açık mı? Kısa haber (src/lib/ordtelling.mjs) ya da kapalı içerik türü değilse açıktır. */
export const apenForSok = ({ body, produksjon, id, title, apnet = false } = {}) =>
  indekserbar(body) && !skjultForSok({ produksjon, id, title, apnet });
