// Şelale: ilk nokta başlangıç düzeyi, sonrakiler artış (+) ya da azalış (−); valg.sum son sütunu toplam olarak ekler.
import { etikettIndekser, fineTikker, kortEnhet, kortNavn, r2, skala, svgKabuk, tall, tekst, yAkse } from '../felles.mjs';

const H = 230, V = 44, U = 14, A = 26;

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? 900 : 400;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet);
  const p = d.serier[0].punkter;
  const steg = [];
  let niva = 0;
  p.forEach((q, i) => {
    if (i === 0) steg.push({ navn: String(q.x), fra: 0, til: q.y, type: 'start', v: q.y });
    else if (!Number.isFinite(q.y)) steg.push({ navn: String(q.x), fra: niva, til: niva, type: 'tom', v: null });
    else steg.push({ navn: String(q.x), fra: niva, til: niva + q.y, type: q.y >= 0 ? 'opp' : 'ned', v: q.y });
    niva = steg.at(-1).til;
  });
  if (d.valg?.sum) steg.push({ navn: 'Sum', fra: 0, til: niva, type: 'sum', v: niva });
  const alle = steg.flatMap((s) => [s.fra, s.til]);
  const tikker = fineTikker(Math.min(0, ...alle), Math.max(0, ...alle));
  const y = skala(tikker[0], tikker.at(-1), H - A, U);
  const bw = (bredde - V) / steg.length;
  const deler = [yAkse(tikker, y, V, bredde)];
  deler.push(`<g class="g-akse">${etikettIndekser(steg.length, o.bred ? 10 : 5).map((i) => tekst(V + i * bw + bw / 2, H - 7, kortNavn(steg[i].navn, 10), 'text-anchor="middle"')).join('')}</g>`);
  const klasse = { start: 'g-f-bar', sum: 'g-f-bar', opp: 'g-f-su', ned: 'g-f-rod' };
  const punkter = steg.map((s, i) => {
    const x0 = V + i * bw + Math.min(4, bw * 0.15);
    const w = Math.max(1, bw - 2 * Math.min(4, bw * 0.15));
    const top = Math.min(y(s.fra), y(s.til));
    if (s.type === 'tom') {
      deler.push(`<g data-i="${i}"><rect x="${r2(x0)}" y="${U}" width="${r2(w)}" height="${H - A - U}" class="g-luft"/></g>`);
      return { x: x0 + w / 2, y: y(s.til), tekst: `${s.navn}\n–` };
    }
    deler.push(`<g data-i="${i}"><rect x="${r2(x0)}" y="${r2(top)}" width="${r2(w)}" height="${r2(Math.max(0.5, Math.abs(y(s.til) - y(s.fra))))}" class="${klasse[s.type]}"/></g>`);
    if (i < steg.length - 1 && steg[i + 1].type !== 'sum') deler.push(`<line class="g-trapp" x1="${r2(x0 + w)}" x2="${r2(x0 + bw)}" y1="${r2(y(s.til))}" y2="${r2(y(s.til))}"/>`);
    const verdi = s.type === 'opp' ? `+${tall(s.v, des)}` : tall(s.v, des);
    return { x: x0 + w / 2, y: top, tekst: `${s.navn}\n${verdi}${enh}` };
  });
  deler.push(`<line class="g-null" x1="${V}" x2="${bredde}" y1="${r2(y(0))}" y2="${r2(y(0))}"/>`);
  const beskrivelse = `${d.tittel}. ${d.under ? `${d.under}. ` : ''}Fra ${tall(steg[0].til, des)} til ${tall(niva, des)}${enh}.`;
  return {
    svg: svgKabuk(bredde, H, beskrivelse, deler.join('')),
    bredde, hoyde: H, modus: 'element', punkter,
    tabell: { kolonner: ['', 'Endring', 'Nivå'], rader: steg.map((s) => [s.navn, s.type === 'start' || s.type === 'sum' || s.type === 'tom' ? '–' : tall(s.v, des), tall(s.til, des)]) },
    beskrivelse,
  };
}
