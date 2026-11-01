// Grafik verisinin tek sözleşmesi: Graf.astro prop'ları ve Forklart'taki graf-N.json aynı şemayı kullanır.

/**
 * @typedef {{ x: string|number, y: number|null, y2?: number, til?: string, start?: number, slutt?: number }} Punkt
 * @typedef {{ navn: string, punkter: Punkt[] }} Serie
 * @typedef {{ type: 'mal', y: number, tekst: string } | { type: 'snitt', tekst?: string } | { type: 'periode', fra: string|number, til: string|number, tekst?: string }} Merknad
 * @typedef {{
 *   form: string, tittel: string, under?: string, tall?: { verdi: string, etikett?: string },
 *   kilde: { navn: string, url?: string, tabell?: string }, enhet: string, desimaler?: number,
 *   serier: Serie[], merknader?: Merknad[],
 *   valg?: { trapp?: boolean, logAkse?: boolean, sorter?: boolean, maks?: number, fremhev?: (string|number)[], prikk?: number, gruppenavn?: [string, string], spor?: boolean, pinne?: boolean, prognoseFra?: string|number, bakgrunn?: boolean, prosent?: boolean, kolonner?: number, trend?: boolean, koble?: boolean, sum?: boolean, enhet2?: string }
 * }} GrafData
 * @typedef {{ x: number, y: number, tekst: string, midt?: string }} TipsPunkt
 * @typedef {{ svg: string, bredde: number, hoyde: number, modus: 'serie'|'element', punkter: TipsPunkt[], ramme?: { topp: number, bunn: number }, nokkel?: { navn: string, klasse: string }[], tabell: { kolonner: string[], rader: string[][] }, beskrivelse: string }} Tegning
 */

export const BILINEN_FORMER = ['linje', 'soyle', 'flate', 'avvik', 'rangering', 'smultring', 'maler', 'rutenett', 'prikksoyle', 'helning', 'manual', 'baand', 'spenn', 'stablet', 'gruppert', 'stabletflate', 'fremdrift', 'fossefall', 'varmekart', 'stripe', 'flyt', 'tre', 'kombi', 'spredning', 'radial', 'smaa'];

/** @param {GrafData} d @returns {string[]} hata listesi; boşsa geçerli */
export function validerGraf(d) {
  const h = [];
  if (!d || typeof d !== 'object') return ['veri yok'];
  if (!BILINEN_FORMER.includes(d.form)) h.push(`bilinmeyen form: ${d.form}`);
  if (!d.tittel) h.push('tittel eksik');
  if (!d.kilde?.navn) h.push('kilde.navn eksik');
  if (typeof d.enhet !== 'string') h.push('enhet eksik');
  if (d.valg && 'prikk' in d.valg && !(d.valg.prikk > 0)) h.push('valg.prikk pozitif olmalı');
  if (d.form === 'manual') {
    if (!(Array.isArray(d.valg?.gruppenavn) && d.valg.gruppenavn.length === 2)) h.push('manual: valg.gruppenavn [a, b] eksik');
    for (const s of d.serier ?? []) for (const p of s.punkter ?? []) if (p.y !== null && !Number.isFinite(p.y2)) h.push(`manual: "${p.x}" y2 eksik`);
  }
  if (['stablet', 'gruppert', 'stabletflate', 'smaa'].includes(d.form) && !(d.serier?.length >= 2)) h.push(`${d.form}: minst 2 serier`);
  if (d.form === 'stablet' || d.form === 'stabletflate') for (const s of d.serier ?? []) for (const p of s.punkter ?? []) if (p.y < 0) h.push(`${d.form}: negatif verdi "${s.navn}" ${p.x}`);
  if (d.form === 'kombi' && d.serier?.length !== 2) h.push('kombi: tam 2 serier (søyle + linje)');
  if (d.form === 'spredning') for (const p of d.serier?.[0]?.punkter ?? []) if (!Number.isFinite(p.x)) h.push(`spredning: x sayısal olmalı (${p.x})`);
  if (d.form === 'fossefall' && !Number.isFinite(d.serier?.[0]?.punkter?.[0]?.y)) h.push('fossefall: første verdi (start) eksik');
  if (d.form === 'flyt') for (const p of d.serier?.[0]?.punkter ?? []) if (!p.til) h.push(`flyt: "${p.x}" til eksik`);
  if (d.form === 'fremdrift') for (const p of d.serier?.[0]?.punkter ?? []) if (!(Number.isFinite(p.y2) && p.y2 > 0)) h.push(`fremdrift: "${p.x}" y2 (mål) må være over 0`);
  if (d.form === 'baand' || d.form === 'spenn') for (const p of d.serier?.[0]?.punkter ?? []) if (Number.isFinite(p.y) && !Number.isFinite(p.y2)) h.push(`${d.form}: "${p.x}" y2 eksik`);
  if (d.form === 'maler' && !(d.valg?.maks > 0)) h.push('maler: valg.maks eksik');
  if ((d.form === 'maler' || d.form === 'rutenett') && !Number.isFinite(d.serier?.[0]?.punkter?.[0]?.y)) h.push(`${d.form}: ilk verdi eksik`);
  if (!Array.isArray(d.serier) || !d.serier.length) h.push('serier boş');
  else
    for (const s of d.serier) {
      if (!Array.isArray(s.punkter) || !s.punkter.length) h.push(`serier: "${s.navn}" boş`);
      else {
        for (const p of s.punkter) if (p.y !== null && !Number.isFinite(p.y)) h.push(`serier: "${s.navn}" ${p.x} geçersiz y`);
        if (!s.punkter.some((p) => Number.isFinite(p.y))) h.push(`serier: "${s.navn}" hiç verdi yok`);
      }
    }
  return h;
}
