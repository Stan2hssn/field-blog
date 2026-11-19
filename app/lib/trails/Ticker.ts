// Driver RAF minimal pour les contextes standalone (CSS/DOM) sans boucle existante.
// time: secondes écoulées depuis start(). dt: delta en secondes, capé à 50ms.
export class Ticker {
  private rafId = 0
  private running = false
  private startTime = 0
  private lastTime = 0

  constructor(private readonly cb: (time: number, dt: number) => void) {}

  start(): void {
    if (this.running) return
    this.running = true
    this.startTime = performance.now()
    this.lastTime = this.startTime
    this.rafId = requestAnimationFrame(this.loop)
  }

  stop(): void {
    this.running = false
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = 0
  }

  private readonly loop = () => {
    if (!this.running) return
    const now = performance.now()
    const dt = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now
    const time = (now - this.startTime) / 1000
    this.cb(time, dt)
    this.rafId = requestAnimationFrame(this.loop)
  }
}
