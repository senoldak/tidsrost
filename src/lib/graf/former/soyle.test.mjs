import test from 'node:test';
import assert from 'node:assert/strict';
import { tegn } from './soyle.mjs';

const veri = (ys, merknader, valg) => ({ form: 'soyle', tittel: 't', kilde: { navn: 'SSB' }, enhet: 'Prosent', serier: [{ navn: 'Ledighet', punkter: ys.map((y, i) => ({ x: `m${i}`, y })) }], merknader, valg });
const rects = (svg) => [...svg.matchAll(/<rect[^>]*data-i="(\d+)"[^>]*y="([\d.]+)"[^>]*height="([\d.]+)"/g)].map((m) => ({ y: +m[2], h: +m[3] }));

test('soyle: snitt doğru', () => assert.match(tegn(veri([4, 5, 6], [{ type: 'snitt' }])).svg, /Snitt 5,0/));
test('soyle: son sütun varsayılan vurgulu', () => assert.match(tegn(veri([1, 2, 3])).svg, /data-i="2"[^>]*class="g-f-su"/));
test('soyle: fremhev listesi', () => assert.match(tegn(veri([1, 2, 3], undefined, { fremhev: ['m0'] })).svg, /data-i="0"[^>]*class="g-f-su"/));
test('soyle: hepsi negatif → çubuklar sıfır çizgisinin altında', () => {
  const t = tegn(veri([-1, -3, -2]));
  const sifir = +t.svg.match(/class="g-null"[^>]*y1="([\d.]+)"/)[1];
  for (const r of rects(t.svg)) assert.ok(r.y >= sifir - 0.01, `${r.y} < ${sifir}`);
});
test('soyle: element modu, ipucu sayısı', () => { const t = tegn(veri([1, null, 3])); assert.equal(t.modus, 'element'); assert.equal(t.punkter.length, 3); assert.equal(t.punkter[1].tekst, 'm1\n–'); });
test('soyle: uzun x etiketi kısalır, ipucunda tam', () => {
  const t = tegn({ ...veri([1]), serier: [{ navn: 's', punkter: [{ x: 'Forsikring og finansielle tjenester', y: 1 }] }] });
  assert.match(t.svg, />Forsikring …</);
  assert.match(t.punkter[0].tekst, /Forsikring og finansielle tjenester/);
});
