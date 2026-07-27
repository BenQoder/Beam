// ============ BEAM REACT ISLANDS RUNTIME ============
// Client-entry runtime that mounts pure React components into
// `<div beam-island="Name" beam-props='{"a":1}'>` placeholders rendered by the
// server (see the <Island> helper in '@benqoder/beam').
//
// React and react-dom are imported DYNAMICALLY on first mount, so pages
// without islands never download React. Island components themselves are
// lazily loaded (code-split) when registered via glob keys or lazyIsland().
//
// '@benqoder/beam/client' includes this mount runtime automatically. Import this
// entry directly only for registry/configuration helpers:
//   import { registerIslands } from '@benqoder/beam/islands'
//   registerIslands(import.meta.glob('/app/islands/*.tsx'))
//
// React components use the hooks from '@benqoder/beam/react' instead — that
// module stays inside the lazy island chunks.

import type { ComponentType } from 'react'

export type IslandComponent = ComponentType<any>

/**
 * Zero-arg loader returning a module (default export) or a component.
 * Typed loosely (Promise<unknown>) so import.meta.glob output assigns
 * directly; the runtime unwraps and validates the default export.
 */
export type IslandLoader = () => Promise<unknown>

export type IslandRegistration = IslandComponent | IslandLoader

// Minimal structural types so this module never statically pulls react-dom
interface IslandRoot {
  render(node: unknown): void
  unmount(): void
}

interface ReactRuntime {
  createElement(type: unknown, props: Record<string, unknown> | null, ...children: unknown[]): unknown
  createRoot(container: Element): IslandRoot
  Component: unknown
  useState: unknown
}

type ReactRuntimeKind = 'bundled' | 'shared'

let bundledReactRuntimePromise: Promise<ReactRuntime> | null = null
let sharedReactRuntimePromise: Promise<ReactRuntime> | null = null

// A variable specifier deliberately survives Vite/Rollup/esbuild. The browser
// then resolves it through the page import map, guaranteeing that a remote
// island and its renderer receive the same React instance.
let sharedModuleImporter: (specifier: string) => Promise<unknown> = (specifier) =>
  import(/* @vite-ignore */ specifier)

export class BeamIslandReactConfigurationError extends Error {
  override name = 'BeamIslandReactConfigurationError'

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
  }
}

function hasSharedReactImportMap(): boolean {
  if (typeof document === 'undefined') return false

  const mapped = new Set<string>()
  for (const node of document.querySelectorAll('script[type="importmap"]')) {
    try {
      const parsed = JSON.parse(node.textContent || '{}') as {
        imports?: Record<string, unknown>
      }
      for (const specifier of ['react', 'react-dom/client', 'react/jsx-runtime']) {
        if (typeof parsed.imports?.[specifier] === 'string') mapped.add(specifier)
      }
    } catch {
      // The browser reports malformed import maps separately.
    }
  }
  return mapped.size === 3
}

function createReactRuntime(
  reactModule: unknown,
  reactDomClientModule: unknown,
  kind: ReactRuntimeKind
): ReactRuntime {
  const reactNamespace = reactModule as Record<string, unknown>
  const react =
    reactNamespace.default &&
    typeof (reactNamespace.default as Record<string, unknown>).createElement === 'function'
      ? reactNamespace.default as Record<string, unknown>
      : reactNamespace
  const domNamespace = reactDomClientModule as Record<string, unknown>
  const reactDomClient =
    domNamespace.default &&
    typeof (domNamespace.default as Record<string, unknown>).createRoot === 'function'
      ? domNamespace.default as Record<string, unknown>
      : domNamespace

  if (
    typeof react.createElement !== 'function' ||
    typeof react.Component !== 'function' ||
    typeof react.useState !== 'function' ||
    typeof reactDomClient.createRoot !== 'function'
  ) {
    throw new BeamIslandReactConfigurationError(
      `[beam] ${kind === 'shared' ? 'Import-map' : 'bundled'} React runtime is incomplete. ` +
      'Expected compatible react, react/jsx-runtime, and react-dom/client modules.'
    )
  }

  return {
    createElement: react.createElement as ReactRuntime['createElement'],
    createRoot: reactDomClient.createRoot as ReactRuntime['createRoot'],
    Component: react.Component,
    useState: react.useState,
  }
}

