import type { Plugin } from 'vite'

export interface BeamPluginOptions {
  /**
   * Glob pattern for action handlers (must start with '/' for virtual modules)
   * @default '/app/actions/*.tsx'
   */
  actions?: string
  /**
   * Glob pattern for modal handlers (must start with '/' for virtual modules)
   * @default '/app/modals/*.tsx'
   */
  modals?: string
  /**
   * Glob pattern for drawer handlers (must start with '/' for virtual modules)
   * @default '/app/drawers/*.tsx'
   */
  drawers?: string
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
 *       modals: '/app/modals/*.tsx',
 *       drawers: '/app/drawers/*.tsx',
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
    modals = '/app/modals/*.tsx',
    drawers = '/app/drawers/*.tsx',
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
        // Generate plain JavaScript - TypeScript types are handled via virtual-beam.d.ts
        return `
import { createBeam, collectHandlers } from '@benqoder/beam'

const { actions, modals, drawers } = collectHandlers({
  actions: import.meta.glob('${actions}', { eager: true }),
  modals: import.meta.glob('${modals}', { eager: true }),
  drawers: import.meta.glob('${drawers}', { eager: true }),
})

export const beam = createBeam({ actions, modals, drawers })
`
      }
    },
  }
}

export default beamPlugin
