/**
 * Figma ↔ Vue component mapping.
 *
 * Source of truth for the design ↔ code contract on this project.
 * Used by devs to navigate from a Figma frame to the Vue SFC that implements it,
 * and by tooling that resolves Figma `nodeId` / `componentKey` to file paths.
 *
 * Figma file: Figma_MCP — key mvEqOky6Y2y6lNkRXpH712
 *
 * Generated 2026-05-27 from the responsive handoff pass.
 * If a master is renamed, prefer updating the `key` here over chasing nodeId.
 * `componentKey` is stable across renames; `nodeId` is not.
 */

export const FIGMA_FILE_KEY = 'mvEqOky6Y2y6lNkRXpH712';

export type FigmaConnectEntry = {
  /** Stable Figma component key (survives renames). */
  key: string;
  /** Current Figma node id in this file. */
  nodeId: string;
  /** Path to the Vue SFC, relative to /app. */
  source: string;
  /** Component name as registered/auto-imported by Nuxt. */
  component: string;
  /** Variant set: enumerate variant names if applicable. */
  variants?: readonly string[];
  /** Free-text notes (responsive behaviour, legacy flag, etc.). */
  notes?: string;
  /** Set true when the master has a newer duplicate that should be preferred. */
  legacy?: boolean;
};

/** Master ↔ Vue mapping. Key is a stable slug, not a Figma id. */
export const FIGMA_COMPONENTS = {
  // ── Atoms ─────────────────────────────────────────────────────────────────
  pill: {
    key: '01dc7027955c9f4bfac6d6c8bd9f4899921a5f9b',
    nodeId: '70:5',
    source: 'components/atoms/Pill.vue',
    component: 'Pill',
    notes: 'Basic pill. Use `pillTag` for the outlined/categorisation variant.',
  },
  pillTag: {
    key: '91181148ef1096edbe2afa138e76e20e95896aeb',
    nodeId: '315:174',
    source: 'components/atoms/Pill.vue',
    component: 'Pill',
    notes: 'Tag variant — border + padding, used for categories ("FONDAMENTAUX").',
  },
  eyebrow: {
    key: 'c3765bfa173fa61c7ff11ee3de1f0c133d40c881',
    nodeId: '70:7',
    source: 'components/atoms/Kicker.vue',
    component: 'Kicker',
  },
  ruleH: {
    key: 'b476672374e245ccd934226cefef79be3873e9d6',
    nodeId: '70:15',
    source: 'components/atoms/Rule.vue',
    component: 'Rule',
    notes: 'Horizontal rule. In Figma masters, always implemented as LINE (not RECTANGLE).',
  },
  logoBrand: {
    key: '17a8abc758d8b68b8fa1f26bfb47fbaecc790c36',
    nodeId: '202:939',
    source: 'components/atoms/BrandLogo.vue',
    component: 'BrandLogo',
  },
  arrowLink: {
    key: '0bd92ed00692b84e71b6cca77aa5cea7680722c2',
    nodeId: '336:378',
    source: 'components/atoms/ArrowLink.vue',
    component: 'ArrowLink',
    variants: ['direction=right', 'direction=left'],
  },
  listSummary: {
    key: '471bb2948c14f0bd9b5050788b111959949cd051',
    nodeId: '238:2419',
    source: 'components/atoms/ListSummary.vue',
    component: 'ListSummary',
    variants: [
      'states=Default',
      'states=active',
      'states=hover',
      'states=focus-visible',
      'states=disabled',
    ],
  },

  // ── Molecules ─────────────────────────────────────────────────────────────
  metaRow: {
    key: '146dc4de99a6ac27b6535acfe68ebdfe2a51066d',
    nodeId: '70:9',
    source: 'components/molecules/MetaRow.vue',
    component: 'MetaRow',
  },
  navTop: {
    key: '3fef0bdc1032c47ffa8d3b4b07bd2fb3e910e0c6',
    nodeId: '155:99',
    source: 'components/molecules/NavTop.vue',
    component: 'NavTop',
    variants: ['Version=V1', 'Version=V2', 'Version=V3', 'Version=V4'],
  },
  blogHeader: {
    key: '43eef8e72e476816b465a46e2085a85f7f27b466',
    nodeId: '73:39',
    source: 'components/molecules/NavTop.vue',
    component: 'NavTop',
    notes: 'Wider desktop nav variant — same Vue component as `navTop`.',
  },
  sectionHead: {
    key: '1716f50927aedc6532ffad3735c40484d663f9c9',
    nodeId: '310:178',
    source: 'components/molecules/SectionHead.vue',
    component: 'SectionHead',
    notes:
      'Big section watermark ("01", 88px) + kicker + italic title (Inter Light Italic 36/40). ' +
      'Used on Article Mobile + Tablet for each section.',
  },
  pullQuote: {
    key: '0ffb45be713364b88b5b65cfb56796b39bc883a2',
    nodeId: '310:174',
    source: 'components/molecules/PullQuote.vue',
    component: 'PullQuote',
    notes: '"POURQUOI" kicker + italic body 26px Light Italic. Used inside article sections.',
  },
  whyCallout: {
    key: '9c827c17068454821f8e9a04ba29d4e21e578e5b',
    nodeId: '73:24',
    source: 'components/molecules/PullQuote.vue',
    component: 'PullQuote',
    legacy: true,
    notes: 'Legacy callout — prefer `pullQuote` (310:174) for new work.',
  },
  doDontList: {
    key: '679710195f3311d66e080fcceb6920ef0ab5a406',
    nodeId: '310:183',
    source: 'components/molecules/DoDontList.vue',
    component: 'DoDontList',
    notes:
      'Wraps DoCard + DontCard (310:191) side by side. Renders rule + label + 4-item list. ' +
      'Items in Inter Regular 15. Tablet shows 2-col, mobile stacks.',
  },
  doDontListLegacyDo: {
    key: 'cbb179679d4668ea311c6cfb65eab3ce3ee35150',
    nodeId: '73:14',
    source: 'components/molecules/DoDontList.vue',
    component: 'DoDontList',
    legacy: true,
    notes: 'Legacy DoCard — prefer 310:183.',
  },
  doDontListLegacyDont: {
    key: '2d52a6b74cf5b02797d0f744674cd5f34650286b',
    nodeId: '73:19',
    source: 'components/molecules/DoDontList.vue',
    component: 'DoDontList',
    legacy: true,
    notes: 'Legacy DontCard — prefer 310:191.',
  },
  tocItem: {
    key: 'f26140e88d231adaad73ea9da8b683779a85f790',
    nodeId: '310:213',
    source: 'components/molecules/TocItem.vue',
    component: 'TocItem',
    variants: ['state=Active', 'state=Default'],
  },
  chapterListItem: {
    key: '8582cddf28b0d147f41ab7a1bfab682f27685608',
    nodeId: '70:17',
    source: 'components/molecules/TocItem.vue',
    component: 'TocItem',
    notes: 'Older variant — same Vue component as `tocItem`.',
  },
  buttonCopyLink: {
    key: '63cb437b623c1381c211e884d2f5c670a83b9c02',
    nodeId: '286:350',
    source: 'components/molecules/ButtonCopyLink.vue',
    component: 'ButtonCopyLink',
    variants: ['state=Default', 'state=Hover', 'state=Pressed', 'state=Pressed in'],
    notes:
      'Includes 3-step icon animation (icon/copy_link master, 328:1117). ' +
      'Map "Default" state for static handoff; full set for prototype.',
  },
  scrollProgressBar: {
    key: '22307af1a3d04dc7924d7a79a0538c9753df571e',
    nodeId: '315:176',
    source: 'components/molecules/ScrollProgressBar.vue',
    component: 'ScrollProgressBar',
    notes:
      'Top of Article. 4px high. Fill bound to color/obys/accent. ' +
      'Progress driven by IntersectionObserver on article sections.',
  },

  // ── Organisms ─────────────────────────────────────────────────────────────
  articleHeader: {
    key: '15f6c353dcc457489da9ed127b8f5cc7853882f8',
    nodeId: '318:184',
    source: 'components/organisms/ArticleHeader.vue',
    component: 'ArticleHeader',
    variants: ['state=full', 'state=preview'],
  },
  introBlock: {
    key: '57479146459968c65ed3796912d8e13e359b31fd',
    nodeId: '102:406',
    source: 'components/organisms/IntroBlock.vue',
    component: 'IntroBlock',
    notes: '"Field Notes est un journal..." intro paragraph block.',
  },
  featuredCard: {
    key: 'c88a15fe34bb79ae7a67bbf13c8579230b03ede9',
    nodeId: '102:384',
    source: 'components/organisms/FeaturedCard.vue',
    component: 'FeaturedCard',
    variants: ['V1', 'V2 (137:791)', 'V3 (137:792)', 'V4 (120:124)'],
    notes:
      'Featured article card. V1-V4 represent typo evolution (versions of the design). ' +
      'Responsive title: 32 mobile (Inter Light Italic) / 44 tablet / 56+ desktop.',
  },
  imageCardStack: {
    key: '909d9dd6c9f15b0e1447bd710333c98501b552a4',
    nodeId: '102:388',
    source: 'components/organisms/ImageCardStack.client.vue',
    component: 'ImageCardStack',
    notes:
      'Mobile/Tablet: horizontal ribbon with overflow (items at negative/positive x). ' +
      'Desktop: vertical scroll. Implements `scroll-snap-type: x mandatory` on touch.',
  },
  chapterListSidebar: {
    key: 'f65ab208ee8dca712f468e05cfad342dc2fa06a0',
    nodeId: '149:117',
    source: 'components/organisms/ChapterListSidebar.vue',
    component: 'ChapterListSidebar',
    variants: ['Version=V1', 'Version=V4'],
  },
  chapterList: {
    key: '37695cfd1b043a64b14b54ad74a83f247d439593',
    nodeId: '98:819',
    source: 'components/organisms/ChapterListSidebar.vue',
    component: 'ChapterListSidebar',
    variants: ['Chapter=1', 'Chapter=2', '...', 'Chapter=13'],
    notes: 'ComponentSet variant by active chapter. 13 chapters total.',
  },
  chapterCarousel: {
    key: '__inline__',
    nodeId: '__inline__',
    source: 'components/organisms/ChapterCarousel.client.vue',
    component: 'ChapterCarousel',
    notes:
      'Mobile horizontal chapter list (in carousel layout). Built from listItem (98:711) instances ' +
      'with `states=Default` / `states=active`. The bottom row "- 01 02 03 ... 13".',
  },
  closingBlock: {
    key: '__inline__',
    nodeId: '__inline__',
    source: 'components/organisms/ClosingBlock.vue',
    component: 'ClosingBlock',
    notes:
      'End-of-article "EN UNE PHRASE" block (Inter Light Italic 32px). Inline in article frames; ' +
      'no master in Figma but the typography style is `editorial/closing-italic`.',
  },
  nextChapterCard: {
    key: '__inline__',
    nodeId: '__inline__',
    source: 'components/organisms/NextChapterCard.vue',
    component: 'NextChapterCard',
    notes:
      'End-of-article "SUITE · CHAPITRE N+1" card. Mobile id 417:1775, tablet id 469:218. ' +
      'Inline (no master), but the pattern is consistent across breakpoints.',
  },
  aboutPanel: {
    key: '__inline__',
    nodeId: '__inline__',
    source: 'components/organisms/AboutPanel.vue',
    component: 'AboutPanel',
    notes:
      'Aside panel grouping about/head + meta-rows + sommaire (TOC). ' +
      'Desktop: sticky position; mobile: stack at top; tablet: full-width stack.',
  },
  ctaReadMore: {
    key: '__inline__',
    nodeId: '__inline__',
    source: 'components/organisms/CtaReadMore.vue',
    component: 'CtaReadMore',
    notes: '"LIRE →" CTA + rule + meta tags row. Used on Index frames.',
  },

  // ── Listitem variants (used by ChapterCarousel + ChapterListSidebar) ──────
  listItem: {
    key: 'dafc32fade856d42cf7f43edd7b93a5eabbd1414',
    nodeId: '98:711',
    source: 'components/molecules/TocItem.vue',
    component: 'TocItem',
    variants: [
      'states=Default',
      'states=active',
      'states=hover',
      'states=focus-visible',
      'states=disabled',
    ],
    notes:
      'Used both in horizontal chapter list (Mobile) and vertical sidebar (Tablet/Desktop). ' +
      'Active state shows a leading tick: characters override to "- 01".',
  },
} as const satisfies Record<string, FigmaConnectEntry>;

