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
