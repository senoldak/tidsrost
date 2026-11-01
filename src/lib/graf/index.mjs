// Grafik seti: biçim kaydı ve tek giriş noktası.
import { validerGraf } from './sema.mjs';

/** @type {Record<string, { tegn: (d: import('./sema.mjs').GrafData, o?: { id?: string }) => import('./sema.mjs').Tegning }>} */
export const FORMER = {};

/** @param {import('./sema.mjs').GrafData} d @param {{ id?: string }} [o] */
export function tegnGraf(d, o = {}) {
  const hatalar = validerGraf(d);
  if (hatalar.length) throw new Error(`Graf "${d?.tittel ?? '?'}": ${hatalar.join('; ')}`);
  return FORMER[d.form].tegn(d, o);
}