export type FigmaComponentSlug = keyof typeof FIGMA_COMPONENTS;

/** Build a Figma URL pointing to a specific component (clipboard-ready). */
export function getFigmaUrl(slug: FigmaComponentSlug): string {
  const c = FIGMA_COMPONENTS[slug];
  if (c.nodeId === '__inline__') {
    return `https://figma.com/design/${FIGMA_FILE_KEY}/Figma_MCP`;
  }
  return `https://figma.com/design/${FIGMA_FILE_KEY}/Figma_MCP?node-id=${c.nodeId.replace(':', '-')}`;
}

/** Reverse lookup: given a Vue source path, find the matching Figma entry. */
export function findByVueSource(source: string): FigmaConnectEntry | undefined {
  return Object.values(FIGMA_COMPONENTS).find((c) => c.source === source);
}

/** All non-legacy entries (canonical mapping). */
export const FIGMA_COMPONENTS_CANONICAL = Object.fromEntries(
  Object.entries(FIGMA_COMPONENTS).filter(([, v]) => !v.legacy),
) as Record<string, FigmaConnectEntry>;

// ── Frames (responsive deliverables, not components) ────────────────────────
// These are the source frames the design team hands off. Each is implemented
// as a page (or composition of organisms) in the Vue app.

export const FIGMA_FRAMES = {
  articleDesktop: { nodeId: '299:1191', label: 'Article · V2 · Color (Desktop)' },
  indexDesktop: { nodeId: '298:281', label: 'Index · Ready for dev (Desktop 1512)' },
  articleMobile: { nodeId: '417:1716', label: 'Article · Mobile (430)' },
  articleTablet: { nodeId: '379:255', label: 'Article · Tablet (768)' },
  indexMobile: { nodeId: '387:469', label: 'Index · Mobile (430)' },
  indexMobileCarousel: { nodeId: '460:1219', label: 'Index · Mobile (430) — carousel pattern' },
  indexTablet: { nodeId: '387:515', label: 'Index · Tablet (768)' },
} as const;

