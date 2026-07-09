// Server-side helper that renders a React island placeholder.
// The actual React component mounts on the client via '@benqoder/beam/react'.

import type { Child } from 'hono/jsx'

export interface IslandProps {
  /** Component name as registered on the client via registerIslands() */
  name: string
  /**
   * Stable identity (beam-id). Required for server-driven props updates
   * (ctx.island(id, props)) and for preserving React state across swaps.
   */
  id?: string
  /** Props for the React component — must be JSON-serializable */
  props?: Record<string, unknown>
  /**
   * Load the component from this URL at runtime instead of the build-time
   * registry (dynamic islands). The URL must match an allowed source prefix
   * on the client (beamPlugin islandSources option) and point to an ES module
   * whose default export is the component, compiled with react as external.
   */
  src?: string
  /**
   * Mount strategy: 'eager' (default) mounts immediately, 'visible' mounts
   * when scrolled near the viewport (ideal for product grids), 'idle' mounts
   * when the main thread is free.
   */
  load?: 'eager' | 'visible' | 'idle'
  /**
   * By default islands survive Beam DOM swaps (React state is preserved and
   * fresh props are adopted). Set remount to tear down and remount instead.
   */
  remount?: boolean
  class?: string
  /** Placeholder content shown until the React component mounts */
  children?: Child
}

/**
 * Render a React island mount point.
 *
 * @example
 * <Island name="Chart" id="salesChart" props={{ series }}>
 *   <div class="skeleton" />
 * </Island>
 */
export function Island({ name, id, props, src, load, remount, class: className, children }: IslandProps) {
  return (
    <div
      beam-island={name}
      {...(id ? { 'beam-id': id } : {})}
      beam-props={JSON.stringify(props ?? {})}
      {...(src ? { 'beam-island-src': src } : {})}
      {...(load && load !== 'eager' ? { 'beam-island-load': load } : {})}
      {...(remount ? { 'beam-island-remount': '' } : {})}
      {...(className ? { class: className } : {})}
    >
      {children}
    </div>
  )
}

/**
 * The bare module specifiers dynamic island modules may import, mapped to the
 * stable shared files the beamPlugin emits. Kept in one place so the import
 * map and the plugin's emitted chunks never drift apart.
 */
export const ISLAND_SHARED_MODULES: Record<string, string> = {
  react: 'react.js',
  'react/jsx-runtime': 'react-jsx-runtime.js',
  'react-dom/client': 'react-dom-client.js',
  '@benqoder/beam/react': 'beam-react.js',
}

export interface IslandImportMapOptions {
  /** URL prefix where the shared files are served @default '/static/beam-shared/' */
  base?: string
  /**
   * Extra import map entries merged in — the per-tenant component registry
   * trick: island modules import shared UI by bare name and the map pins
   * versions, e.g. { '@ui/button': '/islands/ui/button@f3a9.js' }.
   * Extra entries win on conflict; overriding the react specifiers breaks the
   * single-instance guarantee, so only do that if you fully control it.
   */
  extra?: Record<string, string>
}

/**
 * Import map tag for dynamic islands. Emit it in your document <head> (before
 * any module scripts) so remote island modules resolve bare 'react' /
 * '@benqoder/beam/react' imports to the single shared instance the Beam
 * runtime uses. The beamPlugin emits the shared files when `islandSources`
 * is configured.
 *
 * @example
 * // in your renderer/layout head (hono/jsx):
 * import { raw } from 'hono/html'
 * {raw(beamIslandImportMap())}
 * {raw(beamIslandImportMap({ extra: { '@ui/button': '/islands/ui/button@f3a9.js' } }))}
 */
export function beamIslandImportMap(options: string | IslandImportMapOptions = {}): string {
  // string form kept for back-compat: beamIslandImportMap('/assets/shared/')
  const { base = '/static/beam-shared/', extra } =
    typeof options === 'string' ? { base: options, extra: undefined } : options
  const imports: Record<string, string> = {}
  for (const [specifier, file] of Object.entries(ISLAND_SHARED_MODULES)) {
    imports[specifier] = `${base}${file}`
  }
  Object.assign(imports, extra)
  return `<script type="importmap">${JSON.stringify({ imports })}</script>`
}

export interface BeamCspOptions {
  /**
   * Extra origins/sources allowed to load island modules (script-src). Include
   * every host in your islandSources beyond 'self', e.g. a CDN origin.
   */
  islandSources?: string[]
  /** Additional script-src entries (e.g. an analytics host) */
  scriptSrc?: string[]
  /** Additional style-src entries */
  styleSrc?: string[]
  /** Additional connect-src entries (WebSocket/API hosts beyond 'self') */
  connectSrc?: string[]
  /** Additional img-src entries @default ['data:', 'blob:', 'https:'] added */
  imgSrc?: string[]
  /**
   * Allow inline event handlers / expressions. Beam's reactivity uses
   * new Function for beam-* expression attributes, which needs
   * 'unsafe-eval'; set false only if you don't use client-side reactivity.
   * @default true
   */
  allowReactivityEval?: boolean
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
export function beamCsp(options: BeamCspOptions = {}): string {
  const self = "'self'"
  const scriptSrc = [self, ...(options.islandSources ?? []), ...(options.scriptSrc ?? [])]
  if (options.allowReactivityEval !== false) scriptSrc.push("'unsafe-eval'")

  const directives: Record<string, string[]> = {
    'default-src': [self],
    // Islands emit an import map and inline module bootstrap; inline styles are
    // common in server-rendered pages.
    'script-src': [...scriptSrc, "'unsafe-inline'"],
    'style-src': [self, "'unsafe-inline'", ...(options.styleSrc ?? [])],
    'img-src': [self, 'data:', 'blob:', 'https:', ...(options.imgSrc ?? [])],
    // WebSocket RPC: same-origin ws/wss.
    'connect-src': [self, ...(options.connectSrc ?? [])],
    'object-src': ["'none'"],
    'base-uri': [self],
    'frame-ancestors': [self],
  }

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${Array.from(new Set(values)).join(' ')}`)
    .join('; ')
}
