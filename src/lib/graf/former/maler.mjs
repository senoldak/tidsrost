// Gösterge: yarım daire, tek değer (serier[0].punkter[0].y), ölçek 0–valg.maks; isteğe bağlı hedef çizgisi (merknad mal).
import { esc, kortEnhet, r2, tall, tekst } from '../felles.mjs';

/** @param {import('../sema.mjs').GrafData} d @returns {import('../sema.mjs').Tegning} */
export function tegn(d) {
  const bredde = 400, H = 210, cx = 200, cy = 175, R = 140, w = 26;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet);
  const p = d.serier[0].punkter[0];
  const maks = d.valg.maks;
  const kl = (v) => Math.max(0, Math.min(maks, v));
  const vinkel = (v) => Math.PI + (kl(v) / maks) * Math.PI;
  const nokta = (a, rr) => `${r2(cx + rr * Math.cos(a))} ${r2(cy + rr * Math.sin(a))}`;
  const bue = (v0, v1, klasse, ekstra = '') => {
    const a0 = vinkel(v0), a1 = Math.max(vinkel(v1), a0 + 0.0001);
    return `<path${ekstra} class="${klasse}" d="M${nokta(a0, R)}A${R} ${R} 0 0 1 ${nokta(a1, R)}L${nokta(a1, R - w)}A${R - w} ${R - w} 0 0 0 ${nokta(a0, R - w)}Z"/>`;
  };
  const deler = [bue(0, maks, 'g-f-bar'), bue(0, p.y, 'g-f-su', ' data-i="0"')];
  const mal = (d.merknader ?? []).find((m) => m.type === 'mal');
  if (mal) {
    const a = vinkel(mal.y);
    deler.push(`<line class="g-mal-hel" x1="${r2(cx + (R + 6) * Math.cos(a))}" y1="${r2(cy + (R + 6) * Math.sin(a))}" x2="${r2(cx + (R - w - 6) * Math.cos(a))}" y2="${r2(cy + (R - w - 6) * Math.sin(a))}"/>`);
    deler.push(tekst(cx + (R + 14) * Math.cos(a), cy + (R + 14) * Math.sin(a), mal.tekst, `class="g-mal-t" text-anchor="${a < Math.PI * 1.5 ? 'end' : 'start'}"`));
  }
  deler.push(tekst(cx, cy - 22, `${tall(p.y, des)}${enh}`, 'text-anchor="middle" class="g-midt"'));
  if (mal) deler.push(tekst(cx, cy, `${tall(Math.abs(p.y - mal.y), des)} ${p.y >= mal.y ? 'over' : 'under'} målet`, 'text-anchor="middle" class="g-t-blekk"'));
  deler.push(tekst(cx - R + w / 2, cy + 18, '0', 'text-anchor="middle"'));
  deler.push(tekst(cx + R - w / 2, cy + 18, `${tall(maks, 0)}${enh}`, 'text-anchor="middle"'));

  const a = vinkel(p.y);
  const beskrivelse = `${d.tittel}. ${tall(p.y, des)}${enh}${mal ? `, ${mal.tekst}` : ''}.`;
  return {
    svg: `<svg viewBox="0 0 ${bredde} ${H}" class="g-svg" role="img" aria-label="${esc(beskrivelse)}">${deler.join('')}</svg>`,
    bredde, hoyde: H, modus: 'element',
    punkter: [{ x: cx + (R - w / 2) * Math.cos(a), y: cy + (R - w / 2) * Math.sin(a), tekst: `${p.x}\n${tall(p.y, des)}${enh}${mal ? `\n${mal.tekst}` : ''}` }],
    tabell: { kolonner: ['', d.serier[0].navn], rader: [[String(p.x), tall(p.y, des)]] },
    beskrivelse,
  };
}