export type FigmaFrameSlug = keyof typeof FIGMA_FRAMES;

export function getFigmaFrameUrl(slug: FigmaFrameSlug): string {
  return `https://figma.com/design/${FIGMA_FILE_KEY}/Figma_MCP?node-id=${FIGMA_FRAMES[slug].nodeId.replace(':', '-')}`;
}

// ── Tailwind ↔ Figma token map ──────────────────────────────────────────────
// Documents which Figma variable each Tailwind utility resolves to.
// Source of truth for the color contract: `tokens.css` (CSS custom props).

export const FIGMA_COLOR_TOKENS = {
  'text-primary': { figma: 'color/obys/text-primary', tailwind: 'text-primary' },
  'text-secondary': { figma: 'color/obys/text-secondary', tailwind: 'text-secondary' },
  'text-mid': { figma: 'color/obys/text-mid', tailwind: 'text-mid' },
  'text-greyed': { figma: 'color/obys/text-greyed', tailwind: 'text-greyed' },
  'bg-page': { figma: 'color/obys/bg-page', tailwind: 'bg-bg' },
  'bg-card': { figma: 'color/obys/bg-card', tailwind: 'bg-bg-card' },
  accent: { figma: 'color/obys/accent', tailwind: 'text-accent / bg-accent' },
  rule: { figma: 'color/rule', tailwind: 'border-rule' },
} as const;

