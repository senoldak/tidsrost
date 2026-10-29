// Veri sayfalarının derleme anında çizilen grafikleri için saf yardımcılar (src/components/data/*). İstemci betiği yok.

/** [min, max] aralığını [0, piksel]'e eşleyen doğrusal ölçek; düz seride değer ortaya düşer. */
export function skala(min, max, piksel) {
  if (max === min) return () => piksel / 2;
  return (v) => ((v - min) / (max - min)) * piksel;
}

const yuvarla = (n) => Math.round(n * 1e10) / 1e10;

/** Aralığı kapsayan, 1/2/5 × 10ⁿ adımlı yaklaşık beş eksen değeri. */
export function fineTikker(min, max) {
  if (max === min) return [min, yuvarla(min + 1)];
  const ham = (max - min) / 5;
  const us = Math.pow(10, Math.floor(Math.log10(ham)));
  const adim = [1, 2, 5, 10].map((k) => k * us).find((s) => s >= ham - 1e-12);
  const bas = Math.floor(yuvarla(min / adim)) * adim;
  const son = Math.ceil(yuvarla(max / adim)) * adim;
  const ut = [];
  for (let v = bas; v <= son + adim / 2; v += adim) ut.push(yuvarla(v));
  return ut;
}

const n = (v) => yuvarla(v);

/** Noktalardan SVG yol verisi (düz çizgi). */
export function linjeSti(punkter) {
  return punkter.map((p, i) => `${i ? 'L' : 'M'}${n(p.x)} ${n(p.y)}`).join('');
}

/** Basamaklı yol: her değer bir sonraki noktaya kadar sürer (politika faizi gibi). */
export function trinnSti(punkter) {
  if (!punkter.length) return '';
  let d = `M${n(punkter[0].x)} ${n(punkter[0].y)}`;
  for (let i = 1; i < punkter.length; i++) {
    d += `H${n(punkter[i].x)}`;
    if (punkter[i].y !== punkter[i - 1].y) d += `V${n(punkter[i].y)}`;
  }
  return d;
}

/** Norveççe sayı yazımı: ondalık virgül, gerçek eksi işareti. */
export function tallTekst(v, desimaler = 1) {
  const s = Math.abs(v).toLocaleString('nb-NO', { minimumFractionDigits: desimaler, maximumFractionDigits: desimaler }).replace(/ /g, ' ');
  return v < 0 ? `−${s}` : s;
}

/** Fylke haritasının renk basamağı (0 = hiç, 1–4): değer / en büyük değer, dörde bölünmüş. */
export const kartTrinn = (v, maks) => (v <= 0 || maks <= 0 ? 0 : Math.min(4, Math.ceil((v / maks) * 4)));

/** Haritanın açıklaması: her basamağın kapsadığı tam sayı aralığı, kartTrinn'in tersinden; boş basamak atlanır. */
export function kartSkala(maks) {
  const ut = [{ trinn: 0, tekst: '0' }];
  if (maks <= 0) return ut;
  for (let t = 1; t <= 4; t++) {
    const lo = Math.floor(((t - 1) * maks) / 4) + 1;
    const hi = Math.floor((t * maks) / 4);
    if (lo > hi) continue;
    ut.push({ trinn: t, tekst: lo === hi ? String(lo) : `${lo}–${hi}` });
  }
  return ut;
}
