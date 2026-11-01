// İlerleme: her satır bir hedefe (y2) karşı değer (y); iz + dolu kısım + yüzde. Hedefi geçen satır koyu, altı soluk.
import { kortEnhet, kortNavn, r2, svgKabuk, tall, tekst, tom } from '../felles.mjs';

const RAD = 34;

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? 900 : 400;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet);
  const p = d.serier[0].punkter;
  const X0 = 0, X1 = bredde - 52;
  const H = p.length * RAD + 4;
  const deler = [];
  const punkter = p.map((q, i) => {
    const yy = i * RAD + 2;
    const andel = tom(q.y) ? null : q.y / q.y2;
    const fylt = andel === null ? 0 : Math.max(0, Math.min(1, andel));
    deler.push(`<g data-i="${i}"><rect x="0" y="${yy}" width="${bredde}" height="${RAD}" class="g-luft"/>`);
    deler.push(tekst(X0, yy + 12, kortNavn(String(q.x), o.bred ? 60 : 40), 'class="g-t-blekk"'));
    deler.push(`<rect x="${X0}" y="${yy + 17}" width="${X1 - X0}" height="10" class="g-spor"/>`);
    if (fylt > 0) deler.push(`<rect x="${X0}" y="${yy + 17}" width="${r2((X1 - X0) * fylt)}" height="10" class="${andel >= 1 ? 'g-f-su' : 'g-f-su2'}"/>`);
    deler.push(tekst(bredde, yy + 26, andel === null ? '–' : `${tall(andel * 100, 0)} %`, 'text-anchor="end" class="g-t-sterk"'));
    deler.push('</g>');
    return { x: X0 + (X1 - X0) * fylt, y: yy + 14, tekst: `${q.x}\n${tom(q.y) ? '–' : `${tall(q.y, des)}${enh} av ${tall(q.y2, des)}${enh}`}\n${andel === null ? '' : `${tall(andel * 100, 0)} % av målet`}`.trim() };
  });
  const beskrivelse = `${d.tittel}. ${d.under ? `${d.under}. ` : ''}${p.length} mål.`;
  return {
    svg: svgKabuk(bredde, H, beskrivelse, deler.join('')),
    bredde, hoyde: H, modus: 'element', punkter,
    tabell: { kolonner: ['', 'Verdi', 'Mål', 'Andel'], rader: p.map((q) => [String(q.x), tom(q.y) ? '–' : tall(q.y, des), tall(q.y2, des), tom(q.y) ? '–' : `${tall((q.y / q.y2) * 100, 0)} %`]) },
    beskrivelse,
  };
}
