import type { Child } from 'hono/jsx';
export interface IslandProps {
    /** Component name as registered on the client via registerIslands() */
    name: string;
    /**
     * Stable identity (beam-id). Required for server-driven props updates
     * (ctx.island(id, props)) and for preserving React state across swaps.
     */
    id?: string;
    /** Props for the React component — must be JSON-serializable */
    props?: Record<string, unknown>;
    /**
     * Load the component from this URL at runtime instead of the build-time
     * registry (dynamic islands). The URL must match an allowed source prefix
     * registered on the client with allowIslandSources() (or the equivalent
     * meta tag) and point to an ES module whose default export is the component,
     * compiled with react as external.
     */
    src?: string;
    /**
     * Mount strategy: 'eager' (default) mounts immediately, 'visible' mounts
     * when scrolled near the viewport (ideal for product grids), 'idle' mounts
     * when the main thread is free.
     */
    load?: 'eager' | 'visible' | 'idle';
    /**
     * By default islands survive Beam DOM swaps (React state is preserved and
     * fresh props are adopted). Set remount to tear down and remount instead.
     */
    remount?: boolean;
    class?: string;
    /** Placeholder content shown until the React component mounts */
    children?: Child;
}
/**
 * Render a React island mount point.
 *
 * @example
 * <Island name="Chart" id="salesChart" props={{ series }}>
 *   <div class="skeleton" />
 * </Island>
 */
export declare function Island({ name, id, props, src, load, remount, class: className, children }: IslandProps): import("hono/jsx/jsx-dev-runtime").JSX.Element;
/**
 * The bare module specifiers dynamic island modules may import, mapped to the
 * stable shared files the beamPlugin emits. Kept in one place so the import
 * map and the plugin's emitted chunks never drift apart.
 */
export declare const ISLAND_SHARED_MODULES: Record<string, string>;
export interface IslandImportMapOptions {
    /** URL prefix where the shared files are served @default '/static/beam-shared/' */
    base?: string;
    /**
     * Extra import map entries merged in — the per-tenant component registry
     * trick: island modules import shared UI by bare name and the map pins
     * versions, e.g. { '@ui/button': '/islands/ui/button@f3a9.js' }.
     * Extra entries win on conflict; overriding the react specifiers breaks the
     * single-instance guarantee, so only do that if you fully control it.
     */
    extra?: Record<string, string>;
    /** CSP nonce for the inline import-map tag */
    nonce?: string;
}
/**
 * Import map tag for dynamic islands. Emit it in your document <head> (before
 * any module scripts) so remote island modules resolve bare 'react' /
 * '@benqoder/beam/react' imports to the single shared instance the Beam
 * runtime uses. The beamPlugin emits the shared files for every island-capable
 * client build.
 *
 * @example
 * // in your renderer/layout head (hono/jsx):
 * import { raw } from 'hono/html'
 * {raw(beamIslandImportMap())}
 * {raw(beamIslandImportMap({ extra: { '@ui/button': '/islands/ui/button@f3a9.js' } }))}
 */
export declare function beamIslandImportMap(options?: string | IslandImportMapOptions): string;
export interface BeamCspOptions {
    /**
     * Extra origins/sources allowed to load island modules (script-src). Include
     * every host in your islandSources beyond 'self', e.g. a CDN origin.
     */
    islandSources?: string[];
    /** Additional script-src entries (e.g. an analytics host) */
    scriptSrc?: string[];
    /** Additional style-src entries */
    styleSrc?: string[];
    /** Additional connect-src entries (WebSocket/API hosts beyond 'self') */
    connectSrc?: string[];
    /** Additional img-src entries @default ['data:', 'blob:', 'https:'] added */
    imgSrc?: string[];
    /**
     * Beam's reactivity uses new Function for beam-* expression attributes,
     * which needs 'unsafe-eval'; set false if you don't use client-side
     * reactivity.
     * @default true
     */
    allowReactivityEval?: boolean;
    /**
     * Request-specific nonce for trusted inline scripts/import maps.
     */
    scriptNonce?: string;
    /**
     * Compatibility escape hatch for applications that still emit inline
     * scripts without a nonce. This weakens XSS protection and should not be
     * enabled for untrusted content.
     * @default false
     */
    allowUnsafeInlineScripts?: boolean;
}
/**
 * Build a Content-Security-Policy value tuned for Beam apps. A CSP is the
 * strongest blunt-force mitigation for any HTML-injection XSS (an injected
 * beam-* expression attribute can't run scripts it isn't allowed to load).
 *
 * Emit it as a header (preferred) or a <meta http-equiv>. Note: Beam's
 * reactivity evaluates beam-* expressions via new Function, so
 * script-src needs 'unsafe-eval' when reactivity is used — see
 * allowReactivityEval. Islands load ES modules from your islandSources; add
 * any non-'self' origins here.
 *
 * @example
 * // as a Hono header:
 * c.header('Content-Security-Policy', beamCsp({ islandSources: ['https://cdn.example.com'] }))
 */
export declare function beamCsp(options?: BeamCspOptions): string;
//# sourceMappingURL=island.d.ts.map