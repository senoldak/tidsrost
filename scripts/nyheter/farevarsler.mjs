// "Farevarsler": MET ve NVE'nin sarı ve turuncu uyarıları ayrı haber olmaz; o günün tek bir sayfasında bölüm olarak toplanır
// (25 Ekim'de dört kısa "Gult farevarsel for høy vannstand …" haberi ayrı ayrı çıkmıştı). Kırmızı uyarı ve çığ tehlikesi
// tek haber olarak kalır. Bölüm, kaynağın şablonlu metnidir (yapay zekâ yok); her bölüm kendi haritasını taşır.
// Sayfanın bölümleri aynı klasördeki varsler.json'da durur (Astro yalnız .md okur); sayfa her seferinde ondan yeniden kurulur.
// Aynı uyarı (aynı id) güncellenince bölümü yenilenir.
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { osloIso, norskDato, trygg, typografi, avsnitt, mdMetin, lagBilde } from './lib.mjs';
import { dagSlug } from './kortfortalt.mjs';

const yamlStr = (s) => JSON.stringify(String(s));
const NIVA_SIRA = { Oransje: 0, Gult: 1 };

/** Günün sayfasına giren uyarı: sarı ya da turuncu farevarsel (kırmızı ve çığ tek haber kalır). */
export const varselSidesine = (sak) => /^(Gult|Oransje) farevarsel\b/.test(sak?.title ?? '');

export const slugFor = (d) => dagSlug('farevarsler', d);

// "Følg med …" satırı her uyarıda tekrar etmesin: bölümden çıkar, sayfanın sonunda bir kez yazılır.
const FOLG_MED = /^Følg med på oppdaterte varsler.*$/m;
const ren = (body) => typografi(trygg(avsnitt(body.replace(FOLG_MED, '')))).trim();

// Kapak olan harita (en ciddi uyarınınki) bölümde ikinci kez gösterilmez.
const bolum = (v, kapakta) =>
  [`## ${v.title}`, v.kart && !kapakta ? `![${mdMetin(v.kart.alt)}](./${v.kart.fil})\n*${mdMetin(v.kart.kreditt)}*` : null, v.body].filter(Boolean).join('\n\n');

/**
 * Günün sayfasını oluşturur ya da günceller. saker: [{ id, sak }] (sak: kilder/met.mjs, kilder/nve.mjs lag() çıktısı).
 * Döner: eklenen ya da yenilenen bölüm sayısı.
 */
export async function leggTilFarevarsler(rot, saker, naa = new Date(), { bilde = lagBilde } = {}) {
  const gyldige = saker.filter((x) => x?.id && varselSidesine(x.sak));
  if (!gyldige.length) return 0;
  const slug = slugFor(naa);
  const mappe = path.join(rot, 'src/content/haberler', slug);
  const jsonFil = path.join(mappe, 'varsler.json');
  let side = { dato: osloIso(naa), varsler: [] };
  try {
    side = JSON.parse(await readFile(jsonFil, 'utf8'));
  } catch {
    // Günün ilk uyarısı: sayfa yeni açılır.
  }
  await mkdir(mappe, { recursive: true });
  let endret = 0;
  for (const { id, sak } of gyldige) {
    const body = ren(sak.body);
    const title = typografi(trygg(sak.title), { tittel: true });
    const eski = side.varsler.find((v) => v.id === id);
    if (eski && eski.body === body && eski.title === title) continue;
    const nr = eski?.nr ?? Math.max(0, ...side.varsler.map((v) => v.nr)) + 1;
    const v = { id, nr, title, description: typografi(trygg(sak.description)).replace(/\s+/g, ' '), body, kilde: sak.kilde, kart: null };
    const b = await bilde(sak);
    if (b) {
      v.kart = { fil: `kart-${nr}.png`, alt: b.alt, kreditt: b.kreditt };
      await writeFile(path.join(mappe, v.kart.fil), b.png);
    }
    if (eski) side.varsler[side.varsler.indexOf(eski)] = v;
    else side.varsler.push(v);
    endret++;
  }
  if (!endret) return 0;

  const varsler = [...side.varsler].sort((a, b) => (NIVA_SIRA[a.title.split(' ')[0]] ?? 2) - (NIVA_SIRA[b.title.split(' ')[0]] ?? 2) || a.nr - b.nr);
  const dag = norskDato(naa, { year: 'numeric' });
  const forste = varsler[0];
  const kilder = [...new Map(varsler.map((v) => [v.kilde.url, v.kilde])).values()];
  // "NVE / Varsom" → "NVE": metinde yalnız o gün uyarısı olan kurumlar anılır.
  const avsendere = kilder.map((k) => k.navn.split(' / ')[0]).join(' og ');
  const description =
    varsler.length === 1
      ? `${forste.title}, ${dag}. ${forste.description}`
      : `${varsler.length} farevarsler fra ${avsendere} ${dag}, blant dem ${forste.title.charAt(0).toLowerCase()}${forste.title.slice(1)}.`;
  const lenke = (k) => `[${mdMetin(k.navn)}](${k.url})${k.lisens ? ` (${mdMetin(k.lisens)})` : ''}`;
  const kapak = forste.kart;
  const md = [
    '---',
    `title: ${yamlStr(`Farevarsler ${dag}`)}`,
    `description: ${yamlStr(description)}`,
    `date: ${side.dato}`,
    `oppdatert: ${osloIso(naa)}`,
    'category: innenriks',
    varsler.some((v) => v.title.startsWith('Oransje')) ? 'breaking: true' : null,
    'produksjon: automatisk',
    kapak ? `cover: ./${kapak.fil}` : null,
    kapak ? `coverAlt: ${yamlStr(kapak.alt)}` : null,
    kapak ? `coverKreditt: ${yamlStr(kapak.kreditt)}` : null,
    '---',
    '',
    `Farevarsler fra ${avsendere} i dag, med de mest alvorlige først. Teksten under hvert varsel er avsenderens egen.`,
    '',
    varsler.map((v, i) => bolum(v, i === 0)).join('\n\n'),
    '',
    'Følg med på oppdaterte varsler på [yr.no](https://www.yr.no/nb/farevarsler) og [varsom.no](https://www.varsom.no/).',
    '',
    `*${kilder.length > 1 ? 'Kilder' : 'Kilde'}: ${kilder.map(lenke).join(', ')}*`,
    '',
  ]
    .filter((l) => l !== null)
    .join('\n');
  await writeFile(jsonFil, `${JSON.stringify(side, null, 2)}\n`, 'utf8');
  await writeFile(path.join(mappe, 'index.md'), md, 'utf8');
  return endret;
}
