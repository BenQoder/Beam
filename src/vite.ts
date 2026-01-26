import type { Plugin } from 'vite'

export interface BeamPluginOptions {
  /**
   * Glob pattern for action handlers (must start with '/' for virtual modules)
   * @default '/app/actions/*.tsx'
   */
  actions?: string
  /**
   * Path to auth resolver module (must export default AuthResolver function)
   * @example '/app/auth.ts'
   */
  auth?: string
  /**
   * Session configuration.
   * - `secretEnvKey`: Environment variable name containing the session secret (default: 'SESSION_SECRET')
   * - `cookieName`: Cookie name (default: 'beam_sid')
   * - `maxAge`: Cookie max age in seconds (default: 1 year)
   * - `storage`: Path to custom storage factory module (default: cookie storage)
   *
   * Set to `true` for defaults (cookie storage), or provide partial config.
   * @example
   * ```typescript
   * session: true // uses cookie storage with env.SESSION_SECRET
   * session: { secretEnvKey: 'MY_SECRET', cookieName: 'my_sid' }
   * session: { storage: '/app/session-storage.ts' } // custom KV storage
   * ```
   */
  session?: boolean | {
    secretEnvKey?: string
    cookieName?: string
    maxAge?: number
    /** Path to custom storage factory module (must export default SessionStorageFactory) */
    storage?: string
  }
}

const VIRTUAL_MODULE_ID = 'virtual:beam'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID

/**
 * Vite plugin that auto-generates the beam instance from handler files.
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import { beamPlugin } from '@benqoder/beam/vite'
 *
 * export default defineConfig({
 *   plugins: [
 *     beamPlugin({
 *       actions: '/app/actions/*.tsx',
 *     })
 *   ]
 * })
 * ```
 *
 * Then import the beam instance:
 * ```typescript
 * import { beam } from 'virtual:beam'
 * ```
 */
export function beamPlugin(options: BeamPluginOptions = {}): Plugin {
  const {
    actions = '/app/actions/*.tsx',
    auth,
    session,
  } = options

  return {
    name: 'beam-plugin',

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        const authImport = auth ? `import auth from '${auth}'` : ''
        const authConfig = auth ? ', auth' : ''

        // Generate session config code
        let sessionConfig = ''
        let storageImport = ''
        if (session) {
          const sessionOpts = typeof session === 'object' ? session : {}
          const secretEnvKey = sessionOpts.secretEnvKey || 'SESSION_SECRET'
          const cookieName = sessionOpts.cookieName || 'beam_sid'
          const maxAge = sessionOpts.maxAge || 365 * 24 * 60 * 60
          const storagePath = sessionOpts.storage

          // Import custom storage factory if provided
          if (storagePath) {
            storageImport = `import storageFactory from '${storagePath}'`
          }

          // Session secret is resolved at runtime from env
          sessionConfig = `, session: {
    secret: '', // Will be resolved from env.${secretEnvKey} at runtime
    secretEnvKey: '${secretEnvKey}',
    cookieName: '${cookieName}',
    maxAge: ${maxAge}${storagePath ? ',\n    storageFactory' : ''}
  }`
        }

        // Generate plain JavaScript - TypeScript types are handled via virtual-beam.d.ts
        return `
import { createBeam, collectActions } from '@benqoder/beam'
${authImport}
${storageImport}

const actions = collectActions(import.meta.glob('${actions}', { eager: true }))

export const beam = createBeam({ actions${authConfig}${sessionConfig} })
`
      }
    },
  }
}

export default beamPlugin
