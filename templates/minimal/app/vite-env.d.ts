/// <reference types="@benqoder/beam/virtual" />

import type { BeamContext } from '@benqoder/beam'
import type { Env } from './types'

declare module 'hono' {
  interface ContextVariableMap {
    beam: BeamContext<Env>
    beamAuthToken: string
  }
}
