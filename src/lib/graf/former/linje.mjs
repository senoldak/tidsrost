// Çizgi: tek ya da çok seri (en çok 3), basamak (valg.trapp), log eksen (valg.logAkse), hedef çizgisi ve vurgulu dönem.
import { esc, etikettIndekser, fineTikker, kortEnhet, skala, sti, tall, tekst, trappSti } from '../felles.mjs';

const B = 400, B_BRED = 900, H = 220, V = 40, S = 46, U = 14, A = 26;

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? B_BRED : B;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet);
  const serier = d.serier.slice(0, 3);
  const etiketter = serier[0].punkter.map((p) => String(p.x));
  const lengde = etiketter.length;
  const log = !!d.valg?.logAkse;
  const verdier = serier.flatMap((s) => s.punkter.map((p) => p.y)).filter((v) => v !== null && v !== undefined);
  const maler = (d.merknader ?? []).filter((m) => m.type === 'mal');
  const alle = [...verdier, ...maler.map((m) => m.y)];

  let tikker, y;
  if (log) {
    const lo = Math.floor(Math.log10(Math.min(...alle.filter((v) => v > 0))));
    const hi = Math.ceil(Math.log10(Math.max(...alle)));
    tikker = Array.from({ length: hi - lo + 1 }, (_, i) => 10 ** (lo + i));
    const ly = skala(lo, Math.max(hi, lo + 1), H - A, U);
    y = (v) => ly(Math.log10(v));
  } else {
    tikker = fineTikker(Math.min(...alle), Math.max(...alle));
    y = skala(tikker[0], tikker.at(-1), H - A, U);
  }
  const x = (i) => (lengde === 1 ? (V + bredde - S) / 2 : V + (i / (lengde - 1)) * (bredde - V - S));
  const steg = lengde > 1 ? (bredde - V - S) / (lengde - 1) : bredde - V - S;

  const deler = [];
  deler.push('<g class="g-akse">');
  for (const t of tikker) {
    deler.push(`<line x1="${V}" x2="${bredde - S + 6}" y1="${y(t)}" y2="${y(t)}"${t === 0 ? ' class="g-null"' : ''}/>`);
    deler.push(tekst(V - 6, y(t) + 4, log ? t.toLocaleString('nb-NO') : tall(t, Number.isInteger(t) ? 0 : 1), 'text-anchor="end"'));
  }
  for (const i of etikettIndekser(lengde)) {
    const anker = lengde === 1 ? 'middle' : i === 0 ? 'start' : i === lengde - 1 ? 'end' : 'middle';
    deler.push(tekst(x(i), H - 7, etiketter[i], `text-anchor="${anker}"`));
  }
  deler.push('</g>');

  for (const m of d.merknader ?? []) {
    if (m.type === 'periode') {
      const a = etiketter.indexOf(String(m.fra)), b = etiketter.indexOf(String(m.til));
      if (a < 0 || b < 0) continue;
      const x0 = x(a) - steg / 2, x1 = x(b) + steg / 2;
      deler.push(`<rect class="g-periode" x="${x0}" y="${U}" width="${x1 - x0}" height="${H - A - U}"/>`);
      if (m.tekst) deler.push(tekst((x0 + x1) / 2, U + 11, m.tekst, `class="g-periode-t" text-anchor="${(x0 + x1) / 2 > bredde - 70 ? 'end' : 'middle'}"`));
    }
  }
  for (const m of maler) {
    deler.push(`<line class="g-mal" x1="${V}" x2="${bredde - S + 6}" y1="${y(m.y)}" y2="${y(m.y)}"/>`);
    deler.push(tekst(V + 4, y(m.y) - 5, m.tekst, 'class="g-mal-t"'));
  }

  serier.forEach((s, si) => {
    const p = s.punkter.map((q, i) => ({ x: x(i), y: q.y === null || q.y === undefined ? null : y(q.y) }));
    deler.push(`<g class="g-serie g-s${si}"><path d="${d.valg?.trapp ? trappSti(p) : sti(p)}"/>`);
    const siste = [...s.punkter].map((q, i) => ({ q, i })).reverse().find(({ q }) => q.y !== null && q.y !== undefined);
    if (siste) {
      deler.push(`<circle cx="${x(siste.i)}" cy="${y(siste.q.y)}" r="3.5"/>`);
      deler.push(tekst(x(siste.i) + 7, y(siste.q.y) + 4, tall(siste.q.y, des), 'class="g-siste"'));
    }
    deler.push('</g>');
  });

  const punkter = [];
  for (let i = 0; i < lengde; i++) {
    const verdi = serier.map((s) => s.punkter[i]?.y).map((v) => (v === null || v === undefined ? null : v));
    if (verdi.every((v) => v === null)) continue;
    const linjer = serier.length === 1 ? [`${tall(verdi[0], des)}${enh}`] : serier.map((s, si) => `${s.navn}: ${verdi[si] === null ? '–' : `${tall(verdi[si], des)}${enh}`}`);
    punkter.push({ x: x(i), y: Math.min(...verdi.filter((v) => v !== null).map(y)), tekst: [etiketter[i], ...linjer].join('\n') });
  }

  const sisteVerdi = serier[0].punkter.findLast((p) => p.y !== null && p.y !== undefined);
  const beskrivelse = `${d.tittel}. ${d.under ? `${d.under}. ` : ''}Siste verdi ${sisteVerdi ? `${tall(sisteVerdi.y, des)}${enh}` : '–'} (${sisteVerdi?.x ?? ''}).`;
  return {
    svg: `<svg viewBox="0 0 ${bredde} ${H}" class="g-svg" role="img" aria-label="${esc(beskrivelse)}">${deler.join('')}</svg>`,
    bredde, hoyde: H, modus: 'serie', punkter, ramme: { topp: U, bunn: H - A },
    tabell: { kolonner: ['', ...serier.map((s) => s.navn)], rader: etiketter.map((e, i) => [e, ...serier.map((s) => (s.punkter[i]?.y === null || s.punkter[i]?.y === undefined ? '–' : tall(s.punkter[i].y, des)))]) },
    beskrivelse,
  };
}
