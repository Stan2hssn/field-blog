export default defineNuxtConfig({
  compatibilityDate: '2026-05-21',

  modules: [
    '@nuxt/content',
    '@nuxt/image',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/google-fonts',
    '@pinia/nuxt',
    '@vueuse/nuxt',
  ],

  ssr: true,
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/blog'],
    },
  },

  routeRules: {
    '/': { redirect: { to: '/blog', statusCode: 301 } },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      meta: [
        { name: 'theme-color', content: '#0a0a0a' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      ],
    },
  },

  components: [
    { path: '~/components', pathPrefix: false },
  ],

  css: [
    '~/assets/css/tokens.css',
    '~/assets/css/main.css',
    '~/assets/css/tailwind.css',
  ],

  googleFonts: {
    families: {
      Inter: [300, 400, 500, 600, 700],
      'JetBrains Mono': [500],
    },
    display: 'swap',
    download: true,
    inject: true,
  },

  build: {
    transpile: ['gsap'],
  },

  devtools: { enabled: true },
})
