// Mini tablo (motordaki minitablo): satırda etiket, değer + satır içi çubuk (seri 0), işaretli değişim (seri 1).
// Her seri kendi ondalığını (desimaler) ve yüzde biçimini (prosent) taşıyabilir.
import { kortEnhet, kortNavn, r2, svgKabuk, tall, tekst, tom } from '../felles.mjs';

const RAD = 40, TOPP = 30;

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] @returns {import('../sema.mjs').Tegning} */
export function tegn(d, o = {}) {
  const bredde = o.bred ? 900 : 400;
  const [verdi, endring] = d.serier;
  const enhVerdi = verdi.prosent ? ' %' : kortEnhet(d.enhet);
  const enhEndring = endring.prosent ? ' %' : kortEnhet(d.enhet);
  const fv = (q) => (tom(q.y) ? '–' : `${tall(q.y, verdi.desimaler ?? d.desimaler ?? 0)}${enhVerdi}`);
  const fe = (y) => {
    if (tom(y)) return '–';
    const t = tall(y, endring.desimaler ?? d.desimaler ?? 0);
    const null0 = !/[1-9]/.test(t);
    return `${y > 0 && !null0 ? '+' : ''}${t}${enhEndring}`;
  };
  const fremhev = d.valg?.fremhev?.map(String) ?? [];
  const maks = Math.max(0, ...verdi.punkter.map((q) => q.y ?? 0)) || 1;
  const XB = o.bred ? 420 : 170, BW = o.bred ? 260 : 100;
  const deler = [
    tekst(XB - 8, 16, kortNavn(verdi.navn, 18).toLocaleUpperCase('nb'), 'class="g-overtekst" text-anchor="end"'),
    tekst(bredde, 16, kortNavn(endring.navn, 14).toLocaleUpperCase('nb'), 'class="g-overtekst" text-anchor="end"'),
    `<line class="g-akse-sterk" x1="0" x2="${bredde}" y1="${TOPP - 6}" y2="${TOPP - 6}"/>`,
  ];
  const punkter = verdi.punkter.map((q, i) => {
    const e = endring.punkter.find((r) => String(r.x) === String(q.x))?.y ?? null;
    const y0 = TOPP + i * RAD;
    const ut = fremhev.includes(String(q.x));
    deler.push(`<g data-i="${i}"><rect x="0" y="${y0}" width="${bredde}" height="${RAD}" class="g-luft"/>`);
    deler.push(tekst(0, y0 + 25, kortNavn(String(q.x), o.bred ? 40 : 18), ut ? 'class="g-t-sterk"' : 'class="g-t-blekk"'));
    deler.push(tekst(XB - 8, y0 + 25, fv(q), `text-anchor="end" class="${ut ? 'g-t-sterk' : 'g-t-blekk'}"`));
    if (!tom(q.y)) deler.push(`<rect x="${XB}" y="${y0 + 14}" width="${r2(Math.max(1, (BW * Math.max(0, q.y)) / maks))}" height="14" class="${ut ? 'g-f-su' : 'g-f-bar'}"/>`);
    deler.push(tekst(bredde, y0 + 25, fe(e), `text-anchor="end" class="g-t-sterk${ut ? ' g-t-su' : ''}"`));
    deler.push(`<line class="g-akse-linje" x1="0" x2="${bredde}" y1="${y0 + RAD}" y2="${y0 + RAD}"/></g>`);
    return { x: XB + BW / 2, y: y0 + 8, tekst: `${q.x}\n${verdi.navn}: ${fv(q)}\n${endring.navn}: ${fe(e)}` };
  });
  const H = TOPP + verdi.punkter.length * RAD + 4;
  const beskrivelse = `${d.tittel}. ${verdi.punkter.length} rader: ${verdi.navn} og ${endring.navn}.`;
  return {
    svg: svgKabuk(bredde, H, beskrivelse, deler.join('')),
    bredde, hoyde: H, modus: 'element', punkter,
    tabell: { kolonner: ['', verdi.navn, endring.navn], rader: verdi.punkter.map((q) => [String(q.x), fv(q), fe(endring.punkter.find((r) => String(r.x) === String(q.x))?.y ?? null)]) },
    beskrivelse,
  };
}
