// Kaynak: mecmua/site-ortak/denetim/site-denetim.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Haftalık site denetimi (site-denetimi.yml, 2 Kasım 2026): kırık bağlantı (lychee) ve erişilebilirlik (axe-core).
// Site derlenmez; canlı sitenin haritasından sayfa seçilir, lychee o sayfalardaki bağlantıları, axe-core birkaç örnek
// sayfayı denetler. Yalnız rapor yazar (iş eseri + iş özeti); pazartesi masaüstü rutini site-denetimi okur. Telegram yok.
// Kullanım:
//   node site-denetim.mjs sayfalar <çıktı.txt> [--axe <axe-sayfalar.txt>]   site: SITE ortamı ya da scripts/site-ortak.json
//   node site-denetim.mjs axe <axe-sayfalar.txt> <axe.json>                 AXE_MODULLER: playwright ve @axe-core/playwright klasörü
//   node site-denetim.mjs rapor <lychee.json> <axe.json> <rapor.md>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

export const YENI_GUN = 8; // bu kadar gün içinde değişen sayfa her hafta denetlenir
export const DILIM = 4; // eski sayfalar dört haftada bir (adres özetiyle dilimlenir), kaynak sitelere yük binmesin
export const AZAMI_SAYFA = 400;
const AXE_ORNEK = 5;

export function siteAdresi(ortam = process.env, kok = process.cwd()) {
  if (ortam.SITE) return ortam.SITE.replace(/\/+$/, '');
  const dosya = path.join(kok, 'scripts/site-ortak.json');
  if (existsSync(dosya)) return JSON.parse(readFileSync(dosya, 'utf8')).site.replace(/\/+$/, '');
  throw new Error('SITE ya da scripts/site-ortak.json yok');
}

const coz = (s) => s.replace(/&amp;/g, '&').trim();
export function haritaOku(xml) {
  const dizin = [...xml.matchAll(/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>/g)].map((m) => coz(m[1]));
  const urller = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, ic]) => ({
    loc: coz(ic.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? ''),
    lastmod: ic.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim() ?? null,
  })).filter((u) => u.loc);
  return { dizin, urller };
}

export function isoHafta(t) {
  const d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yilBasi = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yilBasi) / 86400000 + 1) / 7);
}

const dilim = (url) => createHash('sha1').update(url).digest()[0] % DILIM;

// Yeni (YENI_GUN içinde değişen) sayfaların hepsi + eski sayfaların bu haftaki dilimi; ana sayfa her zaman.
// axe için ana sayfa ve en yeni birkaç sayfa.
export function sayfalariSec(urller, site, simdi = new Date()) {
  const sinir = simdi.getTime() - YENI_GUN * 86400000;
  const hafta = isoHafta(simdi) % DILIM;
  const tekil = [...new Map(urller.map((u) => [u.loc, u])).values()];
  const yeniMi = (u) => u.lastmod && Date.parse(u.lastmod) >= sinir;
  const yeni = tekil.filter(yeniMi).sort((a, b) => Date.parse(b.lastmod) - Date.parse(a.lastmod));
  const eski = tekil.filter((u) => !yeniMi(u) && dilim(u.loc) === hafta);
  const ana = `${site}/`;
  const lychee = [...new Set([ana, ...yeni.map((u) => u.loc), ...eski.map((u) => u.loc)])].slice(0, AZAMI_SAYFA);
  // axe: ana sayfa + her sayfa türünden (adresin ilk bölümü: haber, veri, kategori…) en yeni bir örnek.
  const turler = new Map();
  for (const u of yeni) {
    const tur = new URL(u.loc).pathname.split('/').filter(Boolean)[0] ?? '';
    if (tur && !turler.has(tur)) turler.set(tur, u.loc);
  }
  const axe = [ana, ...turler.values()].slice(0, AXE_ORNEK);
  return { lychee, axe, yeni: yeni.length, eski: eski.length };
}

async function getir(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'mecmua-site-denetimi' }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.text();
}

export async function haritadanUrller(site, al = getir) {
  const { dizin, urller } = haritaOku(await al(`${site}/sitemap-index.xml`));
  const out = [...urller];
  for (const h of dizin) out.push(...haritaOku(await al(h)).urller);
  return out;
}

// lychee JSON'u (--format json): sürüme göre fail_map ya da error_map; girdi sayfa adresi → [{ url, status }].
export function lycheeKiriklari(veri) {
  const harita = veri.error_map ?? veri.fail_map ?? {};
  const kirik = [];
  for (const [sayfa, liste] of Object.entries(harita)) {
    for (const b of liste ?? []) {
      const durum = typeof b.status === 'object' ? (b.status.code ?? b.status.text ?? JSON.stringify(b.status)) : b.status;
      kirik.push({ sayfa, url: b.url, durum: String(durum ?? '?').slice(0, 80) });
    }
  }
  return kirik;
}

