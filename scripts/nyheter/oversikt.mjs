// Nyhetsoversikt (sahibi, 14 Kasım 2026): Oslo saatiyle 10:45, 14:45, 18:45'te son oversikt'ten bu yana yayına giren
// sakları tek listede toplar. Yapay zekâ yok: başlıklar ve girişler olduğu gibi. src/data/oversikt/<dato>-<donem>.json
// ve kapak public/oversikt/<dato>-<donem>.png yazılır; sayfa /oversikt/<dato>/<donem>/ (noindex). Haber değildir:
// RSS'e, haber haritasına, Facebook/Instagram'a girmez. mecmua-saat kuyruğu yalnız LinkedIn sayfasına gönderir.
// Kullanım: node scripts/nyheter/oversikt.mjs [morgen|ettermiddag|kveld]   (GITHUB_OUTPUT: yazildi=1|0)
//           node scripts/nyheter/oversikt.mjs --bildir                  (son yazılan oversikt'i kuyruğa bildirir)
import path from 'node:path';
import { readFile, writeFile, readdir, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { osloGunu, ozetBildir } from './gunun-ozeti.mjs';
import { yayinDurduMu } from './standart.mjs';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SITE = 'https://tidsrost.com';
export const EN_AZ = 2;
const AZAMI_YAS_MS = 24 * 3600e3;

export const DONEMLER = { morgen: 'Morgenoversikt', ettermiddag: 'Ettermiddagsoversikt', kveld: 'Kveldsoversikt' };

const osloSaat = (d) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', hourCycle: 'h23' }).format(d));
export const donemSec = (simdi) => (osloSaat(simdi) < 12 ? 'morgen' : osloSaat(simdi) < 16 ? 'ettermiddag' : 'kveld');
export const oversiktSlug = (dato, donem) => `oversikt-${dato}-${donem}`;
export const oversiktUrl = (dato, donem) => `${SITE}/oversikt/${dato}/${donem}/`;

// Ön bilgiden yalnız düz alanlar (title, description, date, draft).
export function onBilgi(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const d = {};
  for (const satir of m[1].split(/\r?\n/)) {
    const i = satir.indexOf(':');
    if (i < 1 || /^\s/.test(satir)) continue;
    let v = satir.slice(i + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) {
      try {
        v = JSON.parse(v);
      } catch {
        v = v.slice(1, -1);
      }
    }
    d[satir.slice(0, i).trim()] = v;
  }
  return d;
}

/** Yayındaki saklar (taslak ve ileri tarihli hariç), eskiden yeniye. */
export async function sakerLes({ kok = KOK, simdi }) {
  const dizin = path.join(kok, 'src/content/haberler');
  const saker = [];
  for (const slug of await readdir(dizin).catch(() => [])) {
    const metin = await readFile(path.join(dizin, slug, 'index.md'), 'utf8').catch(() => null);
    const d = metin && onBilgi(metin);
    if (!d?.title || d.draft === 'true') continue;
    const tarih = new Date(d.date);
    if (Number.isNaN(tarih.valueOf()) || tarih > simdi) continue;
    saker.push({ slug, tittel: d.title, ingress: d.description ?? '', tarih });
  }
  return saker.sort((a, b) => a.tarih - b.tarih);
}

async function sonOversikt(kok) {
  const dizin = path.join(kok, 'src/data/oversikt');
  let son = 0;
  for (const ad of await readdir(dizin).catch(() => [])) {
    if (!ad.endsWith('.json')) continue;
    const k = JSON.parse(await readFile(path.join(dizin, ad), 'utf8'));
    son = Math.max(son, Date.parse(k.opprettet) || 0);
  }
  return son;
}

const varMi = (p) => access(p).then(() => true, () => false);

/** Oversikt yazar; yeterli sak yoksa ya da bu dönem zaten yazıldıysa null. kapakFn: kapağı çizer (testte atlanır). */
export async function oversiktYaz({ simdi = new Date(), donem = donemSec(simdi), kok = KOK, kapakFn, log = console.log } = {}) {
  if (!DONEMLER[donem]) throw new Error(`Ugyldig periode: ${donem}`);
  const dato = osloGunu(simdi);
  const dosya = path.join(kok, 'src/data/oversikt', `${dato}-${donem}.json`);
  if (await varMi(dosya)) {
    log(`${dato}-${donem} finnes allerede.`);
    return null;
  }
  const son = await sonOversikt(kok);
  const saker = (await sakerLes({ kok, simdi })).filter((s) => s.tarih.getTime() > son && simdi - s.tarih <= AZAMI_YAS_MS);
  if (saker.length < EN_AZ) {
    log(`For få nye saker (${saker.length}) til ${DONEMLER[donem]}.`);
    return null;
  }
  const kayit = {
    dato,
    donem,
    tittel: DONEMLER[donem],
    opprettet: simdi.toISOString(),
    saker: saker.map(({ slug, tittel, ingress }) => ({ slug, tittel, ingress })),
  };
  await mkdir(path.dirname(dosya), { recursive: true });
  await writeFile(dosya, `${JSON.stringify(kayit, null, 2)}\n`, 'utf8');
  // İki kapak: yatay (site, og:image) ve dikey -dikey.png (LinkedIn, linkedin-gorsel).
  if (kapakFn) {
    await mkdir(path.join(kok, 'public/oversikt'), { recursive: true });
    for (const [bicim, ek] of [['kapak', ''], ['dikey', '-dikey']]) {
      const { png } = await kapakFn({ tittel: kayit.tittel, basliklar: saker.map((s) => s.tittel), bicim });
      await writeFile(path.join(kok, 'public/oversikt', `${dato}-${donem}${ek}.png`), png);
    }
  }
  log(`Skrevet: ${path.relative(kok, dosya)} (${saker.length} saker)`);
  return kayit;
}

/** En son yazılan oversikt (bildirim için). */
export async function sisteOversikt(kok = KOK) {
  const dizin = path.join(kok, 'src/data/oversikt');
  let son = null;
  for (const ad of await readdir(dizin).catch(() => [])) {
    if (!ad.endsWith('.json')) continue;
    const k = JSON.parse(await readFile(path.join(dizin, ad), 'utf8'));
    if (!son || k.opprettet > son.opprettet) son = k;
  }
  return son;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const env = process.env;
  if (process.argv.includes('--bildir')) {
    const k = await sisteOversikt();
    const ok = k && (await ozetBildir({ url: env.MOTOR_URL, anahtar: env.MOTOR_ANAHTARI, site: 'tidsrost', sayfaUrl: oversiktUrl(k.dato, k.donem), slug: oversiktSlug(k.dato, k.donem) }));
    console.log(ok ? `Varslet: ${k.dato}-${k.donem}` : 'Varsling feilet (MOTOR_URL/MOTOR_ANAHTARI eller nett).');
    if (!ok) process.exitCode = 1;
  } else {
    const dur = await yayinDurduMu({ url: env.MOTOR_URL, anahtar: env.MOTOR_ANAHTARI, site: 'tidsrost' });
    const arg = process.argv[2];
    const { listeKart } = await import('./oversikt-kapak.mjs');
    const k = dur.durdu ? (console.log(`Nødstopp: ${dur.neden}`), null) : await oversiktYaz({ ...(DONEMLER[arg] && { donem: arg }), kapakFn: listeKart });
    if (env.GITHUB_OUTPUT) await writeFile(env.GITHUB_OUTPUT, `yazildi=${k ? 1 : 0}\n`, { flag: 'a' });
  }
}
