// Bant: seri 0 aralık bandı (y alt, y2 üst), seri 1 (varsa) bant üzerinde çizgi. Belirsizlik, aralık, fark bandı için.
import { fineTikker, kortEnhet, r2, skala, sti, svgKabuk, tall, tom, xEtiketter, yAkse } from '../felles.mjs';

const H = 220, V = 40, S = 46, U = 14, A = 26;

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? 900 : 400;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet);
  const [band, linje] = d.serier;
  const etiketter = band.punkter.map((p) => String(p.x));
  const lp = linje ? etiketter.map((e) => linje.punkter.find((p) => String(p.x) === e) ?? { x: e, y: null }) : [];
  const alle = [...band.punkter.flatMap((p) => (tom(p.y) ? [] : [p.y, p.y2])), ...lp.filter((p) => !tom(p.y)).map((p) => p.y)];
  const tikker = fineTikker(Math.min(...alle), Math.max(...alle));
  const y = skala(tikker[0], tikker.at(-1), H - A, U);
  const n = etiketter.length;
  const x = (i) => (n === 1 ? (V + bredde - S) / 2 : V + (i / (n - 1)) * (bredde - V - S));
  const deler = [yAkse(tikker, y, V, bredde - S + 6), `<g class="g-akse">${xEtiketter(etiketter, x, H, o.bred ? 8 : 4)}</g>`];

  let bit = [];
  const lukk = () => {
    if (bit.length) {
      const opp = bit.map((q) => `${r2(q.x)} ${r2(q.ust)}`).join('L');
      const ned = [...bit].reverse().map((q) => `${r2(q.x)} ${r2(q.alt)}`).join('L');
      deler.push(`<path class="g-baand" d="M${opp}L${ned}Z"/>`);
    }
    bit = [];
  };
  band.punkter.forEach((p, i) => (tom(p.y) ? lukk() : bit.push({ x: x(i), alt: y(p.y), ust: y(p.y2) })));
  lukk();
  if (linje) deler.push(`<g class="g-serie g-s0"><path d="${sti(lp.map((p, i) => ({ x: x(i), y: tom(p.y) ? null : y(p.y) })))}"/></g>`);

  const punkter = [];
  band.punkter.forEach((p, i) => {
    const l = lp[i];
    if (tom(p.y) && (!l || tom(l.y))) return;
    const linjer = [];
    if (l && !tom(l.y)) linjer.push(`${linje.navn}: ${tall(l.y, des)}${enh}`);
    if (!tom(p.y)) linjer.push(`${band.navn}: ${tall(p.y, des)}–${tall(p.y2, des)}${enh}`);
    punkter.push({ x: x(i), y: l && !tom(l.y) ? y(l.y) : y(p.y2), tekst: [etiketter[i], ...linjer].join('\n') });
  });
  const beskrivelse = `${d.tittel}. ${d.under ? `${d.under}. ` : ''}Bånd: ${band.navn}${linje ? `, linje: ${linje.navn}` : ''}.`;
  return {
    svg: svgKabuk(bredde, H, beskrivelse, deler.join('')),
    bredde, hoyde: H, modus: 'serie', punkter, ramme: { topp: U, bunn: H - A },
    nokkel: linje ? [{ navn: linje.navn, klasse: 'g-s0' }, { navn: band.navn, klasse: 'g-n-baand' }] : undefined,
    tabell: {
      kolonner: ['', `${band.navn} (fra)`, `${band.navn} (til)`, ...(linje ? [linje.navn] : [])],
      rader: band.punkter.map((p, i) => [etiketter[i], tom(p.y) ? '–' : tall(p.y, des), tom(p.y) ? '–' : tall(p.y2, des), ...(linje ? [tom(lp[i].y) ? '–' : tall(lp[i].y, des)] : [])]),
    },
    beskrivelse,
  };
}
