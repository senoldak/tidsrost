// Alan: çizgi + altında gradyan dolgu (ilk seri). Çizim ve izleme linje ile ortak.
import { tegn as linje } from './linje.mjs';

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean, id?: string }} [o] */
export function tegn(d, o = {}) {
  return linje(d, { ...o, flate: true });
}
