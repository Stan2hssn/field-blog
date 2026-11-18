import type { ConfigGroup } from '@sonde/core'
import saved from './devlog-meadow.values.json'

/**
 * Reglages de l'ilot du devlog. Le schema alimente l'onglet Config de la sonde ;
 * « Enregistrer » ecrit les ecarts aux defauts dans `devlog-meadow.values.json`
 * (route `meadow` de nuxt.config), relu ici : la production sert donc les
 * valeurs reglees, sans la sonde.
 */
export interface MeadowParams {
  islandScale: number
  grassRadius: number
  tuftCount: number
  grassHeight: number
  grassWidth: number
  heightVariance: number
  tallChance: number
  tallBoost: number
  radialStart: number
  radialPower: number
  centerHeight: number
  edgeHeight: number
  centerWidth: number
  edgeWidth: number
  redAmount: number
  paleAmount: number
  wind: number
  speckDensity: number
  speckSize: number
  sphereScale: number
  mainSphere: number
  metalSphere: number
  smallSpheres: number
  sphereSink: number
  clayBump: number
  clayScale: number
  metalRoughness: number
  glassRefraction: number
  glassDispersion: number
  pointerRadius: number
  pointerStrength: number
  pointerSoftness: number
}

export const MEADOW_CONFIG_ID = 'island'
export const MEADOW_WRITE_ROUTE = 'meadow'

export const MEADOW_DEFAULTS: MeadowParams = {
  islandScale: 1,
  grassRadius: 1,
  tuftCount: 5400,
  grassHeight: 1,
  grassWidth: 1,
  heightVariance: 0.22,
  tallChance: 0.12,
  tallBoost: 0.35,
  radialStart: 0.75,
  radialPower: 1,
  centerHeight: 1,
  edgeHeight: 0.45,
  centerWidth: 1,
  edgeWidth: 1,
  redAmount: 0.55,
  paleAmount: 0.45,
  wind: 1,
  speckDensity: 0.055,
  speckSize: 1,
  sphereScale: 1,
  mainSphere: 1,
  metalSphere: 1,
  smallSpheres: 1,
  sphereSink: 0.85,
  clayBump: 0.6,
  clayScale: 3.2,
  metalRoughness: 0.06,
  glassRefraction: 0.3,
  glassDispersion: 0.5,
  pointerRadius: 1.5,
  pointerStrength: 1,
  pointerSoftness: 0.35,
}

/** Ces cles changent la repartition : les modifier re-seme les touffes. */
export const MEADOW_SCATTER_KEYS: readonly (keyof MeadowParams)[] = [
  'grassRadius', 'tuftCount', 'heightVariance', 'tallChance', 'tallBoost', 'radialStart', 'radialPower', 'centerHeight', 'edgeHeight', 'centerWidth', 'edgeWidth',
  'redAmount', 'paleAmount', 'speckDensity', 'sphereScale', 'mainSphere', 'metalSphere', 'smallSpheres',
]

