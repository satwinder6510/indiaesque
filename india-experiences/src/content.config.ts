import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    city: z.string().optional(),
    category: z.string(),
    type: z.enum(['hub', 'category', 'paa', 'blog']),
    datePublished: z.string(),
    dateModified: z.string(),
    status: z.enum(['machine-draft', 'published', 'human-edited']),
    schema: z.array(z.string()),
    relatedPages: z.array(z.string()).optional(),
    parentPage: z.string().optional(),
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
  }),
});

export const collections = { pages };
