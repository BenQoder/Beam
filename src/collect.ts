import type { ActionHandler, ModalHandler, DrawerHandler } from './types'

/**
 * Type for glob import results from import.meta.glob
 */
type GlobImport = Record<string, Record<string, unknown>>

/**
 * Collects action handlers from glob imports.
 *
 * @example
 * ```typescript
 * const actions = collectActions<Env>(
 *   import.meta.glob('./actions/*.tsx', { eager: true })
 * )
 * ```
 *
 * Each file can export multiple named functions that become actions:
 * - `./actions/demo.tsx` exports `increment`, `decrement` → `increment`, `decrement`
 * - `./actions/cart.tsx` exports `addToCart` → `addToCart`
 */
export function collectActions<TEnv = object>(
  glob: GlobImport
): Record<string, ActionHandler<TEnv>> {
  const handlers: Record<string, ActionHandler<TEnv>> = {}

  for (const [, module] of Object.entries(glob)) {
    for (const [exportName, exportValue] of Object.entries(module)) {
      // Skip non-function exports and default exports
      if (typeof exportValue === 'function' && exportName !== 'default') {
        handlers[exportName] = exportValue as ActionHandler<TEnv>
      }
    }
  }

  return handlers
}

/**
 * Collects modal handlers from glob imports.
 *
 * @example
 * ```typescript
 * const modals = collectModals<Env>(
 *   import.meta.glob('./modals/*.tsx', { eager: true })
 * )
 * ```
 */
export function collectModals<TEnv = object>(
  glob: GlobImport
): Record<string, ModalHandler<TEnv>> {
  const handlers: Record<string, ModalHandler<TEnv>> = {}

  for (const [, module] of Object.entries(glob)) {
    for (const [exportName, exportValue] of Object.entries(module)) {
      if (typeof exportValue === 'function' && exportName !== 'default') {
        handlers[exportName] = exportValue as ModalHandler<TEnv>
      }
    }
  }

  return handlers
}

/**
 * Collects drawer handlers from glob imports.
 *
 * @example
 * ```typescript
 * const drawers = collectDrawers<Env>(
 *   import.meta.glob('./drawers/*.tsx', { eager: true })
 * )
 * ```
 */
export function collectDrawers<TEnv = object>(
  glob: GlobImport
): Record<string, DrawerHandler<TEnv>> {
  const handlers: Record<string, DrawerHandler<TEnv>> = {}

  for (const [, module] of Object.entries(glob)) {
    for (const [exportName, exportValue] of Object.entries(module)) {
      if (typeof exportValue === 'function' && exportName !== 'default') {
        handlers[exportName] = exportValue as DrawerHandler<TEnv>
      }
    }
  }

  return handlers
}

/**
 * Collects all handlers (actions, modals, drawers) from glob imports.
 * This is a convenience function that collects all three at once.
 *
 * @example
 * ```typescript
 * const { actions, modals, drawers } = collectHandlers<Env>({
 *   actions: import.meta.glob('./actions/*.tsx', { eager: true }),
 *   modals: import.meta.glob('./modals/*.tsx', { eager: true }),
 *   drawers: import.meta.glob('./drawers/*.tsx', { eager: true }),
 * })
 *
 * export const beam = createBeam<Env>({ actions, modals, drawers })
 * ```
 */
export function collectHandlers<TEnv = object>(globs: {
  actions?: GlobImport
  modals?: GlobImport
  drawers?: GlobImport
}): {
  actions: Record<string, ActionHandler<TEnv>>
  modals: Record<string, ModalHandler<TEnv>>
  drawers: Record<string, DrawerHandler<TEnv>>
} {
  return {
    actions: globs.actions ? collectActions<TEnv>(globs.actions) : {},
    modals: globs.modals ? collectModals<TEnv>(globs.modals) : {},
    drawers: globs.drawers ? collectDrawers<TEnv>(globs.drawers) : {},
  }
}
