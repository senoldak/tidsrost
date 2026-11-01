// Dairesel sütun: tek seri, her x bir dilim; iç halkadan dışa doğru değerle orantılı uzunluk. Eksi değer çizilmez.
import { kortEnhet, r2, svgKabuk, tall, tekst, tom } from '../felles.mjs';

/** @param {import('../sema.mjs').GrafData} d @returns {import('../sema.mjs').Tegning} */
export function tegn(d) {
  const bredde = 400, H = 280, cx = 200, cy = 140, R0 = 44, R1 = 128;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet);
  const p = d.serier[0].punkter;
  const maks = Math.max(0, ...p.map((q) => (tom(q.y) ? 0 : q.y))) || 1;
  const n = p.length;
  const dA = (Math.PI * 2) / n;
  const nokta = (a, r) => `${r2(cx + r * Math.cos(a))} ${r2(cy + r * Math.sin(a))}`;
  const deler = [`<circle cx="${cx}" cy="${cy}" r="${R1}" class="g-radial-spor"/>`];
  const punkter = p.map((q, i) => {
    const a0 = -Math.PI / 2 + i * dA + dA * 0.08, a1 = -Math.PI / 2 + (i + 1) * dA - dA * 0.08;
    const v = tom(q.y) ? 0 : Math.max(0, q.y);
    const r = R0 + ((R1 - R0) * v) / maks;
    deler.push(`<path data-i="${i}" class="g-f-su" d="M${nokta(a0, R0)}L${nokta(a0, r)}A${r2(r)} ${r2(r)} 0 0 1 ${nokta(a1, r)}L${nokta(a1, R0)}A${R0} ${R0} 0 0 0 ${nokta(a0, R0)}Z"/>`);
    const am = (a0 + a1) / 2;
    return { x: cx + r * Math.cos(am), y: cy + r * Math.sin(am), tekst: `${q.x}\n${tom(q.y) ? '–' : `${tall(q.y, des)}${enh}`}` };
  });
  const siste = p.findLast((q) => !tom(q.y));
  deler.push(tekst(cx, cy + 6, siste ? tall(siste.y, des) : '–', 'text-anchor="middle" class="g-midt-liten"'));
  const beskrivelse = `${d.tittel}. ${d.under ? `${d.under}. ` : ''}${n} verdier i sirkel; siste ${siste ? `${tall(siste.y, des)}${enh}` : '–'}.`;
  return {
    svg: svgKabuk(bredde, H, beskrivelse, deler.join('')),
    bredde, hoyde: H, modus: 'element', punkter,
    tabell: { kolonner: ['', d.serier[0].navn], rader: p.map((q) => [String(q.x), tom(q.y) ? '–' : tall(q.y, des)]) },
    beskrivelse,
  };
}
