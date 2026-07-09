# Changelog

## 1.1.0 — 2026-07-09

- **Typed actions**: the Vite plugin generates a typed-action registry
  (`beam-actions.d.ts`, `actionTypes` option) — action names, params, and
  `ctx.json` payloads are inferred in `useBeamAction`, `callBeamAction`, and
  `window.beam.*`; unknown names and wrong param shapes become compile errors.
  Zero runtime cost; falls back to the permissive string API without codegen.
- **`beam dev`**: one command for the dev loop — builds with dev refresh, then
  runs `wrangler dev` (args pass through). Dev builds emit `dist/_headers`
  with `Cache-Control: no-store` so rebuilds are never masked by browser or
  miniflare caches; production builds remove it. The Beam client now
  auto-loads the dev-refresh poller in dev builds (no layout wiring; the
  branch and chunk are eliminated from production bundles) and the poller is
  a singleton, so existing manual script tags stay safe. Templates and
  `beam init` now use `beam dev` as the dev script.
- **Error visibility**: in dev builds, server action errors travel with their
  real details (action name, message, stack) and a full-screen error overlay
  renders them — island crashes included; Esc dismisses. Production stays
  opaque and ships zero overlay bytes. All builds dispatch a
  `beam:action-error` window event for custom reporting. `beam.debug(true)`
  traces every action call: params, per-chunk summaries, and round-trip
  duration (persisted via localStorage).
- **Animations**: layered, dependency-free animation system. Layer 1 —
  native View Transitions (`beam-transition="view"` on swap targets/boost
  shells, `beam-transition-name` shared-element morphs). Layer 2 —
  Alpine/Vue-style enter/leave class triplets (`beam-enter[-start/-end]`,
  `beam-leave[-start/-end]`) applied across swaps, streamed chunks, modals,
  drawers, and spawned/removed islands, plus `beam-enter-stagger` for list
  choreography. `beam-swap-transition` grew from 3 to 12 presets (zoom, pop,
  blur, directional slides, flips) with `--beam-swap-duration`/`--beam-swap-ease`
  overrides. Everything respects `prefers-reduced-motion`. Also fixed a
  long-standing bug where swap presets barely animated — the always-on base
  transition animated *into* the from-state (a ~16ms dip) instead of snapping
  there and animating in; the from-state now snaps (`transition: none`) then
  releases.
- `IslandLoader` typing loosened to `() => Promise<unknown>` so
  `import.meta.glob` output assigns without casts.
- **Append/prepend no longer removes a plain trigger button.** Self-removal now
  only applies to `beam-load-more` / `beam-infinite` sentinels (the
  self-replacing pattern, unchanged). A regular `beam-action` button with
  `beam-swap="append"`/`"prepend"` now persists, so it can be clicked
  repeatedly — matching htmx and the obvious expectation.

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
