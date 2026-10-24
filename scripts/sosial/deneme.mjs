// Paylaşım denemelerinin sayımı. Meta uygulama düzeyinde istek sınırına ("Application request limit reached")
// takıldığında hata haberin değil uygulamanın kotasıdır: tur bırakılır (kalan haberler o turda hiç denenmez, sınır
// beslenmez) ve kanalın deneme hakkı yenmez. Haber başına tavan: AZAMI_LIMIT kez sınıra takılan haber vazgeçilir.
export const AZAMI_DENEME = 3; // kanal başına gerçek hata sayısı
export const AZAMI_LIMIT = 4; // haber başına sınır hatası sayısı

const LIMIT = /request limit reached|application request limit|rate limit|too many calls|reduce the amount of data/i;
export const limitHatasi = (mesaj) => LIMIT.test(String(mesaj ?? ''));

// Hata kaydı: sınır hatası kanal denemesinden düşmez, haberin sınır sayacına yazılır. Döner: 'limit' | 'hata'.
export function hataIsle(k, kanal, mesaj) {
  k.son_hata = String(mesaj).slice(0, 300);
  if (limitHatasi(mesaj)) {
    k.limit = (k.limit ?? 0) + 1;
    return 'limit';
  }
  k.deneme = { ...k.deneme, [kanal]: (k.deneme?.[kanal] ?? 0) + 1 };
  return 'hata';
}

// Hâlâ denenecek kanallar.
export const eksikKanallar = (kanallar, k) =>
  kanallar.filter((c) => !k?.[c] && (k?.deneme?.[c] ?? 0) < AZAMI_DENEME && (k?.limit ?? 0) < AZAMI_LIMIT && !k?.atlandi);
