import type { Plugin } from 'vite';
export interface BeamPluginOptions {
    /**
     * Glob pattern for action handlers, used to generate the typed-action registry.
     * @default '/app/actions/*.tsx'
     */
    actions?: string;
    /**
     * Legacy virtual:beam compatibility. New applications should import their
     * auth resolver directly in app/beam.ts.
     * @deprecated Configure auth in createBeam() instead.
     */
    auth?: string;
    /**
     * Legacy virtual:beam compatibility. New applications should configure
     * sessions directly in app/beam.ts.
     * @deprecated Configure sessions in createBeam() instead.
     */
    session?: boolean | {
        secretEnvKey?: string;
        cookieName?: string;
        maxAge?: number;
        /** Path to custom storage factory module (must export default SessionStorageFactory) */
        storage?: string;
    };
    /**
     * Glob pattern for React island components (must start with '/').
     * Matching files are compiled with the React JSX runtime (a
     * \/** @jsxImportSource react *\/ pragma is injected). Register the same
     * glob from application code with registerIslands(import.meta.glob(...)).
     * Set false to disable.
     * @default '/app/islands/*.tsx'
     */
    islands?: string | false;
    /**
     * Allow dynamic island (beam-island-src) URL prefixes in the legacy virtual
     * island module. Shared react / react-dom / Beam hook files are emitted for
     * every island-capable client build, whether this option is present or not.
     * New applications can register prefixes directly with allowIslandSources().
     * Add beamIslandImportMap() to your document head.
     * Off by default: remote sources are executable code, so every prefix here
     * is a trust decision.
     */
    islandSources?: string[];
    /**
     * Output path (root-relative, must start with '/') for the generated
     * typed-action registry d.ts. It maps your action modules into Beam's
     * types so action names, params, and ctx.json payloads are inferred in
     * useBeamAction / callBeamAction / window.beam.
     * Defaults to 'beam-actions.d.ts' next to the actions directory
     * (e.g. '/app/beam-actions.d.ts' for '/app/actions/*.tsx').
     * Set false to disable generation.
     */
    actionTypes?: string | false;
}
/**
 * Vite plugin for typed-action generation, React islands, and Beam's
 * development build flags.
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
 */
export declare function beamPlugin(options?: BeamPluginOptions): Plugin;
export default beamPlugin;
//# sourceMappingURL=vite.d.ts.map