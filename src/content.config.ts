import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CATEGORIES } from './lib/site';

// Düzeltme notları 1 Kasım 2026'dan önce gösterilmez (yapım aşaması; sahibinin kararı, 22 Ekim 2026).
// Zincir de bu tarihten önce not yazmaz (mecmua yazi-isleri/guncelleme/icerik.mjs DUZELTME_ACILIS).
const DUZELTME_ACILIS = Date.parse('2026-11-01T00:00:00+03:00');
const duzeltmeKapisi = (v: string | undefined) => (Date.now() < DUZELTME_ACILIS ? undefined : v);
const slugs = CATEGORIES.map((c) => c.slug) as [string, ...string[]];

const haberler = defineCollection({
  loader: glob({ base: './src/content/haberler', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      category: z.enum(slugs),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      // Görselin kaynağı/hakları (ör. "Kart: tidsrøst. Kartgrunnlag: Natural Earth."); resim altında gösterilir.
      coverKreditt: z.string().optional(),
      author: z.string().default('tidsrøst'),
      featured: z.boolean().default(false),
      breaking: z.boolean().default(false),
      draft: z.boolean().default(false),
      // Haberin nasıl üretildiği; okura haberin altında açıkça gösterilir (VVP 2.3).
      // 'ki-redigert': yazı işleri zincirinin yazısı (yerleştirme yazar); sayfa sonunda zincir notunu alır (src/lib/kinote.mjs).
      produksjon: z.enum(['manuell', 'automatisk', 'ki-assistert', 'ki-kontrollert', 'ki-automatisk', 'ki-medier', 'ki-redigert']).default('manuell'),
      // Düzeltme notu; haberin en üstünde gösterilir (VVP 4.13).
      rettelse: z.string().optional().transform(duzeltmeKapisi),
      // Düzeltme ya da güncelleme tarihi; yapılandırılmış veride dateModified ve haberde "Oppdatert" olarak gösterilir.
      oppdatert: z.coerce.date().optional(),
      // Redaksjonell oppsummering / GEO syntese (Kort oppsummert)
      why_matters: z.string().optional(),
      key_points: z.array(z.string()).optional(),
      // Yazı türü: 'forklart' = tablo ve grafiklerle açıklayıcı yazı (menüde "Forklart"); 'analyse' = yazı işleri zincirinin analiz yazısı (menüde "Analyse").
      sjanger: z.enum(['nyhet', 'forklart', 'analyse']).default('nyhet'),
      // Resmi olmayan kaynakların şifreli kaydı; sitede gösterilmez (bkz. scripts/nyheter/hemmelig.mjs).
      kildeSpor: z.string().optional(),
      // Botun seçimde verdiği haber değeri (1–100, bkz. scripts/nyheter/viktighet.mjs); sitede gösterilmez, Reels seçiminde kullanılır.
      nyhetsverdi: z.number().int().min(1).max(100).optional(),
    }),
});

export const collections = { haberler };
