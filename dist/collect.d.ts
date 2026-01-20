import type { ActionHandler, ModalHandler, DrawerHandler } from './types';
/**
 * Type for glob import results from import.meta.glob
 */
type GlobImport = Record<string, Record<string, unknown>>;
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
export declare function collectActions<TEnv = object>(glob: GlobImport): Record<string, ActionHandler<TEnv>>;
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
export declare function collectModals<TEnv = object>(glob: GlobImport): Record<string, ModalHandler<TEnv>>;
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
export declare function collectDrawers<TEnv = object>(glob: GlobImport): Record<string, DrawerHandler<TEnv>>;
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
export declare function collectHandlers<TEnv = object>(globs: {
    actions?: GlobImport;
    modals?: GlobImport;
    drawers?: GlobImport;
}): {
    actions: Record<string, ActionHandler<TEnv>>;
    modals: Record<string, ModalHandler<TEnv>>;
    drawers: Record<string, DrawerHandler<TEnv>>;
};
export {};
//# sourceMappingURL=collect.d.ts.map