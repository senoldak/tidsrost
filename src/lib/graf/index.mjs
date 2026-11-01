// Grafik seti: biçim kaydı ve tek giriş noktası.
import { validerGraf } from './sema.mjs';
import * as linje from './former/linje.mjs';

/** @type {Record<string, { tegn: (d: import('./sema.mjs').GrafData, o?: { id?: string, bred?: boolean }) => import('./sema.mjs').Tegning }>} */
export const FORMER = { linje };

/** @param {import('./sema.mjs').GrafData} d @param {{ id?: string, bred?: boolean }} [o] */
export function tegnGraf(d, o = {}) {
  const hatalar = validerGraf(d);
  if (hatalar.length) throw new Error(`Graf "${d?.tittel ?? '?'}": ${hatalar.join('; ')}`);
  return FORMER[d.form].tegn(d, o);
}

let teller = 0;
/** Sayfa içinde benzersiz SVG kimliği (gradyan vb. için). */
export function nyId() {
  teller += 1;
  return `g${teller}`;
}
