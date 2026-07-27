/// <reference types="vite/client" />

import type { BeamContext } from '@benqoder/beam'
import type { Env } from './types'

declare module 'hono' {
  interface ContextVariableMap {
    beam: BeamContext<Env>
    beamAuthToken: string
    rpcTraceId: string
  }
}