function loadReactRuntime(kind: ReactRuntimeKind): Promise<ReactRuntime> {
  if (kind === 'shared') {
    if (!sharedReactRuntimePromise) {
      sharedReactRuntimePromise = Promise.all([
        sharedModuleImporter('react'),
        sharedModuleImporter('react-dom/client'),
      ])
        .then(([react, reactDomClient]) => createReactRuntime(react, reactDomClient, kind))
        .catch((cause) => {
          throw cause instanceof BeamIslandReactConfigurationError
            ? cause
            : new BeamIslandReactConfigurationError(
                '[beam] Remote React island could not load the shared React runtime. ' +
                'Emit beamIslandImportMap() before module scripts and serve the Beam shared ESM files.',
                { cause }
              )
        })
    }
    return sharedReactRuntimePromise
  }

  if (!bundledReactRuntimePromise) {
    bundledReactRuntimePromise = Promise.all([import('react'), import('react-dom/client')])
      .then(([react, reactDomClient]) => createReactRuntime(react, reactDomClient, kind))
  }
  return bundledReactRuntimePromise
}

function normalizeReactRenderError(error: unknown): unknown {
  const message = error instanceof Error ? error.message : String(error)
  if (
    /invalid hook call/i.test(message) ||
    /Cannot read properties of null \(reading ['"]use[A-Z]/.test(message)
  ) {
    return new BeamIslandReactConfigurationError(
      '[beam] React island hooks are using a different React instance than the renderer. ' +
      'For beam-island-src modules, emit beamIslandImportMap() before module scripts and ' +
      'do not bundle React into the remote island artifact.',
      { cause: error }
    )
  }
  return error
}

// ============ CRASH RESILIENCE ============
// A tenant's island crashing must not leave a blank hole: the server-rendered
// placeholder is captured before mount and restored if the module fails to
// load or the component throws during render/commit. A 'beam:island-error'
// window event fires either way so platforms can log which artifact failed.

const failedIslands = new WeakSet<Element>()

type IslandErrorPhase = 'load' | 'render'

function dispatchIslandError(
  el: Element,
  entry: Pick<MountedIsland, 'name' | 'src'>,
  phase: IslandErrorPhase,
  error: unknown
): void {
  window.dispatchEvent(
    new CustomEvent('beam:island-error', {
      detail: { name: entry.name, src: entry.src ?? null, phase, error, element: el },
    })
  )
}

function failIsland(el: Element, entry: MountedIsland, phase: IslandErrorPhase, error: unknown): void {
  if (failedIslands.has(el)) return
  error = normalizeReactRenderError(error)
  failedIslands.add(el)
  if (mountedIslands.get(el) === entry) mountedIslands.delete(el)
  console.error(`[beam] React island "${entry.name}" failed (${phase}):`, error)
  // Unmount + restore outside React's commit phase (componentDidCatch runs inside it)
  queueMicrotask(() => {
    try {
      entry.root?.unmount()
    } catch {
      // container may already be gone
    }
    if (el.isConnected) {
      el.innerHTML = entry.placeholder ?? ''
    }
    dispatchIslandError(el, entry, phase, error)
  })
}

// Error boundaries must inherit from the matching React instance. Local and
// remote islands may intentionally use separate, internally consistent roots.
const boundaryClasses = new WeakMap<ReactRuntime, unknown>()

function getErrorBoundary(runtime: ReactRuntime): unknown {
  const cached = boundaryClasses.get(runtime)
  if (cached) return cached
  const Base = runtime.Component as new (props: unknown) => {
    props: { onError: (error: unknown) => void; children?: unknown }
    state: { failed: boolean }
  }
  class IslandErrorBoundary extends Base {
    state = { failed: false }
    static getDerivedStateFromError(): { failed: boolean } {
      return { failed: true }
    }
    componentDidCatch(error: unknown): void {
      this.props.onError(error)
    }
    render(): unknown {
      return this.state.failed ? null : this.props.children
    }
  }
  boundaryClasses.set(runtime, IslandErrorBoundary)
  return IslandErrorBoundary
}

// ============ DYNAMIC SOURCES (beam-island-src) ============
// Islands whose component module is fetched at runtime from a URL instead of
// the build-time registry — for platforms that compile components from other
// sources (per-tenant artifacts, plugin systems). The module must be an ES
// module with the component as default export, compiled WITHOUT React inside:
// bare `import ... from 'react'` specifiers are resolved by the page's import
// map to Beam's shared React (see beamIslandImportMap()).
//
// Security: executing a remote module is running code. Sources are OFF by
// default — only URLs matching an explicitly allowed prefix are loaded.

const allowedIslandSources: string[] = []
let metaSourcesRead = false

/**
 * Allow island source URL prefixes for beam-island-src loading.
 * Relative prefixes (e.g. '/islands/') resolve against the current origin.
 * Usually configured via the beamPlugin `islandSources` option or a
 * `<meta name="beam-island-sources" content="/islands/">` tag instead.
 */
export function allowIslandSources(prefixes: string[]): void {
  prefixes.forEach((prefix) => {
    if (prefix && !allowedIslandSources.includes(prefix)) {
      allowedIslandSources.push(prefix)
    }
  })
}

function readMetaSources(): void {
  if (metaSourcesRead || typeof document === 'undefined') return
  metaSourcesRead = true
  const content = document
    .querySelector('meta[name="beam-island-sources"]')
    ?.getAttribute('content')
  if (content) {
    allowIslandSources(content.split(',').map((s) => s.trim()).filter(Boolean))
  }
}

/**
 * Resolve src to an absolute URL if it matches an allowed prefix, else null.
 *
 * Matching is on a path-segment boundary, NOT a raw string prefix: an allowed
 * prefix is normalized to end with '/', and the resolved URL must be that exact
 * directory or a descendant. This blocks sibling-path bypasses — prefix
 * '/islands' must not also permit '/islands-evil/x.js'. Same origin only.
 */
function resolveAllowedSource(src: string): string | null {
  readMetaSources()
  // Resolve the SRC against the DOCUMENT's base URL, not location.href: in an
  // srcdoc iframe location.href is 'about:srcdoc' — an opaque-path URL that
  // every relative or path-absolute reference THROWS against — while baseURI
  // inherits the parent document's URL, which is exactly what server-rendered
  // previews injected via srcDoc need. On normal pages baseURI === location.href.
  const base =
    typeof document !== 'undefined' && document.baseURI ? document.baseURI : location.href
  let resolved: URL
  try {
    resolved = new URL(src, base)
  } catch {
    return null
  }
  // Anchor the allowlist ORIGIN to the real page origin, NOT the base URL:
  // baseURI honors a <base> tag, so resolving relative prefixes against it
  // would let an injected <base href="evil"> redirect island loading (both the
  // prefix and a relative src would resolve to the attacker origin and match).
  // location.origin is unspoofable and is the parent's origin inside srcdoc, so
  // a spoofed <base> now fails the origin check below. Absolute prefixes carry
  // their own origin and are unaffected either way.
  const originBase =
    typeof location !== 'undefined' && location.origin && location.origin !== 'null'
      ? location.origin
      : base
  for (const prefix of allowedIslandSources) {
    try {
      const allowed = new URL(prefix, originBase)
      if (resolved.origin !== allowed.origin) continue

      // Normalize the allowed path to a directory (trailing slash).
      const allowedPath = allowed.pathname.endsWith('/')
        ? allowed.pathname
        : allowed.pathname + '/'

      // Descendant of the directory, or the directory index itself.
      if (
        resolved.pathname === allowed.pathname ||
        resolved.pathname.startsWith(allowedPath)
      ) {
        return resolved.href
      }
    } catch {
      // skip invalid prefix
    }
  }
  return null
}

// Indirection so tests can fake module fetching (native import of real URLs
// is not available under jsdom).
let remoteImporter: (url: string) => Promise<unknown> = (url) =>
  import(/* @vite-ignore */ url)

const remoteComponents = new Map<string, Promise<IslandComponent | null>>()

function loadRemoteComponent(url: string): Promise<IslandComponent | null> {
  let pending = remoteComponents.get(url)
  if (!pending) {
    pending = Promise.resolve(remoteImporter(url)).then((mod) => {
      const component = unwrapModule(mod)
      if (!component) {
        console.warn(`[beam] Island source "${url}" has no default export`)
      }
      return component
    })
    remoteComponents.set(url, pending)
  }
  return pending
}

export const __beamIslandsInternals = {
  setRemoteImporter(fn: (url: string) => Promise<unknown>): void {
    remoteImporter = fn
  },
  resetDynamicSources(): void {
    allowedIslandSources.length = 0
    metaSourcesRead = false
    remoteComponents.clear()
  },
  setSharedModuleImporter(fn: (specifier: string) => Promise<unknown>): void {
    sharedModuleImporter = fn
    sharedReactRuntimePromise = null
  },
  resetReactRuntimes(): void {
    sharedModuleImporter = (specifier) => import(/* @vite-ignore */ specifier)
    bundledReactRuntimePromise = null
    sharedReactRuntimePromise = null
  },
  hasSharedReactImportMap,
  normalizeReactRenderError,
}

// ============ REGISTRY ============

const LOADER_MARKER = Symbol.for('beam.islandLoader')

// Registered islands, normalized to async component resolvers
const islandRegistry = new Map<string, () => Promise<IslandComponent | null>>()
const resolvedComponents = new Map<string, IslandComponent>()

interface MountedIsland {
  name: string
  root: IslandRoot | null
  component: IslandComponent | null
  /** Raw beam-props string last rendered — detects changes made while detached */
  lastProps: string | null
  /** Runtime source URL, when loaded via beam-island-src */
  src: string | null
  /** Server-rendered placeholder HTML, restored if the island crashes */
  placeholder: string | null
  /** Renderer paired with this component: app-bundled or import-map shared. */
  runtimeKind: ReactRuntimeKind
}

const mountedIslands = new Map<Element, MountedIsland>()

/**
 * Mark a function as a lazy island loader so it is not mistaken for a
 * function component when registered under a plain name key.
 *
 * @example registerIslands({ Chart: lazyIsland(() => import('./Chart')) })
 */
export function lazyIsland(loader: IslandLoader): IslandLoader {
  ;(loader as unknown as Record<symbol, boolean>)[LOADER_MARKER] = true
  return loader
}

function islandNameFromKey(key: string): string {
  const base = key.split('/').pop() ?? key
  return base.replace(/\.(t|j)sx?$/, '')
}

function unwrapModule(mod: unknown): IslandComponent | null {
  if (mod && typeof mod === 'object' && 'default' in (mod as Record<string, unknown>)) {
    return ((mod as { default: unknown }).default as IslandComponent) ?? null
  }
  return (mod as IslandComponent) ?? null
}

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
export function registerIslands(islands: Record<string, IslandRegistration>): void {
  Object.entries(islands).forEach(([key, value]) => {
    const name = islandNameFromKey(key)
    const isLoader =
      typeof value === 'function' &&
      (key.includes('/') || Boolean((value as unknown as Record<symbol, boolean>)[LOADER_MARKER]))

    if (isLoader) {
      const loader = value as IslandLoader
      islandRegistry.set(name, () => Promise.resolve(loader()).then(unwrapModule))
    } else {
      islandRegistry.set(name, () => Promise.resolve(value as IslandComponent))
    }
  })

  if (typeof document !== 'undefined') {
    initIslands()
    scanIslands(document)
  }
}

// ============ MOUNTING ============

function readIslandProps(el: Element): Record<string, unknown> {
  const raw = el.getAttribute('beam-props')
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch (err) {
    console.warn('[beam] Invalid beam-props JSON on island:', el, err)
    return {}
  }
}

function renderIsland(el: Element, entry: MountedIsland, runtime: ReactRuntime): void {
  if (!entry.root || !entry.component) return
  entry.lastProps = el.getAttribute('beam-props')
  const Boundary = getErrorBoundary(runtime)
  entry.root.render(
    runtime.createElement(
      Boundary,
      { onError: (error: unknown) => failIsland(el, entry, 'render', error) },
      runtime.createElement(entry.component, readIslandProps(el))
    )
  )
}

async function resolveIslandComponent(name: string): Promise<IslandComponent | null> {
  const cached = resolvedComponents.get(name)
  if (cached) return cached

  const resolver = islandRegistry.get(name)
  if (!resolver) return null

  const component = await resolver()
  if (!component) {
    console.warn(`[beam] React island "${name}" resolved to nothing (missing default export?)`)
    return null
  }
  resolvedComponents.set(name, component)
  return component
}

// ============ MOUNT STRATEGIES (beam-island-load) ============
// eager (default): mount as soon as the marker is seen.
// visible: mount when scrolled near the viewport — a grid of 30 product-card
//          islands creates zero React roots until the shopper reaches them.
// idle:    mount when the main thread is free (requestIdleCallback).

const pendingVisibleIslands = new Set<Element>()
let visibilityObserver: IntersectionObserver | null = null

function getVisibilityObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null
  if (!visibilityObserver) {
    visibilityObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target
          visibilityObserver?.unobserve(el)
          pendingVisibleIslands.delete(el)
          mountIslandNow(el)
        }
      },
      { rootMargin: '100px' }
    )
  }
  return visibilityObserver
}

