import { collectActions, createBeam } from '@benqoder/beam'
import auth from './auth'
import storageFactory from './session-storage'
import type { Env } from './types'

const actions = collectActions<Env>(
  import.meta.glob('/app/actions/*.tsx', { eager: true })
)

export const beam = createBeam<Env>({
  actions,
  auth,
  session: {
    secret: '',
    secretEnvKey: 'SESSION_SECRET',
    storageFactory,
  },
})
