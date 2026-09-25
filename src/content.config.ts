import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Fields carried over from WordPress by scripts/import-wp.mjs.
const legacy = {
  legacyUrl: z.string().optional(),
  wpId: z.number().optional(),
  updated: z.string().optional(),
};

const withAlt = <T extends { image?: unknown; imageAlt?: string }>(d: T) => !d.image || !!d.imageAlt;
const altError = { error: 'imageAlt is required when image is set', path: ['imageAlt'] };

const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      heading: z.string().optional(),
      description: z.string().optional(),
      image: image().optional(),
      imageAlt: z.string().optional(),
      legacyMapQuery: z.string().optional(),
      legacyFormFields: z.array(z.string()).optional(),
      ...legacy,
    }).refine(withAlt, altError),
});

const services = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/services' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      heading: z.string(),
      order: z.number().int().positive(),
      description: z.string().optional(),
      image: image().optional(),
      imageAlt: z.string().optional(),
      // Stand-in photo until the shop supplies a real one.
      imagePlaceholder: z.boolean().default(false),
      ...legacy,
    }).refine(withAlt, altError),
});

export const collections = { pages, services };
