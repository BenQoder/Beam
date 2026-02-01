import type { IslandProps, IslandComponent } from './types';
/**
 * Register an island component with a name
 * @param name - The name of the island component (used in beam-island attribute)
 * @param component - The component function
 */
export declare function registerIsland(name: string, component: IslandComponent): void;
/**
 * Define an island component (returns the component for server-side use)
 * This is the main API for creating island components
 * @param name - The name of the island component
 * @param component - The component function
 * @returns The component function (for tree-shaking)
 */
export declare function defineIsland<TProps extends IslandProps = IslandProps>(name: string, component: IslandComponent<TProps>): IslandComponent<TProps>;
/**
 * Scan the document for island elements and hydrate them
 * @param root - The root element to scan (defaults to document)
 */
export declare function hydrateIslands(root?: Document | Element): void;
/**
 * Get the island registry (for debugging)
 */
export declare function getIslandRegistry(): Map<string, IslandComponent>;
export { hydrateIslands as scanIslands };
//# sourceMappingURL=islands.d.ts.map