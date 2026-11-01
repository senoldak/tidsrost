// Ağaç haritası: tek seri, büyükten küçüğe; alan değerle orantılı. Liste toplamca ikiye bölünür, dikdörtgen uzun kenarından.
import { kortEnhet, kortNavn, r2, svgKabuk, tall, tekst, tom } from '../felles.mjs';
import { farge } from './flerserie.mjs';

// liste: { navn, v }[] (v değer); ut: { navn, v, x, y, w, h }[] (x/y/w/h kutu).
function del(liste, x, y, w, h, ut) {
  if (!liste.length) return;
  if (liste.length === 1) {
    ut.push({ navn: liste[0].navn, v: liste[0].v, x, y, w, h });
    return;
  }
  const sum = liste.reduce((a, q) => a + q.v, 0);
  let acc = 0, k = 0;
  while (k < liste.length - 1 && acc + liste[k].v <= sum / 2) acc += liste[k++].v;
  if (k === 0) acc = liste[k++].v;
  const andel = sum ? acc / sum : 0.5;
  if (w >= h) {
    del(liste.slice(0, k), x, y, w * andel, h, ut);
    del(liste.slice(k), x + w * andel, y, w * (1 - andel), h, ut);
  } else {
    del(liste.slice(0, k), x, y, w, h * andel, ut);
    del(liste.slice(k), x, y + h * andel, w, h * (1 - andel), ut);
  }
}

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? 900 : 400, H = 240;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet);
  const liste = d.serier[0].punkter.filter((q) => !tom(q.y) && q.y > 0).map((q) => ({ navn: String(q.x), v: q.y })).sort((a, b) => b.v - a.v);
  const sum = liste.reduce((a, q) => a + q.v, 0);
  const pst = (v) => `${tall((v / (sum || 1)) * 100, 1)} %`;
  const bokser = [];
  if (sum > 0) del(liste, 0, 0, bredde, H, bokser);
  const deler = [];
  const punkter = bokser.map((b, i) => {
    deler.push(`<rect data-i="${i}" x="${r2(b.x)}" y="${r2(b.y)}" width="${r2(b.w)}" height="${r2(b.h)}" class="${farge(i)} g-boks"/>`);
    if (b.w > 70 && b.h > 34) {
      deler.push(tekst(b.x + 6, b.y + 16, kortNavn(b.navn, Math.floor(b.w / 7)), 'class="g-boks-t"'));
      deler.push(tekst(b.x + 6, b.y + 30, pst(b.v), 'class="g-boks-t"'));
    }
    return { x: b.x + b.w / 2, y: b.y + 4, tekst: `${b.navn}\n${tall(b.v, des)}${enh} (${pst(b.v)})` };
  });
  const beskrivelse = `${d.tittel}. ${liste.slice(0, 3).map((q) => `${q.navn} ${pst(q.v)}`).join(', ')}.`;
  return {
    svg: svgKabuk(bredde, H, beskrivelse, deler.join('')),
    bredde, hoyde: H, modus: 'element', punkter,
    tabell: { kolonner: ['', d.serier[0].navn, 'Andel'], rader: liste.map((q) => [q.navn, tall(q.v, des), pst(q.v)]) },
    beskrivelse,
  };
}
