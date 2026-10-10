// Haber kapaklarındaki haritaların altlığını (nordkart.json) üretir. Bir kerelik çalıştırılır.
// Kaynak: Natural Earth 1:10m ülke sınırları (kamu malı, atıf gerekmez).
//   https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson
// Kullanım: node scripts/nyheter/kart/lag-nordkart.mjs <indirilen.geojson>
import { readFile, writeFile } from 'node:fs/promises';

const LAND = ['NOR', 'SWE', 'FIN', 'DNK', 'RUS', 'EST', 'LVA', 'DEU', 'POL', 'NLD', 'GBR', 'IRL', 'FRO'];
// Norveç ve çevresi (boylam, enlem); Svalbard dahil değil.
const [X0, Y0, X1, Y1] = [-9, 51, 42, 72.5];

// Halkayı dikdörtgene kırpar (Sutherland–Hodgman).
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

function kryss(a, b, akse, v) {
  const t = (v - a[akse]) / (b[akse] - a[akse]);
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}

// Yaklaşık 1 km'den yakın ardışık noktaları atar (dosya küçük kalsın).
function seyrelt(ring) {
  const ut = [];
  for (const p of ring) {
    const q = ut.at(-1);
    if (!q || Math.abs(p[0] - q[0]) * Math.cos((p[1] * Math.PI) / 180) > 0.012 || Math.abs(p[1] - q[1]) > 0.006) ut.push(p);
  }
  return ut;
}

const utenfor = (ring) => ring.some(([x, y]) => x < X0 || x > X1 || y < Y0 || y > Y1);

const data = JSON.parse(await readFile(process.argv[2], 'utf8'));
const land = [];
for (const f of data.features) {
  const kode = f.properties.ADM0_A3;
  if (!LAND.includes(kode)) continue;
  const polygoner = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const ringer = polygoner
    // Norveç'in ana kara dışındaki parçaları (Svalbard, Jan Mayen) kırpılmaz, tamamen atlanır.
    .filter((p) => kode !== 'NOR' || !utenfor(p[0]))
    .map((p) => seyrelt(klipp(p[0])).map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]))
    .filter((r) => r.length >= 3);
  if (ringer.length) land.push({ kode, ringer });
}
await writeFile(new URL('./nordkart.json', import.meta.url), JSON.stringify({ kilde: 'Natural Earth (public domain)', land }) + '\n');
console.log(land.map((l) => `${l.kode}: ${l.ringer.length}`).join(', '));
