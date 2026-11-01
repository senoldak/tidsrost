// Aralık: her x için en düşük (y)–en yüksek (y2) dikey çizgi; start/slutt varsa mum gövdesi (artış mavi, düşüş kırmızı).
import { etikettIndekser, fineTikker, kortEnhet, kortNavn, r2, skala, svgKabuk, tall, tekst, tom, yAkse } from '../felles.mjs';

const H = 220, V = 44, U = 14, A = 26;

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? 900 : 400;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet);
  const p = d.serier[0].punkter;
  const alle = p.flatMap((q) => (tom(q.y) ? [] : [q.y, q.y2]));
  const tikker = fineTikker(Math.min(...alle), Math.max(...alle));
  const y = skala(tikker[0], tikker.at(-1), H - A, U);
  const bw = (bredde - V) / p.length;
  const deler = [yAkse(tikker, y, V, bredde)];
  deler.push(`<g class="g-akse">${etikettIndekser(p.length, o.bred ? 8 : 4).map((i) => tekst(V + i * bw + bw / 2, H - 7, kortNavn(String(p[i].x), 12), 'text-anchor="middle"')).join('')}</g>`);
  const punkter = p.map((q, i) => {
    const cx = V + i * bw + bw / 2;
    deler.push(`<g data-i="${i}"><rect x="${r2(V + i * bw)}" y="${U}" width="${r2(bw)}" height="${H - A - U}" class="g-luft"/>`);
    if (tom(q.y)) {
      deler.push('</g>');
      return { x: cx, y: y(tikker[0]), tekst: `${q.x}\n–` };
    }
    deler.push(`<line class="g-spenn" x1="${r2(cx)}" x2="${r2(cx)}" y1="${r2(y(q.y))}" y2="${r2(y(q.y2))}"/>`);
    const kropp = Number.isFinite(q.start) && Number.isFinite(q.slutt);
    if (kropp) {
      const w = Math.max(2, bw * 0.6);
      deler.push(`<rect x="${r2(cx - w / 2)}" y="${r2(y(Math.max(q.start, q.slutt)))}" width="${r2(w)}" height="${r2(Math.max(1, Math.abs(y(q.start) - y(q.slutt))))}" class="${q.slutt >= q.start ? 'g-f-su' : 'g-f-rod'}"/>`);
    }
    deler.push('</g>');
    const linjer = [`${tall(q.y, des)}–${tall(q.y2, des)}${enh}`];
    if (kropp) linjer.push(`Start ${tall(q.start, des)}, slutt ${tall(q.slutt, des)}`);
    return { x: cx, y: y(q.y2), tekst: [String(q.x), ...linjer].join('\n') };
  });
  const beskrivelse = `${d.tittel}. ${d.under ? `${d.under}. ` : ''}Laveste og høyeste verdi for ${p.length} perioder.`;
  const f = (v) => (Number.isFinite(v) ? tall(v, des) : '–');
  return {
    svg: svgKabuk(bredde, H, beskrivelse, deler.join('')),
    bredde, hoyde: H, modus: 'element', punkter,
    tabell: { kolonner: ['', 'Lav', 'Høy', 'Start', 'Slutt'], rader: p.map((q) => [String(q.x), f(q.y), f(q.y2), f(q.start), f(q.slutt)]) },
    beskrivelse,
  };
}
