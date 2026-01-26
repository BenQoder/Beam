import type { ActionHandler } from './types';
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
export {};
//# sourceMappingURL=collect.d.ts.map