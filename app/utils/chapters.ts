export type ChapterLevel = 'fundamentals' | 'practice' | 'expert'
export type ChapterPart = 1 | 2 | 3

export interface ChapterEntry {
  num: string
  slug: string
  shortTitle: string
  fullTitle: string
  level: ChapterLevel
  part: ChapterPart
}

export const CHAPTER_PARTS: Record<ChapterPart, string> = {
  1: 'Fondations',
  2: 'Pratiques avancées',
  3: 'Collaboration & systèmes',
}

export const CHAPTER_LEVELS: Record<ChapterLevel, { glyph: string; label: string }> = {
  fundamentals: { glyph: '●', label: 'Fondamentaux' },
  practice: { glyph: '◐', label: 'Pratique avancée' },
  expert: { glyph: '○', label: 'Expert' },
}

export const CHAPTERS_MANIFEST: ChapterEntry[] = [
  { num: '01', slug: 'figma-handoff-pour-le-code', shortTitle: 'Préparer une maquette Figma', fullTitle: 'Préparer une maquette Figma pour le code', level: 'fundamentals', part: 1 },
  { num: '02', slug: 'claude-pour-les-designers', shortTitle: 'Claude pour les designers', fullTitle: 'Claude pour les designers — IA dans le workflow Figma', level: 'fundamentals', part: 1 },
  { num: '03', slug: 'variables-figma-design-tokens', shortTitle: 'Variables Figma & design tokens', fullTitle: 'Variables Figma et design tokens — du Figma au code sans friction', level: 'fundamentals', part: 1 },
  { num: '04', slug: 'fichier-figma-claude-ready', shortTitle: 'Anatomie d\'un fichier Claude-ready', fullTitle: 'Anatomie d\'un fichier Figma "Claude-ready" — structure de référence', level: 'fundamentals', part: 1 },
  { num: '05', slug: 'auto-layout-avance', shortTitle: 'Auto Layout avancé', fullTitle: 'Auto Layout avancé — patterns responsive et container queries', level: 'practice', part: 2 },
  { num: '06', slug: 'composants-variants', shortTitle: 'Composants & Variants', fullTitle: 'Composants & Variants — penser API avant de penser pixel', level: 'practice', part: 2 },
  { num: '07', slug: 'etats-micro-interactions', shortTitle: 'États & micro-interactions', fullTitle: 'États, micro-interactions, animations — comment les transmettre', level: 'practice', part: 2 },
  { num: '08', slug: 'annotations-specs', shortTitle: 'Annotations & specs', fullTitle: 'Annotations & specs — documenter ce que l\'œil ne voit pas', level: 'practice', part: 2 },
  { num: '09', slug: 'code-connect', shortTitle: 'Code Connect', fullTitle: 'Code Connect — quand un composant Figma = un composant React', level: 'practice', part: 2 },
  { num: '10', slug: 'stack-web-cote-designer', shortTitle: 'Stack web côté designer', fullTitle: 'Comprendre la stack web côté designer — HTML, CSS, composants, a11y', level: 'expert', part: 3 },
  { num: '11', slug: 'workflow-handoff-moderne', shortTitle: 'Workflow handoff moderne', fullTitle: 'Le workflow handoff moderne — Dev Mode, plugins, MCP', level: 'expert', part: 3 },
  { num: '12', slug: 'travailler-avec-ia-dev', shortTitle: 'Travailler avec une IA dev', fullTitle: 'Travailler avec une IA dev — review, itération, validation', level: 'expert', part: 3 },
  { num: '13', slug: 'design-system-deux-mains', shortTitle: 'Design system à deux mains', fullTitle: 'Construire un design system maintenu à deux mains (design + code)', level: 'expert', part: 3 },
  { num: '14', slug: 'mesurer-qualite-handoff', shortTitle: 'Mesurer la qualité du handoff', fullTitle: 'Mesurer la qualité du handoff — métriques designer/dev', level: 'expert', part: 3 },
]

export function getChapterEntry(slug: string): ChapterEntry | undefined {
  return CHAPTERS_MANIFEST.find((c) => c.slug === slug)
}
