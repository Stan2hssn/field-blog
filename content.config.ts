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
  },
})
