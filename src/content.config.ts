import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    description: z.string().default(''),
    draft: z.boolean().default(true),
    coverImage: z.string().optional(),
    tags: z.array(z.string()).default([])
  })
});

export const collections = { posts };
