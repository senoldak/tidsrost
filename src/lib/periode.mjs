// Dönem yardımcıları: 'YYYY-MM' ay kodunu kaydırma ve seride aya göre arama (seriden boş ay düşebilir; konuma göre
// almak "bir önceki ay" diye yanlış ayı gösterir).
export function forskyvMaaned(ym, n) {
  const d = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export const finnMaaned = (serie, ym) => serie.find((p) => p.maaned === ym);
