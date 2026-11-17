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

// news: tarihe göre yeniden eskiye sıralı. Döner: { signatur, hero, rest } (rest: imza ve manşet hariç).
export function velgForside(news = []) {
  const signatur = news.find(erSignaturSak);
  const uten = news.filter((h) => h !== signatur);
  const hero = uten.find((h) => h.data?.featured) ?? uten.find(kanVaereManset) ?? uten[0];
  const rest = uten.filter((h) => h !== hero);
  return { signatur, hero, rest };
}
