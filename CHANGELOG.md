# Changelog

## 1.0.0 — 2026-07-07

First stable release. Beam's server-driven HTML-over-WebSocket core is joined by a
full React islands system — pure React components as first-class citizens of the
duplex pipe: the server pushes data into them at any time, they call the server at
any time.

### React Islands

- `<Island name id props>` server helper renders a mount point; the client mounts a
  real React root into it (`react-dom/client`) — no SSR, no hydration, placeholder
  children show until mount
- Auto-discovery of `app/islands/*.tsx` via the Vite plugin (`islands` option,
  compiled with the React JSX runtime while the rest of the app stays on hono/jsx),
  registered from `virtual:beam/islands` with `registerIslands()`
- React is fully lazy: pages without islands download zero React bytes; each island
  is its own code-split chunk
- Islands survive Beam DOM swaps by default (server re-renders adopt fresh
  `beam-props`, local React state is preserved); `beam-island-remount` opts out
- Hooks in `@benqoder/beam/react`: `useBeamAction` (WebSocket action calls with
  `loading`/`error`/`data`/`json`), `useBeamState` (two-way bridge to named reactive
  states), `useBeamEvent` (server-pushed events), `useBeamConnection`
- New server response helpers: `ctx.island(id, props)` props pushes (streamable from
  generators), `ctx.event(name, data)`, `ctx.json(value)` (private request/response —
  resolved at the call site, no DOM/state side effects), `ctx.notify?.()`
  fire-and-forget pushes over the live session callback

### Dynamic Islands (runtime component sources)

- `beam-island-src` loads an island's ES module from a URL at runtime — for
  per-tenant compiled artifacts, plugin systems, component marketplaces
- Secure by default: sources load only from prefixes allowed via the plugin's
  `islandSources` option, `allowIslandSources()`, or a
  `<meta name="beam-island-sources">` tag
- Single shared React instance guaranteed via emitted stable-name modules
  (`static/beam-shared/*.js`) and `beamIslandImportMap({ base?, extra? })`; `extra`
  entries turn the import map into a per-tenant shared-component registry
- Modules cached per URL; `beam-island-src` overrides a registered component of the
  same name

### Island lifecycle & resilience

- Mount strategies: `beam-island-load="visible"` (IntersectionObserver, ideal for
  product grids) and `"idle"` (requestIdleCallback); props pushed while pending are
  applied at mount
- Crash resilience: the server-rendered placeholder is captured before mount and
  restored if the module fails to load or the component throws during
  render/commit; a `beam:island-error` window event
  (`{ name, src, phase, error, element }`) fires for logging
- Server-driven lifecycle: `ctx.island(id, props, { component, src?, target, swap?,
  load? })` upserts (creates the island when missing), `ctx.removeIsland(...ids)`
  unmounts and removes

### Reactivity

- `beam.effect(fn)` — reactive effect with dispose, re-runs when any state it reads
  changes (the primitive `useBeamState` builds on)
- `beam.ensureState(id, initial)` — get-or-create a named state from JS/React before
  any `beam-state` element declares it

### Docs

- README: React Islands, Dynamic Islands, Mount Strategies & Crash Resilience,
  channel-picking guide (`state` vs `island` vs `json` vs `event` vs `render`),
  state semantics, island attribute reference

## 0.8.0 and earlier

Pre-1.0 development: WebSocket RPC core, declarative attributes, reactive state,
modals/drawers, streaming actions, Beam visits, CLI (`create`/`init`/`build`),
dev-refresh, Wrangler-first workflow. See git history.
