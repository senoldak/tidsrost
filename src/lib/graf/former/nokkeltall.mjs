// Büyük rakam (motordaki tekrakam): rol 'ana' tek nokta büyük yazılır; isteğe bağlı 'sammenligning' (1–3 nokta) ortak
// ölçekli yatay çubuklar, 'kunye' (2–4 nokta) altta eşit hücreler. Yalnız girilen değerler yazılır.
import { kortEnhet, kortNavn, r2, svgKabuk, tall, tekst } from '../felles.mjs';

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? 900 : 400;
  const des = d.desimaler ?? 0;
  const enh = kortEnhet(d.enhet);
  const ana = d.serier.find((s) => s.rol === 'ana');
  const sml = d.serier.find((s) => s.rol === 'sammenligning');
  const kunye = d.serier.find((s) => s.rol === 'kunye');
  const fremhev = d.valg?.fremhev?.map(String) ?? (sml ? [String(sml.punkter[0].x)] : []);
  const v = (s, q) => `${tall(q.y, s.desimaler ?? des)}${enh}`;
  const deler = [];
  const punkter = [];
  let y = 18;
  const a = ana.punkter[0];
  deler.push(`<g data-i="0"><rect x="0" y="0" width="${bredde}" height="96" class="g-luft"/>`);
  deler.push(tekst(0, y, String(a.x).toLocaleUpperCase('nb'), 'class="g-overtekst"'));
  deler.push(tekst(0, y + 64, v(ana, a), 'class="g-stortall"'));
  deler.push('</g>');
  punkter.push({ x: 60, y: 4, tekst: `${a.x}\n${v(ana, a)}` });
  y += 92;
  if (sml) {
    const maks = Math.max(...sml.punkter.map((q) => q.y), 0) || 1;
    sml.punkter.forEach((q) => {
      const i = punkter.length;
      const w = (bredde * Math.max(0, q.y)) / maks;
      const ut = fremhev.includes(String(q.x));
      deler.push(`<g data-i="${i}"><rect x="0" y="${y - 4}" width="${bredde}" height="54" class="g-luft"/>`);
      deler.push(`<rect data-i="${i}" x="0" y="${y}" width="${r2(Math.max(1, w))}" height="24" class="${ut ? 'g-f-su' : 'g-f-bar'}"/>`);
      deler.push(tekst(0, y + 42, `${kortNavn(String(q.x), 40)}: ${v(sml, q)}`, ut ? 'class="g-t-sterk"' : ''));
      deler.push('</g>');
      punkter.push({ x: Math.max(8, w / 2), y, tekst: `${q.x}\n${v(sml, q)}` });
      y += 58;
    });
  }
  if (kunye) {
    y += 6;
    deler.push(`<line class="g-akse-linje" x1="0" x2="${bredde}" y1="${y}" y2="${y}"/>`);
    const n = kunye.punkter.length;
    const cw = bredde / n;
    kunye.punkter.forEach((q, j) => {
      const i = punkter.length;
      const x0 = j * cw;
      const anker = j === 0 ? 'start' : j === n - 1 ? 'end' : 'middle';
      const xt = j === 0 ? x0 : j === n - 1 ? x0 + cw : x0 + cw / 2;
      deler.push(`<g data-i="${i}"><rect x="${r2(x0)}" y="${y}" width="${r2(cw)}" height="56" class="g-luft"/>`);
      if (j > 0) deler.push(`<line class="g-akse-linje" x1="${r2(x0)}" x2="${r2(x0)}" y1="${y + 8}" y2="${y + 50}"/>`);
      deler.push(tekst(xt, y + 22, kortNavn(String(q.x), 16).toLocaleUpperCase('nb'), `class="g-overtekst" text-anchor="${anker}"`));
      deler.push(tekst(xt, y + 46, v(kunye, q), `class="g-t-sterk g-kunye-tall" text-anchor="${anker}"`));
      deler.push('</g>');
      punkter.push({ x: x0 + cw / 2, y, tekst: `${q.x}\n${v(kunye, q)}` });
    });
    y += 60;
  }
  const H = y + 4;
  const beskrivelse = `${d.tittel}. ${a.x}: ${v(ana, a)}.`;
  const rader = d.serier.flatMap((s) => s.punkter.map((q) => [String(q.x), tall(q.y, s.desimaler ?? des)]));
  return {
    svg: svgKabuk(bredde, H, beskrivelse, deler.join('')),
    bredde, hoyde: H, modus: 'element', punkter,
    tabell: { kolonner: ['', 'Verdi'], rader },
    beskrivelse,
  };
}
