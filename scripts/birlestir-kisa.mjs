// Tek seferlik göç (26 Ekim 2026): eski kısa bot haberleri Oslo dilimi derlemelerine, eski sarı/turuncu farevarsel
// haberleri günün "Farevarsler" sayfasına taşınır. Metne bir şey eklenmez: her haber kendi başlığıyla bir bölüm olur,
// gövdesi ve kaynak satırı olduğu gibi kalır. Eski adresler public/_redirects'te 301 ile bölümüne yönlenir.
//
//   node scripts/birlestir-kisa.mjs --prova [--rapor dosya.md]   yalnız listeyi çıkarır, hiçbir dosyaya dokunmaz
//   node scripts/birlestir-kisa.mjs --yaz --yedek <klasör>       yazar; taşınan klasörler önce yedeğe kopyalanır
//
// Kurallar (sahibinin kararı, 25–26 Ekim): eşik 250 kelime (ordtelling); dilimler Oslo saatiyle sabah 06–12,
// öğleden sonra 12–18, akşam 18–06 (gece yarısından sonrası önceki güne); derleme 2–8 haber, kalabalık dilim
// kategoriye göre bölünür; tek kalan haber aynı günün en yakın dilimine katılır; ki-medier ayrı derlenir.
import path from 'node:path';
import { readFile, writeFile, readdir, mkdir, cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import GithubSlugger from 'github-slugger';
import { ordtelling } from '../src/lib/ordtelling.mjs';
import { lagBilde, osloIso, KATEGORIER } from './nyheter/lib.mjs';
import { nokkel, sammeHendelse } from './nyheter/dublett.mjs';
import { dekrypter, krypter, harNokkel } from './nyheter/hemmelig.mjs';
import { leggTilFarevarsler, varselSidesine, slugFor as varselSlug } from './nyheter/farevarsler.mjs';

export const ESIK = 250;
export const EN_AZ = 2;
export const AZAMI = 8;
const DILIMLER = ['morgen', 'ettermiddag', 'kveld'];
const URETIM_SIRA = ['ki-medier', 'ki-automatisk', 'ki-kontrollert', 'ki-assistert', 'automatisk', 'manuell'];
const yamlStr = (s) => JSON.stringify(String(s));

// ── Okuma ──────────────────────────────────────────────────────────────────────────────────────────────────────

const deger = (fm, k) => {
  const m = fm.match(new RegExp(`^${k}:[ \\t]*(.*)$`, 'm'));
  if (!m) return '';
  const v = m[1].trim();
  return v.startsWith('"') ? JSON.parse(v) : v;
};

export function haberOku(slug, metin) {
  const m = metin.replace(/\r/g, '').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  const [, fm, govde] = m;
  return {
    slug,
    title: deger(fm, 'title'),
    description: deger(fm, 'description'),
    dateHam: deger(fm, 'date'),
    date: new Date(deger(fm, 'date')),
    category: deger(fm, 'category') || 'innenriks',
    sjanger: deger(fm, 'sjanger') || 'nyhet',
    produksjon: deger(fm, 'produksjon') || 'manuell',
    draft: deger(fm, 'draft') === 'true',
    kildeSpor: deger(fm, 'kildeSpor'),
    nyhetsverdi: Number(deger(fm, 'nyhetsverdi')) || 0,
    coverAlt: deger(fm, 'coverAlt'),
    coverKreditt: deger(fm, 'coverKreditt'),
    cover: deger(fm, 'cover'),
    govde: govde.trim(),
    ord: ordtelling(govde),
  };
}

// ── Seçim ve gruplama (saf işlevler; testi birlestir-kisa.test.mjs) ──────────────────────────────────────────────

const osloParca = (d) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );

/** Oslo dilimi: { gun: 'YYYY-MM-DD', dilim: 0|1|2 }. 00–06 arası önceki günün akşamıdır. */
export function dilimi(d) {
  const p = osloParca(d);
  const saat = Number(p.hour);
  if (saat < 6) {
    const once = osloParca(new Date(Date.UTC(p.year, p.month - 1, p.day, 12) - 864e5));
    return { gun: `${once.year}-${once.month}-${once.day}`, dilim: 2 };
  }
  return { gun: `${p.year}-${p.month}-${p.day}`, dilim: saat < 12 ? 0 : saat < 18 ? 1 : 2 };
}

