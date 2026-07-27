import { collectActions, createBeam } from '@benqoder/beam'
import type { Env } from './types'

const actions = collectActions<Env>(
  import.meta.glob('/app/actions/*.tsx', { eager: true })
)

export const beam = createBeam<Env>({
  actions,
  session: {
    secret: '',
    secretEnvKey: 'SESSION_SECRET',
  },
})