const scheduledIdleIslands = new WeakSet<Element>()

function scheduleIdleMount(el: Element): void {
  if (scheduledIdleIslands.has(el)) return
  scheduledIdleIslands.add(el)
  const run = () => {
    scheduledIdleIslands.delete(el)
    if (el.isConnected) mountIslandNow(el)
  }
  const ric = (window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => void
  }).requestIdleCallback
  if (typeof ric === 'function') {
    ric(run, { timeout: 2000 })
  } else {
    setTimeout(run, 150)
  }
}

function mountIsland(el: Element): void {
  const existing = mountedIslands.get(el)
  if (existing) {
    // Already mounted — catch props that changed while the element was detached
    // (e.g. beam-keep style preservation re-inserting it during a swap).
    if (existing.root && el.getAttribute('beam-props') !== existing.lastProps) {
      void loadReactRuntime(existing.runtimeKind).then((runtime) => renderIsland(el, existing, runtime))
    }
    return
  }
  if (failedIslands.has(el) || pendingVisibleIslands.has(el)) return

  const load = el.getAttribute('beam-island-load')
  if (load === 'visible') {
    const observer = getVisibilityObserver()
    if (observer) {
      pendingVisibleIslands.add(el)
      observer.observe(el)
      return
    }
    // No IntersectionObserver support — fall through to an eager mount.
  } else if (load === 'idle') {
    scheduleIdleMount(el)
    return
  }

  mountIslandNow(el)
}

