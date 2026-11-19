import type { TrailObjectApi } from './Trails.interface'

// Dépendance minimale (pas de couplage à Theatre directement -> pas de cycle).
interface TheatreLike {
  get(id: string): Readonly<Record<string, number>>
  tick(cb: () => void): () => void
}

// Le wrapper d'un objet abonné : lecture pull (get/value) ou push (onApply chaque frame).
// L'application des valeurs (possiblement complexe) est faite par le consumer, en TS.
export class TrailObject implements TrailObjectApi {
  private readonly unsubs = new Set<() => void>()

  constructor(
    private readonly theatre: TheatreLike,
    readonly id: string,
  ) {}

  get(): Readonly<Record<string, number>> {
    return this.theatre.get(this.id)
  }

  value(prop: string): number {
    const v = this.theatre.get(this.id)[prop]
    return v ?? Number.NaN
  }

  onApply(cb: (values: Readonly<Record<string, number>>) => void): () => void {
    const un = this.theatre.tick(() => cb(this.theatre.get(this.id)))
    this.unsubs.add(un)
    return () => {
      un()
      this.unsubs.delete(un)
    }
  }

  release(): void {
    for (const un of this.unsubs) un()
    this.unsubs.clear()
  }
}
