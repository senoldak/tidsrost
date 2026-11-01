// Sapma: sıfır ortada; artı kırmızı sağa, eksi mavi sola, büyükten küçüğe.
import { stolper } from './stolper.mjs';

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] */
export function tegn(d, o = {}) {
  return stolper(d, o, { sorter: true, fortegn: true, klasse: (q) => (q.y > 0 ? 'g-f-rod' : 'g-f-su') });
}
