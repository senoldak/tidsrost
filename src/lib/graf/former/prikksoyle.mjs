// Nokta sütunu: her x için üst üste noktalar; bir nokta = valg.prikk birim (varsayılan 0,5). Negatif değer nokta çizmez.
import { esc, etikettIndekser, kortNavn, kortEnhet, r2, tall, tekst, tom } from '../felles.mjs';

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? 900 : 400;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet);
  const enhetPrikk = d.valg?.prikk ?? 0.5;
  const s = d.serier[0];
  const p = s.punkter;
  const antall = p.map((q) => (tom(q.y) || q.y <= 0 ? 0 : Math.round(q.y / enhetPrikk)));
  const maksAntall = Math.max(...antall);
  const bw = bredde / p.length;
  const r = Math.max(2, Math.min(6, bw / 2 - 1.5));
  const steg = r * 2 + 2;
  const A = 24;
  const H = Math.max(120, Math.max(...antall) * steg + A + 10);
  const deler = [];
  const punkter = p.map((q, i) => {
    const cx = i * bw + bw / 2;
    deler.push(`<g data-i="${i}"><rect x="${r2(i * bw)}" y="0" width="${r2(bw)}" height="${H - A}" class="g-luft"/>`);
    for (let j = 0; j < antall[i]; j++) deler.push(`<circle cx="${r2(cx)}" cy="${r2(H - A - r - j * steg)}" r="${r2(r)}" class="g-f-su"/>`);
    if (d.valg?.bakgrunn) for (let j = antall[i]; j < maksAntall; j++) deler.push(`<circle cx="${r2(cx)}" cy="${r2(H - A - r - j * steg)}" r="${r2(r)}" class="g-prikk-bak"/>`);
    deler.push('</g>');
    return { x: cx, y: H - A - antall[i] * steg, tekst: `${q.x}\n${tom(q.y) ? '–' : `${tall(q.y, des)}${enh}`}` };
  });
  for (const i of etikettIndekser(p.length, o.bred ? 8 : 4)) deler.push(tekst(i * bw + bw / 2, H - 6, kortNavn(String(p[i].x), 12), 'text-anchor="middle"'));
  const beskrivelse = `${d.tittel}. ${d.under ? `${d.under}. ` : ''}Én prikk er ${tall(enhetPrikk, enhetPrikk % 1 ? 1 : 0)}${enh}.`;
  return {
    svg: `<svg viewBox="0 0 ${bredde} ${H}" class="g-svg" role="img" aria-label="${esc(beskrivelse)}">${deler.join('')}</svg>`,
    bredde, hoyde: H, modus: 'element', punkter,
    tabell: { kolonner: ['', s.navn], rader: p.map((q) => [String(q.x), tom(q.y) ? '–' : tall(q.y, des)]) },
    beskrivelse,
  };
}
