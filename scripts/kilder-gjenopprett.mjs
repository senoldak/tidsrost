// Eski haberlerin kaynak listesini frontmatter `kilder` alanına taşır (yalnız yerelde çalışır; KILDE_NOKKEL .env'den).
//   node scripts/kilder-gjenopprett.mjs --dry    yalnız sayar
//   node scripts/kilder-gjenopprett.mjs          yazar
// - kildeSpor var, kilder yok: şifre çözülür, normalize edilmiş liste kildeSpor satırının hemen altına yazılır.
// - Gövdede "*Kilde: [Ad](url)*" (ya da "*Kilder: ...*", isteğe bağlı "(lisens)") satırı: kilder'e taşınır, satır silinir.
// Çözülmüş kaynaklar loglara yazılmaz, yalnız sayılar.
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dekrypter, harNokkel } from './nyheter/hemmelig.mjs';
import { normaliserKilder } from '../src/lib/kilder.mjs';
import { kildeYaml } from './nyheter/lib.mjs';

const ROT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = path.join(ROT, 'src/content/haberler');
const DRY = process.argv.includes('--dry');

// "*Kilde: [A](u) (lisens), [B](u2)*" satırı; yalnız her öğesi bağlantı olan satırlar (düz metin kaynak satırları kalır).
const SATIR = /^\*Kilder?: (.+)\*[ \t]*$/m;
const OGE = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)(?: \(([^)]+)\))?$/;
function lesSatir(govde) {
  const m = govde.match(SATIR);
  if (!m) return null;
  const deler = m[1].split(/(?<=\))(?: \([^)]+\))?, (?=\[)/);
  const liste = [];
  for (const d of deler) {
    const o = d.trim().match(OGE);
    if (!o) return null;
    liste.push({ navn: o[1], url: o[2], ...(o[3] && { lisens: o[3] }) });
  }
  return { satir: m[0], liste };
}

if (!harNokkel()) {
  console.error('KILDE_NOKKEL yok (.env); ki-medier izleri çözülemez.');
  process.exit(1);
}

const sayac = { kiMedier: 0, resmi: 0, izsiz: 0, ogeler: 0, ayniKalan: 0, atlanan: 0 };
for (const slug of await readdir(BASE)) {
  const fil = path.join(BASE, slug, 'index.md');
  let md;
  try {
    md = await readFile(fil, 'utf8');
  } catch {
    continue;
  }
  // Farevarsel-sayfaları varsler.json'dan her seferinde yeniden kurulur (farevarsler.mjs); elle değiştirilmez.
  if (existsSync(path.join(BASE, slug, 'varsler.json'))) {
    sayac.atlanan++;
    continue;
  }
  const crlf = md.includes('\r\n');
  const t = md.replace(/\r\n/g, '\n');
  const m = t.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) continue;
  let [, fm, govde] = m;
  if (/^kilder:/m.test(fm)) {
    sayac.ayniKalan++;
    continue;
  }
  const spor = fm.match(/^kildeSpor:\s*"?([^"\n]+)"?$/m)?.[1];
  const satir = lesSatir(govde);
  let liste = null;
  let tur;
  if (satir) {
    liste = satir.liste;
    govde = govde.replace(satir.satir, '').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '\n');
    tur = 'resmi';
  } else if (spor) {
    try {
      liste = dekrypter(spor);
    } catch {
      liste = null;
    }
    tur = 'kiMedier';
  }
  liste = normaliserKilder(liste ?? []);
  if (!liste.length) {
    if (spor || satir) sayac.izsiz++;
    continue;
  }
  const blokk = `kilder:\n${liste.map(kildeYaml).join('\n')}`;
  // kildeSpor satırının hemen altına; yoksa nyhetsverdi/cover'dan önce, o da yoksa frontmatter sonuna.
  fm = spor
    ? fm.replace(/^kildeSpor:.*$/m, (s) => `${s}\n${blokk}`)
    : /^(nyhetsverdi:|cover:)/m.test(fm)
      ? fm.replace(/^(nyhetsverdi:|cover:)/m, (s) => `${blokk}\n${s}`)
      : `${fm}\n${blokk}`;
  sayac[tur]++;
  sayac.ogeler += liste.length;
  const yeni = `---\n${fm}\n---\n${govde.startsWith('\n') ? '' : '\n'}${govde}`;
  if (!DRY) await writeFile(fil, crlf ? yeni.replace(/\n/g, '\r\n') : yeni, 'utf8');
}
console.log(`${DRY ? '[dry] ' : ''}ki-medier: ${sayac.kiMedier}, resmî: ${sayac.resmi}, çözülemeyen/izsiz (satır ya da iz var ama liste yok): ${sayac.izsiz}, zaten kilder'li: ${sayac.ayniKalan}, farevarsel atlanan: ${sayac.atlanan}, toplam kaynak öğesi: ${sayac.ogeler}`);
