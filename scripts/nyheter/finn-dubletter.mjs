// Yayınlanmış haberler arasında aynı olayı anlatan grupları bulur (sadece listeler, hiçbir şey silmez).
// Kullanım: node scripts/nyheter/finn-dubletter.mjs [--timer 96]
// Karşılaştırma: slug (sondaki -2 atılarak), başlık+giriş (dublett.mjs/sammeHendelse), başlıklardaki nadir özel
// isimler ve tarih (en fazla
// --timer saat arayla). Slug ölçütü bilerek gevşektir: sonuç bir aday listesidir, birleştirme kararı insanındır.
// Her grupta tutulması önerilen haber: en uzun gövde, eşitlikte en çok kaynak, sonra en erken tarih.
// Birleştirme: diğerlerinin klasörü silinir, public/_redirects'e "/artikkel/<silinen>/ /artikkel/<tutulan>/ 301" eklenir.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sammeHendelse, nokkel, termer } from './dublett.mjs';
import { ordtelling } from '../../src/lib/ordtelling.mjs';

const ROT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = path.join(ROT, 'src/content/haberler');
const i = process.argv.indexOf('--timer');
const TIMER = i > -1 ? Number(process.argv[i + 1]) : 96;

const saker = [];
for (const slug of await readdir(BASE)) {
  const md = await readFile(path.join(BASE, slug, 'index.md'), 'utf8').catch(() => '');
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) continue;
  const [, fm, body] = m;
  const felt = (k) => {
    const v = fm.match(new RegExp(`^${k}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? '';
    try {
      return v.startsWith('"') ? JSON.parse(v) : v;
    } catch {
      return v;
    }
  };
  if (felt('draft') === 'true' || felt('sjanger') === 'forklart') continue;
  const kilder = (body.match(/^\*Kilder?:.*$/m)?.[0].match(/\]\(/g) ?? []).length;
  saker.push({
    ...nokkel({ slug, tittel: felt('title'), ingress: felt('description'), produksjon: felt('produksjon') || 'manuell' }),
    tid: Date.parse(felt('date')),
    ord: ordtelling(body),
    kilder,
  });
}

const slugRot = (s) => s.replace(/-\d+$/, '');
// Slug terimleri; başlıktaki bakanlık öneki ("utenriksdepartementet-…") karşılaştırmayı bozmasın diye atılır.
const slugTermer = (s) => termer(slugRot(s).replace(/^[a-z-]*departementet-|^statsministerens-kontor-/, '').replace(/-/g, ' '));

function slugLik(a, b) {
  if (slugRot(a.slug) === slugRot(b.slug)) return true;
  // Şablonlu veri haberlerinin (uyarılar) slug'ları hep benzer; onlarda sadece aynı slug kökü sayılır.
  if (a.produksjon === 'automatisk' || b.produksjon === 'automatisk') return false;
  const x = slugTermer(a.slug);
  const y = slugTermer(b.slug);
  const felles = [...x].filter((t) => y.has(t));
  // En az iki ortak terim, biri uzun/ayırt edici (prisjegersak, oljefond, nato …) ve kısa slug'ın yarısı.
  return felles.length >= 2 && felles.some((t) => t.length >= 7 || /\d/.test(t)) && felles.length / Math.min(x.size, y.size) >= 0.5;
}

// Nadir özel isim: başlıklarda en fazla 3 kez geçen özel isim (Telenor, NATO, prisjegersaken …) iki başlıkta da
// varsa aday sayılır. Rakamlar tek başına yetmez (150 stilling ↔ 150 millioner).
const df = new Map();
for (const s of saker) for (const t of s._tT) df.set(t, (df.get(t) ?? 0) + 1);
const nadir = (a, b) =>
  a.produksjon !== 'automatisk' && b.produksjon !== 'automatisk' &&
  [...a._tT].some((t) => b._tT.has(t) && df.get(t) <= 3 && !/d/.test(t) && (a._e.has(t) || b._e.has(t) || t.length >= 9));

// Birlik-bul ile grupla.
const forelder = saker.map((_, k) => k);
const rot = (k) => (forelder[k] === k ? k : (forelder[k] = rot(forelder[k])));
const grunn = new Map();
for (let a = 0; a < saker.length; a++) {
  for (let b = a + 1; b < saker.length; b++) {
    const x = saker[a];
    const y = saker[b];
    if (Math.abs(x.tid - y.tid) > TIMER * 36e5) continue;
    const tekst = sammeHendelse(x, y);
    const slug = slugLik(x, y);
    const navn = nadir(x, y);
    if (!tekst && !slug && !navn) continue;
    forelder[rot(a)] = rot(b);
    grunn.set(`${x.slug}|${y.slug}`, [tekst && 'tekst', slug && 'slug', navn && 'navn'].filter(Boolean).join('+'));
  }
}

const grupper = new Map();
saker.forEach((s, k) => grupper.set(rot(k), [...(grupper.get(rot(k)) ?? []), s]));
const beste = (g) => [...g].sort((a, b) => b.ord - a.ord || b.kilder - a.kilder || a.tid - b.tid)[0];

let n = 0;
for (const g of grupper.values()) {
  if (g.length < 2) continue;
  n++;
  const behold = beste(g);
  console.log(`\nGruppe ${n}: behold ${behold.slug}`);
  for (const s of g.sort((a, b) => a.tid - b.tid)) {
    console.log(`  ${s === behold ? '*' : ' '} ${new Date(s.tid).toISOString().slice(0, 16)}  ${String(s.ord).padStart(4)} ord  ${s.kilder} kilder  ${s.slug}`);
    console.log(`      «${s.tittel}»`);
  }
  const par = [...grunn].filter(([k]) => g.some((s) => k.startsWith(`${s.slug}|`)));
  console.log(`    (${par.map(([k, v]) => `${k.replace('|', ' ~ ')}: ${v}`).join('; ')})`);
}
console.log(`\n${n} mulige grupper. Kontroller hver gruppe manuelt før sammenslåing.`);
