// Eldre saker: skriv `sted` i frontmatter (alle med sted i tittel/ingress) og sted.webp der stedet er poenget (visKart).
//   node scripts/sted-gjenopprett.mjs --dry    bare teller og lister
//   node scripts/sted-gjenopprett.mjs          skriver
// Samme regler som boten (scripts/nyheter/lib.mjs lagSted). Farevarselsider (egne kart), samlesaker og saker med
// eget kapak-bilde (graf/kart) røres ikke. Saker som allerede har `sted` hoppes over.
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { lagSted, stedYaml } from './nyheter/lib.mjs';

const ROT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = path.join(ROT, 'src/content/haberler');
const DRY = process.argv.includes('--dry');

const teller = { sjekket: 0, sted: 0, kart: 0, hoppet: 0 };
const kartListe = [];
const merkeListe = [];
for (const slug of (await readdir(BASE)).sort()) {
  const fil = path.join(BASE, slug, 'index.md');
  let md;
  try {
    md = await readFile(fil, 'utf8');
  } catch {
    continue;
  }
  if (/^(farevarsler|nyheter)-/.test(slug) || existsSync(path.join(BASE, slug, 'varsler.json'))) {
    teller.hoppet++;
    continue;
  }
  const crlf = md.includes('\r\n');
  const t = md.replace(/\r\n/g, '\n');
  const m = t.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) continue;
  const [, fm, govde] = m;
  let data;
  try {
    data = parse(fm);
  } catch {
    continue;
  }
  teller.sjekket++;
  if (data.sted) continue;
  // Eget kapak-bilde (graf/kart) betyr at boten brukte sak.bilde; det tilsvarer «ingen stedkart» i lagSted.
  if (data.coverKreditt && data.coverKreditt !== 'Illustrasjon: tidsrøst') continue;
  const { sted, kart } = await lagSted({
    id: slug,
    title: data.title,
    description: data.description,
    category: data.category,
    sjanger: data.sjanger,
  });
  if (!sted) continue;
  teller.sted++;
  (kart ? kartListe : merkeListe).push(`${sted.navn} | ${slug}`);
  if (kart) teller.kart++;
  if (DRY) continue;
  const blokk = stedYaml(sted);
  const nyFm = /^cover:/m.test(fm) ? fm.replace(/^cover:/m, (s) => `${blokk}\n${s}`) : `${fm}\n${blokk}`;
  const ny = `---\n${nyFm}\n---\n${govde.startsWith('\n') ? '' : '\n'}${govde}`;
  await writeFile(fil, crlf ? ny.replace(/\n/g, '\r\n') : ny, 'utf8');
  if (kart) await writeFile(path.join(BASE, slug, 'sted.webp'), kart);
}
console.log(`Kart (${kartListe.length}):\n  ${kartListe.join('\n  ')}\nBare ◉-merke (${merkeListe.length}):\n  ${merkeListe.join('\n  ')}`);
console.log(`${DRY ? '[dry] ' : ''}sjekket: ${teller.sjekket}, med sted: ${teller.sted}, med kart: ${teller.kart}, hoppet over (farevarsel/samlesaker): ${teller.hoppet}`);
