export type ChapterLevel = 'fundamentals' | 'practice' | 'expert' | 'devlog'
export type ChapterPart = 1 | 2 | 3

export interface ChapterEntry {
  num: string
  slug: string
  path: string
  preview: string
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
  devlog: { glyph: '◆', label: 'Devlog' },
}

// Uniquement les articles ecrits : le carrousel n'affiche pas de chapitre a venir.
export const CHAPTERS_MANIFEST: ChapterEntry[] = [
  { num: '01', slug: '01-figma-handoff-pour-le-code', path: '/blog/01-figma-handoff-pour-le-code', preview: '/previews/01-figma-handoff-pour-le-code.webp', shortTitle: 'Préparer une maquette Figma', fullTitle: 'Préparer une maquette Figma pour le code', level: 'fundamentals', part: 1 },
  { num: '02', slug: '02-claude-pour-les-designers', path: '/blog/02-claude-pour-les-designers', preview: '/previews/02-claude-pour-les-designers.webp', shortTitle: 'Claude pour les designers', fullTitle: 'Claude pour les designers — IA dans le workflow Figma', level: 'fundamentals', part: 1 },
  { num: '03', slug: '01-image-maths-camera', path: '/devlog/01-image-maths-camera', preview: '/previews/01-image-maths-camera.webp', shortTitle: 'R3D · Image, vecteurs, caméra', fullTitle: 'Une image, des vecteurs, une caméra.', level: 'devlog', part: 1 },
  { num: '04', slug: '02-spheres-materiaux', path: '/devlog/02-spheres-materiaux', preview: '/previews/02-spheres-materiaux.webp', shortTitle: 'R3D · Sphères et matériaux', fullTitle: 'Des sphères, de la lumière, des matériaux.', level: 'devlog', part: 1 },
  { num: '05', slug: '03-triangles-obj-performance', path: '/devlog/03-triangles-obj-performance', preview: '/previews/03-triangles-obj-performance.webp', shortTitle: 'R3D · Triangles, OBJ, vitesse', fullTitle: 'Des triangles, un fichier OBJ, et de la vitesse.', level: 'devlog', part: 1 },
]

export function getChapterEntry(slug: string): ChapterEntry | undefined {
  return CHAPTERS_MANIFEST.find((c) => c.slug === slug)
}
