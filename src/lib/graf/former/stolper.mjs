// Yatay çubuk satırları: rangering ve avvik ortak çizimi. Her satır <g data-i>: ad, çubuk, değer.
import { esc, kortEnhet, kortNavn, r2, skala, tall, tekst, tom } from '../felles.mjs';

const RAD = 24;

/**
 * @param {import('../sema.mjs').GrafData} d
 * @param {{ bred?: boolean }} o
 * @param {{ sorter: boolean, klasse: (q: {x:any,y:number}, i: number) => string, fortegn: boolean }} valg
 * @returns {import('../sema.mjs').Tegning}
 */
export function stolper(d, o, valg) {
  const bredde = o.bred ? 900 : 400;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet);
  const s = d.serier[0];
  const rader = valg.sorter ? [...s.punkter].sort((a, b) => (tom(a.y) || tom(b.y) ? Number(tom(a.y)) - Number(tom(b.y)) : b.y - a.y)) : [...s.punkter];
  const M = o.bred ? 300 : 225;
  const maksNavn = o.bred ? 46 : 34;
  const verdier = rader.map((q) => q.y).filter((v) => !tom(v));
  const lo = Math.min(0, ...verdier), hi = Math.max(0, ...verdier);
  const x = skala(lo, hi === lo ? lo + 1 : hi, M, bredde - 44);
  const H = rader.length * RAD + 4;
  const tegnTall = (v) => `${valg.fortegn && v > 0 ? '+' : ''}${tall(v, des)}`;

  const deler = [];
  const punkter = rader.map((q, i) => {
    const yy = i * RAD + 2;
    deler.push(`<g data-i="${i}">`);
    deler.push(tekst(M - 8, yy + 16, kortNavn(String(q.x), maksNavn), 'text-anchor="end" class="g-t-blekk"'));
    if (tom(q.y)) {
      deler.push(`<rect x="0" y="${yy}" width="${bredde}" height="${RAD}" class="g-luft"/>`);
      deler.push(tekst(x(0) + 5, yy + 16, '–'));
      deler.push('</g>');
      return { x: x(0), y: yy + 4, tekst: `${q.x}\n–` };
    }
    const x0 = Math.min(x(0), x(q.y));
    deler.push(`<rect x="${r2(x0)}" y="${yy + 5}" width="${r2(Math.max(1, Math.abs(x(q.y) - x(0))))}" height="${RAD - 10}" class="${valg.klasse(q, i)}"/>`);
    deler.push(tekst(q.y >= 0 ? x(q.y) + 5 : x(0) + 5, yy + 16, tegnTall(q.y), 'class="g-t-sterk"'));
    deler.push('</g>');
    return { x: (x0 + Math.max(x(0), x(q.y))) / 2, y: yy + 4, tekst: `${q.x}\n${tegnTall(q.y)}${enh}` };
  });
  if (lo < 0) deler.push(`<line class="g-null" x1="${r2(x(0))}" x2="${r2(x(0))}" y1="0" y2="${H}"/>`);

  const beskrivelse = `${d.tittel}. ${d.under ? `${d.under}. ` : ''}${rader.filter((q) => !tom(q.y)).slice(0, 3).map((q) => `${q.x} ${tegnTall(q.y)}${enh}`).join(', ')}.`;
  return {
    svg: `<svg viewBox="0 0 ${bredde} ${H}" class="g-svg" role="img" aria-label="${esc(beskrivelse)}">${deler.join('')}</svg>`,
    bredde, hoyde: H, modus: 'element', punkter,
    tabell: { kolonner: ['', s.navn], rader: rader.map((q) => [String(q.x), tom(q.y) ? '–' : tall(q.y, des)]) },
    beskrivelse,
  };
}