/** Haberleri sınıflar: { kisa, varsel } (taslaklar, gelecek tarihliler, Forklart/Analyse ve günlük sayfalar hariç). */
export function sec(haberler, { esik = ESIK, simdi = new Date() } = {}) {
  const uygun = haberler.filter(
    (h) => h && !h.draft && h.sjanger === 'nyhet' && h.date <= simdi && !/^(kort-fortalt|farevarsler|nyheter)-\d/.test(h.slug),
  );
  const varsel = uygun.filter((h) => varselSidesine(h));
  const kisa = uygun.filter((h) => !varsel.includes(h) && !/^\S+ (farevarsel|snøskredfare)\b/i.test(h.title) && h.ord < esik);
  return { kisa, varsel };
}

const kategoriSira = (c) => (KATEGORIER.indexOf(c) + 1 || 99);
const sirala = (a, b) => kategoriSira(a.category) - kategoriSira(b.category) || a.date - b.date;

/** n haberi en çok AZAMI'lık dengeli parçalara böler (kategoriye göre sıralı, bitişik). */
export function bol(liste, azami = AZAMI) {
  const s = [...liste].sort(sirala);
  const parca = Math.ceil(s.length / azami);
  const out = [];
  for (let i = 0, bas = 0; i < parca; i++) {
    const boy = Math.floor(s.length / parca) + (i < s.length % parca ? 1 : 0);
    out.push(s.slice(bas, bas + boy));
    bas += boy;
  }
  return out;
}

/**
 * Derleme grupları: [{ akis, gun, dilim, parca, uyeler }]. Akış: 'medier' (ki-medier) ya da 'resmi'.
 * Tek kalan haber aynı günün aynı akışındaki en yakın dilime katılır (eşitlikte öncekine); yoksa yerinde kalır.
 */
export function grupla(kisa) {
  const kova = new Map();
  for (const h of kisa) {
    const akis = h.produksjon === 'ki-medier' ? 'medier' : 'resmi';
    const { gun, dilim } = dilimi(h.date);
    const k = `${akis}|${gun}`;
    if (!kova.has(k)) kova.set(k, [[], [], []]);
    kova.get(k)[dilim].push(h);
  }
  const gruplar = [];
  const kalan = [];
  for (const [k, dilimler] of [...kova].sort(([a], [b]) => a.localeCompare(b))) {
    const [akis, gun] = k.split('|');
    for (let d = 0; d < 3; d++) {
      if (dilimler[d].length !== 1) continue;
      const hedef = [d - 1, d + 1, d - 2, d + 2].find((x) => x >= 0 && x < 3 && dilimler[x].length >= 1 && x !== d);
      if (hedef === undefined) continue;
      dilimler[hedef].push(...dilimler[d]);
      dilimler[d] = [];
    }
    for (let d = 0; d < 3; d++) {
      if (!dilimler[d].length) continue;
      if (dilimler[d].length < EN_AZ) {
        kalan.push(...dilimler[d]);
        continue;
      }
      bol(dilimler[d]).forEach((uyeler, i, hepsi) => gruplar.push({ akis, gun, dilim: d, parca: hepsi.length > 1 ? i + 1 : 0, uyeler }));
    }
  }
  return { gruplar, kalan };
}

// ── Derleme metni ────────────────────────────────────────────────────────────────────────────────────────────

const gunYazi = (gun) => new Date(`${gun}T12:00:00Z`).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const saatYazi = (d) =>
  `${d.toLocaleDateString('nb-NO', { timeZone: 'Europe/Oslo', day: 'numeric', month: 'long' })} kl. ${d
    .toLocaleTimeString('nb-NO', { timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .replace(':', '.')}`;

export function derlemeSlug(g, alinan = new Set()) {
  const [y, m, d] = g.gun.split('-').map(Number);
  const maned = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('nb-NO', { month: 'long', timeZone: 'UTC' });
  let slug = `nyheter-${d}-${maned}-${y}-${DILIMLER[g.dilim]}`;
  for (let i = 2; alinan.has(slug); i++) slug = `nyheter-${d}-${maned}-${y}-${DILIMLER[g.dilim]}-${i}`;
  alinan.add(slug);
  return slug;
}