function mountIslandNow(el: Element): void {
  if (mountedIslands.has(el) || failedIslands.has(el)) return

  const name = el.getAttribute('beam-island')
  if (!name) return

  // Resolution order: an explicit runtime source wins over the build-time
  // registry, so per-tenant/artifact components can override registered names.
  const src = el.getAttribute('beam-island-src')
  let runtimeKind: ReactRuntimeKind = 'bundled'
  let componentPromise: Promise<IslandComponent | null>

  if (src) {
    const allowedUrl = resolveAllowedSource(src)
    if (!allowedUrl) {
      console.error(
        `[beam] Island source "${src}" is not allowed. Add its prefix via allowIslandSources([...]) or a <meta name="beam-island-sources"> tag.`
      )
      return
    }
    if (hasSharedReactImportMap()) {
      runtimeKind = 'shared'
    } else {
      console.warn(
        '[beam] Remote React island has no complete import map for react, react/jsx-runtime, and react-dom/client. ' +
        'Beam will try the app-bundled runtime, but hook-based islands may fail. Emit beamIslandImportMap() before module scripts.'
      )
    }
    componentPromise = loadRemoteComponent(allowedUrl)
  } else if (islandRegistry.has(name)) {
    componentPromise = resolveIslandComponent(name)
  } else {
    console.warn(
      `[beam] React island "${name}" is not registered and has no beam-island-src. Call registerIslands({ ${name}: ... }) in your client entry or provide a source URL.`
    )
    return
  }

  const entry: MountedIsland = {
    name,
    root: null,
    component: null,
    lastProps: null,
    src,
    // Captured before React clears the container — restored if the island crashes.
    placeholder: el.innerHTML,
    runtimeKind,
  }
  mountedIslands.set(el, entry)

  Promise.all([componentPromise, loadReactRuntime(runtimeKind)])
    .then(([component, runtime]) => {
      // The element may have been removed (or re-claimed) while the chunk loaded.
      if (!component || mountedIslands.get(el) !== entry) return
      if (!el.isConnected) {
        mountedIslands.delete(el)
        return
      }
      entry.component = component
      entry.root = runtime.createRoot(el)
      renderIsland(el, entry, runtime)
    })
    .catch((err) => {
      if (mountedIslands.get(el) === entry) {
        failIsland(el, entry, 'load', err)
      }
    })
}

