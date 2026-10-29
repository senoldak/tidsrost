// Günlük "Farevarsler <dag>" derleme sayfaları 29.10.2026'dan beri kapalı: sarı ve turuncu uyarıların günlük kaydı
// artık /farevarsler/ sayfasındaki arşivde (src/data/varselarkiv.json). Kırmızı uyarı ve çığ tehlikesi tek haber
// olarak kalır (bu anahtar onları etkilemez). Geri açmak için repo değişkeni FAREVARSEL_DAGSSIDE=1.
export const dagssideAktiv = (env = process.env) => env.FAREVARSEL_DAGSSIDE === '1';
