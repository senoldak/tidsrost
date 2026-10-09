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
    }),
});

export const collections = { haberler };
