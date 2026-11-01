// Yığılmış alan: seriler üst üste dolgulu katmanlar; izleme çizgisi her x'te katmanları ve toplamı verir.
import { fineTikker, kortEnhet, r2, skala, svgKabuk, tall, xEtiketter, yAkse } from '../felles.mjs';
import { farge, hizala, nokkelFor } from './flerserie.mjs';

const H = 220, V = 40, S = 12, U = 14, A = 26;

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? 900 : 400;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet);
  const { etiketter, verdier } = hizala(d.serier);
  const n = etiketter.length;
  const x = (i) => (n === 1 ? (V + bredde - S) / 2 : V + (i / (n - 1)) * (bredde - V - S));
  const kum = [];
  verdier.forEach((s, si) => kum.push(s.map((v, i) => (si ? kum[si - 1][i] : 0) + (v ?? 0))));
  const tikker = fineTikker(0, Math.max(...kum.at(-1)));
  const y = skala(tikker[0], tikker.at(-1), H - A, U);
  const deler = [yAkse(tikker, y, V, bredde - S), `<g class="g-akse">${xEtiketter(etiketter, x, H, o.bred ? 8 : 4)}</g>`];
  kum.forEach((ust, si) => {
    const alt = si ? kum[si - 1] : etiketter.map(() => 0);
    const opp = ust.map((v, i) => `${r2(x(i))} ${r2(y(v))}`).join('L');
    const ned = alt.map((v, i) => `${r2(x(i))} ${r2(y(v))}`).reverse().join('L');
    deler.push(`<path class="g-lag ${farge(si)}" d="M${opp}L${ned}Z"/>`);
  });
  const punkter = etiketter.map((e, i) => ({
    x: x(i),
    y: y(kum.at(-1)[i]),
    tekst: [e, ...d.serier.map((s, si) => `${s.navn}: ${verdier[si][i] === null ? '–' : `${tall(verdier[si][i], des)}${enh}`}`), `Sum: ${tall(kum.at(-1)[i], des)}${enh}`].join('\n'),
  }));
  const beskrivelse = `${d.tittel}. ${d.under ? `${d.under}. ` : ''}${d.serier.map((s) => s.navn).join(', ')}.`;
  return {
    svg: svgKabuk(bredde, H, beskrivelse, deler.join('')),
    bredde, hoyde: H, modus: 'serie', punkter, ramme: { topp: U, bunn: H - A }, nokkel: nokkelFor(d.serier),
    tabell: { kolonner: ['', ...d.serier.map((s) => s.navn), 'Sum'], rader: etiketter.map((e, i) => [e, ...verdier.map((s) => (s[i] === null ? '–' : tall(s[i], des))), tall(kum.at(-1)[i], des)]) },
    beskrivelse,
  };
}
