// Isı ızgarası: seriler satır, x'ler sütun; değer 5 kademede su renginin koyuluğu. Boş hücre g-v0.
import { kortEnhet, kortNavn, r2, svgKabuk, tall, tekst, tom } from '../felles.mjs';
import { hizala } from './flerserie.mjs';

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? 900 : 400;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet);
  const { etiketter, verdier } = hizala(d.serier);
  const alle = verdier.flat().filter((v) => v !== null);
  const lo = Math.min(...alle), hi = Math.max(...alle);
  const kademe = (v) => (v === null ? 0 : hi === lo ? 3 : 1 + Math.min(4, Math.floor(((v - lo) / (hi - lo)) * 5)));
  const M = o.bred ? 180 : 110, U = 18;
  const cw = (bredde - M) / etiketter.length;
  const ch = Math.max(14, Math.min(30, cw));
  const H = U + d.serier.length * ch + 4;
  const deler = [];
  const vis = new Set([0, Math.floor((etiketter.length - 1) / 2), etiketter.length - 1]);
  etiketter.forEach((e, j) => { if (vis.has(j)) deler.push(tekst(M + j * cw + cw / 2, 12, kortNavn(e, 10), 'text-anchor="middle"')); });
  const punkter = [];
  d.serier.forEach((s, si) => {
    deler.push(tekst(M - 6, U + si * ch + ch / 2 + 4, kortNavn(s.navn, o.bred ? 26 : 16), 'text-anchor="end" class="g-t-blekk"'));
    etiketter.forEach((e, j) => {
      const v = verdier[si][j];
      deler.push(`<rect data-i="${punkter.length}" x="${r2(M + j * cw + 0.5)}" y="${r2(U + si * ch + 0.5)}" width="${r2(Math.max(1, cw - 1))}" height="${r2(ch - 1)}" class="g-v${kademe(v)}"/>`);
      punkter.push({ x: M + j * cw + cw / 2, y: U + si * ch, tekst: `${s.navn}, ${e}\n${tom(v) ? '–' : `${tall(v, des)}${enh}`}` });
    });
  });
  const beskrivelse = `${d.tittel}. ${d.under ? `${d.under}. ` : ''}Fra ${tall(lo, des)} til ${tall(hi, des)}${enh}.`;
  return {
    svg: svgKabuk(bredde, H, beskrivelse, deler.join('')),
    bredde, hoyde: H, modus: 'element', punkter,
    tabell: { kolonner: ['', ...etiketter], rader: d.serier.map((s, si) => [s.navn, ...verdier[si].map((v) => (v === null ? '–' : tall(v, des)))]) },
    beskrivelse,
  };
}
