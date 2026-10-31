// Fjerner urelaterte adresser fra frontmatter `kilder` i ki-medier-saker (engangsopprydding).
//   node scripts/kilder-rydd.mjs --dry    bare teller
//   node scripts/kilder-rydd.mjs          skriver
// En oppføring fjernes bare når adressens slug har minst 3 ord (2 meningsfulle) og ingen av dem finnes i sakens
// tittel, ingress og de første 1500 tegnene av brødteksten (se src/lib/kilde-relevans.mjs). Adresser uten lesbar slug
// beholdes. Samlesaker (nyheter-*) hoppes over. Rapporterer saker som står igjen med 0 eller 1 mediekilde.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { urelatertUrl } from '../src/lib/kilde-relevans.mjs';

const ROT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = path.join(ROT, 'src/content/haberler');
const DRY = process.argv.includes('--dry');

const verdi = (fm, nokkel) => fm.match(new RegExp(`^${nokkel}:\\s*"?(.*?)"?\\s*$`, 'm'))?.[1] ?? '';
let fjernet = 0;
let endret = 0;
const hoppet = [];
const faa = [];
for (const slug of await readdir(BASE)) {
  const fil = path.join(BASE, slug, 'index.md');
  let md;
  try {
    md = await readFile(fil, 'utf8');
  } catch {
    continue;
  }
  const crlf = md.includes('\r\n');
  const t = md.replace(/\r\n/g, '\n');
  const m = t.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) continue;
  const [, fm, govde] = m;
  if (verdi(fm, 'produksjon') !== 'ki-medier') continue;
  const blokk = fm.match(/^kilder:\n((?:[ \t]+.*\n?)+)/m);
  if (!blokk) continue;
  if (slug.startsWith('nyheter-')) {
    hoppet.push(slug);
    continue;
  }
  // oppføringer: "  - navn: ..." etterfulgt av innrykkede linjer
  const oppforinger = blokk[1].replace(/\n$/, '').split(/\n(?=[ \t]*- )/);
  const tekst = `${verdi(fm, 'title')}\n${verdi(fm, 'description')}\n${govde.slice(0, 1500)}`;
  const behold = oppforinger.filter((o) => {
    const url = o.match(/url:\s*"?([^"\s]+)"?/)?.[1];
    return !(url && urelatertUrl(url, tekst));
  });
  const bort = oppforinger.length - behold.length;
  if (bort && process.env.RYDD_VIS) console.log('  ', slug, '->', oppforinger.filter((o) => !behold.includes(o)).map((o) => o.match(/url:\s*"?([^"\s]+)/)?.[1].slice(8, 110)).join(' ; '));
  if (behold.length < 2) faa.push(`${slug} (${behold.length})`);
  if (!bort) continue;
  fjernet += bort;
  endret++;
  const nyBlokk = behold.length ? `kilder:\n${behold.join('\n')}\n` : '';
  const nyFm = fm.replace(blokk[0], nyBlokk).replace(/\n+$/, '');
  const ny = `---\n${nyFm}\n---\n${govde.startsWith('\n') ? '' : '\n'}${govde}`;
  if (!DRY) await writeFile(fil, crlf ? ny.replace(/\n/g, '\r\n') : ny, 'utf8');
}
console.log(`${DRY ? '[dry] ' : ''}fjernet ${fjernet} oppføringer i ${endret} saker`);
console.log(`saker med 0 eller 1 mediekilde etter opprydding (${faa.length}): ${faa.join(', ')}`);
console.log(`samlesaker hoppet over (${hoppet.length}): ${hoppet.join(', ')}`);
