// Halka: tek seri, x = ad, y = pay. En büyük valg.maks (5) dilim + "Andre". Orta metin toplamı, dokununca dilimin payını yazar.
import { esc, kortNavn, r2, tall, tekst, tom } from '../felles.mjs';

const RENK = ['g-f-su', 'g-f-kontur', 'g-f-rod', 'g-f-gul', 'g-f-su2', 'g-f-bar'];

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = 400, H = 220, cx = 110, cy = 110, R = 96, r = 58;
  const des = d.desimaler ?? 1;
  const alle = d.serier[0].punkter.filter((p) => !tom(p.y) && p.y >= 0).sort((a, b) => b.y - a.y);
  const sum = alle.reduce((a, p) => a + p.y, 0) || 1;
  const maks = d.valg?.maks ?? 5;
  const dilimler = alle.slice(0, maks).map((p) => ({ navn: String(p.x), y: p.y }));
  const rest = alle.slice(maks).reduce((a, p) => a + p.y, 0);
  if (rest > 0) dilimler.push({ navn: 'Andre', y: rest });
  const pst = (v) => `${tall((v / sum) * 100, 1)} %`;

  const deler = [];
  const nokta = (a, rr) => `${r2(cx + rr * Math.cos(a))} ${r2(cy + rr * Math.sin(a))}`;
  let a0 = -Math.PI / 2;
  const punkter = dilimler.map((s, i) => {
    const andel = s.y / sum;
    const a1 = a0 + andel * Math.PI * 2;
    const midtA = (a0 + a1) / 2;
    if (s.y > 0) {
      const stor = a1 - a0 > Math.PI ? 1 : 0;
      const sluttA = andel >= 0.9999 ? a1 - 0.0001 : a1;
      deler.push(`<path data-i="${i}" class="${RENK[Math.min(i, RENK.length - 1)]} g-skive" d="M${nokta(a0, R)}A${R} ${R} 0 ${stor} 1 ${nokta(sluttA, R)}L${nokta(sluttA, r)}A${r} ${r} 0 ${stor} 0 ${nokta(a0, r)}Z"/>`);
    }
    const ly = 22 + i * 32;
    deler.push(`<rect x="232" y="${ly - 10}" width="12" height="12" class="${RENK[Math.min(i, RENK.length - 1)]}"/>`);
    deler.push(tekst(252, ly, kortNavn(s.navn, 22), 'class="g-t-blekk"'));
    deler.push(tekst(252, ly + 14, pst(s.y)));
    a0 = a1;
    return { x: cx + R * Math.cos(midtA), y: cy + R * Math.sin(midtA), tekst: `${s.navn}\n${pst(s.y)}`, midt: pst(s.y) };
  });
  deler.push(tekst(cx, cy + 7, '100 %', 'data-midt="" text-anchor="middle" class="g-midt"'));

  const beskrivelse = `${d.tittel}. ${dilimler.slice(0, 3).map((s) => `${s.navn} ${pst(s.y)}`).join(', ')}.`;
  return {
    svg: `<svg viewBox="0 0 ${bredde} ${H}" class="g-svg" role="img" aria-label="${esc(beskrivelse)}">${deler.join('')}</svg>`,
    bredde, hoyde: H, modus: 'element', punkter: punkter.filter((_, i) => dilimler[i].y > 0),
    tabell: { kolonner: ['', d.serier[0].navn, 'Andel'], rader: d.serier[0].punkter.map((p) => [String(p.x), tom(p.y) ? '–' : tall(p.y, des), tom(p.y) || p.y < 0 ? '–' : pst(p.y)]) },
    beskrivelse,
  };
}
