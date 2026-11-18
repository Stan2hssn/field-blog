import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: 'page',
      source: 'blog/**/*.md',
      schema: z.object({
        num: z.string(),
        slug: z.string(),
        title: z.string(),
        lede: z.string(),
        publishDate: z.date(),
        authors: z.array(z.string()),
        readingTime: z.number(),
        categories: z.array(z.enum(['guides', 'design', 'ia', 'expert'])),
        tags: z.array(z.string()).optional(),
        nextSlug: z.string().optional(),
        sections: z.array(
          z.object({
            num: z.string(),
            kicker: z.string(),
            title: z.string(),
            body: z.string(),
            doItems: z.array(z.string()),
            dontItems: z.array(z.string()),
            why: z.string(),
          }),
        ),
        closing: z.string(),
      }),
    }),
    // Long-form : le corps Markdown est l'article. Le schema checklist du blog
    // ne porte ni code ni schemas, d'ou une collection a part.
    devlog: defineCollection({
      type: 'page',
      source: 'devlog/**/*.md',
      schema: z.object({
        num: z.string(),
        slug: z.string(),
        series: z.string(),
        title: z.string(),
        lede: z.string(),
        publishDate: z.date(),
        readingTime: z.number(),
        tags: z.array(z.string()),
        sections: z.array(z.object({ num: z.string(), kicker: z.string() })),
        nextSlug: z.string().optional(),
        closing: z.string(),
      }),
    }),
  },
})
