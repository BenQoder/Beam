import type { Plugin } from 'vite';
export interface BeamPluginOptions {
    /**
     * Glob pattern for action handlers (must start with '/' for virtual modules)
     * @default '/app/actions/*.tsx'
     */
    actions?: string;
    /**
     * Glob pattern for modal handlers (must start with '/' for virtual modules)
     * @default '/app/modals/*.tsx'
     */
    modals?: string;
    /**
     * Glob pattern for drawer handlers (must start with '/' for virtual modules)
     * @default '/app/drawers/*.tsx'
     */
    drawers?: string;
}
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
export declare function beamPlugin(options?: BeamPluginOptions): Plugin;
export default beamPlugin;
//# sourceMappingURL=vite.d.ts.map