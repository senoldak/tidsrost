// Çok serili biçimlerin ortak hazırlığı: serileri ilk serinin x etiketlerine hizalar, renk sırasını verir.
import { tom } from '../felles.mjs';

export const FARGER = ['g-f-su', 'g-f-kontur', 'g-f-gul', 'g-f-rod', 'g-f-su2', 'g-f-bar'];
const NOKKEL = ['g-n-su', 'g-n-kontur', 'g-n-gul', 'g-n-rod', 'g-n-su2', 'g-n-bar'];

/** @param {import('../sema.mjs').Serie[]} serier */
export function hizala(serier) {
  const etiketter = serier[0].punkter.map((p) => String(p.x));
  const verdier = serier.map((s) => etiketter.map((e) => {
    const p = s.punkter.find((q) => String(q.x) === e);
    return p && !tom(p.y) ? p.y : null;
  }));
  return { etiketter, verdier };
}

export const nokkelFor = (serier) => serier.map((s, i) => ({ navn: s.navn, klasse: NOKKEL[Math.min(i, NOKKEL.length - 1)] }));
export const farge = (i) => FARGER[Math.min(i, FARGER.length - 1)];
