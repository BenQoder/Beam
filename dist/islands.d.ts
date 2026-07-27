import type { ComponentType } from 'react';
export type IslandComponent = ComponentType<any>;
/**
 * Zero-arg loader returning a module (default export) or a component.
 * Typed loosely (Promise<unknown>) so import.meta.glob output assigns
 * directly; the runtime unwraps and validates the default export.
 */
export type IslandLoader = () => Promise<unknown>;
export type IslandRegistration = IslandComponent | IslandLoader;
export declare class BeamIslandReactConfigurationError extends Error {
    name: string;
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
declare function hasSharedReactImportMap(): boolean;
declare function normalizeReactRenderError(error: unknown): unknown;
/**
 * Allow island source URL prefixes for beam-island-src loading.
 * Relative prefixes (e.g. '/islands/') resolve against the current origin.
 * Usually configured via the beamPlugin `islandSources` option or a
 * `<meta name="beam-island-sources" content="/islands/">` tag instead.
 */
export declare function allowIslandSources(prefixes: string[]): void;
export declare const __beamIslandsInternals: {
    setRemoteImporter(fn: (url: string) => Promise<unknown>): void;
    resetDynamicSources(): void;
    setSharedModuleImporter(fn: (specifier: string) => Promise<unknown>): void;
    resetReactRuntimes(): void;
    hasSharedReactImportMap: typeof hasSharedReactImportMap;
    normalizeReactRenderError: typeof normalizeReactRenderError;
};
/**
 * Mark a function as a lazy island loader so it is not mistaken for a
 * function component when registered under a plain name key.
 *
 * @example registerIslands({ Chart: lazyIsland(() => import('./Chart')) })
 */
export declare function lazyIsland(loader: IslandLoader): IslandLoader;
/**
 * Register React island components.
 *
 * Accepts:
 * - `import.meta.glob('/app/islands/*.tsx')` output (path keys → lazy, code-split)
 * - Direct components: `{ Chart, DataGrid }`
 * - Explicit lazy loaders: `{ Chart: lazyIsland(() => import('./Chart')) }`
 *
 * The island name is the file basename for path keys (e.g. '/app/islands/Chart.tsx'
 * → 'Chart') or the key itself otherwise. Safe to call multiple times.
 */
export declare function registerIslands(islands: Record<string, IslandRegistration>): void;
/**
 * Scan a DOM subtree for island markers and mount them.
 * Called automatically on load and after DOM mutations; call manually only
 * for containers the observer cannot see (e.g. detached shadow roots).
 */
export declare function scanIslands(root?: ParentNode): void;
export {};
//# sourceMappingURL=islands.d.ts.map