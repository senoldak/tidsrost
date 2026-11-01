// Saçılım: sayısal x ve y; valg.trend en küçük kareler doğrusu, valg.koble noktaları sırayla bağlar (döngü grafiği).
import { fineTikker, kortEnhet, r2, skala, svgKabuk, tall, tekst, tikkDesimaler, tom, yAkse } from '../felles.mjs';

const H = 240, V = 40, S = 12, U = 14, A = 26;
const yuv = (v) => Math.round(v * 1e6) / 1e6;

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? 900 : 400;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet);
  const p = d.serier[0].punkter.filter((q) => !tom(q.y) && Number.isFinite(q.x));
  const xs = p.map((q) => q.x), ys = p.map((q) => q.y);
  const tx = fineTikker(Math.min(...xs), Math.max(...xs));
  const ty = fineTikker(Math.min(...ys), Math.max(...ys));
  const x = skala(tx[0], tx.at(-1), V, bredde - S);
  const y = skala(ty[0], ty.at(-1), H - A, U);
  const dx = tikkDesimaler(tx);
  const deler = [yAkse(ty, y, V, bredde - S)];
  deler.push(`<g class="g-akse">${tx.map((t) => tekst(x(t), H - 7, tall(t, dx), 'text-anchor="middle"')).join('')}</g>`);
  if (d.valg?.koble) deler.push(`<path class="g-koble" d="M${p.map((q) => `${r2(x(q.x))} ${r2(y(q.y))}`).join('L')}"/>`);
  if (d.valg?.trend && p.length > 1) {
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const sxx = xs.reduce((a, v) => a + (v - mx) ** 2, 0);
    const a = sxx ? xs.reduce((s, v, i) => s + (v - mx) * (ys[i] - my), 0) / sxx : 0;
    const b = my - a * mx;
    const [x0, x1] = [tx[0], tx.at(-1)];
    deler.push(`<line class="g-trend" data-a="${yuv(a)}" data-b="${yuv(b)}" x1="${r2(x(x0))}" x2="${r2(x(x1))}" y1="${r2(y(a * x0 + b))}" y2="${r2(y(a * x1 + b))}"/>`);
  }
  const punkter = p.map((q, i) => {
    deler.push(`<circle data-i="${i}" cx="${r2(x(q.x))}" cy="${r2(y(q.y))}" r="5" class="g-f-su g-prikk"/>`);
    return { x: x(q.x), y: y(q.y) - 5, tekst: `${q.navn ?? d.serier[0].navn}\nx: ${tall(q.x, des)} · y: ${tall(q.y, des)}${enh}` };
  });
  const beskrivelse = `${d.tittel}. ${d.under ? `${d.under}. ` : ''}${p.length} punkter.`;
  return {
    svg: svgKabuk(bredde, H, beskrivelse, deler.join('')),
    bredde, hoyde: H, modus: 'element', punkter,
    tabell: { kolonner: ['x', 'y'], rader: p.map((q) => [tall(q.x, des), tall(q.y, des)]) },
    beskrivelse,
  };
}
