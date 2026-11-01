// Sütun + çizgi: seri 0 sütun (sol eksen, d.enhet), seri 1 çizgi (sağ eksen, valg.enhet2). İki ayrı ölçek açıkça etiketli.
import { fineTikker, kortEnhet, r2, skala, sti, svgKabuk, tall, tekst, tikkDesimaler, tom, xEtiketter, yAkse } from '../felles.mjs';
import { hizala } from './flerserie.mjs';

const H = 230, V = 44, S = 44, U = 14, A = 26;

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? 900 : 400;
  const des = d.desimaler ?? 1;
  const enh1 = kortEnhet(d.enhet), enh2 = kortEnhet(d.valg?.enhet2 ?? '');
  const { etiketter, verdier: [sv, lv] } = hizala(d.serier);
  const s1 = sv.filter((v) => v !== null), s2 = lv.filter((v) => v !== null);
  const t1 = fineTikker(Math.min(0, ...s1), Math.max(0, ...s1));
  const t2 = fineTikker(Math.min(...s2), Math.max(...s2));
  const y1 = skala(t1[0], t1.at(-1), H - A, U), y2 = skala(t2[0], t2.at(-1), H - A, U);
  const bw = (bredde - V - S) / etiketter.length;
  const x = (i) => V + i * bw + bw / 2;
  const deler = [yAkse(t1, y1, V, bredde - S)];
  const d2 = tikkDesimaler(t2);
  deler.push(`<g class="g-akse g-akse-h">${t2.map((t) => tekst(bredde - S + 6, y2(t) + 4, tall(t, d2), 'class="g-akse-h-t"')).join('')}</g>`);
  deler.push(`<g class="g-akse">${xEtiketter(etiketter, x, H, o.bred ? 8 : 4)}</g>`);
  sv.forEach((v, i) => {
    if (v === null) return;
    const w = Math.max(1, bw * 0.7);
    deler.push(`<rect x="${r2(x(i) - w / 2)}" y="${r2(Math.min(y1(v), y1(0)))}" width="${r2(w)}" height="${r2(Math.max(0.5, Math.abs(y1(v) - y1(0))))}" class="g-f-su2"/>`);
  });
  deler.push(`<g class="g-serie g-s1"><path d="${sti(lv.map((v, i) => ({ x: x(i), y: v === null ? null : y2(v) })))}"/></g>`);
  const punkter = etiketter.map((e, i) => ({
    x: x(i),
    y: Math.min(sv[i] === null ? H - A : y1(sv[i]), lv[i] === null ? H - A : y2(lv[i])),
    tekst: [e, `${d.serier[0].navn}: ${sv[i] === null ? '–' : `${tall(sv[i], des)}${enh1}`}`, `${d.serier[1].navn}: ${tom(lv[i]) ? '–' : `${tall(lv[i], des)}${enh2}`}`].join('\n'),
  }));
  const beskrivelse = `${d.tittel}. ${d.under ? `${d.under}. ` : ''}Søyler: ${d.serier[0].navn} (venstre akse). Linje: ${d.serier[1].navn} (høyre akse).`;
  return {
    svg: svgKabuk(bredde, H, beskrivelse, deler.join('')),
    bredde, hoyde: H, modus: 'serie', punkter, ramme: { topp: U, bunn: H - A },
    nokkel: [{ navn: `${d.serier[0].navn} (venstre)`, klasse: 'g-n-su2' }, { navn: `${d.serier[1].navn} (høyre)`, klasse: 'g-s1' }],
    tabell: { kolonner: ['', d.serier[0].navn, d.serier[1].navn], rader: etiketter.map((e, i) => [e, sv[i] === null ? '–' : tall(sv[i], des), lv[i] === null ? '–' : tall(lv[i], des)]) },
    beskrivelse,
  };
}
