// Renk şeridi: her x eşit genişlikte dikey şerit; renk ortalamadan sapmaya göre 7 kademe (üstü kırmızı, altı mavi).
import { kortEnhet, r2, svgKabuk, tall, tekst, tom } from '../felles.mjs';

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? 900 : 400;
  const H = 130, A = 22;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet);
  const p = d.serier[0].punkter;
  const verdier = p.map((q) => q.y).filter((v) => !tom(v));
  const snitt = verdier.reduce((a, b) => a + b, 0) / verdier.length;
  const maksAvvik = Math.max(...verdier.map((v) => Math.abs(v - snitt))) || 1;
  const kademe = (v) => Math.max(-3, Math.min(3, Math.round(((v - snitt) / maksAvvik) * 3)));
  const sw = bredde / p.length;
  const deler = [];
  const punkter = p.map((q, i) => {
    const k = tom(q.y) ? null : kademe(q.y);
    deler.push(`<rect data-i="${i}" x="${r2(i * sw)}" y="0" width="${r2(sw + 0.3)}" height="${H - A}" class="${k === null ? 'g-v0' : `g-d${k}`}"/>`);
    return { x: i * sw + sw / 2, y: 0, tekst: `${q.x}\n${tom(q.y) ? '–' : `${tall(q.y, des)}${enh}`}` };
  });
  [0, Math.floor((p.length - 1) / 2), p.length - 1].forEach((i, j) => deler.push(tekst(i * sw + sw / 2, H - 6, String(p[i].x), `text-anchor="${j === 0 ? 'start' : j === 2 ? 'end' : 'middle'}"`)));
  const beskrivelse = `${d.tittel}. ${d.under ? `${d.under}. ` : ''}Snitt ${tall(snitt, des)}${enh}; rødt over, blått under.`;
  return {
    svg: svgKabuk(bredde, H, beskrivelse, deler.join('')),
    bredde, hoyde: H, modus: 'element', punkter,
    tabell: { kolonner: ['', d.serier[0].navn], rader: p.map((q) => [String(q.x), tom(q.y) ? '–' : tall(q.y, des)]) },
    beskrivelse,
  };
}
