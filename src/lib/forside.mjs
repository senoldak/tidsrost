// Ön sayfa seçimi (17.11.2026).
// - İmza şeridi: sahibin en yeni yazısı (Forklart/Analyse); sayfanın başka yerinde tekrar etmez.
// - Manşet: yalnız resmî kaynaktan yazılan ya da tablodan üretilen haber. Başka yayınlardan derlenen
//   haberler (ki-medier) listelerde kalır, manşete çıkmaz. Günlük "Kort fortalt" derlemesi manşet olmaz.
//   Uygun haber yoksa en yeni haber manşet olur.
import { erEierSak } from './kinote.mjs';

export const MANSET_PRODUKSJON = ['ki-kontrollert', 'ki-automatisk', 'automatisk'];

const erDerleme = (h) => String(h?.id ?? '').startsWith('kort-fortalt-');

export const erSignaturSak = (h) => erEierSak({ author: h?.data?.author, sjanger: h?.data?.sjanger });

export const kanVaereManset = (h) =>
  !erSignaturSak(h) && !erDerleme(h) && MANSET_PRODUKSJON.includes(h?.data?.produksjon);

// Ön sayfa listeleri (17.11.2026): KI haberi yalnız nyhetsverdi >= FORSIDE_TERSKEL (75) ise; Kort fortalt yalnız
// bugünün (Oslo). Sahibin yazıları ve tablodan üretilen haberler her zaman. Ötekiler kategori ve arşivde kalır.
export const FORSIDE_TERSKEL = 75;
export const MANSET_TIMER = 24;
// Gün listeleri (I dag / I går / Tidligere) en fazla bu kadar gün geriye gider.
export const FORSIDE_DAGER = 3;
export const innenforDager = (h, na = new Date()) => na - new Date(h.data?.date) <= FORSIDE_DAGER * 86400 * 1000;

const osloDag = (d) => new Date(d).toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });

export function paForsiden(h, na = new Date()) {
  if (erSignaturSak(h)) return true;
  if (erDerleme(h)) return osloDag(h.data?.date) === osloDag(na);
  const p = String(h?.data?.produksjon ?? '');
  if (!p.startsWith('ki-')) return true;
  return Number(h?.data?.nyhetsverdi) >= FORSIDE_TERSKEL;
}

// news: tarihe göre yeniden eskiye sıralı. Döner: { signatur, hero, rest } (rest: imza ve manşet hariç,
// ön sayfa süzgecinden geçmiş). featured manşet süzgece takılmaz.
export function velgForside(news = [], na = new Date()) {
  const signatur = news.find(erSignaturSak);
  const uten = news.filter((h) => h !== signatur);
  // Resmî kaynaklı manşet son MANSET_TIMER saatten olmalı (puan eşiği yok; yayın eşiği yeterli),
  // yoksa ön sayfaya giren en yeni haber manşettir: eski bir haber manşete çıkmaz.
  const fersk = (h) => na - new Date(h.data?.date) <= MANSET_TIMER * 3600 * 1000;
  const hero =
    uten.find((h) => h.data?.featured) ??
    uten.find((h) => kanVaereManset(h) && fersk(h)) ??
    uten.find((h) => paForsiden(h, na)) ??
    uten[0];
  const rest = uten.filter((h) => h !== hero && paForsiden(h, na));
  return { signatur, hero, rest };
}
