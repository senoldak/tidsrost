// Priskalkulator: tarihsel KPI (src/data/kpi-historisk.json) ile tutarı bir dönemden öbürüne çevirir.
// Sunucu (derleme) ve istemci (paketlenmiş betik) aynı kodu kullanır. Bilinmeyen dönem ya da geçersiz tutar → null;
// asla NaN ya da tahmin döndürmez.

const AAR = /^\d{4}$/;
const MND = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Yıl ya da ay için indeks değeri; ikisi de yıl ya da ikisi de ay değilse yıllık indeks. */
function indeks(data, fra, til) {
  const bruk = AAR.test(fra) && AAR.test(til) ? 'aar' : MND.test(fra) && MND.test(til) ? 'mnd' : 'aar';
  const nokkel = (p) => (bruk === 'aar' ? p.slice(0, 4) : p);
  const tabell = data?.[bruk];
  if (!tabell || !(AAR.test(fra) || MND.test(fra)) || !(AAR.test(til) || MND.test(til))) return null;
  const a = tabell[nokkel(fra)];
  const b = tabell[nokkel(til)];
  return typeof a === 'number' && typeof b === 'number' && a > 0 && b > 0 ? [a, b] : null;
}

/** Tutarı `fra` dönemindeki kronelerden `til` dönemindeki kronelere çevirir. 'YYYY' ya da 'YYYY-MM'. */
export function omregn(data, belop, fra, til) {
  if (typeof belop !== 'number' || !Number.isFinite(belop) || belop <= 0) return null;
  const i = indeks(data, fra, til);
  return i ? (belop * i[1]) / i[0] : null;
}

/** Fiyat düzeyinin `fra`'dan `til`'e yüzde değişimi. */
export function endringProsent(data, fra, til) {
  const i = indeks(data, fra, til);
  return i ? (i[1] / i[0] - 1) * 100 : null;
}
