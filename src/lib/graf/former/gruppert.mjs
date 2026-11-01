// Gruplu sütun: her x'te seriler yan yana; eksi değer sıfırın altına iner.
import { etikettIndekser, fineTikker, kortEnhet, kortNavn, r2, skala, svgKabuk, tall, tekst, yAkse } from '../felles.mjs';
import { farge, hizala, nokkelFor } from './flerserie.mjs';

const H = 220, V = 40, U = 14, A = 26;

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? 900 : 400;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet);
  const { etiketter, verdier } = hizala(d.serier);
  const alle = verdier.flat().filter((v) => v !== null);
  const tikker = fineTikker(Math.min(0, ...alle), Math.max(0, ...alle));
  const y = skala(tikker[0], tikker.at(-1), H - A, U);
  const gw = (bredde - V) / etiketter.length;
  const luft = Math.min(8, gw * 0.2);
  const bw = (gw - luft) / d.serier.length;
  const deler = [yAkse(tikker, y, V, bredde)];
  deler.push(`<g class="g-akse">${etikettIndekser(etiketter.length, o.bred ? 8 : 4).map((i) => tekst(V + i * gw + gw / 2, H - 7, kortNavn(etiketter[i], 12), 'text-anchor="middle"')).join('')}</g>`);
  const punkter = etiketter.map((e, i) => {
    deler.push(`<g data-i="${i}"><rect x="${r2(V + i * gw)}" y="${U}" width="${r2(gw)}" height="${H - A - U}" class="g-luft"/>`);
    let topp = y(0);
    d.serier.forEach((_, si) => {
      const v = verdier[si][i];
      if (v === null) return;
      const top = Math.min(y(v), y(0));
      topp = Math.min(topp, top);
      deler.push(`<rect x="${r2(V + i * gw + luft / 2 + si * bw)}" y="${r2(top)}" width="${r2(Math.max(1, bw - 1))}" height="${r2(Math.max(0.5, Math.abs(y(v) - y(0))))}" class="${farge(si)}"/>`);
    });
    deler.push('</g>');
    return { x: V + i * gw + gw / 2, y: topp, tekst: [e, ...d.serier.map((s, si) => `${s.navn}: ${verdier[si][i] === null ? '–' : `${tall(verdier[si][i], des)}${enh}`}`)].join('\n') };
  });
  deler.push(`<line class="g-null" x1="${V}" x2="${bredde}" y1="${r2(y(0))}" y2="${r2(y(0))}"/>`);
  const beskrivelse = `${d.tittel}. ${d.under ? `${d.under}. ` : ''}${d.serier.map((s) => s.navn).join(', ')}.`;
  return {
    svg: svgKabuk(bredde, H, beskrivelse, deler.join('')),
    bredde, hoyde: H, modus: 'element', punkter, nokkel: nokkelFor(d.serier),
    tabell: { kolonner: ['', ...d.serier.map((s) => s.navn)], rader: etiketter.map((e, i) => [e, ...verdier.map((s) => (s[i] === null ? '–' : tall(s[i], des)))]) },
    beskrivelse,
  };
}