// ── Text styles (Figma) ↔ Tailwind utilities ────────────────────────────────
// Suggested utility class for each Figma text style. Where no exact Tailwind
// utility exists, the recommendation is to use the closest combo of
// `font-{family} text-[Npx] leading-[Npx] tracking-[N%]`.

export const FIGMA_TEXT_STYLES = {
  'display/hero': 'font-sans font-black text-[128px] leading-[120px] tracking-[-0.04em]',
  'display/title': 'font-sans font-bold text-[44px] leading-[52px] tracking-[-0.02em]',
  'display/part': 'font-sans font-bold text-[56px] leading-[64px] tracking-[-0.02em]',
  'heading/h1': 'font-sans font-bold text-[52px] leading-[60px] tracking-[-0.02em]',
  'heading/h2': 'font-sans font-semibold text-[28px] leading-[36px] tracking-[-0.01em]',
  'heading/h3': 'font-sans font-bold text-[32px] leading-9',
  'editorial/title': 'font-sans font-bold text-4xl leading-[44px] tracking-[-0.02em]',
  'section/title-italic':
    'font-sans font-light italic text-4xl leading-10 tracking-[-0.02em]',
  'section/title-italic-lg':
    'font-sans font-light italic text-[44px] leading-[52px] tracking-[-0.02em]',
  'featured/title-italic':
    'font-sans font-light italic text-[32px] leading-9 tracking-[-0.02em]',
  'pullquote/text-italic':
    'font-sans font-light italic text-[26px] leading-8 tracking-[-0.01em]',
  'editorial/closing-italic':
    'font-sans font-light italic text-[32px] leading-10 tracking-[-0.01em]',
  'body/lead': 'font-sans text-xl leading-8',
  'body/md': 'font-sans text-[17px] leading-7',
  'body/sm': 'font-sans text-[15px] leading-6',
  'body/meta': 'font-sans text-sm leading-[22px]',
  'label/card': 'font-sans font-medium text-sm leading-5',
  'label/meta': 'font-sans font-medium text-[13px] leading-5 tracking-[0.04em]',
  'label/sm': 'font-sans font-semibold text-xs leading-4 tracking-[0.08em]',
  'label/xs': 'font-sans font-semibold text-[11px] leading-4 tracking-[0.08em]',
  'mono/tag': 'font-mono text-[11px] leading-4 tracking-[0.08em]',
  'mono/tag-bold': 'font-mono font-medium text-[11px] leading-4 tracking-[0.08em]',
  'mono/xs-track': 'font-mono text-[11px] leading-4 tracking-[0.16em]',
  'editorial/section': 'font-sans font-medium text-[13px] leading-[18px] tracking-[0.24em]',
  'editorial/date': 'font-sans font-medium text-[13px] leading-[18px] tracking-[0.04em]',
  'editorial/meta': 'font-mono text-xs leading-[18px] tracking-[0.08em]',
  'display/section-num':
    'font-sans font-medium text-[88px] leading-[88px] tracking-[-0.03em]',
} as const;

