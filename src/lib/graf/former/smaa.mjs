// Küçük çoklular: her seri kendi küçük çizgi paneli, ortak y ölçeği; valg.kolonner (varsayılan 3) ızgara.
import { fineTikker, kortEnhet, kortNavn, r2, skala, sti, svgKabuk, tall, tekst, tom } from '../felles.mjs';

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? 900 : 400;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet);
  const k = Math.max(1, d.valg?.kolonner ?? (o.bred ? 4 : 2));
  const rader = Math.ceil(d.serier.length / k);
  const pw = bredde / k, ph = 96, PAD = 8, TOPP = 18;
  const H = rader * ph;
  const alle = d.serier.flatMap((s) => s.punkter.map((p) => p.y)).filter((v) => !tom(v));
  const t = fineTikker(Math.min(...alle), Math.max(...alle), 2);
  const deler = [];
  const punkter = d.serier.map((s, si) => {
    const px = (si % k) * pw, py = Math.floor(si / k) * ph;
    const y = skala(t[0], t.at(-1), py + ph - PAD, py + TOPP + 4);
    const n = s.punkter.length;
    const x = (i) => (n === 1 ? px + pw / 2 : px + PAD + (i / (n - 1)) * (pw - 2 * PAD - 30));
    const siste = s.punkter.findLast((p) => !tom(p.y));
    const forste = s.punkter.find((p) => !tom(p.y));
    deler.push(`<g data-i="${si}"><rect x="${r2(px)}" y="${py}" width="${r2(pw)}" height="${ph}" class="g-luft"/>`);
    deler.push(`<line class="g-smaa-bunn" x1="${r2(px + PAD)}" x2="${r2(px + pw - PAD)}" y1="${r2(y(t[0]))}" y2="${r2(y(t[0]))}"/>`);
    deler.push(tekst(px + PAD, py + 13, kortNavn(s.navn, Math.floor(pw / 7)), 'class="g-t-sterk"'));
    deler.push(`<path class="g-smaa-linje" d="${sti(s.punkter.map((p, i) => ({ x: x(i), y: tom(p.y) ? null : y(p.y) })))}"/>`);
    if (siste) deler.push(tekst(x(s.punkter.lastIndexOf(siste)) + 4, y(siste.y) + 4, tall(siste.y, des), 'class="g-siste"'));
    deler.push('</g>');
    const endring = siste && forste && siste !== forste ? `\nEndring fra ${forste.x}: ${siste.y - forste.y >= 0 ? '+' : ''}${tall(siste.y - forste.y, des)}` : '';
    return { x: px + pw / 2, y: py + 4, tekst: `${s.navn}\nSiste: ${siste ? `${tall(siste.y, des)}${enh} (${siste.x})` : '–'}${endring}` };
  });
  const etiketter = d.serier[0].punkter.map((p) => String(p.x));
  const beskrivelse = `${d.tittel}. ${d.under ? `${d.under}. ` : ''}${d.serier.length} små grafer med felles skala.`;
  return {
    svg: svgKabuk(bredde, H, beskrivelse, deler.join('')),
    bredde, hoyde: H, modus: 'element', punkter,
    tabell: { kolonner: ['', ...etiketter], rader: d.serier.map((s) => [s.navn, ...etiketter.map((e) => { const p = s.punkter.find((q) => String(q.x) === e); return p && !tom(p.y) ? tall(p.y, des) : '–'; })]) },
    beskrivelse,
  };
}
