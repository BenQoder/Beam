import type { Plugin } from 'vite';
export interface BeamPluginOptions {
    /**
     * Glob pattern for action handlers (must start with '/' for virtual modules)
     * @default '/app/actions/*.tsx'
     */
    actions?: string;
    /**
     * Glob pattern for island components (must start with '/' for virtual modules)
     * @default '/app/islands/*.tsx'
     * @example '/app/islands/\*\*\/*.tsx'
     */
    islands?: string;
    /**
     * Path to auth resolver module (must export default AuthResolver function)
     * @example '/app/auth.ts'
     */
    auth?: string;
    /**
     * Session configuration.
     * - `secretEnvKey`: Environment variable name containing the session secret (default: 'SESSION_SECRET')
     * - `cookieName`: Cookie name (default: 'beam_sid')
     * - `maxAge`: Cookie max age in seconds (default: 1 year)
     * - `storage`: Path to custom storage factory module (default: cookie storage)
     *
     * Set to `true` for defaults (cookie storage), or provide partial config.
     * @example
     * ```typescript
     * session: true // uses cookie storage with env.SESSION_SECRET
     * session: { secretEnvKey: 'MY_SECRET', cookieName: 'my_sid' }
     * session: { storage: '/app/session-storage.ts' } // custom KV storage
     * ```
     */
    session?: boolean | {
        secretEnvKey?: string;
        cookieName?: string;
        maxAge?: number;
        /** Path to custom storage factory module (must export default SessionStorageFactory) */
        storage?: string;
    };
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
 *       islands: '/app/islands/*.tsx',
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