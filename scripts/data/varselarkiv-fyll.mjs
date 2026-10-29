// Farevarsel arşivini geriye doğru doldurur: eksik ayları MET'in archive.json'undan sırayla çeker (istekler arası 2 sn).
// Bir kez elle koşulur ve sonuç commit edilir; sonrasını hent-data.mjs'in arşiv işi günceller.
// Kullanım: node scripts/data/varselarkiv-fyll.mjs --fra 2019-01 [--tving]
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VARSEL_KILDE } from './data.mjs';
import { birlestirMaaned, dagsTall, hendelser } from './varselarkiv.mjs';

const ROT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIL = path.join(ROT, 'src/data/varselarkiv.json');
const USER_AGENT = 'tidsrost.com/1.0 (+https://tidsrost.com/om-oss/; redaksjon@tidsrost.com)';
const arg = (navn) => process.argv[process.argv.indexOf(navn) + 1];
const fra = process.argv.includes('--fra') ? arg('--fra') : '2019-01';
const tving = process.argv.includes('--tving');

let arkiv = { fra, maaneder: {} };
try {
  arkiv = JSON.parse(await readFile(FIL, 'utf8'));
} catch {}

const maaneder = [];
for (let d = new Date(`${fra}-01T00:00:00Z`); d <= new Date(); d.setUTCMonth(d.getUTCMonth() + 1)) maaneder.push(d.toISOString().slice(0, 7));

for (const m of maaneder) {
  if (!tving && arkiv.maaneder?.[m]) continue;
  const res = await fetch(`https://api.met.no/weatherapi/metalerts/2.0/archive.json?period=${m}`, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  if (!res.ok) {
    console.error(`${m}: ${res.status} ${res.statusText}, ikke i arkivet ennå; stopper`);
    break;
  } else {
    const json = await res.json();
    const dager = dagsTall(hendelser(json.features, m));
    arkiv = birlestirMaaned(arkiv, m, dager, new Date().toISOString());
    const land = Object.values(dager).reduce((s, d) => s + d.landTotal.reduce((a, b) => a + b, 0), 0);
    console.log(`${m}: ${json.features?.length ?? 0} meldinger → ${land} hendelser på land`);
    await writeFile(FIL, JSON.stringify({ hentet: new Date().toISOString(), kilde: VARSEL_KILDE, fra: arkiv.fra ?? fra, arkivForsok: arkiv.arkivForsok ?? null, maaneder: arkiv.maaneder, lopende: arkiv.lopende ?? null }) + '\n', 'utf8');
  }
  await new Promise((r) => setTimeout(r, 2000));
}
