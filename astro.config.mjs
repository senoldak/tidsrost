// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apenForSok } from './src/lib/sok-synlighet.mjs';
import { osloDag } from './src/lib/apenhet.mjs';
import { ARKIV_TERSKEL } from './src/lib/arkiv.mjs';

// Astro kapakların orijinal PNG'sini de dist/_astro'ya yazar, oysa sayfalar yalnızca türetilmiş dosyaları kullanır.
// Derleme sonunda hiçbir çıktı dosyasında adı geçmeyen görselleri sileriz. Kaynaktaki kapaklar (src/content) silinmez.
//
// Dosya bütçesi (Cloudflare Workers static assets: sürüm başına en fazla 20.000 dosya; yayinla.yml 15.000'de uyarır):
//   her haber: index.html + OG/JSON-LD görseli (1200 px JPEG) = 2 dosya, grafikli yazılarda + graf-N.svg;
//   son GORSEL_GUN (14) gündeki haberler: + sayfa kapağı (1200 px WebP); kategori sayfası: 30 haberde 1 sayfa.
//   Sabit kısım (site sayfaları, yazı tipleri, CSS/JS, public/) ~100 dosya. ~250 haberde dist ≈ 750 dosya;
//   15.000'lik uyarıya ~7.000 haberde varılır. O zaman eski OG görselleri ortak bir görsele çevrilebilir.
const kullanilmayanGorseller = () => ({
  name: 'kullanilmayan-gorseller',
  hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      const kok = fileURLToPath(dir);
      const dosyalar = await readdir(kok, { recursive: true });
      const gorsel = /\.(png|jpe?g|webp|avif|gif)$/i;
      const adaylar = dosyalar.filter((f) => f.startsWith(`_astro${path.sep}`) && gorsel.test(f));
      // Çıktı dosyalarında geçen görsel adları tek geçişte toplanır (O(N)); eskiden bütün metin tek dizede birleştirilip
      // her aday için includes() çalıştırılıyordu (O(N²): 2.000 haberde 30–40 sn, 5.000'de dakikalar).
      const kullanilan = new Set();
      const ad = /[\w.-]+\.(?:png|jpe?g|webp|avif|gif)\b/gi;
      for (const f of dosyalar) {
        if (!/\.(html|xml|css|js|json|txt)$/i.test(f)) continue;
        for (const m of (await readFile(path.join(kok, f), 'utf8')).matchAll(ad)) kullanilan.add(m[0].toLowerCase());
      }
      const silinecek = adaylar.filter((f) => !kullanilan.has(path.basename(f).toLowerCase()));
      for (const f of silinecek) await rm(path.join(kok, f));
      logger.info(`${silinecek.length} kullanılmayan görsel silindi.`);
    },
  },
});

// Site haritası için haber tarihleri: frontmatter'dan okunur (lastmod). Taslaklar ve
// içeriksiz kategoriler site haritasına girmez. Arama motorlarına kapalı haberler (kısa, medya yeniden yazımı,
// farevarsel; bkz. src/lib/sok-synlighet.mjs) de girmez; ölçü haber sayfasının robots etiketiyle aynı yardımcıdan gelir.
const haberDizini = fileURLToPath(new URL('./src/content/haberler/', import.meta.url));
const haberTarihleri = new Map();
const doluKategoriler = new Set();
const kisaHaberler = new Set();
// Arkivdag (Oslo) → antall artikler; dagssider under ARKIV_TERSKEL er noindex og står ikke i kartet.
const arkivDager = new Map();
for (const f of await readdir(haberDizini, { recursive: true })) {
  if (!f.endsWith('.md')) continue;
  const metin = await readFile(path.join(haberDizini, f), 'utf8');
  const fm = metin.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const alan = (ad) => fm.match(new RegExp(`^${ad}:\\s*["']?([^"'\\r\\n]+)`, 'm'))?.[1]?.trim();
  if (alan('draft') === 'true') continue;
  // Tarihi gelmemiş (planlanmış) haberler derlemeye girmez (src/lib/news.ts yayinda).
  if (new Date(alan('date') ?? '').getTime() > Date.now()) continue;
  const id = path.dirname(f) === '.' ? path.basename(f, '.md') : path.dirname(f).split(path.sep).join('/');
  const tarih = new Date(alan('date') ?? '');
  // Düzeltme/güncelleme tarihi varsa lastmod odur.
  const oppdatert = new Date(alan('oppdatert') ?? '');
  const sist = !Number.isNaN(oppdatert.getTime()) && oppdatert > tarih ? oppdatert : tarih;
  if (!Number.isNaN(tarih.getTime())) haberTarihleri.set(`/artikkel/${id}/`, sist);
  if (!apenForSok({ body: metin, produksjon: alan('produksjon'), id, title: alan('title') })) kisaHaberler.add(`/artikkel/${id}/`);
  const kategori = alan('category');
  if (kategori) doluKategoriler.add(kategori);
  if (!Number.isNaN(tarih.getTime())) {
    const dag = osloDag(tarih);
    const a = arkivDager.get(dag) ?? { antall: 0, sist: tarih };
    arkivDager.set(dag, { antall: a.antall + 1, sist: a.sist > tarih ? a.sist : tarih });
  }
}

