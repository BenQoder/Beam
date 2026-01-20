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
export function collectActions(glob) {
    const handlers = {};
    for (const [, module] of Object.entries(glob)) {
        for (const [exportName, exportValue] of Object.entries(module)) {
            // Skip non-function exports and default exports
            if (typeof exportValue === 'function' && exportName !== 'default') {
                handlers[exportName] = exportValue;
            }
        }
    }
    return handlers;
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
export function collectModals(glob) {
    const handlers = {};
    for (const [, module] of Object.entries(glob)) {
        for (const [exportName, exportValue] of Object.entries(module)) {
            if (typeof exportValue === 'function' && exportName !== 'default') {
                handlers[exportName] = exportValue;
            }
        }
    }
    return handlers;
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
export function collectDrawers(glob) {
    const handlers = {};
    for (const [, module] of Object.entries(glob)) {
        for (const [exportName, exportValue] of Object.entries(module)) {
            if (typeof exportValue === 'function' && exportName !== 'default') {
                handlers[exportName] = exportValue;
            }
        }
    }
    return handlers;
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
export function collectHandlers(globs) {
    return {
        actions: globs.actions ? collectActions(globs.actions) : {},
        modals: globs.modals ? collectModals(globs.modals) : {},
        drawers: globs.drawers ? collectDrawers(globs.drawers) : {},
    };
}
