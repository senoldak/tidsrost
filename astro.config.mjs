// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { indekserbar } from './src/lib/ordtelling.mjs';

// Eski haberlerin kapakları sayfada kullanılmasa da Astro orijinal dosyayı yine dist/_astro'ya yazar.
// Derleme sonunda hiçbir çıktı dosyasında adı geçmeyen görselleri sileriz (dosya sayısı sınırı: 20.000).
const kullanilmayanGorseller = () => ({
  name: 'kullanilmayan-gorseller',
  hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      const kok = fileURLToPath(dir);
      const dosyalar = await readdir(kok, { recursive: true });
      const gorsel = /\.(png|jpe?g|webp|avif|gif)$/i;
      const adaylar = dosyalar.filter((f) => f.startsWith(`_astro${path.sep}`) && gorsel.test(f));
      let metin = '';
      for (const f of dosyalar) if (/\.(html|xml|css|js|json|txt)$/i.test(f)) metin += await readFile(path.join(kok, f), 'utf8');
      const silinecek = adaylar.filter((f) => !metin.includes(path.basename(f)));
      for (const f of silinecek) await rm(path.join(kok, f));
      logger.info(`${silinecek.length} kullanılmayan görsel silindi.`);
    },
  },
});

// Site haritası için haber tarihleri: frontmatter'dan okunur (lastmod). Taslaklar ve
// içeriksiz kategoriler site haritasına girmez. Çok kısa haberler (noindex, bkz. src/lib/ordtelling.mjs)
// de girmez; ölçü haber sayfasının robots etiketiyle aynı yardımcıdan gelir.
const haberDizini = fileURLToPath(new URL('./src/content/haberler/', import.meta.url));
const haberTarihleri = new Map();
const doluKategoriler = new Set();
const kisaHaberler = new Set();
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
  if (!indekserbar(metin)) kisaHaberler.add(`/artikkel/${id}/`);
  const kategori = alan('category');
  if (kategori) doluKategoriler.add(kategori);
}

const siteHaritasi = sitemap({
  filter: (sayfa) => {
    const yol = new URL(sayfa).pathname;
    if (yol.startsWith('/admin') || yol.startsWith('/404') || kisaHaberler.has(yol)) return false;
    const kategori = yol.match(/^\/kategori\/([^/]+)\/$/)?.[1];
    return !kategori || doluKategoriler.has(kategori);
  },
  serialize: (oge) => {
    const tarih = haberTarihleri.get(new URL(oge.url).pathname);
    return tarih ? { ...oge, lastmod: tarih.toISOString() } : oge;
  },
});

// https://astro.build/config
export default defineConfig({
  site: 'https://tidsrost.com',
  integrations: [siteHaritasi, kullanilmayanGorseller()],
  // CSP (public/_headers) satır içi stile izin vermez; tüm CSS ayrı dosya olarak yüklenir.
  build: { inlineStylesheets: 'never' },
});