// Veri sayfalarının lastmod'u: ilgili JSON'un alındığı zaman (scripts/data/hent-data.mjs). /tall/ en yenisini alır.
const veriTarihleri = new Map();
for (const [yol, fil, alan] of [
  ['/styringsrenten/', 'styringsrente.json'],
  ['/prisstigning/', 'prisstigning.json'],
  ['/boligpriser/', 'boligpriser.json'],
  ['/arbeidsledighet/', 'arbeidsledighet.json'],
  ['/prisomregner/', 'kpi-historisk.json'],
  ['/farevarsler/', 'varselarkiv.json', 'lopende'],
  ['/snoskredvarsel/', 'snoskred.json'],
]) {
  try {
    const j = JSON.parse(await readFile(fileURLToPath(new URL(`./src/data/${fil}`, import.meta.url)), 'utf8'));
    const t = new Date((alan ? j[alan]?.hentet : null) ?? j.hentet);
    if (!Number.isNaN(t.getTime())) veriTarihleri.set(yol, t);
  } catch {}
}
if (veriTarihleri.size) veriTarihleri.set('/tall/', new Date(Math.max(...[...veriTarihleri.values()].map(Number))));

const siteHaritasi = sitemap({
  filter: (sayfa) => {
    const yol = new URL(sayfa).pathname;
    // Søkesiden er noindex (resultatene lages i nettleseren); søkeindeksen (JSON) er ingen side.
    if (yol.startsWith('/sok') || yol.endsWith('.json')) return false;
    // Ukesider er summen av dagssidene (noindex).
    if (yol.startsWith('/arkiv/uke/')) return false;
    if (yol.startsWith('/404') || kisaHaberler.has(yol)) return false;
    const arkiv = yol.match(/^\/arkiv\/(\d{4}-\d{2}-\d{2})\/$/)?.[1];
    if (arkiv && (arkivDager.get(arkiv)?.antall ?? 0) < ARKIV_TERSKEL) return false;
    // Kategorinin 2. ve sonraki sayfaları (/kategori/<slug>/2/) yalnız haber varsa üretilir; haritaya girer.
    const kategori = yol.match(/^\/kategori\/([^/]+)\/$/)?.[1];
    return !kategori || doluKategoriler.has(kategori);
  },
  serialize: (oge) => {
    const yol = new URL(oge.url).pathname;
    const arkiv = yol.match(/^\/arkiv\/(\d{4}-\d{2}-\d{2})\/$/)?.[1];
    const tarih = arkiv ? arkivDager.get(arkiv)?.sist : (haberTarihleri.get(yol) ?? veriTarihleri.get(yol));
    return tarih ? { ...oge, lastmod: tarih.toISOString() } : oge;
  },
});

// https://astro.build/config
export default defineConfig({
  // Astro 7 varsayılanı "jsx": satır sonundaki boşluğu etiket kenarında siler (ör. "</a>" + yeni satır + "kelime" bitişik çıkar). true: tek boşluğa indirir.
  compressHTML: true,
  site: 'https://tidsrost.com',
  integrations: [siteHaritasi, kullanilmayanGorseller()],
  // CSP (public/_headers) satır içi stile izin vermez; tüm CSS ayrı dosya olarak yüklenir.
  build: { inlineStylesheets: 'never' },
  // CSP satır içi script'e de izin vermez: Astro küçük script'leri (ör. DelSaken'deki "Kopier lenke") satır içine
  // gömmesin, her zaman ayrı dosya (/_astro/*.js) olsun.
  vite: { build: { assetsInlineLimit: 0 } },
});
