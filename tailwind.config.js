import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/components/**/*.{js,ts,vue}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/plugins/**/*.{js,ts}',
    './app/composables/**/*.{js,ts}',
    './app/app.vue',
    './app/error.vue',
    './content/**/*.md',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
        greyed: 'var(--color-text-greyed)',
        bg: 'var(--color-bg-page)',
        'bg-card': 'var(--color-bg-card)',
        accent: 'var(--color-accent)',
        rule: 'var(--color-rule)',
        'cream-primary': 'var(--color-cream-text-primary)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        kicker: 'var(--tracking-kicker)',
      },
      screens: {
        sm: { raw: '((min-width: 640px) and (min-height: 840px))' },
        'width-sm': { raw: '(min-width: 640px)' },
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
      },
      transitionDuration: {
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
      },
    },
  },
  plugins: [typography],
}
