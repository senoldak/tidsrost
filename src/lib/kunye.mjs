// Künyedeki yayın adlarını o yayınların ana sayfasına bağlar (dört sitede aynı dosya).
export const YAYINLAR = {
  kifobu: 'https://kifobu.com/',
  finfolis: 'https://finfolis.com/',
  'JEN DUME': 'https://jendume.com/',
  'tidsrøst': 'https://tidsrost.com/',
};

const AD = /(kifobu|finfolis|JEN DUME|tidsrøst)/;

/** Paragrafı parçalara böler: [{ metin, adres? }]; yayın adı olan parçanın adresi dolu. */
export function kunyeParcalari(paragraf) {
  return paragraf
    .split(AD)
    .filter((p) => p !== '')
    .map((p) => (YAYINLAR[p] ? { metin: p, adres: YAYINLAR[p] } : { metin: p }));
}

/** Satırı bağlantılı parçalara böler: baglanti { parca, adres } metnin içindeki parçayı bağlar. */
export function satirParcalari(metin, baglanti) {
  if (!baglanti || !metin.includes(baglanti.parca)) return [{ metin }];
  const i = metin.indexOf(baglanti.parca);
  return [
    { metin: metin.slice(0, i) },
    { metin: baglanti.parca, adres: baglanti.adres },
    { metin: metin.slice(i + baglanti.parca.length) },
  ].filter((p) => p.metin !== '');
}