// ── Breakpoint contract ─────────────────────────────────────────────────────
// What the design team committed to per breakpoint.

export const RESPONSIVE_CONTRACT = {
  mobile: {
    minWidth: 0,
    maxWidth: 639,
    figmaWidth: 430,
    notes: [
      'Featured title: section/title-italic (36 italic) or featured/title-italic (32).',
      'Article h1: heading/h3 (32px Bold).',
      'Section watermark "01": display/section-num (88px Inter Medium).',
      'Aside (about/sommaire) stacks at top — `position: sticky` removed.',
      'ImageCardStack: horizontal ribbon with overflow (items at negative x).',
      'Chapter list: horizontal row of listItem instances.',
      'Carousel touch target: 44×44 (WCAG 2.5.5 minimum).',
      'Footer: 2 columns — CEST + CONTACT.',
    ],
  },
  tablet: {
    minWidth: 640,
    maxWidth: 1023,
    figmaWidth: 768,
    notes: [
      'Featured title: section/title-italic-lg (44 italic).',
      'Article h1: display/title (44px Bold).',
      'TOC switches to 2 columns.',
      'Do/Dont layout: 2 columns.',
      'ImageCardStack ribbon items: 220×280 / 180×220 / 260×320 (varied).',
      'Carousel touch target: 56×56 (more visible than mobile).',
      'next/cta block at end of article.',
    ],
  },
  desktop: {
    minWidth: 1024,
    figmaWidth: 1512,
    notes: [
      'Article h1: display/part (56) or editorial/hero (84).',
      'Sidebar (149:117) sticky on scroll.',
      'ImageCardStack: vertical scroll.',
      '2-column content/row: ImageCardStack | col/article-aside.',
    ],
  },
} as const;
