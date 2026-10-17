// Son N günün editoryal kapaklarını (coverKreditt "Illustrasjon: tidsrøst") güncel sakKapagi ile yeniden çizer.
// Harita ve grafik kapaklarına dokunmaz. Görsel dil değiştiğinde bir kez çalıştırılır (kapak-yenile.yml, Linux'ta:
// bot da kapakları Linux'ta çizdiği için çıktılar birebir aynı olur).
// Kullanım: node scripts/nyheter/kapak-yenile.mjs [--gun 14] [--ornek <klasör>]
//   --ornek: dosyalara dokunmaz, ilk 6 kapağı klasöre yazar (önizleme).
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { sakKapagi, kapakCiz } from './bilde.mjs';
import { fontlariDenetle } from './fjord.mjs';

const DIZIN = 'src/content/haberler';
const arg = (ad, vars) => { const i = process.argv.indexOf(`--${ad}`); return i > 0 ? process.argv[i + 1] : vars; };
const gun = Number(arg('gun', 14));
const ornek = arg('ornek', null);
const sinir = Date.now() - gun * 86400e3;

await fontlariDenetle(); // yazı tipi yüklenmediyse hiçbir kapak yazılmadan durur

const hedefler = [];
for (const f of await readdir(DIZIN, { recursive: true })) {
  if (!f.endsWith('index.md')) continue;
  const md = await readFile(path.join(DIZIN, f), 'utf8');
  const fm = parse(md.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '') ?? {};
  if (fm.coverKreditt !== 'Illustrasjon: tidsrøst' || fm.cover !== './cover.png') continue;
  if (!(new Date(fm.date).getTime() >= sinir)) continue;
  hedefler.push({ dir: path.join(DIZIN, path.dirname(f)), tittel: fm.title, ingress: fm.description });
}
hedefler.sort((a, b) => a.dir.localeCompare(b.dir));
console.log(`${hedefler.length} kapak (son ${gun} gün)`);

if (ornek) await mkdir(ornek, { recursive: true });
let n = 0;
for (const h of ornek ? hedefler.slice(0, 6) : hedefler) {
  const png = await kapakCiz(sakKapagi({ tittel: h.tittel, ingress: h.ingress }));
  await writeFile(ornek ? path.join(ornek, `${path.basename(h.dir)}.png`) : path.join(h.dir, 'cover.png'), png);
  n++;
}
console.log(`${n} kapak ${ornek ? `örnek olarak ${ornek} klasörüne` : 'yerinde'} yazıldı`);
