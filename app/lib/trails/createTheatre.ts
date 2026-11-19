import type { Theatre } from './Theatre'
import { timeline } from './timeline'

export interface CreateTheatreOpts {
  baseUrl?: string
}

// Charge un theatre depuis son JSON (<baseUrl>/<id>.json). Lenient : si absent, theatre vide.
export function createTheatre(id: string, opts: CreateTheatreOpts = {}): Promise<Theatre> {
  return timeline(id).load(opts.baseUrl)
}
