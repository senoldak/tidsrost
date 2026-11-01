// Kareli ızgara: tek yüzde değeri, 100 kareden yuvarlanmış sayısı dolu ("100 kişiden 5'i").
import { esc, kortEnhet, r2, tall } from '../felles.mjs';

/** @param {import('../sema.mjs').GrafData} d @returns {import('../sema.mjs').Tegning} */
export function tegn(d) {
  const bredde = 400, H = 222, k = 18, g = 4;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet) || ' %';
  const s = d.serier[0];
  const p = s.punkter[0];
  const n = Math.max(0, Math.min(100, Math.round(p.y)));
  const x0 = (bredde - (10 * k + 9 * g)) / 2;
  const deler = [];
  const punkter = [];
  for (let i = 0; i < 100; i++) {
    const x = x0 + (i % 10) * (k + g), y = 2 + Math.floor(i / 10) * (k + g);
    deler.push(`<rect data-i="${i}" x="${r2(x)}" y="${y}" width="${k}" height="${k}" class="${i < n ? 'g-f-rod' : 'g-f-bar'}"/>`);
    punkter.push({ x: x + k / 2, y, tekst: i < n ? `${s.navn}\n${tall(p.y, des)}${enh} (${p.x})` : `Resten\n${tall(100 - p.y, des)}${enh}` });
  }
  const beskrivelse = `${d.tittel}. ${s.navn}: ${tall(p.y, des)}${enh} (${p.x}).`;
  return {
    svg: `<svg viewBox="0 0 ${bredde} ${H}" class="g-svg" role="img" aria-label="${esc(beskrivelse)}">${deler.join('')}</svg>`,
    bredde, hoyde: H, modus: 'element', punkter,
    tabell: { kolonner: ['', s.navn], rader: [[String(p.x), tall(p.y, des)]] },
    beskrivelse,
  };
}
