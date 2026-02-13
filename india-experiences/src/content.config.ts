import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    city: z.string().optional(),
    // SEO Governance: Tier-based content hierarchy
    tier: z.enum(['1', '2', '3']).optional(),  // Required after migration: 1=hub, 2=guide, 3=micro
    category: z.enum([
      // Governance categories
      'hub', 'guide', 'micro', 'where-to-stay', 'experiences', 'neighbourhoods',
      'things-to-do', 'food-guide', 'nightlife-guide', 'day-trips', 'heritage-guide', 'safety-guide',
      // Legacy categories for backward compatibility
      'general', 'food', 'heritage', 'practical', 'activities', 'transport',
      'shopping', 'culture', 'wellness', 'markets', 'nature', 'spiritual',
      'nightlife', 'festival', 'daytrips', 'neighbourhood',
    ]),
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
    // New optional fields for enhanced layouts
    heroImage: z.string().optional(),
    cardImage: z.string().optional(),
    duration: z.string().optional(),
    price: z.string().optional(),
    bestMonths: z.array(z.number()).optional(),
    goodMonths: z.array(z.number()).optional(),
    // Internal linking fields
    priority: z.number().min(1).max(10).default(5),  // Computed from tier, kept for backward compatibility
    tags: z.array(z.string()).optional(),            // for topic matching
  }),
});

export const collections = { pages };
