import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CATEGORIES } from './lib/site';

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
      author: z.string().default('tidsrøst'),
      featured: z.boolean().default(false),
      breaking: z.boolean().default(false),
      draft: z.boolean().default(false),
      // Haberin nasıl üretildiği; okura haberin altında açıkça gösterilir (VVP 2.3).
      produksjon: z.enum(['manuell', 'automatisk', 'ki-assistert', 'ki-kontrollert', 'ki-automatisk']).default('manuell'),
      // Düzeltme notu; haberin en üstünde gösterilir (VVP 4.13).
      rettelse: z.string().optional(),
    }),
});

export const collections = { haberler };
