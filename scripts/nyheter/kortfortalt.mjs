// "Kort fortalt": kaynak metni tam haber için yetmeyen resmi duyurular (sayfası okunamayan bülten, kısa
// Stortinget kararı) ayrı haber olmaz; o günün tek bir özet sayfasına satır olarak eklenir.
// Satır, gönderenin kendi başlığı ve girişidir (yapay zekâ yok, uydurma yok) ve kaynağa bağlanır.
// Sadece resmi kaynaklar için: haber sitesi adayları (skjult) buraya girmez.
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { normaliserUrl, mdMetin, htmlTilTekst, osloIso, norskDato, trygg, typografi } from './lib.mjs';

const yamlStr = (s) => JSON.stringify(String(s));
const ren = (s = '') => typografi(trygg(htmlTilTekst(s))).replace(/\s+/g, ' ').trim();

// Oslo tarihi: YYYY-MM-DD (günün sayfası bu tarihe göre seçilir).
const osloDag = (d) => osloIso(d).slice(0, 10);

export const slugFor = (d) => {
  const [y, m, g] = osloDag(d).split('-').map(Number);
  const maned = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('nb-NO', { month: 'long', timeZone: 'UTC' });
  return `kort-fortalt-${g}-${maned.replace(/ø/g, 'o').replace(/å/g, 'a').replace(/æ/g, 'ae')}-${y}`;
};

// Kaynaktan gelen kısa duyuruyu satıra çevirir. Döner: { tittel, ingress, kilde } ya da geçersizse null.
export function kortMelding({ tittel, ingress, kilde }) {
  const url = normaliserUrl(kilde?.url);
  if (!tittel || !url) return null;
  const t = ren(tittel).replace(/[.:]+$/, '');
  const i = ren(ingress);
  return t ? { tittel: t, ingress: i && i !== t ? i : '', kilde: { ...kilde, url } } : null;
}

export const linje = (m) =>
  `- **${m.tittel}.**${m.ingress ? ` ${m.ingress}` : ''} *([${mdMetin(m.kilde.navn)}](${m.kilde.url}))*`;

// Günün sayfasını oluşturur ya da günceller. Aynı adresli satır iki kez eklenmez.
// Döner: eklenen satır sayısı.
export async function leggTilKortFortalt(rot, meldinger, naa = new Date()) {
  const gyldige = meldinger.filter(Boolean);
  if (!gyldige.length) return 0;
  const slug = slugFor(naa);
  const mappe = path.join(rot, 'src/content/haberler', slug);
  const fil = path.join(mappe, 'index.md');
  let dato = osloIso(naa);
  let linjer = [];
  try {
    const eski = await readFile(fil, 'utf8');
    dato = eski.match(/^date:\s*(\S+)/m)?.[1] ?? dato;
    linjer = eski.split(/\r?\n/).filter((l) => l.startsWith('- **'));
  } catch {
    // Günün ilk satırı: sayfa yeni açılır.
  }
  let lagt = 0;
  for (const m of gyldige) {
    if (linjer.some((l) => l.includes(`(${m.kilde.url})`))) continue;
    linjer.push(linje(m));
    lagt++;
  }
  if (!lagt) return 0;
  const dag = norskDato(naa, { year: 'numeric' });
  const md = [
    '---',
    `title: ${yamlStr(`Kort fortalt ${dag}`)}`,
    `description: ${yamlStr(`Korte meldinger fra departementer, etater og Stortinget ${dag}, med lenke til hele saken hos avsenderen.`)}`,
    `date: ${dato}`,
    `oppdatert: ${osloIso(naa)}`,
    'category: innenriks',
    'produksjon: automatisk',
    '---',
    '',
    'Korte meldinger fra offentlige kilder i dag. Hver linje er avsenderens egen tittel og ingress; følg lenken for hele saken.',
    '',
    ...linjer,
    '',
  ].join('\n');
  await mkdir(mappe, { recursive: true });
  await writeFile(fil, md, 'utf8');
  return lagt;
}
