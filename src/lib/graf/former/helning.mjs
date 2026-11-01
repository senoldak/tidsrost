// Eğim: her seri bir kategori, iki nokta (önce/sonra). En çok artan mavi, en çok düşen kırmızı; ötekiler soluk ve etiketsiz.
import { esc, kortEnhet, kortNavn, r2, skala, tall, tekst, tom } from '../felles.mjs';

/** @param {import('../sema.mjs').GrafData} d @returns {import('../sema.mjs').Tegning} */
export function tegn(d) {
  const bredde = 400, H = 300, X1 = 110, X2 = 260;
  const des = d.desimaler ?? 1;
  const enh = kortEnhet(d.enhet);
  const rader = d.serier.filter((s) => !tom(s.punkter[0]?.y) && !tom(s.punkter[1]?.y)).map((s) => ({ navn: s.navn, a: s.punkter[0].y, b: s.punkter[1].y }));
  const [etA, etB] = [String(d.serier[0].punkter[0].x), String(d.serier[0].punkter[1]?.x ?? '')];
  const endring = (r) => r.b - r.a;
  const opp = rader.reduce((m, r) => (endring(r) > endring(m) ? r : m), rader[0]);
  const ned = rader.reduce((m, r) => (endring(r) < endring(m) ? r : m), rader[0]);
  const alle = rader.flatMap((r) => [r.a, r.b]);
  const y = skala(Math.min(...alle), Math.max(...alle), H - 16, 28);
  const deler = [tekst(X1, 14, etA, 'text-anchor="middle" class="g-t-sterk"'), tekst(X2, 14, etB, 'text-anchor="middle" class="g-t-sterk"')];
  const punkter = rader.map((r, i) => {
    const vurgu = rader.length > 1 && r === opp && endring(r) > 0 ? ' g-su-vurgu' : rader.length > 1 && r === ned && endring(r) < 0 ? ' g-rod-vurgu' : '';
    deler.push(`<g data-i="${i}" class="g-helning${vurgu}"><line x1="${X1}" x2="${X2}" y1="${r2(y(r.a))}" y2="${r2(y(r.b))}"/><circle cx="${X1}" cy="${r2(y(r.a))}" r="3.5"/><circle cx="${X2}" cy="${r2(y(r.b))}" r="3.5"/>`);
    if (vurgu || rader.length === 1) deler.push(tekst(X2 + 8, y(r.b) + 4, kortNavn(r.navn, 18)));
    deler.push('</g>');
    return { x: X2, y: y(r.b), tekst: `${r.navn}\n${tall(r.a, des)} → ${tall(r.b, des)}${enh}` };
  });
  const beskrivelse = `${d.tittel}. ${opp ? `Størst økning: ${opp.navn}.` : ''}`;
  return {
    svg: `<svg viewBox="0 0 ${bredde} ${H}" class="g-svg" role="img" aria-label="${esc(beskrivelse)}">${deler.join('')}</svg>`,
    bredde, hoyde: H, modus: 'element', punkter,
    tabell: { kolonner: ['', etA, etB], rader: rader.map((r) => [r.navn, tall(r.a, des), tall(r.b, des)]) },
    beskrivelse,
  };
}
