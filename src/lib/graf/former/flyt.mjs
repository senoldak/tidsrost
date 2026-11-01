// Akış (sankey): punkter { x: kaynak, til: hedef, y: değer }. Solda kaynaklar, sağda hedefler; bant kalınlığı değerle orantılı.
import { kortEnhet, kortNavn, r2, svgKabuk, tall, tekst } from '../felles.mjs';
import { farge } from './flerserie.mjs';

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? 900 : 400;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet);
  const p = d.serier[0].punkter.filter((q) => Number.isFinite(q.y) && q.y > 0);
  const venstre = [...new Set(p.map((q) => String(q.x)))];
  const hoyre = [...new Set(p.map((q) => String(q.til)))];
  const sumAv = (navn, felt) => p.filter((q) => String(q[felt]) === navn).reduce((a, q) => a + q.y, 0);
  const total = p.reduce((a, q) => a + q.y, 0) || 1;
  const H = Math.max(180, Math.max(venstre.length, hoyre.length) * 34 + 20);
  const U = 8, GAP = 8, NW = 10;
  const XL = o.bred ? 230 : 110, XR = bredde - (o.bred ? 230 : 110);
  const k = (n) => (H - 2 * U - GAP * (n - 1)) / total;
  const kv = k(venstre.length), kh = k(hoyre.length);
  const skala = Math.min(kv, kh);
  const plasser = (navnene, felt) => {
    let yy = U;
    return Object.fromEntries(navnene.map((n) => {
      const h = sumAv(n, felt) * skala;
      const pos = { y: yy, h, brukt: 0 };
      yy += h + GAP;
      return [n, pos];
    }));
  };
  const L = plasser(venstre, 'x'), R = plasser(hoyre, 'til');
  const deler = [];
  const punkter = p.map((q, i) => {
    const l = L[String(q.x)], r = R[String(q.til)];
    const t = q.y * skala;
    const y0 = l.y + l.brukt, y1 = r.y + r.brukt;
    l.brukt += t;
    r.brukt += t;
    const xm = (XL + NW + XR) / 2;
    deler.push(`<path data-i="${i}" class="g-flyt ${farge(venstre.indexOf(String(q.x)))}" d="M${XL + NW} ${r2(y0)}C${r2(xm)} ${r2(y0)} ${r2(xm)} ${r2(y1)} ${XR} ${r2(y1)}L${XR} ${r2(y1 + t)}C${r2(xm)} ${r2(y1 + t)} ${r2(xm)} ${r2(y0 + t)} ${XL + NW} ${r2(y0 + t)}Z"/>`);
    return { x: xm, y: (y0 + y1) / 2, tekst: `${q.x} → ${q.til}\n${tall(q.y, des)}${enh}` };
  });
  const maks = o.bred ? 34 : 16;
  for (const n of venstre) {
    deler.push(`<rect x="${XL}" y="${r2(L[n].y)}" width="${NW}" height="${r2(L[n].h)}" class="g-node-v"/>`);
    deler.push(tekst(XL - 6, L[n].y + L[n].h / 2 + 4, kortNavn(n, maks), 'text-anchor="end" class="g-t-blekk"'));
  }
  for (const n of hoyre) {
    deler.push(`<rect x="${XR}" y="${r2(R[n].y)}" width="${NW}" height="${r2(R[n].h)}" class="g-node-h"/>`);
    deler.push(tekst(XR + NW + 6, R[n].y + R[n].h / 2 + 4, kortNavn(n, maks), 'class="g-t-blekk"'));
  }
  const beskrivelse = `${d.tittel}. ${d.under ? `${d.under}. ` : ''}Fra ${venstre.length} til ${hoyre.length}, til sammen ${tall(total, des)}${enh}.`;
  return {
    svg: svgKabuk(bredde, H, beskrivelse, deler.join('')),
    bredde, hoyde: H, modus: 'element', punkter,
    tabell: { kolonner: ['Fra', 'Til', d.serier[0].navn], rader: p.map((q) => [String(q.x), String(q.til), tall(q.y, des)]) },
    beskrivelse,
  };
}
