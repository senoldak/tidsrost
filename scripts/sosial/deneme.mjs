// Paylaşım denemelerinin sayımı. Meta istek sınırı ("Application request limit reached") haberin değil kanalın
// sorunudur: kanalın deneme hakkı yenmez, haber düşmez. Sınıra takılan kanal bir süre beklemeye alınır (1, 2, 4, 8,
// en çok 12 saat; başarılı gönderimde sıfırlanır); bu sürede o kanala hiç çağrı yapılmaz, öteki kanallar sürer.
// 23–26 Ekim 2026: yalnız ig_post sınıra takıldı, aynı turda ig_story ve Facebook geçti. Tur bırakıldığında
// (15a6125) Facebook da durdu; bu yüzden sınır kanal başına tutulur.
export const AZAMI_DENEME = 3; // kanal başına gerçek hata sayısı
export const SINIR_ILK_MS = 3600e3;
export const SINIR_TAVAN_MS = 12 * 3600e3;
export const SINIR_UZUN = 4; // art arda bu kadar sınır: iş kırmızı biter (kalıcı kısıtlama şüphesi)

const LIMIT = /request limit reached|application request limit|rate limit|too many calls|reduce the amount of data/i;
export const limitHatasi = (mesaj) => LIMIT.test(String(mesaj ?? ''));

// Hata kaydı: sınır hatası kanal denemesinden düşmez, haberin sınır sayacına (yalnız bilgi) yazılır. Döner: 'limit' | 'hata'.
export function hataIsle(k, kanal, mesaj) {
  k.son_hata = String(mesaj).slice(0, 500);
  if (limitHatasi(mesaj)) {
    k.limit = (k.limit ?? 0) + 1;
    return 'limit';
  }
  k.deneme = { ...k.deneme, [kanal]: (k.deneme?.[kanal] ?? 0) + 1 };
  return 'hata';
}

// Hâlâ denenecek kanallar (sınır beklemesine bakmaz; o, sinirde ile ayrıca süzülür).
export const eksikKanallar = (kanallar, k) =>
  kanallar.filter((c) => !k?.[c] && (k?.deneme?.[c] ?? 0) < AZAMI_DENEME && !k?.atlandi);

// Kanal sınır beklemesi; sinir = delt.json'daki _sinir nesnesi ({ kanal: { sayi, kadar } }).
export function sinirKaydet(sinir, kanal, simdi = Date.now()) {
  const sayi = (sinir[kanal]?.sayi ?? 0) + 1;
  sinir[kanal] = { sayi, kadar: new Date(simdi + Math.min(SINIR_ILK_MS * 2 ** (sayi - 1), SINIR_TAVAN_MS)).toISOString() };
  return sinir[kanal];
}
export const sinirde = (sinir, kanal, simdi = Date.now()) => Date.parse(sinir?.[kanal]?.kadar ?? '') > simdi;
