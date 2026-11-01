// Sıralama: yatay çubuk, büyükten küçüğe (valg.sorter=false sırayı korur); valg.fremhev vurgular.
import { stolper } from './stolper.mjs';

/** @param {import('../sema.mjs').GrafData} d @param {{ bred?: boolean }} [o] */
export function tegn(d, o = {}) {
  const fremhev = d.valg?.fremhev?.map(String);
  return stolper(d, o, {
    sorter: d.valg?.sorter ?? true,
    fortegn: false,
    klasse: (q) => (!fremhev?.length || fremhev.includes(String(q.x)) ? 'g-f-su' : 'g-f-su2'),
  });
}