export const MEADOW_SCHEMA: ConfigGroup[] = [
  {
    id: 'island',
    label: 'Îlot',
    fields: [
      { kind: 'number', key: 'islandScale', label: 'Échelle globale', min: 0.3, max: 2.5, step: 0.01 },
      { kind: 'number', key: 'grassRadius', label: 'Rayon de l\'herbe', min: 0.4, max: 1.6, step: 0.01 },
    ],
  },
  {
    id: 'grass',
    label: 'Herbe',
    fields: [
      { kind: 'number', key: 'tuftCount', label: 'Nombre de touffes', min: 300, max: 16000, step: 50, hint: 'Divisé par 3 sous 768 px.' },
      { kind: 'number', key: 'grassHeight', label: 'Hauteur', min: 0.1, max: 4, step: 0.01 },
      { kind: 'number', key: 'grassWidth', label: 'Largeur', min: 0.1, max: 4, step: 0.01 },
      { kind: 'number', key: 'heightVariance', label: 'Variation de hauteur', min: 0, max: 1.5, step: 0.01 },
      { kind: 'number', key: 'tallChance', label: 'Part de grandes touffes', min: 0, max: 1, step: 0.01 },
      { kind: 'number', key: 'tallBoost', label: 'Surplus des grandes', min: 0, max: 2, step: 0.01 },
      { kind: 'number', key: 'redAmount', label: 'Plaques rouges', min: 0, max: 1, step: 0.01 },
      { kind: 'number', key: 'paleAmount', label: 'Plaques paille', min: 0, max: 1, step: 0.01 },
      { kind: 'number', key: 'wind', label: 'Vent', min: 0, max: 4, step: 0.01 },
    ],
  },
  {
    id: 'radial',
    label: 'Échelle du centre au bord',
    fields: [
      { kind: 'number', key: 'centerHeight', label: 'Hauteur au centre', min: 0, max: 3, step: 0.01 },
      { kind: 'number', key: 'edgeHeight', label: 'Hauteur au bord', min: 0, max: 3, step: 0.01 },
      { kind: 'number', key: 'centerWidth', label: 'Largeur au centre', min: 0.1, max: 3, step: 0.01 },
      { kind: 'number', key: 'edgeWidth', label: 'Largeur au bord', min: 0.1, max: 3, step: 0.01 },
      { kind: 'number', key: 'radialStart', label: 'Début du dégradé', min: 0, max: 1, step: 0.01, hint: 'Fraction du rayon : avant, l\'échelle du centre ; ensuite, glissement vers le bord.' },
      { kind: 'number', key: 'radialPower', label: 'Courbe', min: 0.2, max: 5, step: 0.01, hint: '1 = régulier, plus grand = le bord ne change qu\'au dernier moment.' },
    ],
  },
  {
    id: 'specks',
    label: 'Fleurs blanches',
    fields: [
      { kind: 'number', key: 'speckDensity', label: 'Densité', min: 0, max: 0.5, step: 0.005, hint: 'Part des touffes qui portent une fleur.' },
      { kind: 'number', key: 'speckSize', label: 'Taille', min: 0.1, max: 5, step: 0.01 },
    ],
  },
  {
    id: 'spheres',
    label: 'Sphères',
    fields: [
      { kind: 'number', key: 'sphereScale', label: 'Échelle de toutes', min: 0.1, max: 3, step: 0.01 },
      { kind: 'number', key: 'mainSphere', label: 'Grande orange', min: 0.1, max: 3, step: 0.01 },
      { kind: 'number', key: 'metalSphere', label: 'Métal', min: 0.1, max: 3, step: 0.01 },
      { kind: 'number', key: 'smallSpheres', label: 'Petites', min: 0.1, max: 3, step: 0.01 },
      { kind: 'number', key: 'sphereSink', label: 'Hauteur de pose', min: 0, max: 1.5, step: 0.01, hint: 'En rayons : 1 = posée sur le sol, moins = enfoncée.' },
    ],
  },
  {
    id: 'materials',
    label: 'Matières',
    fields: [
      { kind: 'number', key: 'clayBump', label: 'Relief de l\'argile', min: 0, max: 1.5, step: 0.01 },
      { kind: 'number', key: 'clayScale', label: 'Grain de l\'argile', min: 0.5, max: 12, step: 0.1 },
      { kind: 'number', key: 'metalRoughness', label: 'Rugosité du métal', min: 0, max: 0.6, step: 0.01 },
      { kind: 'number', key: 'glassRefraction', label: 'Réfraction du verre', min: 0, max: 1.2, step: 0.01 },
      { kind: 'number', key: 'glassDispersion', label: 'Dispersion du verre', min: 0, max: 2, step: 0.01, hint: 'Écart entre rouge, vert et bleu : l\'arc-en-ciel sur les bords.' },
    ],
  },
  {
    id: 'pointer',
    label: 'Souris',
    fields: [
      { kind: 'number', key: 'pointerRadius', label: 'Rayon', min: 0.2, max: 3, step: 0.01 },
      { kind: 'number', key: 'pointerStrength', label: 'Force', min: 0, max: 3, step: 0.01 },
      { kind: 'number', key: 'pointerSoftness', label: 'Douceur', min: 0.02, max: 1.5, step: 0.01, hint: 'Temps en secondes que met l\'herbe à suivre le vent : plus haut, plus enveloppant.' },
    ],
  },
]

export function meadowParams(): MeadowParams {
  const overrides = (saved as Record<string, Partial<MeadowParams>>)[MEADOW_CONFIG_ID] ?? {}
  return { ...MEADOW_DEFAULTS, ...overrides }
}
