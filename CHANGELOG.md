# Changelog

## Unreleased

- Declarative polling now handles the complete action response (including
  events, state, island updates, errors, and redirects), like normal actions.
- Poll requests are serialized after stream completion. Disabling/removing a
  poller cancels its reader and ignores late results; re-enabling restarts it.
- Poll transport failures emit the normal action-error event and retry on the
  next interval. Invalid intervals fall back to five seconds.

## 1.3.0 — 2026-07-27

- Security hardening:
  - RPC action lookup now requires an own callable property, closing a
    `constructor` action that returned the full Beam context (including
    environment secrets, user, and session data).
  - WebSocket authentication now cryptographically verifies both session
    cookies before using their ID or data; forged `beam_data` is rejected.
  - Action request limits are enforced while streaming the body even when
    `Content-Length` is absent, and non-object JSON payloads are rejected.
  - Import-map JSON escapes script terminators; `beamCsp()` and
    `beamIslandImportMap()` support matching script nonces. `beamCsp()` now
    denies inline scripts by default; legacy inline scripts require the
    explicit `allowUnsafeInlineScripts` compatibility escape hatch.
  - Removed an unused example session helper that contained a public signing
    secret and accepted cookie signatures without verifying them.
  - New apps generate a random gitignored `.dev.vars` secret, production
    Wrangler builds no longer use `--dev`, and vulnerable build dependencies
    are pinned to patched versions.
- New applications no longer depend on `virtual:beam` or
  `virtual:beam/islands`. They define their Beam instance in `app/beam.ts` with
  `createBeam()` and `collectActions(import.meta.glob(...))`, and register
  islands directly from `app/client.ts` with
  `registerIslands(import.meta.glob(...))`. Existing applications continue to
  work unchanged: both virtual modules and their Vite options remain as
  backward-compatible shims, so no migration process is required.
- `@benqoder/beam/client` now includes island mounting instead of only
  preserving island markers during Beam swaps. Pages with `beam-island`
  markers can no longer fail silently because the separate islands side-effect
  entry was omitted.
- Dynamic `beam-island-src` components now load their React renderer through
  the page import map while registered local islands keep using app-bundled
  React. This enforces a matched component/renderer instance even when Vite,
  Rollup, or esbuild bundles the Beam client. Dual-React hook failures are
  reported as `BeamIslandReactConfigurationError`, and every island-capable
  client build emits the stable shared ESM facades.

## 1.2.1 — 2026-07-10

- **Dynamic islands mount inside `srcdoc` iframes.** `beam-island-src` now
  resolves against `document.baseURI` instead of `location.href`. In an
  `srcdoc` document `location.href` is `about:srcdoc` — an opaque-path URL
  every relative or path-absolute reference throws against — so islands in
  server-rendered previews injected via `srcDoc` were always refused.
  `baseURI` inherits the parent document's URL there, and equals
  `location.href` on normal pages.
  The allowlist **origin** stays anchored to `location.origin` (not
  `baseURI`), so an injected `<base>` tag cannot redirect island loading to a
  foreign origin — the spoofed source resolves against the base but then fails
  the unspoofable origin check. Absolute-origin prefixes are unaffected.

## 1.2.0 — 2026-07-10

- **Security hardening.**
  - Session cookies now set `Secure` (in addition to `HttpOnly` +
    `SameSite=Lax`).
  - Dynamic island source allowlist now matches on a **path-segment
    boundary** instead of a raw string prefix — closes a sibling-path bypass
    where `islandSources: ['/islands']` also permitted `/islands-evil/x.js`.
  - WebSocket endpoint is **same-origin by default** (defense-in-depth over
    the in-band token); `beam.init(app, { allowedOrigins })` configures a list
    or `'*'` to disable.
  - Blob-carrying action bodies are capped (`maxUploadBytes`, default 10 MB →
    413) before buffering.
  - `verifyToken` validates payload shape (numeric `exp`, string `sid`) — a
    signed-but-malformed token can no longer become a non-expiring credential.
  - Beam visits are clamped to same-origin (rejects cross-origin URLs without
    fetching).
  - New `beamCsp()` helper builds a Beam-tuned Content-Security-Policy
    (islands, reactivity `unsafe-eval`, WebSocket connect-src).
  - README **Hardening Checklist** documents secret management, the
    expression-eval RCE caveat, and cookie-session (signed-not-encrypted)
    guidance.
- **capnweb upgraded 0.6.1 → 0.10.0.** Fixes a memory leak that pinned all
  received messages for the life of the session (Beam sessions are long-lived,
  so this affected every connected client), plus prototype-pollution and
  resource-leak security fixes. New capabilities Beam now rides on:
  `Blob` (and streams) are serializable over the RPC pipe with MIME preserved —
  the transport primitive for upcoming file uploads — and receiver-side
  resource limits (message size, nesting depth, bigint length) are enforced
  with sane defaults on the WebSocket endpoint. New
  `beam.init(app, { rpcOptions })` passthrough exposes `limits` tuning and the
  `onSendError` log/redact hook. Peer range corrected from `^0.4.0` (which
  never matched the 0.6.x actually in use) to `^0.10.0`.

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
