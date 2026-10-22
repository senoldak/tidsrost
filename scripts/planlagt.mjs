// Planlanmış haberler: tarihi gelmiş ama canlı sitede henüz olmayan haber var mı?
// Varsa "yayin=1" yazar; Nyhetsbot iş akışı bunu görünce siteyi yeniden derletir (src/lib/news.ts yayinda).
// Kullanım: node scripts/planlagt.mjs  (GITHUB_OUTPUT varsa oraya da yazar)
import { readdir, readFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { acilDurdurma } from './nyheter/kapi.mjs';

const SITE = process.env.SITE ?? 'https://tidsrost.com';
const DIZIN = 'src/content/haberler';
const PENCERE_MS = 3 * 86400e3; // son 3 günde tarihi gelenlere bakılır

// Standartlar: acil durdurma açıksa planlı yazılar yayına alınmaz (yayin çıktısı yazılmaz).
if (await acilDurdurma()) process.exit(0);

const simdi = Date.now();
const eksik = [];
for (const f of await readdir(DIZIN, { recursive: true })) {
  if (!f.endsWith('index.md')) continue;
  const fm = (await readFile(path.join(DIZIN, f), 'utf8')).match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  if (/^draft:\s*true/m.test(fm)) continue;
  const tarih = new Date(fm.match(/^date:\s*["']?([^"'\r\n]+)/m)?.[1] ?? '').getTime();
  if (!(tarih <= simdi && tarih > simdi - PENCERE_MS)) continue;
  const id = path.dirname(f).split(path.sep).join('/');
  const res = await fetch(`${SITE}/artikkel/${id}/`, { method: 'HEAD', headers: { 'cache-control': 'no-cache' } });
  if (res.status === 404) eksik.push(id);
}

console.log(eksik.length ? `Yayında olmayan planlanmış haber: ${eksik.join(', ')}` : 'Planlanmış haber bekleniyor değil.');
if (eksik.length && process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, 'yayin=1\n');