const kacis = (s) => String(s).replace(/\|/g, '/').replace(/\n/g, ' ');

export function raporYaz({ site, lychee, axe }) {
  const s = [`## Site denetimi: ${site}`, ''];
  if (!lychee) s.push('Kırık bağlantı denetimi çalışmadı (lychee çıktısı yok).', '');
  else {
    const kirik = lycheeKiriklari(lychee);
    s.push(`### Kırık bağlantılar: ${kirik.length} (denetlenen bağlantı ${lychee.total ?? '?'})`, '');
    if (kirik.length) {
      s.push('| Bağlantı | Durum | Sayfa |', '|---|---|---|');
      for (const k of kirik.slice(0, 150)) s.push(`| ${kacis(k.url)} | ${kacis(k.durum)} | ${kacis(k.sayfa)} |`);
      if (kirik.length > 150) s.push('', `…ve ${kirik.length - 150} bağlantı daha (iş eserindeki lychee.json).`);
      s.push('');
    }
  }
  if (!axe) s.push('Erişilebilirlik denetimi çalışmadı (axe çıktısı yok).', '');
  else {
    s.push(`### Erişilebilirlik (axe-core, ${axe.length} sayfa): yalnız "serious" ve "critical"`, '');
    const satirlar = [];
    for (const p of axe) {
      if (p.hata) satirlar.push(`| ${kacis(p.url)} | açılamadı | ${kacis(p.hata)} | |`);
      for (const v of p.ihlaller ?? []) satirlar.push(`| ${kacis(p.url)} | ${v.etki} | ${v.kural}: ${kacis(v.aciklama)} | ${v.sayi} |`);
    }
    if (satirlar.length) s.push('| Sayfa | Etki | Kural | Öğe |', '|---|---|---|---|', ...satirlar);
    else s.push('Ciddi erişilebilirlik hatası yok.');
    s.push('');
  }
  return s.join('\n');
}

async function axeCalistir(sayfalar, moduller) {
  const yukle = (ad) => import(pathToFileURL(path.join(moduller, 'node_modules', ad, 'index.mjs')).href)
    .catch(() => import(pathToFileURL(path.join(moduller, 'node_modules', ad, 'dist', 'index.mjs')).href));
  const { chromium } = await yukle('playwright');
  const { default: AxeBuilder } = await yukle('@axe-core/playwright');
  const tarayici = await chromium.launch();
  const out = [];
  try {
    for (const url of sayfalar) {
      const sayfa = await tarayici.newPage();
      try {
        await sayfa.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        const r = await new AxeBuilder({ page: sayfa }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        out.push({
          url,
          ihlaller: r.violations.filter((v) => ['serious', 'critical'].includes(v.impact))
            .map((v) => ({ kural: v.id, etki: v.impact, aciklama: v.help, sayi: v.nodes.length })),
        });
      } catch (e) {
        out.push({ url, hata: String(e.message).slice(0, 200) });
      } finally {
        await sayfa.close();
      }
    }
  } finally {
    await tarayici.close();
  }
  return out;
}

const jsonOku = (dosya) => {
  try {
    return JSON.parse(readFileSync(dosya, 'utf8'));
  } catch {
    return null;
  }
};

async function ana([komut, ...arg]) {
  if (komut === 'sayfalar') {
    const site = siteAdresi();
    const { lychee, axe, yeni, eski } = sayfalariSec(await haritadanUrller(site), site);
    writeFileSync(arg[0], `${lychee.join('\n')}\n`);
    const i = arg.indexOf('--axe');
    if (i >= 0) writeFileSync(arg[i + 1], `${axe.join('\n')}\n`);
    console.log(`${site}: ${lychee.length} sayfa (${yeni} yeni, ${eski} eski dilimden), axe ${axe.length}`);
  } else if (komut === 'axe') {
    const sayfalar = readFileSync(arg[0], 'utf8').split('\n').filter(Boolean);
    writeFileSync(arg[1], JSON.stringify(await axeCalistir(sayfalar, process.env.AXE_MODULLER), null, 1));
  } else if (komut === 'rapor') {
    const metin = raporYaz({ site: siteAdresi(), lychee: jsonOku(arg[0]), axe: jsonOku(arg[1]) });
    writeFileSync(arg[2], `${metin}\n`);
    console.log(metin);
  } else {
    throw new Error('kullanım: site-denetim.mjs sayfalar|axe|rapor …');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ana(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
