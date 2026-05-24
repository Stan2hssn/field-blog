# FIELD® — Field Notes

Blog technique Nuxt 4 + Content v3 sur le handoff design × code × IA.
Routes principales : `/blog` (index), `/blog/[slug]` (article).

---

## ⚠️ OBLIGATIONS AVANT CHAQUE PROMPT (Claude / IA)

Toute session qui travaille sur ce projet **doit** exécuter cette checklist
avant la première modification de code. Sauter une étape a déjà coûté plusieurs
allers-retours de refactor.

### 1. Lecture obligatoire (dans l'ordre)

1. **Ce README** — vue d'ensemble + obligations.
2. **`/Users/stan_husson/Dev/PP/RD/Guidelines/field-blog-bootstrap-plan.md`** —
   plan self-contained : stack, sprint, IDs Figma, schémas, conventions.
3. **Mémoire projet** —
   `~/.claude/projects/-Users-stan_husson-Dev-PP-field-blog/memory/MEMORY.md`
   et fichiers référencés (décisions validées, sources, process).

### 2. Figma MCP — **avant tout code visuel**

Le fichier Figma est `mvEqOky6Y2y6lNkRXpH712`. Pages clés :
- `10 — Ready to dev` : frame **Index `298:281`**, frame **Article `299:1191`**.
- `00 — Components & Tokens` : tous les masters.

Pour chaque composant à coder ou modifier :

```
mcp__claude_ai_Figma__get_design_context   ← code de référence + variants
mcp__claude_ai_Figma__get_variable_defs    ← tokens couleur / espacement
mcp__claude_ai_Figma__get_screenshot       ← visuel pour diff
mcp__claude_ai_Figma__get_metadata         ← structure du frame parent
```

**Annotations** : chaque master expose une description + chaque instance peut
avoir un `data-annotations` spécifique. **Ne JAMAIS sauter cette lecture** —
elles précisent :
- Comportement (sticky, scroll-spy, animations, timing exact).
- A11y (rôles, `aria-current`, `aria-hidden`, skip-link).
- Source de données (`featured.tags`, `chapter.publishDate`, etc.).
- États (Default / hover / active / focus-visible / disabled).
- Transitions (durée + easing par propriété).
- Tokens à utiliser (jamais de couleur en dur).

### 3. Validation après chaque batch — **obligatoire**

`pnpm dev` + Chrome DevTools MCP :

```
mcp__chrome-devtools__new_page          ← /blog et /blog/01-...
mcp__chrome-devtools__resize_page       ← 1512×982 (taille frame Figma)
mcp__chrome-devtools__list_console_messages types=["error","warn"]
mcp__chrome-devtools__take_screenshot   ← diff vs screenshot Figma
mcp__chrome-devtools__take_snapshot     ← vérifie liens, aria-current, semantic
mcp__chrome-devtools__evaluate_script   ← positions, dimensions, state actif
```

HTTP 200 sur curl **ne suffit pas** : un lien `<NuxtLink>` cassé renvoie 200
sur la page de destination tapée à la main mais 404 quand cliqué depuis l'index.
Toujours tester la navigation interactive.

### 4. Skills Claude Code

Invoquer en début de tâche :
- `nuxt-skills:nuxt` — config Nuxt 4 + auto-imports.
- `nuxt-skills:nuxt-content` — collections v3 + `queryCollection*`.
- `nuxt-skills:vue` — Composition API + reactive props.
- `superpowers:using-superpowers` — checklist en tête de session.

### 5. Conventions repo (rappel court)

- Composants Vue 3.5+ : `<script setup lang="ts">`, props destructurés avec
  defaults, `defineProps<{}>()`, `useId()` pour IDs SSR-stables (jamais
  `Math.random()`).
- Slugs Nuxt Content : préfixe `NN-` pour matcher l'auto-path
  (`/blog/01-figma-handoff-pour-le-code`).
- Tokens uniquement (jamais `#hex`) : variables CSS dans
  `app/assets/css/tokens.css` + classes Tailwind correspondantes.
- Mono / Inter : tracking `--tracking-kicker: 1.76px` absolu pour les kickers.
- Transitions : durées spécifiées dans les annotations Figma (120ms color,
  200ms padding/transform, 80ms scroll). Respecter `prefers-reduced-motion`.

### 6. Commits

Conventional Commits FR. Référencer les annotations / IDs Figma corrigés
dans le corps. Validation Chrome DevTools mentionnée dans le commit.

---

## Stack

- **Nuxt 4** (app router `app/`) + **Content v3** (SQLite local, libSQL prod)
- **Tailwind 3** + `@tailwindcss/typography` (article body)
- **Pinia 3**, **VueUse 14**, **GSAP 3** (transitions Jour 9-10)
- **Vercel** (SSG via `nuxt generate`)
- pnpm avec `onlyBuiltDependencies` (better-sqlite3, sharp, esbuild, @parcel/watcher)

## Setup

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm generate     # SSG build → .output/public/
pnpm preview
```

## Structure

```
app/
├── components/
│   ├── atoms/        Kicker, Heading, BodyText, Rule, Pill, ArrowLink,
│   │                 BrandLogo, ListSummary
│   ├── molecules/    SectionHead, PullQuote, DoDontList, MetaRow, TocItem,
│   │                 ScrollProgressBar, NavTop, ButtonCopyLink
│   ├── organisms/    ArticleHeader, AboutPanel, ClosingBlock,
│   │                 NextChapterCard, ChapterListSidebar, IntroBlock,
│   │                 ImageCardStack.client, FeaturedCard, CtaReadMore
│   └── templates/    ArticleLayout
├── composables/      useScrollProgress, useScrollSpy, useClock
├── pages/            blog/index, blog/[slug], about, _dev/{atoms,molecules,index-pieces}
├── utils/            chapters (manifest 14 entrées)
└── assets/css/       tokens, main, tailwind
content/blog/         01-figma-handoff-pour-le-code.md (Zod-validé)
```

## Sources de référence

- Plan complet : `/Users/stan_husson/Dev/PP/RD/Guidelines/field-blog-bootstrap-plan.md`
- Contenu chapitres source : `/Users/stan_husson/Dev/PP/RD/Guidelines/blog/*/README.md`
- Repo conventions (à NE PAS dupliquer aveuglément) : `/Users/stan_husson/Dev/PV/Projects/PFGOB25`
- Audit dette technique de PFGOB25 (anti-patterns à éviter) : `PFGOB25/optimzation.md`
