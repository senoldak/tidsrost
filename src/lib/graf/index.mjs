// Grafik seti: biçim kaydı ve tek giriş noktası.
import { validerGraf } from './sema.mjs';
import * as avvik from './former/avvik.mjs';
import * as flate from './former/flate.mjs';
import * as helning from './former/helning.mjs';
import * as linje from './former/linje.mjs';
import * as manual from './former/manual.mjs';
import * as maler from './former/maler.mjs';
import * as prikksoyle from './former/prikksoyle.mjs';
import * as rangering from './former/rangering.mjs';
import * as rutenett from './former/rutenett.mjs';
import * as smultring from './former/smultring.mjs';
import * as soyle from './former/soyle.mjs';
import * as baand from './former/baand.mjs';
import * as spenn from './former/spenn.mjs';

/** @type {Record<string, { tegn: (d: import('./sema.mjs').GrafData, o?: { id?: string, bred?: boolean }) => import('./sema.mjs').Tegning }>} */
export const FORMER = { linje, flate, soyle, avvik, rangering, smultring, maler, rutenett, prikksoyle, helning, manual, baand, spenn };

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
