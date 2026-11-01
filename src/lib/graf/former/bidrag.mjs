// Yatay şelale (motordaki selale): seri 0 parçalar sıfırdan birikerek, seri 1 tek nokta toplam (kanıttaki değer, adıyla).
// Hepsi artıysa bileşim kipi (işaretsiz), eksi varsa değişim kipi (▲ +x / ▼ −x). Ara birikim yazılmaz; yalnız girilen
// değerler yazılır.
import { fineTikker, kortEnhet, kortNavn, r2, skala, svgKabuk, tall, tekst } from '../felles.mjs';

const RAD = 40, TOPP = 6, TOPLAM = 50;

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? 900 : 400;
  const des = d.desimaler ?? 0;
  const enh = kortEnhet(d.enhet);
  const [deler0, totalSerie] = d.serier;
  const parcalar = deler0.punkter;
  const total = totalSerie.punkter[0];
  const degisim = parcalar.some((q) => q.y < 0);
  const fmt = (v, isaret) => {
    const t = tall(v, des);
    if (!isaret || !/[1-9]/.test(t)) return t;
    return v > 0 ? `▲ +${t}` : `▼ ${t}`;
  };
  let acc = 0;
  const steg = parcalar.map((q) => {
    const fra = acc;
    acc += q.y;
    return { navn: String(q.x), fra, til: acc, v: q.y };
  });
  const alle = [0, total.y, ...steg.flatMap((s) => [s.fra, s.til])];
  const tikker = fineTikker(Math.min(...alle), Math.max(...alle));
  const M = o.bred ? 260 : 120, VERDI = 74;
  const x = skala(tikker[0], tikker.at(-1), M, bredde - VERDI);
  const deler = [];
  const punkter = steg.map((s, i) => {
    const yy = TOPP + i * RAD;
    const x0 = Math.min(x(s.fra), x(s.til)), x1 = Math.max(x(s.fra), x(s.til));
    deler.push(`<g data-i="${i}"><rect x="0" y="${yy}" width="${bredde}" height="${RAD}" class="g-luft"/>`);
    deler.push(tekst(M - 8, yy + 25, kortNavn(s.navn, o.bred ? 34 : 16), 'text-anchor="end" class="g-t-blekk"'));
    deler.push(`<rect x="${r2(x0)}" y="${yy + 8}" width="${r2(Math.max(1, x1 - x0))}" height="24" class="${!degisim ? 'g-f-bar' : s.v >= 0 ? 'g-f-su2' : 'g-f-blekk'}"/>`);
    deler.push(tekst(x1 + 8, yy + 25, fmt(s.v, degisim), 'class="g-t-sterk"'));
    deler.push('</g>');
    if (i < steg.length - 1) deler.push(`<line class="g-trapp" x1="${r2(x(s.til))}" x2="${r2(x(s.til))}" y1="${yy + 32}" y2="${yy + RAD + 8}"/>`);
    return { x: (x0 + x1) / 2, y: yy + 6, tekst: `${s.navn}\n${fmt(s.v, degisim)}${enh}` };
  });
  const yt = TOPP + steg.length * RAD + 8;
  const i = punkter.length;
  deler.push(`<line class="g-akse-sterk" x1="0" x2="${bredde}" y1="${yt - 4}" y2="${yt - 4}"/>`);
  deler.push(`<g data-i="${i}"><rect x="0" y="${yt}" width="${bredde}" height="${TOPLAM}" class="g-luft"/>`);
  deler.push(tekst(M - 8, yt + 30, kortNavn(String(total.x), o.bred ? 34 : 16), 'text-anchor="end" class="g-t-sterk"'));
  deler.push(`<rect x="${r2(Math.min(x(0), x(total.y)))}" y="${yt + 12}" width="${r2(Math.max(1, Math.abs(x(total.y) - x(0))))}" height="26" class="g-f-su"/>`);
  deler.push(tekst(Math.max(x(0), x(total.y)) + 8, yt + 31, tall(total.y, des), 'class="g-t-sterk g-total-tall"'));
  deler.push('</g>');
  punkter.push({ x: (x(0) + x(total.y)) / 2, y: yt + 8, tekst: `${total.x}\n${tall(total.y, des)}${enh}` });
  const H = yt + TOPLAM + 4;
  deler.push(`<line class="g-null" x1="${r2(x(0))}" x2="${r2(x(0))}" y1="${TOPP}" y2="${H - 4}"/>`);
  const beskrivelse = `${d.tittel}. ${steg.length} deler, ${total.x}: ${tall(total.y, des)}${enh}.`;
  return {
    svg: svgKabuk(bredde, H, beskrivelse, deler.join('')),
    bredde, hoyde: H, modus: 'element', punkter,
    tabell: { kolonner: ['', deler0.navn], rader: [...steg.map((s) => [s.navn, tall(s.v, des)]), [String(total.x), tall(total.y, des)]] },
    beskrivelse,
  };
}
