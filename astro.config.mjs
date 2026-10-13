// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

// https://astro.build/config
export default defineConfig({
  site: 'https://tidsrost.com',
  integrations: [sitemap(), kullanilmayanGorseller()],
  // CSP (public/_headers) satır içi stile izin vermez; tüm CSS ayrı dosya olarak yüklenir.
  build: { inlineStylesheets: 'never' },
});