/**
 * Scan a DOM subtree for island markers and mount them.
 * Called automatically on load and after DOM mutations; call manually only
 * for containers the observer cannot see (e.g. detached shadow roots).
 */
export function scanIslands(root: ParentNode = document): void {
  if (root instanceof Element && root.hasAttribute('beam-island')) {
    mountIsland(root)
  }
  root.querySelectorAll('[beam-island]').forEach(mountIsland)
}

function sweepRemovedIslands(): void {
  mountedIslands.forEach((entry, el) => {
    if (el.isConnected) return
    mountedIslands.delete(el)
    entry.root?.unmount()
  })
  pendingVisibleIslands.forEach((el) => {
    if (el.isConnected) return
    pendingVisibleIslands.delete(el)
    visibilityObserver?.unobserve(el)
  })
}

let islandsInitialized = false

function initIslands(): void {
  if (islandsInitialized || typeof document === 'undefined') return

  const start = () => {
    if (islandsInitialized) return
    islandsInitialized = true

    // One observer covers every Beam update path: mounts islands arriving in any
    // swap/modal/drawer/visit, unmounts removed ones, and re-renders on
    // beam-props changes (ctx.island() updates and preserved-island prop syncs).
    const observer = new MutationObserver((mutations) => {
      let childListChanged = false
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          const target = mutation.target
          if (target instanceof Element) {
            const entry = mountedIslands.get(target)
            if (entry?.root) {
              void loadReactRuntime(entry.runtimeKind).then((runtime) => renderIsland(target, entry, runtime))
            }
          }
        } else if (mutation.addedNodes.length || mutation.removedNodes.length) {
          childListChanged = true
        }
      }
      if (childListChanged) {
        sweepRemovedIslands()
        scanIslands(document)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['beam-props'],
    })

    scanIslands(document)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true })
  } else {
    start()
  }
}

// Auto-initialize even when registerIslands is never called, so island markers
// warn instead of silently doing nothing. Deferred a microtask so the client
// entry's synchronous registerIslands() call runs first (no spurious warnings).
if (typeof document !== 'undefined') {
  queueMicrotask(initIslands)
}
