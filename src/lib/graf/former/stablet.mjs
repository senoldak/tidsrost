// Yığılmış sütun: her x'te serilerin değerleri üst üste; valg.prosent her sütunu %100'e ölçer (bileşim).
import { etikettIndekser, fineTikker, kortEnhet, kortNavn, r2, skala, svgKabuk, tall, tekst, yAkse } from '../felles.mjs';
import { farge, hizala, komplett, nokkelFor } from './flerserie.mjs';

const H = 220, V = 40, U = 14, A = 26;

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? 900 : 400;
  const des = d.desimaler ?? 1;
  const prosent = !!d.valg?.prosent;
  const enh = prosent ? ' %' : kortEnhet(d.enhet);
  const { etiketter, verdier } = hizala(d.serier);
  const hel = komplett(verdier);
  const summer = etiketter.map((_, i) => (hel[i] ? verdier.reduce((a, s) => a + s[i], 0) : null));
  const verdi = (si, i) => (prosent ? (summer[i] ? ((verdier[si][i] ?? 0) / summer[i]) * 100 : 0) : verdier[si][i] ?? 0);
  const tikker = prosent ? [0, 25, 50, 75, 100] : fineTikker(0, Math.max(0, ...summer.filter((v) => v !== null)));
  const y = skala(tikker[0], tikker.at(-1), H - A, U);
  const bw = (bredde - V) / etiketter.length;
  const deler = [yAkse(tikker, y, V, bredde)];
  deler.push(`<g class="g-akse">${etikettIndekser(etiketter.length, o.bred ? 8 : 4).map((i) => tekst(V + i * bw + bw / 2, H - 7, kortNavn(etiketter[i], 12), 'text-anchor="middle"')).join('')}</g>`);
  const punkter = etiketter.map((e, i) => {
    const x0 = V + i * bw + Math.min(4, bw * 0.15);
    const w = Math.max(1, bw - 2 * Math.min(4, bw * 0.15));
    let bunn = 0;
    deler.push(`<g data-i="${i}">`);
    if (hel[i]) d.serier.forEach((_, si) => {
      const v = verdi(si, i);
      if (v > 0) deler.push(`<rect x="${r2(x0)}" y="${r2(y(bunn + v))}" width="${r2(w)}" height="${r2(y(bunn) - y(bunn + v))}" class="${farge(si)} g-lag-kant"/>`);
      bunn += v;
    });
    deler.push('</g>');
    const linjer = d.serier.map((s, si) => `${s.navn}: ${verdier[si][i] === null || (prosent && !hel[i]) ? '–' : `${tall(prosent ? verdi(si, i) : verdier[si][i], des)}${enh}`}`);
    if (!prosent) linjer.push(`Sum: ${summer[i] === null ? '–' : `${tall(summer[i], des)}${enh}`}`);
    return { x: x0 + w / 2, y: y(bunn), tekst: [e, ...linjer].join('\n') };
  });
  const beskrivelse = `${d.tittel}. ${d.under ? `${d.under}. ` : ''}${d.serier.map((s) => s.navn).join(', ')}.`;
  return {
    svg: svgKabuk(bredde, H, beskrivelse, deler.join('')),
    bredde, hoyde: H, modus: 'element', punkter, nokkel: nokkelFor(d.serier),
    tabell: { kolonner: ['', ...d.serier.map((s) => s.navn), ...(prosent ? [] : ['Sum'])], rader: etiketter.map((e, i) => [e, ...verdier.map((s) => (s[i] === null ? '–' : tall(s[i], des))), ...(prosent ? [] : [summer[i] === null ? '–' : tall(summer[i], des)])]) },
    beskrivelse,
  };
}