const enGuclu = (uyeler) => [...uyeler].sort((a, b) => b.nyhetsverdi - a.nyhetsverdi || b.ord - a.ord || a.date - b.date)[0];

export function derlemeBaslik(g) {
  const ust = enGuclu(g.uyeler);
  const n = g.uyeler.length - 1;
  return `${ust.title} og ${n === 1 ? '1 annen sak' : `${n} andre saker`} · ${gunYazi(g.gun)}, ${DILIMLER[g.dilim]}`;
}

export function derlemeAciklama(g) {
  const ust = enGuclu(g.uyeler);
  const basliklar = [ust, ...g.uyeler.filter((h) => h !== ust)].map((h) => h.title);
  const giris = `Korte nyheter ${gunYazi(g.gun)}, ${DILIMLER[g.dilim]}: `;
  const secilen = [];
  for (const b of basliklar) {
    if ((giris + [...secilen, b].join('. ')).length > 290) break;
    secilen.push(b);
  }
  return `${giris}${(secilen.length ? secilen : basliklar.slice(0, 1)).join('. ')}.`;
}

// Bölüm gövdesindeki başlıklar bir kademe iner (bölüm başlığı ## olduğu için).
const indir = (govde) => govde.replace(/^(#{2,5}) /gm, '#$1 ');

export function derlemeGovde(g) {
  const uyeler = [...g.uyeler].sort(sirala);
  return [
    'Sakene under ble først publisert hver for seg og er her samlet på én side. Teksten er ikke endret.',
    ...uyeler.map((h) => [`## ${h.title}`, `*Publisert ${saatYazi(h.date)}*`, indir(h.govde)].join('\n\n')),
  ].join('\n\n');
}

/** Markdown başlıklarının Astro'daki kimlikleri (github-slugger, belge sırasıyla). Döner: Map(başlık metni → id). */
export function baslikIdleri(md) {
  const slugger = new GithubSlugger();
  const out = new Map();
  for (const m of md.replace(/\r/g, '').matchAll(/^#{1,6} (.+)$/gm)) {
    const id = slugger.slug(m[1].replace(/[*_`]/g, '').trim());
    if (!out.has(m[1].trim())) out.set(m[1].trim(), id);
  }
  return out;
}

const uretim = (uyeler) => URETIM_SIRA.find((p) => uyeler.some((h) => h.produksjon === p)) ?? 'manuell';

function kildeSporBirlestir(uyeler) {
  const spor = uyeler.map((h) => h.kildeSpor).filter(Boolean);
  if (!spor.length) return '';
  if (!harNokkel()) throw new Error('KILDE_NOKKEL yok: kildeSpor birleştirilemez');
  const liste = [];
  for (const s of spor) for (const k of dekrypter(s)) if (!liste.some((x) => x.url === k.url)) liste.push(k);
  return krypter(liste);
}

const enSik = (uyeler, ust) => {
  const say = {};
  for (const h of uyeler) say[h.category] = (say[h.category] ?? 0) + 1;
  return Object.entries(say).sort(([a, x], [b, y]) => y - x || (a === ust.category ? -1 : b === ust.category ? 1 : 0))[0][0];
};

/** Aynı derlemede aynı olayı anlatan çiftler (rapor için). */
export function tekrarlar(uyeler) {
  const n = uyeler.map((h) => nokkel({ slug: h.slug, tittel: h.title, ingress: h.description, tekst: h.govde, produksjon: h.produksjon }));
  const out = [];
  for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) if (sammeHendelse(n[i], n[j])) out.push([uyeler[i], uyeler[j]]);
  return out;
}

// ── Ana akış ─────────────────────────────────────────────────────────────────────────────────────────────────

async function main() {
  const arg = process.argv.slice(2);
  const yaz = arg.includes('--yaz');
  const rot = process.cwd();
  const dizin = path.join(rot, 'src/content/haberler');
  const haberler = [];
  for (const d of await readdir(dizin)) {
    const f = path.join(dizin, d, 'index.md');
    if (existsSync(f)) haberler.push(haberOku(d, await readFile(f, 'utf8')));
  }
  const { kisa, varsel } = sec(haberler);
  const { gruplar, kalan } = grupla(kisa);
  const alinan = new Set(haberler.map((h) => h?.slug));
  const yonlenen = (await readFile(path.join(rot, 'public/_redirects'), 'utf8')).split('\n').map((l) => l.match(/^\/artikkel\/([^/\s]+)/)?.[1]).filter(Boolean);
  for (const s of yonlenen) alinan.add(s);
  for (const g of gruplar) {
    g.slug = derlemeSlug(g, alinan);
    g.title = derlemeBaslik(g);
    g.description = derlemeAciklama(g);
    g.govde = derlemeGovde(g);
    g.tekrar = tekrarlar(g.uyeler);
  }

  // Rapor
  const satir = [];
  satir.push(`# Kısa haber birleştirme provası`, '');
  satir.push(`- Kısa haber (<${ESIK} kelime): ${kisa.length}; derlemeye giren: ${gruplar.reduce((a, g) => a + g.uyeler.length, 0)}; yerinde kalan (gününde eşi yok): ${kalan.length}`);
  satir.push(`- Derleme: ${gruplar.length} (resmî ${gruplar.filter((g) => g.akis === 'resmi').length}, ki-medier ${gruplar.filter((g) => g.akis === 'medier').length})`);
  satir.push(`- Farevarsel → günlük sayfa: ${varsel.length} haber, ${new Set(varsel.map((h) => varselSlug(h.date))).size} sayfa`);
  const tekrarSay = gruplar.reduce((a, g) => a + g.tekrar.length, 0);
  satir.push(`- Olası tekrar çifti: ${tekrarSay}`, '');
  if (tekrarSay) {
    satir.push('## Olası tekrarlar (aynı derlemede aynı olay)', '');
    for (const g of gruplar) for (const [a, b] of g.tekrar) satir.push(`- ${g.slug}: «${a.title}» (${a.ord} k.) ↔ «${b.title}» (${b.ord} k.)`);
    satir.push('');
  }
  satir.push('## Derlemeler', '');
  for (const g of gruplar) {
    satir.push(`### ${g.slug} (${g.uyeler.length}, ${g.akis})`, `**${g.title}**`, '');
    for (const h of [...g.uyeler].sort(sirala)) satir.push(`- [${h.category}] ${h.title} (${h.ord} k.)`);
    satir.push('');
  }
  if (kalan.length) {
    satir.push('## Yerinde kalanlar', '');
    for (const h of kalan) satir.push(`- ${h.dateHam.slice(0, 10)} ${h.title} (${h.ord} k., ${h.produksjon})`);
    satir.push('');
  }
  satir.push('## Farevarsel', '');
  for (const h of varsel) satir.push(`- ${varselSlug(h.date)} ← ${h.title}`);
  const raporYolu = arg[arg.indexOf('--rapor') + 1];
  if (arg.includes('--rapor')) await writeFile(raporYolu, `${satir.join('\n')}\n`, 'utf8');
  console.log(satir.slice(0, 7).join('\n'));
  if (!yaz) return;

  // Yazım
  const yedek = arg[arg.indexOf('--yedek') + 1];
  if (!arg.includes('--yedek') || !yedek) throw new Error('--yedek <klasör> gerekli');
  const tasinan = [...gruplar.flatMap((g) => g.uyeler), ...varsel];
  await mkdir(yedek, { recursive: true });
  for (const h of tasinan) await cp(path.join(dizin, h.slug), path.join(yedek, h.slug), { recursive: true });

  const yonlendirme = []; // [eski, yeni#id]
  for (const g of gruplar) {
    const ust = enGuclu(g.uyeler);
    const son = [...g.uyeler].sort((a, b) => b.date - a.date)[0];
    const spor = kildeSporBirlestir(g.uyeler);
    const nyhetsverdi = Math.max(0, ...g.uyeler.map((h) => h.nyhetsverdi));
    const mappe = path.join(dizin, g.slug);
    await mkdir(mappe, { recursive: true });
    const kategori = enSik(g.uyeler, ust);
    const bilde = await lagBilde({ title: g.title, description: g.description, category: kategori, date: son.dateHam });
    if (bilde) await writeFile(path.join(mappe, 'cover.png'), bilde.png);
    const md = [
      '---',
      `title: ${yamlStr(g.title)}`,
      `description: ${yamlStr(g.description)}`,
      `date: ${son.dateHam}`,
      `category: ${kategori}`,
      `produksjon: ${uretim(g.uyeler)}`,
      spor ? `kildeSpor: ${yamlStr(spor)}` : null,
      nyhetsverdi ? `nyhetsverdi: ${nyhetsverdi}` : null,
      bilde ? 'cover: ./cover.png' : null,
      bilde ? `coverAlt: ${yamlStr(bilde.alt)}` : null,
      bilde ? `coverKreditt: ${yamlStr(bilde.kreditt)}` : null,
      '---',
      '',
      g.govde,
      '',
    ]
      .filter((l) => l !== null)
      .join('\n');
    await writeFile(path.join(mappe, 'index.md'), md, 'utf8');
    const idler = baslikIdleri(g.govde);
    for (const h of g.uyeler) yonlendirme.push([h.slug, `${g.slug}/#${idler.get(h.title)}`]);
  }

  // Farevarsel: kronolojik sırayla günün sayfasına; harita olarak eski kapak kullanılır.
  for (const h of [...varsel].sort((a, b) => a.date - b.date)) {
    const kaynak = h.govde.match(/^\*Kilde: \[([^\]]+)\]\(([^)]+)\)(?: \(([^)]+)\))?\*\s*$/m);
    const kilde = kaynak ? { navn: kaynak[1], url: kaynak[2], lisens: kaynak[3] } : { navn: 'Meteorologisk institutt', url: 'https://www.met.no/', lisens: 'CC BY 4.0' };
    const body = h.govde.replace(/^\*Kilder?: .*\*\s*$/m, '').trim();
    const kapak = h.cover ? path.join(dizin, h.slug, h.cover.replace(/^\.\//, '')) : null;
    const bilde = async () => (kapak && existsSync(kapak) ? { png: await readFile(kapak), alt: h.coverAlt, kreditt: h.coverKreditt } : null);
    await leggTilFarevarsler(rot, [{ id: `eski:${h.slug}`, sak: { title: h.title, description: h.description, body, kilde } }], h.date, { bilde });
  }
  for (const s of new Set(varsel.map((h) => varselSlug(h.date)))) {
    const sayfa = JSON.parse(await readFile(path.join(dizin, s, 'varsler.json'), 'utf8'));
    const idler = baslikIdleri(await readFile(path.join(dizin, s, 'index.md'), 'utf8'));
    for (const v of sayfa.varsler) if (v.id.startsWith('eski:')) yonlendirme.push([v.id.slice(5), `${s}/${idler.get(v.title) ? `#${idler.get(v.title)}` : ''}`]);
  }

  for (const h of tasinan) await rm(path.join(dizin, h.slug), { recursive: true, force: true });

  // İç bağlantılar
  const harita = new Map(yonlendirme);
  for (const d of await readdir(dizin)) {
    const f = path.join(dizin, d, 'index.md');
    if (!existsSync(f)) continue;
    const eski = await readFile(f, 'utf8');
    const yeni = eski.replace(/\]\(\/artikkel\/([^/)#\s]+)\/?(#[^)\s]*)?\)/g, (tam, s) => (harita.has(s) ? `](/artikkel/${harita.get(s)})` : tam));
    if (yeni !== eski) await writeFile(f, yeni, 'utf8');
  }

  const blok = [
    '',
    '# Kısa haberler dilim derlemelerine, sarı/turuncu farevarsel haberleri günün Farevarsler sayfasına birleştirildi',
    '# (scripts/birlestir-kisa.mjs, 2026-10-26). Eski adres derlemedeki kendi bölümüne gider.',
    ...yonlendirme.map(([eski, yeni]) => [eski, yeni.replace(/#(.+)$/, (_, id) => `#${encodeURIComponent(id)}`)]).flatMap(([eski, yeni]) => [`/artikkel/${eski}/ /artikkel/${yeni} 301`, `/artikkel/${eski} /artikkel/${yeni} 301`]),
    '',
  ].join('\n');
  const rf = path.join(rot, 'public/_redirects');
  await writeFile(rf, `${(await readFile(rf, 'utf8')).replace(/\s*$/, '\n')}${blok}`, 'utf8');
  await writeFile(path.join(yedek, 'yonlendirmeler.json'), `${JSON.stringify(yonlendirme, null, 2)}\n`, 'utf8');
  console.log(`yazıldı: ${gruplar.length} derleme, ${yonlendirme.length} yönlendirme; yedek ${yedek}; ${osloIso()}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
