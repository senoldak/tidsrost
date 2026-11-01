// Grafik setinin ortak saf yardımcıları: ölçek, eksen değerleri, nb-NO sayı biçimi, SVG yolları.

const yuvarla = (n) => Math.round(n * 1e10) / 1e10;

/** [min, max] aralığını kapsayan, 1/2/2,5/5 × 10ⁿ adımlı yaklaşık n+1 eksen değeri. Düz seride değerin etrafında açılır. */
export function fineTikker(min, max, n = 4) {
  if (!(max > min)) {
    const a = Math.abs(min) || 1;
    return fineTikker(min - a / 2, max + a / 2, n);
  }
  const ham = (max - min) / n;
  const us = 10 ** Math.floor(Math.log10(ham));
  const adim = [1, 2, 2.5, 5, 10].map((k) => k * us).find((s) => s >= ham - 1e-12);
  const bas = Math.floor(yuvarla(min / adim)) * adim;
  const son = Math.ceil(yuvarla(max / adim)) * adim;
  const ut = [];
  for (let v = bas; v <= son + adim / 2; v += adim) ut.push(yuvarla(v));
  return ut;
}

/** Doğrusal ölçek: [d0, d1] → [r0, r1]. Düz aralıkta ortaya düşer. */
export function skala(d0, d1, r0, r1) {
  if (d1 === d0) return () => (r0 + r1) / 2;
  return (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

const bicim = new Map();
/** nb-NO sayı: virgül ondalık, dar olmayan boşluk binlik, eksi işareti U+2212. */
export function tall(v, desimaler = 1) {
  if (!bicim.has(desimaler)) bicim.set(desimaler, new Intl.NumberFormat('nb-NO', { minimumFractionDigits: desimaler, maximumFractionDigits: desimaler }));
  return bicim.get(desimaler).format(v).replace(/\u202f/g, '\u00a0');
}

/** Uzun adı `maks` karaktere indirir (sonuna …). */
export function kortNavn(s, maks) {
  return s.length > maks ? `${s.slice(0, maks - 1)}…` : s;
}

/** XML/HTML kaçışı. */
export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const n = (v) => yuvarla(Math.round(v * 100) / 100);

/** Noktalardan M/L yolu; y null olan noktada çizgi kesilir. */
export function sti(punkter) {
  let ut = '';
  let acik = false;
  for (const p of punkter) {
    if (p.y === null || p.y === undefined) { acik = false; continue; }
    ut += `${acik ? 'L' : 'M'}${n(p.x)} ${n(p.y)}`;
    acik = true;
  }
  return ut;
}

/** Basamaklı yol: önce yatay, sonra dikey. */
export function trappSti(punkter) {
  const g = punkter.filter((p) => p.y !== null && p.y !== undefined);
  if (!g.length) return '';
  return g.reduce((d, p, i) => (i ? `${d}H${n(p.x)}V${n(p.y)}` : `M${n(p.x)} ${n(p.y)}`), '');
}
