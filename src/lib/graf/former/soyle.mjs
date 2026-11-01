// Dikey sütun: tek seri, vurgulu sütun(lar) (valg.fremhev; yoksa son sütun) ve isteğe bağlı ortalama çizgisi.
import { esc, etikettIndekser, fineTikker, kortEnhet, r2, skala, tall, tekst, tom } from '../felles.mjs';

const H = 220, V = 36, U = 14, A = 26;

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? 900 : 400;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet);
  const s = d.serier[0];
  const p = s.punkter;
  const verdier = p.map((q) => q.y).filter((v) => !tom(v));
  const snitt = (d.merknader ?? []).find((m) => m.type === 'snitt');
  const snittVerdi = verdier.length ? verdier.reduce((a, b) => a + b, 0) / verdier.length : 0;
  const tikker = fineTikker(Math.min(0, ...verdier), Math.max(0, ...verdier));
  const y = skala(tikker[0], tikker.at(-1), H - A, U);
  const bw = (bredde - V) / p.length;
  const fremhev = d.valg?.fremhev?.map(String) ?? [String(p.at(-1).x)];

  const deler = ['<g class="g-akse">'];
  for (const t of tikker) {
    deler.push(`<line x1="${V}" x2="${bredde}" y1="${r2(y(t))}" y2="${r2(y(t))}"/>`);
    deler.push(tekst(V - 6, y(t) + 4, tall(t, Number.isInteger(t) ? 0 : 1), 'text-anchor="end"'));
  }
  for (const i of etikettIndekser(p.length, o.bred ? 8 : 4)) deler.push(tekst(V + i * bw + bw / 2, H - 7, String(p[i].x), 'text-anchor="middle"'));
  deler.push('</g>');

  const punkter = p.map((q, i) => {
    const x0 = V + i * bw + Math.min(3, bw * 0.15);
    const w = Math.max(1, bw - 2 * Math.min(3, bw * 0.15));
    if (tom(q.y)) {
      deler.push(`<rect data-i="${i}" x="${r2(x0)}" y="${U}" width="${r2(w)}" height="${H - A - U}" class="g-luft"/>`);
      return { x: x0 + w / 2, y: y(0), tekst: `${q.x}\n–` };
    }
    const top = Math.min(y(q.y), y(0));
    const klasse = fremhev.includes(String(q.x)) ? 'g-f-su' : 'g-f-bar';
    deler.push(`<rect data-i="${i}" x="${r2(x0)}" y="${r2(top)}" width="${r2(w)}" height="${r2(Math.max(0.5, Math.abs(y(q.y) - y(0))))}" class="${klasse}"/>`);
    return { x: x0 + w / 2, y: top, tekst: `${q.x}\n${tall(q.y, des)}${enh}` };
  });
  deler.push(`<line class="g-null" x1="${V}" x2="${bredde}" y1="${r2(y(0))}" y2="${r2(y(0))}"/>`);
  if (snitt) {
    deler.push(`<line class="g-mal" x1="${V}" x2="${bredde}" y1="${r2(y(snittVerdi))}" y2="${r2(y(snittVerdi))}"/>`);
    deler.push(tekst(V + 4, y(snittVerdi) - 5, `${snitt.tekst ?? 'Snitt'} ${tall(snittVerdi, des)}${enh}`, 'class="g-mal-t"'));
  }

  const siste = p.findLast((q) => !tom(q.y));
  const beskrivelse = `${d.tittel}. ${d.under ? `${d.under}. ` : ''}Siste verdi ${siste ? `${tall(siste.y, des)}${enh}` : '–'} (${siste?.x ?? ''}).`;
  return {
    svg: `<svg viewBox="0 0 ${bredde} ${H}" class="g-svg" role="img" aria-label="${esc(beskrivelse)}">${deler.join('')}</svg>`,
    bredde, hoyde: H, modus: 'element', punkter,
    tabell: { kolonner: ['', s.navn], rader: p.map((q) => [String(q.x), tom(q.y) ? '–' : tall(q.y, des)]) },
    beskrivelse,
  };
}
