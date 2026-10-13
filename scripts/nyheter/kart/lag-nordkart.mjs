// Haber kapaklarındaki haritaların altlığını (nordkart.json) üretir.
// Kaynak: Natural Earth 1:10m ülke sınırları ve göller (kamu malı, atıf gerekmez).
// Kullanım: node scripts/nyheter/kart/lag-nordkart.mjs [indirilen.geojson]
import { readFile, writeFile } from 'node:fs/promises';
import { hentJson } from '../lib.mjs';

const LAND = ['NOR', 'SWE', 'FIN', 'DNK', 'RUS', 'EST', 'LVA', 'DEU', 'POL', 'NLD', 'GBR', 'IRL', 'FRO', 'ISL', 'GRL'];
// Kuzey Atlantik, Grönland Denizi, Svalbard, Barents Denizi ve İskandinavya (boylam, enlem).
const [X0, Y0, X1, Y1] = [-28, 51, 42, 82];

function kryss(a, b, akse, v) {
  const t = (v - a[akse]) / (b[akse] - a[akse]);
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}

function klipp(ring) {
  const kanter = [
    [(p) => p[0] >= X0, (a, b) => kryss(a, b, 0, X0)],
    [(p) => p[0] <= X1, (a, b) => kryss(a, b, 0, X1)],
    [(p) => p[1] >= Y0, (a, b) => kryss(a, b, 1, Y0)],
    [(p) => p[1] <= Y1, (a, b) => kryss(a, b, 1, Y1)],
  ];
  let ut = ring;
  for (const [inne, skjær] of kanter) {
    const inn = ut;
    ut = [];
    for (let i = 0; i < inn.length; i++) {
      const a = inn[i];
      const b = inn[(i + 1) % inn.length];
      if (inne(b)) {
        if (!inne(a)) ut.push(skjær(a, b));
        ut.push(b);
      } else if (inne(a)) ut.push(skjær(a, b));
    }
    if (!ut.length) return [];
  }
  return ut;
}

function seyrelt(ring, tol = 0.012) {
  const ut = [];
  for (const p of ring) {
    const q = ut.at(-1);
    if (!q || Math.abs(p[0] - q[0]) * Math.cos((p[1] * Math.PI) / 180) > tol || Math.abs(p[1] - q[1]) > tol * 0.5) ut.push(p);
  }
  return ut;
}

const cData = process.argv[2]
  ? JSON.parse(await readFile(process.argv[2], 'utf8'))
  : await hentJson('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson');

const lData = await hentJson('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_lakes.geojson');

const land = [];
for (const f of cData.features) {
  const kode = f.properties.ADM0_A3;
  if (!LAND.includes(kode)) continue;
  const polygoner = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const ringer = polygoner
    .map((p) => seyrelt(klipp(p[0])).map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]))
    .filter((r) => r.length >= 3);
  if (ringer.length) land.push({ kode, ringer });
}

const innsjoer = [];
for (const f of lData.features) {
  const polygoner = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const p of polygoner) {
    const ring = seyrelt(klipp(p[0]), 0.018).map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);
    if (ring.length >= 4) innsjoer.push(ring);
  }
}

const utData = { kilde: 'Natural Earth (public domain)', land, innsjoer };
await writeFile(new URL('./nordkart.json', import.meta.url), JSON.stringify(utData) + '\n');
console.log(`nordkart.json lagret: ${land.length} land, ${innsjoer.length} innsjøer.`);
