export interface Keyframe {
  t: number
  v: number
  e?: string
  cp?: [number, number, number, number]
}

export type Track = Keyframe[]

export interface TrailState {
  duration: number
  loop?: boolean
  markers?: Record<string, number>
  objects: Record<string, Record<string, Track>>
}

export interface Tickable {
  update(time: number, dt: number): void
}

export interface MarkerOpts {
  duration?: number
  ease?: string
  instant?: boolean
}

// Options de position/durée pour la déclaration façon GSAP (to/from/fromTo/set).
export interface TweenOpts {
  at?: number
  duration?: number
  ease?: string
}

// Handle rendu par subscribe() : l'objet lit ses props et applique ses animations (pull ou push).
export interface TrailObjectApi {
  readonly id: string
  get(): Readonly<Record<string, number>>
  value(prop: string): number
  onApply(cb: (values: Readonly<Record<string, number>>) => void): () => void
  release(): void
}
