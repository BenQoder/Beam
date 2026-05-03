# Beam

A lightweight, declarative UI framework for building interactive web applications with WebSocket RPC. Beam provides server-driven UI updates with minimal JavaScript configuration—just add attributes to your HTML.

## Features

- **WebSocket RPC** - Real-time communication without HTTP overhead
- **Per-Call Hono Middleware** - Re-enter Hono for every RPC action without switching the browser to HTTP
- **Declarative** - No JavaScript needed, just HTML attributes
- **Auto-discovery** - Handlers are automatically found via Vite plugin
- **Modals & Drawers** - Built-in overlay components
- **Smart Loading** - Per-action loading indicators with parameter matching
- **DOM Updates** - Server-driven UI updates
- **Real-time Validation** - Validate forms as users type
- **Input Watchers** - Trigger actions on input/change events with debounce/throttle
- **Conditional Triggers** - Only trigger when conditions are met (`beam-watch-if`)
- **Dirty Form Tracking** - Track unsaved changes with indicators and warnings
- **Conditional Fields** - Enable/disable/show/hide fields based on other values
- **Deferred Loading** - Load content when scrolled into view
- **Polling** - Auto-refresh content at intervals
- **Hungry Elements** - Auto-update elements across actions
- **Confirmation Dialogs** - Confirm before destructive actions
- **Instant Click** - Trigger on mousedown for snappier UX
- **Offline Detection** - Show/hide content based on connection
- **Navigation Feedback** - Auto-highlight current page links
- **Conditional Show/Hide** - Toggle visibility based on form values
- **Auto-submit Forms** - Submit on field change
- **Beam Visits** - Upgrade normal SSR links into Beam-powered visits
- **History Management** - Push/replace browser history for actions and visits
- **Placeholders** - Show loading content in target
- **Keep Elements** - Preserve elements during updates
- **Toggle** - Client-side show/hide with transitions (no server)
- **Dropdowns** - Click-outside closing, Escape key support (no server)
- **Collapse** - Expand/collapse with text swap (no server)
- **Class Toggle** - Toggle CSS classes on elements (no server)
- **Reactive State** - Fine-grained reactivity for UI components (tabs, accordions, carousels)
- **Server State Updates** - Update named client state from server actions without swapping DOM
- **Cloak** - Hide elements until reactivity initializes (no flash of unprocessed content)
- **Lazy Connections** - Beam connects only when needed by default
- **Multi-Render** - Update multiple targets in a single action response
- **Async Components** - Full support for HonoX async components in `ctx.render()`
- **Streaming Actions** - Async generator handlers push incremental updates over WebSocket (skeleton → content, live progress, AI-style text)
- **requestContext Access** - Read the live Hono request context from Beam actions when per-call middleware is enabled

## Installation

```bash
npm install @benqoder/beam
```

## Create or Initialize an App

Beam ships its scaffolding in the same package as the framework.

Create a new HonoX + Beam + Wrangler app:

```bash
npx @benqoder/beam create my-app
cd my-app
npm install
npm run dev
```

Add Beam to an existing HonoX project:

```bash
npx @benqoder/beam init
npm install
npm run dev
```

`init` writes `wrangler.json`, updates `package.json`, adds missing starter files, and skips existing source files unless `--force` is provided.

## Wrangler-First Development

Beam actions run over WebSocket RPC, so Cloudflare Workers apps should be developed through Wrangler rather than a standalone Vite dev server. The Beam CLI provides a build command that creates both the Worker bundle and client assets:

```bash
beam build
```

Add it to Wrangler's build hook so `wrangler dev` works from a clean checkout without manually running `npm run build` first. Use `--dev` for local development; normal production builds remove dev-only refresh artifacts.

```json
{
  "main": "./dist/index.js",
  "assets": {
    "directory": "./dist"
  },
  "build": {
    "command": "npx --no-install beam build --dev",
    "watch_dir": "app"
  }
}
```

With that configuration, `wrangler dev` runs `beam build --dev` before Miniflare starts and rebuilds when files in `app/` change. This keeps the Worker, assets, and WebSocket endpoint on the same origin, avoiding the split Vite/Worker setup that can break Beam RPC connections.

For development-only DOM refresh, add the dev refresh script when `VITE_BEAM_DEV_REFRESH=1` is present:

```tsx
{import.meta.env.VITE_BEAM_DEV_REFRESH === '1' && (
  <script type="module" src="/static/dev-refresh.js"></script>
)}
```

`beam build --dev` writes `/__beam_dev.json` and builds `/static/dev-refresh.js`. The browser polls that manifest; server-only changes fetch the current page and morph the matching root (`[beam-dev-refresh-root]`, `[beam-boost]`, or `body`) while preserving focused inputs and `[beam-keep]` nodes. Asset changes fall back to a full reload.

## Quick Start

### 1. Add the Vite Plugin

```typescript
// vite.config.ts
import { beamPlugin } from "@benqoder/beam/vite";

export default defineConfig({
  plugins: [
    beamPlugin({
      actions: "./actions/*.tsx",
    }),
  ],
});
```

### 2. Initialize Beam Server

```typescript
// app/server.ts
import { createApp } from "honox/server";
import { beam } from "virtual:beam";

const app = createApp({
  init: beam.init,
});

export default app;
```

### 3. Add the Client Script

```typescript
// app/client.ts
import "@benqoder/beam/client";
```

### 4. Create an Action

```tsx
// app/actions/counter.tsx
export function increment(c) {
  const count = parseInt(c.req.query("count") || "0");
  return <div>Count: {count + 1}</div>;
}
```

### 5. Use in HTML

```html
<div id="counter">Count: 0</div>
<button beam-action="increment" beam-target="#counter">Increment</button>
```

---

## Core Concepts

### Actions

Actions are server functions that return HTML. They're the primary way to handle user interactions.

```tsx
// app/actions/demo.tsx
export function greet(c) {
  const name = c.req.query("name") || "World";
  return <div>Hello, {name}!</div>;
}
```

```html
<button beam-action="greet" beam-data-name="Alice" beam-target="#greeting">
  Say Hello
</button>
<div id="greeting"></div>
```

### Including Input Values

Use `beam-include` to collect values from input elements and include them in action params. Elements are found by `beam-id`, `id`, or `name` (in that priority order):

```html
<!-- Define inputs with beam-id, id, or name -->
<input beam-id="name" type="text" value="Ben" />
<input id="email" type="email" value="ben@example.com" />
<input name="age" type="number" value="30" />
<input beam-id="subscribe" type="checkbox" checked />

<!-- Button includes specific inputs -->
<button
  beam-action="saveUser"
  beam-include="name,email,age,subscribe"
  beam-data-source="form"
  beam-target="#result"
>
  Save
</button>

<div id="result"></div>
```

The action receives merged params with proper type conversion:

```json
{
  "source": "form",
  "name": "Ben",
  "email": "ben@example.com",
  "age": 30,
  "subscribe": true
}
```

Type conversion:

- `checkbox` → `boolean` (checked state)
- `number`/`range` → `number`
- All others → `string`

### Modals

Two ways to open modals:

**1. `beam-modal` attribute** - Explicitly opens the action result in a modal, with optional placeholder:

```html
<!-- Shows placeholder while loading, then replaces with action result -->
<button
  beam-modal="confirmDelete"
  beam-data-id="123"
  beam-size="small"
  beam-placeholder="<div>Loading...</div>"
>
  Delete Item
</button>
```

**2. `beam-action` with `ctx.modal()`** - Action decides to return a modal:

```tsx
// app/actions/confirm.tsx
export function confirmDelete(
  ctx: BeamContext<Env>,
  { id }: Record<string, unknown>,
) {
  return ctx.modal(
    <div>
      <h2>Confirm Delete</h2>
      <p>Are you sure you want to delete item {id}?</p>
      <button beam-action="deleteItem" beam-data-id={id} beam-close>
        Delete
      </button>
      <button beam-close>Cancel</button>
    </div>,
    { size: "small" },
  );
}
```

`ctx.modal()` accepts JSX directly - no wrapper function needed. Options: `size` ('small' | 'medium' | 'large'), `spacing` (padding in pixels).

```html
<button beam-action="confirmDelete" beam-data-id="123">Delete Item</button>
```

### Drawers

Two ways to open drawers:

**1. `beam-drawer` attribute** - Explicitly opens in a drawer:

```html
<button
  beam-drawer="openCart"
  beam-position="right"
  beam-size="medium"
  beam-placeholder="<div>Loading cart...</div>"
>
  Open Cart
</button>
```

**2. `beam-action` with `ctx.drawer()`** - Action returns a drawer:

```tsx
// app/actions/cart.tsx
export function openCart(ctx: BeamContext<Env>) {
  return ctx.drawer(
    <div>
      <h2>Shopping Cart</h2>
      <div class="cart-items">{/* Cart contents */}</div>
      <button beam-close>Close</button>
    </div>,
    { position: "right", size: "medium" },
  );
}
```

`ctx.drawer()` accepts JSX directly. Options: `position` ('left' | 'right'), `size` ('small' | 'medium' | 'large'), `spacing` (padding in pixels).

```html
<button beam-action="openCart">Open Cart</button>
```

### Multi-Render Array API

Update multiple targets in a single action response using `ctx.render()` with arrays:

**1. Explicit targets (comma-separated)**

```tsx
export function refreshDashboard(ctx: BeamContext<Env>) {
  return ctx.render(
    [
      <div class="stat-card">Visits: {visits}</div>,
      <div class="stat-card">Users: {users}</div>,
      <div class="stat-card">Revenue: ${revenue}</div>,
    ],
    { target: "#stats, #users, #revenue" },
  );
}
```

**2. Auto-detect by beam-id / beam-item-id (no targets needed)**

```tsx
export function refreshDashboard(ctx: BeamContext<Env>) {
  // Client automatically finds elements by stable identity
  return ctx.render([
    <div beam-id="stats">Visits: {visits}</div>,
    <div beam-id="users">Users: {users}</div>,
    <div beam-id="revenue">Revenue: ${revenue}</div>,
  ]);
}
```

**3. Mixed approach**

```tsx
export function updateDashboard(ctx: BeamContext<Env>) {
  return ctx.render(
    [
      <div>Header content</div>, // Uses explicit target
      <div beam-id="content">Main content</div>, // Auto-detected by beam-id
    ],
    { target: "#header" }, // Only first item gets explicit target
  );
}
```

**Target Resolution Order:**

1. Explicit target from comma-separated list (by index)
2. Identity from the HTML fragment's root element (`beam-id` or `beam-item-id`)
3. Frontend fallback (`beam-target` on the triggering element)
4. Skip if no target found

Notes:

- `beam-target` accepts any valid CSS selector (e.g. `#id`, `.class`, `[attr=value]`). Using `#id` targets is still fully supported.
- Auto-targeting (step 2) uses stable element identity from the returned HTML root: `beam-id`, `beam-item-id`, or `id`.
- Auto-targeting intentionally does **not** use input `name` values, because they are often not unique enough for safe DOM replacement.
- Prefer `beam-id` for named UI regions and `beam-item-id` for repeated/list items. Use plain `id` when that already matches your markup structure.
- When an explicit target is used and the server returns a single root element that has the same `beam-id`/`beam-item-id` as the target, Beam unwraps it and swaps only the target’s inner content. This prevents accidentally nesting the component inside itself.

**Exclusion:** Use `!selector` to explicitly skip an item:

```tsx
ctx.render(
  [<Box1 />, <Box2 />, <Box3 />],
  { target: "#a, !#skip, #c" }, // Box2 is skipped
);
```

### Async Components

`ctx.render()` fully supports HonoX async components:

```tsx
// Async component that fetches data
async function UserCard({ userId }: { userId: string }) {
  const user = await db.getUser(userId); // Async data fetch
  return (
    <div class="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
}

// Use directly in ctx.render() - no wrapper needed
export function loadUser(
  ctx: BeamContext<Env>,
  { id }: Record<string, unknown>,
) {
  return ctx.render(<UserCard userId={id as string} />, { target: "#user" });
}

// Works with arrays too
export function loadUsers(ctx: BeamContext<Env>) {
  return ctx.render(
    [<UserCard userId="1" />, <UserCard userId="2" />, <UserCard userId="3" />],
    { target: "#user1, #user2, #user3" },
  );
}

// Mixed sync and async
export function loadDashboard(ctx: BeamContext<Env>) {
  return ctx.render([
    <div>Static header</div>, // Sync
    <UserCard userId="current" />, // Async
    <StatsWidget />, // Async
  ]);
}
```

Async components are awaited automatically - no manual `Promise.resolve()` or helper functions needed.

---

### Streaming Actions

Turn any action into a streaming action by making it an **async generator** (`async function*`). Each `yield` pushes an update to the browser immediately — no waiting for the full response.

```tsx
export async function* loadProfile(ctx: BeamContext<Env>, { id }: Record<string, unknown>) {
  // First yield: show skeleton immediately
  yield ctx.render(<div id="profile">Loading…</div>)

  // Simulate slow API call
  await delay(1800)

  const user = await db.getUser(id as string)

  // Second yield: replace with real content
  yield ctx.render(
    <div id="profile">
      <h3>{user.name}</h3>
      <p>{user.role}</p>
    </div>
  )
}
```

Use it in HTML exactly like a regular action — no special attribute needed:

```html
<button beam-action="loadProfile" beam-include="id">Load Profile</button>
<div id="profile"></div>
```

#### Patterns

**Skeleton → Content** — yield a skeleton immediately so the user sees feedback, then yield the real content once the data is ready:

```tsx
export async function* loadProfile(ctx: BeamContext<Env>, { id }: Record<string, unknown>) {
  yield ctx.render(<SkeletonCard id="result" />)
  const user = await fetchUser(id)
  yield ctx.render(<UserCard id="result" user={user} />)
}
```

**Multi-step Progress** — yield after each step completes to show a live progress list:

```tsx
export async function* runPipeline(ctx: BeamContext<Env>, _: Record<string, unknown>) {
  const steps = ['Validating', 'Fetching', 'Processing', 'Saving']
  const done: string[] = []

  for (const step of steps) {
    yield ctx.render(<Pipeline done={done} current={step} pending={steps.slice(done.length + 1)} id="pipeline" />)
    await runStep(step)
    done.push(step)
  }

  yield ctx.render(<Pipeline done={done} complete id="pipeline" />)
}
```

**AI-style Text Streaming** — accumulate text and re-render on each chunk for a typewriter effect:

```tsx
export async function* streamText(ctx: BeamContext<Env>, _: Record<string, unknown>) {
  let text = ''
  for (const word of words) {
    text += (text ? ' ' : '') + word
    await delay(120)
    yield ctx.render(<p id="output">{text}<span class="cursor">▌</span></p>)
  }
  yield ctx.render(<p id="output">{text}</p>) // remove cursor
}
```

**Streaming into Modals and Drawers** — yield `ctx.modal()` or `ctx.drawer()` calls. The first yield opens the overlay; subsequent yields update its content:

```tsx
export async function* openProfileModal(ctx: BeamContext<Env>, { id }: Record<string, unknown>) {
  yield ctx.modal(<SkeletonProfile />, { size: 'md' }) // opens modal with skeleton

  const user = await fetchUser(id)

  yield ctx.modal(<UserProfile user={user} />, { size: 'md' }) // swaps in real content
}
```

```html
<button beam-modal="openProfileModal" beam-include="id">View Profile</button>
```

#### How It Works

- A regular action handler returns a single value → one DOM update.
- An async generator handler yields multiple values → one DOM update per yield, streamed over the WebSocket as each chunk is ready.
- The client processes chunks in order; each chunk is a full `ActionResponse` (the same object a regular action returns).
- No special HTML attributes are needed — the server detects async generators automatically.

---

## Attribute Reference

### Actions

| Attribute             | Description                                                   | Example                                     |
| --------------------- | ------------------------------------------------------------- | ------------------------------------------- |
| `beam-action`         | Action name to call                                           | `beam-action="increment"`                   |
| `beam-target`         | CSS selector for where to render response                     | `beam-target="#counter"`                    |
| `beam-data-*`         | Pass data to the action                                       | `beam-data-id="123"`                        |
| `beam-include`        | Include values from inputs by beam-id, id, or name            | `beam-include="name,email,age"`             |
| `beam-swap`           | How to swap content: `replace`, `append`, `prepend`, `delete` | `beam-swap="replace"`                       |
| `beam-confirm`        | Show confirmation dialog before action                        | `beam-confirm="Delete this item?"`          |
| `beam-confirm-prompt` | Require typing text to confirm                                | `beam-confirm-prompt="Type DELETE\|DELETE"` |
| `beam-instant`        | Trigger on mousedown instead of click                         | `beam-instant`                              |
| `beam-disable`        | Disable element(s) during request                             | `beam-disable` or `beam-disable="#btn"`     |
| `beam-placeholder`    | Show placeholder in target while loading                      | `beam-placeholder="<p>Loading...</p>"`      |
| `beam-push`           | Push URL to browser history after action                      | `beam-push="/new-url"`                      |
| `beam-replace`        | Replace current URL in history                                | `beam-replace="?page=2"`                    |

Swap notes:

- `replace` replaces `target.innerHTML` (no DOM diff), then tries to preserve UX:
  - Keeps focused input caret/selection when possible.
  - Reinserts elements marked with `beam-keep` (matched by `beam-id`, `beam-item-id`, `id`, or input `name`).
  - If Alpine.js is present on the page, initializes any newly inserted DOM (`Alpine.initTree`).

Swap transitions (optional):

Add `beam-swap-transition` on the _target_ element to animate after swaps:

```html
<div id="results" beam-swap-transition="fade"></div>
```

Supported values: `fade`, `slide`, `scale`.

### Modals & Drawers

| Attribute          | Description                                       | Example                                |
| ------------------ | ------------------------------------------------- | -------------------------------------- |
| `beam-modal`       | Action to call and display result in modal        | `beam-modal="editUser"`                |
| `beam-drawer`      | Action to call and display result in drawer       | `beam-drawer="openCart"`               |
| `beam-size`        | Size for modal/drawer: `small`, `medium`, `large` | `beam-size="large"`                    |
| `beam-position`    | Drawer position: `left`, `right`                  | `beam-position="left"`                 |
| `beam-placeholder` | HTML to show while loading                        | `beam-placeholder="<p>Loading...</p>"` |
| `beam-close`       | Close the current modal/drawer when clicked       | `beam-close`                           |

Modals and drawers can also be returned from `beam-action` using context helpers:

```tsx
// Modal with options
return ctx.modal(render(<MyModal />), { size: "large", spacing: 20 });

// Drawer with options
return ctx.drawer(render(<MyDrawer />), { position: "left", size: "medium" });
```

### Forms

| Attribute     | Description                            | Example                         |
| ------------- | -------------------------------------- | ------------------------------- |
| `beam-action` | Action to call on submit (on `<form>`) | `<form beam-action="saveUser">` |
| `beam-reset`  | Reset form after successful submit     | `beam-reset`                    |

### Loading States

| Attribute              | Description                          | Example                           |
| ---------------------- | ------------------------------------ | --------------------------------- |
| `beam-loading-for`     | Show element while action is loading | `beam-loading-for="saveUser"`     |
| `beam-loading-for="*"` | Show for any loading action          | `beam-loading-for="*"`            |
| `beam-loading-data-*`  | Match specific parameters            | `beam-loading-data-id="123"`      |
| `beam-loading-class`   | Add class while loading              | `beam-loading-class="opacity-50"` |
| `beam-loading-remove`  | Hide element while NOT loading       | `beam-loading-remove`             |

### Validation

| Attribute       | Description                                    | Example                        |
| --------------- | ---------------------------------------------- | ------------------------------ |
| `beam-validate` | Target selector to update with validation      | `beam-validate="#email-error"` |
| `beam-watch`    | Event to trigger validation: `input`, `change` | `beam-watch="input"`           |
| `beam-debounce` | Debounce delay in milliseconds                 | `beam-debounce="300"`          |

### Input Watchers

| Attribute            | Description                                                 | Example                             |
| -------------------- | ----------------------------------------------------------- | ----------------------------------- |
| `beam-watch`         | Event to trigger action: `input`, `change`                  | `beam-watch="input"`                |
| `beam-debounce`      | Debounce delay in milliseconds                              | `beam-debounce="300"`               |
| `beam-throttle`      | Throttle interval in milliseconds (alternative to debounce) | `beam-throttle="100"`               |
| `beam-watch-if`      | Condition that must be true to trigger                      | `beam-watch-if="value.length >= 3"` |
| `beam-cast`          | Cast input value: `number`, `integer`, `boolean`, `trim`    | `beam-cast="number"`                |
| `beam-loading-class` | Add class to input while request is in progress             | `beam-loading-class="loading"`      |
| `beam-keep`          | Prevent element from being replaced during updates          | `beam-keep`                         |

### Dirty Form Tracking

| Attribute              | Description                                   | Example                           |
| ---------------------- | --------------------------------------------- | --------------------------------- |
| `beam-dirty-track`     | Enable dirty tracking on a form               | `<form beam-dirty-track>`         |
| `beam-dirty-indicator` | Show element when form is dirty               | `beam-dirty-indicator="#my-form"` |
| `beam-dirty-class`     | Toggle class instead of visibility            | `beam-dirty-class="has-changes"`  |
| `beam-warn-unsaved`    | Warn before leaving page with unsaved changes | `<form beam-warn-unsaved>`        |
| `beam-revert`          | Button to revert form to original values      | `beam-revert="#my-form"`          |
| `beam-show-if-dirty`   | Show element when form is dirty               | `beam-show-if-dirty="#my-form"`   |
| `beam-hide-if-dirty`   | Hide element when form is dirty               | `beam-hide-if-dirty="#my-form"`   |

### Conditional Form Fields

| Attribute          | Description                                | Example                                    |
| ------------------ | ------------------------------------------ | ------------------------------------------ |
| `beam-enable-if`   | Enable field when condition is true        | `beam-enable-if="#subscribe:checked"`      |
| `beam-disable-if`  | Disable field when condition is true       | `beam-disable-if="#country[value='']"`     |
| `beam-visible-if`  | Show field when condition is true          | `beam-visible-if="#source[value='other']"` |
| `beam-hidden-if`   | Hide field when condition is true          | `beam-hidden-if="#premium:checked"`        |
| `beam-required-if` | Make field required when condition is true | `beam-required-if="#business:checked"`     |

### Deferred Loading

| Attribute     | Description                               | Example                      |
| ------------- | ----------------------------------------- | ---------------------------- |
| `beam-defer`  | Load content when element enters viewport | `beam-defer`                 |
| `beam-action` | Action to call (used with `beam-defer`)   | `beam-action="loadComments"` |

### Polling

| Attribute       | Description                    | Example                   |
| --------------- | ------------------------------ | ------------------------- |
| `beam-poll`     | Enable polling on this element | `beam-poll`               |
| `beam-interval` | Poll interval in milliseconds  | `beam-interval="5000"`    |
| `beam-action`   | Action to call on each poll    | `beam-action="getStatus"` |

### Hungry Elements

| Attribute     | Description                                        | Example       |
| ------------- | -------------------------------------------------- | ------------- |
| `beam-hungry` | Auto-update when any response contains matching ID | `beam-hungry` |

### Out-of-Band Updates

| Attribute    | Description                                     | Example                         |
| ------------ | ----------------------------------------------- | ------------------------------- |
| `beam-touch` | Update additional elements (on server response) | `beam-touch="#sidebar,#footer"` |

### Optimistic UI

| Attribute         | Description                                       | Example                                  |
| ----------------- | ------------------------------------------------- | ---------------------------------------- |
| `beam-optimistic` | Immediately update with this HTML before response | `beam-optimistic="<div>Saving...</div>"` |

### Preloading & Caching

| Attribute      | Description                        | Example                |
| -------------- | ---------------------------------- | ---------------------- |
| `beam-preload` | Preload on hover: `hover`, `mount` | `beam-preload="hover"` |
| `beam-cache`   | Cache duration in seconds          | `beam-cache="60"`      |

### Infinite Scroll

| Attribute        | Description                                                | Example                  |
| ---------------- | ---------------------------------------------------------- | ------------------------ |
| `beam-infinite`  | Load more when scrolled near bottom (auto-trigger)         | `beam-infinite`          |
| `beam-load-more` | Load more on click (manual trigger)                        | `beam-load-more`         |
| `beam-action`    | Action to call for next page                               | `beam-action="loadMore"` |
| `beam-item-id`   | Unique ID for list items (deduplication + fresh data sync) | `beam-item-id={item.id}` |

### Navigation Feedback

| Attribute        | Description                                                 | Example          |
| ---------------- | ----------------------------------------------------------- | ---------------- |
| `beam-nav`       | Mark container as navigation (children get `.beam-current`) | `<nav beam-nav>` |
| `beam-nav-exact` | Only match exact URL paths                                  | `beam-nav-exact` |

### Offline Detection

| Attribute              | Description                                 | Example                                |
| ---------------------- | ------------------------------------------- | -------------------------------------- |
| `beam-offline`         | Show element when offline, hide when online | `beam-offline`                         |
| `beam-offline-class`   | Toggle class instead of visibility          | `beam-offline-class="offline-warning"` |
| `beam-offline-disable` | Disable element when offline                | `beam-offline-disable`                 |

### Auto-Reconnect

| Element / Attribute                                              | Description                                       |
| ---------------------------------------------------------------- | ------------------------------------------------- |
| `<meta name="beam-reconnect-interval" content="5000">`          | Fixed retry interval (ms) after initial backoff   |
| `beam-disconnected`                                              | Show element while disconnected, hide on reconnect |
| `<meta name="beam-auto-connect" content="true">`                 | Explicitly opt into eager Beam connection         |

### Conditional Show/Hide

| Attribute          | Description                                  | Example                    |
| ------------------ | -------------------------------------------- | -------------------------- |
| `beam-switch`      | Watch this field and control target elements | `beam-switch=".options"`   |
| `beam-show-for`    | Show when switch value matches               | `beam-show-for="premium"`  |
| `beam-hide-for`    | Hide when switch value matches               | `beam-hide-for="free"`     |
| `beam-enable-for`  | Enable when switch value matches             | `beam-enable-for="admin"`  |
| `beam-disable-for` | Disable when switch value matches            | `beam-disable-for="guest"` |

### Auto-submit Forms

| Attribute         | Description                        | Example               |
| ----------------- | ---------------------------------- | --------------------- |
| `beam-autosubmit` | Submit form when any field changes | `beam-autosubmit`     |
| `beam-debounce`   | Debounce delay in milliseconds     | `beam-debounce="300"` |

### Boost Links

| Attribute        | Description                                                     | Example                  |
| ---------------- | --------------------------------------------------------------- | ------------------------ |
| `beam-boost`     | Upgrade descendant same-origin links into Beam SSR visits       | `<main beam-boost>`      |
| `beam-boost-off` | Exclude specific links from Beam visits                         | `beam-boost-off`         |
| `beam-visit`     | Explicitly mark a link as a Beam visit                          | `<a beam-visit href>`    |
| `beam-patch`     | Visit with patch-style scroll semantics                         | `<a beam-patch href>`    |
| `beam-navigate`  | Visit with navigation-style scroll semantics                    | `<a beam-navigate href>` |

### Keep Elements

| Attribute   | Description                         | Example             |
| ----------- | ----------------------------------- | ------------------- |
| `beam-keep` | Preserve element during DOM updates | `<video beam-keep>` |

### Client-Side Reactive State (No Server Round-Trip)

Beam supports a single client-side UI model: reactive state + declarative bindings. Use `beam-state` to define state, `beam-show` / `beam-class` / `beam-text` / `beam-attr-*` to bind UI, and `beam-click` / `beam-model` / `beam-state-toggle` to mutate state.

#### Reactive State

Fine-grained reactivity for UI components (carousels, tabs, accordions) without server round-trips.

| Attribute           | Description                                               | Example                            |
| ------------------- | --------------------------------------------------------- | ---------------------------------- |
| `beam-state`        | Declare reactive state (JSON, key-value, or simple value) | `beam-state="tab: 0; total: 5"`    |
| `beam-id`           | Name the state for cross-component access                 | `beam-id="cart"`                   |
| `beam-state-ref`    | Reference a named state from elsewhere                    | `beam-state-ref="cart"`            |
| `beam-init`         | Run JS expression once after state is initialized         | `beam-init="setInterval(() => { index = (index+1) % total }, 3000)"` |
| `beam-cloak`        | Hide element until its reactive scope is ready            | `<div beam-state="open: false" beam-cloak>` |
| `beam-text`         | Bind text content to expression                           | `beam-text="count"`                |
| `beam-attr-*`       | Bind any attribute to expression                          | `beam-attr-disabled="count === 0"` |
| `beam-show`         | Show/hide element based on expression                     | `beam-show="open"`                 |
| `beam-class`        | Toggle classes (simplified or JSON syntax)                | `beam-class="active: tab === 0"`   |
| `beam-click`        | Click handler that mutates state                          | `beam-click="open = !open"`        |
| `beam-state-toggle` | Toggle (or set) a state property (sugar)                  | `beam-state-toggle="open"`         |
| `beam-model`        | Two-way binding for inputs                                | `beam-model="firstName"`           |

---

## Swap Modes

Control how content is inserted into the target element:

| Mode      | Description                                                                                 |
| --------- | ------------------------------------------------------------------------------------------- |
| `replace` | Replace target HTML (default) while preserving focus and `beam-keep` elements when possible |
| `append`  | Add to the end of target                                                                    |
| `prepend` | Add to the beginning of target                                                              |
| `delete`  | Remove the target element                                                                   |

```html
<!-- Append new items to a list -->
<button beam-action="addItem" beam-swap="append" beam-target="#items">
  Add Item
</button>

<!-- Replace update -->
<button beam-action="refresh" beam-swap="replace" beam-target="#content">
  Refresh
</button>
```

---

## Loading States

### Global Loading

Show a loader for any action:

```html
<div beam-loading-for="*" class="spinner">Loading...</div>
```

### Per-Action Loading

Show a loader only for specific actions:

```html
<button beam-action="save">
  Save
  <span beam-loading-for="save" class="spinner"></span>
</button>
```

### Parameter Matching

Show loading state only when parameters match:

```html
<div class="item">
  <span>Item 1</span>
  <span beam-loading-for="deleteItem" beam-loading-data-id="1">
    Deleting...
  </span>
  <button beam-action="deleteItem" beam-data-id="1">Delete</button>
</div>
```

### Loading Classes

Toggle a class instead of showing/hiding:

```html
<div beam-loading-for="save" beam-loading-class="opacity-50">
  Content that fades while saving
</div>
```

---

## Real-time Validation

Validate form fields as the user types:

```html
<form beam-action="submitForm" beam-target="#result">
  <input
    name="email"
    beam-validate="#email-error"
    beam-watch="input"
    beam-debounce="300"
  />
  <div id="email-error"></div>

  <button type="submit">Submit</button>
</form>
```

The action receives `_validate` parameter indicating which field triggered validation:

```tsx
export function submitForm(c) {
  const data = await c.req.parseBody();
  const validateField = data._validate;

  if (validateField === "email") {
    // Return just the validation feedback
    if (data.email === "taken@example.com") {
      return <div class="error">Email already taken</div>;
    }
    return <div class="success">Email available</div>;
  }

  // Full form submission
  return <div>Form submitted!</div>;
}
```

---

## Input Watchers

Trigger actions on input events without forms. Great for live search, auto-save, and real-time updates.

### Basic Usage

```html
<!-- Live search with debounce -->
<input
  name="q"
  placeholder="Search..."
  beam-action="search"
  beam-target="#results"
  beam-watch="input"
  beam-debounce="300"
/>
<div id="results"></div>
```

### Throttle vs Debounce

Use `beam-throttle` for real-time updates (like range sliders) where you want periodic updates:

```html
<!-- Range slider with throttle - updates every 100ms while dragging -->
<input
  type="range"
  name="price"
  beam-action="updatePrice"
  beam-target="#price-display"
  beam-watch="input"
  beam-throttle="100"
/>

<!-- Search with debounce - waits 300ms after user stops typing -->
<input
  name="q"
  beam-action="search"
  beam-target="#results"
  beam-watch="input"
  beam-debounce="300"
/>
```

### Conditional Triggers

Only trigger action when a condition is met:

```html
<!-- Only search when 3+ characters are typed -->
<input
  name="q"
  placeholder="Type 3+ chars to search..."
  beam-action="search"
  beam-target="#results"
  beam-watch="input"
  beam-watch-if="value.length >= 3"
  beam-debounce="300"
/>
```

The condition has access to `value` (current input value) and `this` (the element).

### Type Casting

Cast input values before sending to the server:

```html
<!-- Send as number instead of string -->
<input
  type="range"
  name="quantity"
  beam-action="updateQuantity"
  beam-cast="number"
  beam-watch="input"
/>
```

Cast types:

- `number` - Parse as float
- `integer` - Parse as integer
- `boolean` - Convert "true"/"1"/"yes" to true
- `trim` - Trim whitespace

### Loading Feedback

Add a class to the input while the request is in progress:

```html
<input
  name="q"
  placeholder="Search..."
  beam-action="search"
  beam-target="#results"
  beam-watch="input"
  beam-loading-class="input-loading"
/>

<style>
  .input-loading {
    border-color: blue;
    animation: pulse 1s infinite;
  }
</style>
```

### Preventing Element Replacement

Use `beam-keep` to prevent an element from being replaced during updates. This keeps the element exactly as-is, preserving its state (focus, value, etc.):

```html
<input
  name="bio"
  beam-action="validateBio"
  beam-target="#bio-feedback"
  beam-watch="input"
  beam-keep
/>
```

Since the input isn't replaced, focus and cursor position are naturally preserved.

Beam matches kept elements by stable identity in this order:

- `beam-id`
- `beam-item-id`
- `id`
- unique form control `name` as a best-effort fallback

For the most reliable behavior, give kept elements a `beam-id`, `beam-item-id`, or `id`. If multiple inputs share the same `name`, Beam will not preserve by `name` alone.

Use cases:

- `beam-id`: shared UI regions like badges, panels, counters, and named state scopes
- `beam-item-id`: repeated records in feeds, tables, carts, and paginated lists
- `id`: one-off DOM anchors when the element already has a stable page-level ID

### Auto-Save on Blur

Trigger action when the user leaves the field:

```html
<input
  name="username"
  beam-action="saveField"
  beam-data-field="username"
  beam-target="#save-status"
  beam-watch="change"
  beam-keep
/>
<div id="save-status">Not saved yet</div>
```

---

## Dirty Form Tracking

Track form changes and warn users before losing unsaved work.

### Basic Usage

```html
<form id="profile-form" beam-dirty-track>
  <input name="username" value="johndoe" />
  <input name="email" value="john@example.com" />
  <button type="submit">Save</button>
</form>
```

The form gets a `beam-dirty` attribute when modified.

### Dirty Indicator

Show an indicator when the form has unsaved changes:

```html
<h2>
  Profile Settings
  <span beam-dirty-indicator="#profile-form" class="unsaved-badge">*</span>
</h2>

<form id="profile-form" beam-dirty-track>
  <!-- form fields -->
</form>

<style>
  [beam-dirty-indicator] {
    display: none;
    color: orange;
  }
</style>
```

### Revert Changes

Add a button to restore original values:

```html
<form id="profile-form" beam-dirty-track>
  <input name="username" value="johndoe" />
  <input name="email" value="john@example.com" />

  <button
    type="button"
    beam-revert="#profile-form"
    beam-show-if-dirty="#profile-form"
  >
    Revert Changes
  </button>
  <button type="submit">Save</button>
</form>
```

The revert button only shows when the form is dirty.

### Unsaved Changes Warning

Warn users before navigating away with unsaved changes:

```html
<form beam-dirty-track beam-warn-unsaved>
  <input name="important-data" />
  <button type="submit">Save</button>
</form>
```

The browser will show a confirmation dialog if the user tries to close the tab or navigate away.

### Conditional Visibility

Show/hide elements based on dirty state:

```html
<form id="settings" beam-dirty-track>
  <!-- Show when dirty -->
  <div beam-show-if-dirty="#settings" class="warning">
    You have unsaved changes
  </div>

  <!-- Hide when dirty -->
  <div beam-hide-if-dirty="#settings">All changes saved</div>
</form>
```

---

## Conditional Form Fields

Enable, disable, show, or hide fields based on other field values—all client-side, no server round-trip.

### Enable/Disable Fields

```html
<label>
  <input type="checkbox" id="subscribe" name="subscribe" />
  Subscribe to newsletter
</label>

<!-- Enabled only when checkbox is checked -->
<input
  type="email"
  name="email"
  placeholder="Enter your email..."
  beam-enable-if="#subscribe:checked"
  disabled
/>
```

### Show/Hide Fields

```html
<select name="source" id="source">
  <option value="">-- Select --</option>
  <option value="google">Google</option>
  <option value="friend">Friend</option>
  <option value="other">Other</option>
</select>

<!-- Only visible when "other" is selected -->
<div beam-visible-if="#source[value='other']">
  <label>Please specify</label>
  <input type="text" name="source-other" />
</div>
```

### Required Fields

```html
<label>
  <input type="checkbox" id="business" name="is-business" />
  This is a business account
</label>

<!-- Required only when checkbox is checked -->
<input
  type="text"
  name="company"
  placeholder="Company name"
  beam-required-if="#business:checked"
/>
```

### Condition Syntax

Conditions support:

- `:checked` - Checkbox/radio is checked
- `:disabled` - Element is disabled
- `:empty` - Input has no value
- `[value='x']` - Input value equals 'x'
- `[value!='x']` - Input value not equals 'x'
- `[value>'5']` - Numeric comparison

```html
<!-- Enable when country is selected -->
<select beam-disable-if="#country[value='']" name="state">
  <!-- Show when amount is over 100 -->
  <div beam-visible-if="#amount[value>'100']">
    Large order discount applied!
  </div>
</select>
```

---

## Deferred Loading

Load content only when it enters the viewport:

```html
<div beam-defer beam-action="loadComments" class="placeholder">
  Loading comments...
</div>
```

The action is called once when the element becomes visible (with 100px margin).

---

## Polling

Auto-refresh content at regular intervals:

```html
<div beam-poll beam-interval="5000" beam-action="getNotifications">
  <!-- Updated every 5 seconds -->
</div>
```

Polling automatically stops when the element is removed from the DOM.

---

## Hungry Elements

Elements marked with `beam-hungry` automatically update whenever any action returns HTML with matching stable identity:

```html
<!-- This badge updates when any action returns beam-id="cart-count" -->
<span beam-id="cart-count" beam-hungry>0</span>

<!-- Clicking this updates both #cart-result AND the hungry badge -->
<button beam-action="addToCart" beam-target="#cart-result">Add to Cart</button>
```

```tsx
export function addToCart(c) {
  const cartCount = getCartCount() + 1;
  return (
    <>
      <div>Item added to cart!</div>
      {/* This updates the hungry element */}
      <span beam-id="cart-count">{cartCount}</span>
    </>
  );
}
```

Hungry matching checks identity in this order:

- `beam-id`
- `beam-item-id`
- `id`

For shared UI regions, prefer `beam-id`. For repeated records, prefer `beam-item-id`.

---

## Out-of-Band Updates

Update multiple elements from a single action using `beam-touch`:

```tsx
export function updateDashboard(c) {
  return (
    <>
      <div>Main content updated</div>
      <div beam-touch="#sidebar">New sidebar content</div>
      <div beam-touch="#notifications">3 new notifications</div>
    </>
  );
}
```

---

## Confirmation Dialogs

Require user confirmation before destructive actions:

```html
<!-- Simple confirmation -->
<button beam-action="deletePost" beam-confirm="Delete this post?">
  Delete
</button>

<!-- Require typing to confirm (for high-risk actions) -->
<button
  beam-action="deleteAccount"
  beam-confirm="This will permanently delete your account"
  beam-confirm-prompt="Type DELETE to confirm|DELETE"
>
  Delete Account
</button>
```

---

## Instant Click

Trigger actions on `mousedown` instead of `click` for ~100ms faster response:

```html
<button beam-action="navigate" beam-instant>Next Page</button>
```

---

## Disable During Request

Prevent double-submissions by disabling elements during requests:

```html
<!-- Disable the button itself -->
<button beam-action="save" beam-disable>Save</button>

<!-- Disable specific elements -->
<form beam-action="submit" beam-disable="#submit-btn, .form-inputs">
  <input class="form-inputs" name="email" />
  <button id="submit-btn" type="submit">Submit</button>
</form>
```

---

## Placeholders

Show loading content in the target while waiting for response:

```html
<!-- Inline HTML placeholder -->
<button
  beam-action="loadContent"
  beam-target="#content"
  beam-placeholder="<div class='skeleton'>Loading...</div>"
>
  Load Content
</button>

<!-- Reference a template -->
<button
  beam-action="loadContent"
  beam-target="#content"
  beam-placeholder="#loading-template"
>
  Load Content
</button>

<template id="loading-template">
  <div class="skeleton-loader">
    <div class="skeleton-line"></div>
    <div class="skeleton-line"></div>
  </div>
</template>
```

---

## Navigation Feedback

Automatically highlight current page links:

```html
<nav beam-nav>
  <a href="/home">Home</a>
  <!-- Gets .beam-current when on /home -->
  <a href="/products">Products</a>
  <!-- Gets .beam-current when on /products/* -->
  <a href="/about" beam-nav-exact>About</a>
  <!-- Only exact match -->
</nav>
```

Links also get `.beam-active` class while loading.

CSS classes:

- `.beam-current` - Link matches current URL
- `.beam-active` - Action is in progress

---

## Offline Detection

Show/hide content based on connection status:

```html
<!-- Show warning when offline -->
<div beam-offline class="offline-banner">
  You are offline. Changes won't be saved.
</div>

<!-- Disable buttons when offline -->
<button beam-action="save" beam-offline-disable>Save</button>
```

The `body` also gets `.beam-offline` class when disconnected.

---

## Auto-Reconnect

Beam automatically reconnects when the WebSocket drops (e.g. server restart, network blip). No configuration required — it works out of the box.

### Reconnect Schedule

| Attempt | Delay |
| ------- | ----- |
| 1st     | 1s    |
| 2nd     | 3s    |
| 3rd     | 5s    |
| 4th+    | 5s (configurable) |

After the first three stepped attempts, Beam retries indefinitely at a fixed interval until the connection is restored.

### Configuring the Interval

Override the fixed interval with a `<meta>` tag in your `<head>`:

```html
<!-- Retry every 10 seconds after the initial backoff steps -->
<meta name="beam-reconnect-interval" content="10000">
```

The value is in milliseconds. Values below 1000ms are ignored (minimum 1s).

### Disconnect Indicator

Show UI while disconnected using `beam-disconnected`:

```html
<div beam-disconnected style="display:none" class="banner">
  Reconnecting...
</div>
```

The element is shown automatically on disconnect and hidden on reconnect. The `body` also receives the `.beam-disconnected` class while offline.

### Events

| Event                  | Fires when                          |
| ---------------------- | ----------------------------------- |
| `beam:disconnected`    | WebSocket connection drops          |
| `beam:reconnected`     | Connection successfully restored    |

```javascript
window.addEventListener('beam:reconnected', () => {
  console.log('Back online!')
})
```

---

## Conditional Show/Hide

Toggle element visibility based on form field values (no server round-trip):

```html
<select name="plan" beam-switch=".plan-options">
  <option value="free">Free</option>
  <option value="pro">Pro</option>
  <option value="enterprise">Enterprise</option>
</select>

<div class="plan-options" beam-show-for="free">
  Free plan: 5 projects, 1GB storage
</div>

<div class="plan-options" beam-show-for="pro">
  Pro plan: Unlimited projects, 100GB storage
</div>

<div class="plan-options" beam-show-for="enterprise">
  Enterprise: Custom limits, dedicated support
</div>

<!-- Enable/disable based on selection -->
<button class="plan-options" beam-enable-for="pro,enterprise">
  Advanced Settings
</button>
```

---

## Auto-submit Forms

Automatically submit forms when fields change (great for filters):

```html
<form
  beam-action="filterProducts"
  beam-target="#products"
  beam-autosubmit
  beam-debounce="300"
>
  <input name="search" placeholder="Search..." />

  <select name="category">
    <option value="">All Categories</option>
    <option value="electronics">Electronics</option>
    <option value="clothing">Clothing</option>
  </select>

  <select name="sort">
    <option value="newest">Newest</option>
    <option value="price">Price</option>
  </select>
</form>

<div id="products">
  <!-- Results update automatically as user changes filters -->
</div>
```

---

## Beam Visits

Upgrade regular SSR links into Beam-powered visits while keeping normal navigation as the fallback:

```html
<!-- Boost all eligible links in a container -->
<main beam-boost>
  <a href="/page1">Page 1</a>
  <!-- Uses Beam visit -->
  <a href="/page2">Page 2</a>
  <!-- Uses Beam visit -->
  <a href="https://external.com">External</a>
  <!-- Automatically left alone -->
  <a href="/download/report.pdf" beam-boost-off>Download</a>
  <!-- Explicitly opt out -->
</main>

<!-- Or opt in per link -->
<a href="/about" beam-visit beam-target="#content">About</a>
<a href="/products?page=2" beam-patch beam-target="#content">Next Page</a>
<a href="/login" beam-navigate beam-target="#content">Login</a>
```

Visited links:

- render the real SSR route internally through Beam
- update the specified target (default: the nearest `[beam-boost]` shell, otherwise `body`)
- update browser history and page title
- prefetch on hover/touch intent
- fall back to normal hard navigation when Beam cannot safely apply the visit

Beam automatically bypasses visits for:

- external links
- download links
- links with `target="_blank"`
- modifier-click / middle-click navigation
- links marked with `beam-boost-off`

Current scope:

- links are fully supported
- forms are intentionally not part of the visit lifecycle yet

Fallback behavior:

- if the route returns a redirect, non-HTML response, asset mismatch, opt-out signal, or cookie-writing response, Beam falls back to normal browser navigation so session/auth behavior stays correct

---

## History Management

Update browser URL after actions:

```html
<!-- Push new URL to history -->
<button beam-action="loadTab" beam-data-tab="settings" beam-push="/settings">
  Settings
</button>

<!-- Replace current URL (no new history entry) -->
<button beam-action="filter" beam-data-page="2" beam-replace="?page=2">
  Page 2
</button>
```

---

## Keep Elements

Preserve specific elements during DOM updates (useful for video players, animations):

```html
<div id="content">
  <!-- This video keeps playing during updates -->
  <video beam-keep src="video.mp4" autoplay></video>

  <!-- This content gets updated -->
  <div id="comments">
    <!-- Comments here -->
  </div>
</div>
```

---

## Client-Side Reactive State

Beam uses a single client-side UI model: reactive state + declarative bindings.

### Reactive State

Fine-grained reactivity for UI components like carousels, tabs, accordions, and modals. All declarative via HTML attributes.

#### beam-state Syntax Options

**1. Simple value with beam-id** (property name comes from beam-id):

```html
<div beam-state="false" beam-id="open">
  <button type="button" beam-state-toggle="open">Toggle</button>
  <div beam-show="open">Content</div>
</div>

<div beam-state="0" beam-id="count">
  <button beam-click="count++">
    Clicked <span beam-text="count"></span> times
  </button>
</div>
```

**2. Key-value pairs** (semicolon-separated):

```html
<div beam-state="tab: 0; total: 5">
  <button beam-click="tab = (tab + 1) % total">Next</button>
  <span beam-text="tab + 1"></span> of <span beam-text="total"></span>
</div>

<div beam-state="name: 'World'; greeting: 'Hello'">
  <span beam-text="greeting + ', ' + name + '!'"></span>
</div>
```

**3. JSON** (for arrays and nested objects):

```html
<div beam-state='{"items": [1, 2, 3], "config": {"enabled": true}}'>...</div>
```

#### beam-class Syntax Options

**1. Simplified syntax** (no JSON required):

```html
<!-- Single class -->
<button beam-class="active: tab === 0">Tab 1</button>

<!-- Multiple classes (semicolon-separated) -->
<div
  beam-class="text-red: hasError; text-green: !hasError; bold: important"
></div>
```

**2. Multiple classes with one condition** (quote the class names):

```html
<div
  beam-class="'bg-green text-white shadow-lg': isActive; 'bg-gray text-dark': !isActive"
></div>
```

**3. JSON** (backward compatible):

```html
<button beam-class="{ active: tab === 0, highlight: selected }">
  <div beam-class="{ 'text-green italic': !hasError, bold: important }"></div>
</button>
```

#### Examples

```html
<!-- Accordion -->
<div beam-state="open: false">
  <button beam-click="open = !open">Toggle</button>
  <div beam-show="open">
    <p>Expanded content here...</p>
  </div>
</div>

<!-- Tabs with simplified beam-class -->
<div beam-state="tab: 0">
  <button beam-click="tab = 0" beam-class="active: tab === 0">Tab 1</button>
  <button beam-click="tab = 1" beam-class="active: tab === 1">Tab 2</button>
  <button beam-click="tab = 2" beam-class="active: tab === 2">Tab 3</button>

  <div beam-show="tab === 0">Content for Tab 1</div>
  <div beam-show="tab === 1">Content for Tab 2</div>
  <div beam-show="tab === 2">Content for Tab 3</div>
</div>

<!-- Carousel (manual) -->
<div beam-state="slide: 0; total: 5">
  <button beam-click="slide = (slide - 1 + total) % total">← Prev</button>
  <span beam-text="slide + 1"></span> / <span beam-text="total"></span>
  <button beam-click="slide = (slide + 1) % total">Next →</button>
</div>

<!-- Auto-play carousel (beam-init starts the interval after state is ready) -->
<div
  beam-state="slide: 0; total: 5"
  beam-init="setInterval(() => { slide = (slide + 1) % total }, 3000)"
>
  <div class="overflow-hidden">
    <div
      class="flex transition-transform duration-500"
      beam-attr-style="'transform: translateX(-' + (slide * 100) + '%)'"
    >
      <!-- slides here, each min-w-full -->
    </div>
  </div>
  <button beam-click="slide = (slide - 1 + total) % total">← Prev</button>
  <button beam-click="slide = (slide + 1) % total">Next →</button>
</div>

<!-- Counter with attribute binding -->
<div beam-state="count: 0">
  <button beam-click="count--" beam-attr-disabled="count === 0">-</button>
  <span beam-text="count"></span>
  <button beam-click="count++">+</button>
</div>

<!-- Status indicator with multiple classes -->
<div beam-state="status: 'idle'">
  <div
    beam-class="status-idle: status === 'idle'; status-loading: status === 'loading'; status-error: status === 'error'"
  >
    <span beam-text="status"></span>
  </div>
</div>
```

#### beam-init — Run Code on State Initialization

`beam-init` runs a JavaScript expression **once** after the state scope is fully initialized. Use it for `setInterval` (auto-play), `setTimeout`, or any setup that needs access to the reactive state.

```html
<!-- Auto-play carousel -->
<div
  beam-state="slide: 0; total: 4"
  beam-init="setInterval(() => { slide = (slide + 1) % total }, 3000)"
>
  ...
</div>

<!-- Derived initial value -->
<div
  beam-state="count: 0; doubled: 0"
  beam-init="doubled = count * 2"
>
  <span beam-text="doubled"></span>
</div>
```

**Scoping:** `beam-init` must be on the same element as `beam-state` (or on an element inside a scope). The expression runs with the same reactive state context as all other directives in the scope.

**Note:** `beam-init` only works inside a `beam-state` scope — it has no effect on elements without a state ancestor.

#### beam-cloak — Prevent Flash of Unprocessed Content

`beam-cloak` hides an element until its reactive scope has fully initialized. Without it, elements with `beam-show` may briefly appear before Beam processes them.

Add it to the same element as `beam-state`. Beam removes the attribute automatically after setup.

```html
<!-- Without beam-cloak: the "Dropdown" content may flash visible on load -->
<!-- With beam-cloak: hidden until reactivity is ready, then shown correctly -->
<div beam-state="open: false" beam-cloak>
  <button beam-state-toggle="open">Toggle</button>
  <div beam-show="open">Dropdown content</div>
</div>
```

Beam ships a CSS rule that does the hiding:

```css
[beam-cloak] { display: none !important; }
```

This rule is included in `@benqoder/beam/styles`. If you are not importing the beam stylesheet, add it yourself.

#### Named State (Cross-Component)

Share state between different parts of the page. Named states (with `beam-id`) persist across server-driven updates:

```html
<!-- Cart state defined once -->
<div beam-state="count: 0" beam-id="cart">
  Cart: <span beam-text="count"></span> items
</div>

<!-- Add to cart button elsewhere -->
<button beam-state-ref="cart" beam-click="count++">Add to Cart</button>
```

**Note:** Named states persist when the DOM is updated by `beam-action`. This means reactive state is preserved even when server actions update the page.

#### Server-Driven Named State Updates

Server actions can update existing named state directly, without returning HTML. This is useful when the UI already has a `beam-state` scope and you only want to change its data.

Use `ctx.state(id, value)` for a single state update:

```tsx
export function refreshCart(ctx: BeamContext<Env>) {
  return ctx.state("cart", {
    count: 3,
    total: 29.99,
  });
}
```

Use `ctx.state({ ... })` to update multiple named states in one response:

```tsx
export function syncDashboard(ctx: BeamContext<Env>) {
  return ctx.state({
    cart: { count: 3, total: 29.99 },
    notifications: 7,
  });
}
```

```html
<div beam-state="count: 0; total: 0" beam-id="cart">
  Cart: <span beam-text="count"></span> items
  Total: $<span beam-text="total.toFixed(2)"></span>
</div>

<div beam-state="0" beam-id="notifications">
  Notifications: <span beam-text="notifications"></span>
</div>

<button beam-action="refreshCart">Refresh Cart</button>
<button beam-action="syncDashboard">Sync Everything</button>
```

Behavior:

- Updates target existing named states by `beam-id`
- Object payloads shallow-merge into object state
- Primitive payloads replace simple named values
- Elements using `beam-state-ref` update automatically
- Missing state IDs are ignored with a console warning

#### JavaScript API

Access reactive state programmatically:

```javascript
// Get named state
const cartState = beam.getState("cart");
cartState.count++; // Triggers reactive updates

// Get state by element
const el = document.querySelector("[beam-state]");
const state = beam.getState(el);

// Batch multiple updates
beam.batch(() => {
  state.a = 1;
  state.b = 2;
});

// Apply a named state update programmatically
beam.updateState("cart", { count: 4, total: 39.99 });
```

#### Standalone Usage (No Beam Server)

The reactivity system can be used independently without the Beam WebSocket server:

```typescript
// Just import reactivity - no server connection needed
import "@benqoder/beam/reactivity";
```

This is useful for:

- Static sites that don't need server communication
- Adding reactivity to existing projects
- Using with other frameworks

The API is exposed on `window.beamReactivity`:

```javascript
// When using standalone
const state = beamReactivity.getState("my-state");
state.count++;
```

### CSS

Or import the included CSS (swap transitions, modal/drawer styles):

```typescript
import "@benqoder/beam/styles";
// or
import "@benqoder/beam/beam.css";
```

### Migration from Alpine.js

**Before (Alpine.js):**

```html
<div x-data="{ open: false }">
  <button @click="open = !open">Menu</button>
  <div x-show="open" x-cloak>Content</div>
</div>
```

**After (Beam):**

```html
<div beam-state='{"open": false}' beam-cloak>
  <button type="button" beam-state-toggle="open">Menu</button>
  <div beam-show="open">Content</div>
</div>
```

> `beam-cloak` is the Beam equivalent of `x-cloak` — it hides the element until reactivity has initialized, preventing a flash of visible content.

**Before (Alpine.js dropdown):**

```html
<div x-data="{ open: false }" @click.outside="open = false">
  <button @click="open = !open">Account</button>
  <div x-show="open">Dropdown</div>
</div>
```

**After (Beam):**

```html
<div beam-state='{"open": false}'>
  <button type="button" beam-state-toggle="open">Account</button>
  <div beam-show="open">Dropdown</div>
</div>
```

---

## Server API

### createBeam

Creates a Beam instance with handlers:

```typescript
import { createBeam } from "@benqoder/beam";

const beam = createBeam<Env>({
  actions: { increment, decrement, openModal, openCart },
});
```

### render

Utility to render JSX to HTML string:

```typescript
import { render } from '@benqoder/beam'

const html = render(<div>Hello</div>)
```

---

## Vite Plugin Options

```typescript
beamPlugin({
  // Glob pattern for action handler files (must start with '/' for virtual modules)
  actions: "/app/actions/*.tsx", // default
});
```

---

## TypeScript

### Handler Types

```typescript
import type { ActionHandler, ActionResponse, BeamContext } from '@benqoder/beam'
import { render } from '@benqoder/beam'

// Action that returns HTML string
const myAction: ActionHandler<Env> = async (ctx, params) => {
  return '<div>Hello</div>'
}

// Action that returns ActionResponse with modal
const openModal: ActionHandler<Env> = async (ctx, params) => {
  return ctx.modal(render(<div>Modal content</div>), { size: 'medium' })
}

// Action that returns ActionResponse with drawer
const openDrawer: ActionHandler<Env> = async (ctx, params) => {
  return ctx.drawer(render(<div>Drawer content</div>), { position: 'right' })
}
```

### `BeamContext`

Beam actions receive a `BeamContext` with:

- `env` - Worker/runtime bindings
- `user` - resolved Beam user
- `request` - original request snapshot used to seed Beam
- `session` - Beam session adapter
- `requestContext?` - live Hono `Context` for the current internal action request when per-call middleware is enabled
- response helpers like `render()`, `state()`, `script()`, `redirect()`, `modal()`, and `drawer()`

```typescript
export function myAction(ctx: BeamContext<Env>) {
  const traceId = ctx.requestContext?.get('rpcTraceId')
  return ctx.render(<div>Trace: {traceId ?? 'none'}</div>)
}
```

### Virtual Module Types

Add to your `app/vite-env.d.ts`:

```typescript
/// <reference types="@benqoder/beam/virtual" />
```

---

## Examples

### Todo List

```tsx
// actions/todos.tsx
let todos = ["Learn Beam", "Build something"];

export function addTodo(c) {
  const text = c.req.query("text");
  if (text) todos.push(text);
  return <TodoList todos={todos} />;
}

export function deleteTodo(c) {
  const index = parseInt(c.req.query("index"));
  todos.splice(index, 1);
  return <TodoList todos={todos} />;
}

function TodoList({ todos }) {
  return (
    <ul>
      {todos.map((todo, i) => (
        <li>
          {todo}
          <button
            beam-action="deleteTodo"
            beam-data-index={i}
            beam-target="#todos"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
```

```html
<form beam-action="addTodo" beam-target="#todos" beam-reset>
  <input name="text" placeholder="New todo" />
  <button type="submit">Add</button>
</form>
<div id="todos">
  <!-- Todo list renders here -->
</div>
```

### Live Search

```tsx
// actions/search.tsx
export function search(c) {
  const query = c.req.query("q") || "";
  const results = searchDatabase(query);

  return (
    <ul>
      {results.map((item) => (
        <li>{item.name}</li>
      ))}
    </ul>
  );
}
```

```html
<input
  beam-action="search"
  beam-target="#results"
  beam-watch="input"
  beam-debounce="300"
  name="q"
  placeholder="Search..."
/>
<div id="results"></div>
```

### Shopping Cart with Badge

```tsx
// actions/cart.tsx
let cart = [];

export function addToCart(c) {
  const product = c.req.query("product");
  cart.push(product);

  return (
    <>
      <div>Added {product} to cart!</div>
      <span id="cart-badge">{cart.length}</span>
    </>
  );
}
```

```html
<span id="cart-badge" beam-hungry>0</span>

<button
  beam-action="addToCart"
  beam-data-product="Widget"
  beam-target="#message"
>
  Add Widget
</button>
<div id="message"></div>
```

---

## Session Management

Beam provides automatic session management with a simple `ctx.session` API. No boilerplate middleware required.

### Quick Start

1. **Enable sessions in vite.config.ts:**

```typescript
beamPlugin({
  actions: "/app/actions/*.tsx",
  session: true, // Enable with defaults (cookie storage)
});
```

2. **Add SESSION_SECRET to wrangler.json:**

```json
{
  "vars": {
    "SESSION_SECRET": "your-secret-key-change-in-production"
  }
}
```

3. **Use in actions:**

```typescript
// app/actions/cart.tsx
export async function addToCart(ctx: BeamContext<Env>, data) {
  const cart = await ctx.session.get<CartItem[]>('cart') || []
  cart.push({ productId: data.productId, qty: data.qty })
  await ctx.session.set('cart', cart)
  return <CartBadge count={cart.length} />
}
```

4. **Use in routes:**

```typescript
// app/routes/products/index.tsx
export default createRoute(async (c) => {
  const { session } = c.get('beam')
  const cart = await session.get<CartItem[]>('cart') || []

  return c.html(
    <Layout cartCount={cart.length}>
      <ProductList />
    </Layout>
  )
})
```

### Session API

```typescript
// Get a value (returns null if not set)
const cart = await ctx.session.get<CartItem[]>("cart");

// Set a value
await ctx.session.set("cart", [{ productId: "123", qty: 1 }]);

// Delete a value
await ctx.session.delete("cart");
```

### Storage Options

#### Cookie Storage (Default)

Session data is stored in a signed cookie. Good for small data (~4KB limit).

```typescript
beamPlugin({
  session: true, // Uses cookie storage
});

// Or with custom options:
beamPlugin({
  session: {
    secretEnvKey: "MY_SECRET", // Default: 'SESSION_SECRET'
    cookieName: "my_sid", // Default: 'beam_sid'
    maxAge: 86400, // Default: 1 year (in seconds)
  },
});
```

#### KV Storage (For WebSocket Actions)

Cookie storage is read-only in WebSocket context. For actions that modify session data via WebSocket, use KV storage:

```typescript
// vite.config.ts
beamPlugin({
  session: { storage: "/app/session-storage.ts" },
});
```

```typescript
// app/session-storage.ts
import { KVSession } from "@benqoder/beam";

export default (sessionId: string, env: { KV: KVNamespace }) =>
  new KVSession(sessionId, env.KV);
```

```json
{
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "your-kv-namespace-id"
    }
  ],
  "vars": {
    "SESSION_SECRET": "your-secret-key"
  }
}
```

### Architecture

```
Request comes in
    ↓
Read session ID from signed cookie (beam_sid)
    ↓
Create session adapter with sessionId + env
    ↓
ctx.session.get('cart')  → adapter.get()
ctx.session.set('cart')  → adapter.set()
```

**Two components:**

- **Session ID**: Always stored in a signed cookie (`beam_sid`)
- **Session data**: Configurable storage (cookies by default, KV optional)

### Key Points

- **Zero boilerplate** - Just enable in vite.config.ts and use `ctx.session`
- **Works in actions** - Use `ctx.session.get/set/delete`
- **Works in routes** - Use `c.get('beam').session.get/set/delete`
- **Cookie storage limit** - ~4KB total size
- **WebSocket limitation** - Cookie storage is read-only in WebSocket (use KV for write operations)
- **Signed cookies** - Session ID is cryptographically signed to prevent tampering

---

## Security: WebSocket Authentication

Beam uses **in-band authentication** to prevent Cross-Site WebSocket Hijacking (CSWSH) attacks. This is the pattern recommended by [capnweb](https://github.com/nickelsworth/capnweb).

### The Problem

WebSocket connections in browsers:

- **Always permit cross-site connections** (no CORS for WebSocket)
- **Automatically send cookies** with the upgrade request
- **Cannot use custom headers** for authentication

This means a malicious site could open a WebSocket to your server, and the browser would send your cookies, authenticating the attacker.

### The Solution: In-Band Authentication

Instead of relying on cookies, Beam requires clients to authenticate explicitly:

1. **Server generates a short-lived token** (embedded in same-origin page)
2. **WebSocket connects unauthenticated** (gets `PublicApi`)
3. **Client calls `authenticate(token)`** to get the full API
4. **Malicious sites can't get the token** (CORS blocks page requests)

### Setup

#### 1. Enable Sessions (Required)

The auth token is tied to sessions:

```typescript
// vite.config.ts
beamPlugin({
  actions: "/app/actions/*.tsx",
  session: true, // Uses env.SESSION_SECRET
});
```

#### 2. Use authMiddleware

```typescript
// app/server.ts
import { createApp } from "honox/server";
import { beam } from "virtual:beam";

const app = createApp({
  init(app) {
    app.use("*", beam.authMiddleware()); // Generates token
    beam.init(app);
  },
});

export default app;
```

#### 3. Inject Token in Layout

```tsx
// app/routes/_renderer.tsx
import { jsxRenderer } from "hono/jsx-renderer";

export default jsxRenderer((c, { children }) => {
  const token = c.get("beamAuthToken");

  return (
    <html>
      <head>
        <meta name="beam-token" content={token} />
        <script type="module" src="/app/client.ts"></script>
      </head>
      <body>{children}</body>
    </html>
  );
});
```

Or use the helper:

```tsx
import { beamTokenMeta } from "@benqoder/beam";
import { Raw } from "hono/html";

<head>
  <Raw html={beamTokenMeta(c.get("beamAuthToken"))} />
</head>;
```

#### 4. Set Environment Variable

```bash
# .dev.vars (local) or Cloudflare dashboard (production)
SESSION_SECRET=your-secret-key-at-least-32-chars
```

### How It Works

| Step                    | What Happens                                        |
| ----------------------- | --------------------------------------------------- |
| 1. Page Load            | Server generates 5-minute token, embeds in HTML     |
| 2. Client Connects      | WebSocket opens, gets `PublicApi` (unauthenticated) |
| 3. Client Authenticates | Calls `publicApi.authenticate(token)`               |
| 4. Server Validates     | Verifies signature, expiration, session match       |
| 5. Server Returns       | Full `BeamServer` API (authenticated)               |

### Security Properties

| Attack               | Result                                             |
| -------------------- | -------------------------------------------------- |
| Cross-site WebSocket | Can connect, but `authenticate()` fails (no token) |
| Stolen token         | Expires in 5 minutes, tied to session ID           |
| Replay attack        | Token is single-use per session                    |
| Token tampering      | HMAC-SHA256 signature verification fails           |

### Token Details

- **Algorithm**: HMAC-SHA256
- **Lifetime**: 5 minutes (configurable)
- **Payload**: `{ sid: sessionId, uid: userId, exp: timestamp }`
- **Format**: `base64(payload).base64(signature)`

### Generating Tokens Manually

If you need to generate tokens outside the middleware:

```typescript
const token = await beam.generateAuthToken(ctx);
```

---

## Per-Call Hono Middleware

Beam actions still originate from the browser over the WebSocket RPC session, but Beam can now re-enter a Hono app **once per RPC action call** on the server.

This gives you true per-call middleware for:

- authz checks
- tracing / request IDs
- tenancy / org loading
- audit logging
- rate limiting
- request-scoped resources

### Transport Model

When `rpcMiddlewareApp` is enabled:

- **Browser → Beam** stays on WebSocket RPC
- **Beam → Hono** becomes an internal synthetic request per action call
- **Hono → Beam** returns a streamed response
- **Beam → Browser** forwards those streamed chunks back over WebSocket

So the client does **not** switch to HTTP, but your server middleware still runs per RPC action.
The internal request path is Beam-managed server infrastructure, not a new browser-facing transport.

### Setup

```typescript
// app/server.ts
import { Hono } from "hono";
import { createApp } from "honox/server";
import { beam } from "virtual:beam";

const app = createApp({
  init(app) {
    const rpcApp = new Hono();

    app.use("*", beam.authMiddleware());
    rpcApp.use("*", beam.authMiddleware());

    rpcApp.use("*", async (c, next) => {
      c.set("rpcTraceId", crypto.randomUUID().slice(0, 8));
      await next();
    });

    beam.init(app, { rpcMiddlewareApp: rpcApp });
  },
});
```

### Accessing Hono Context Inside Actions

When an action runs through the internal Hono request pipeline, Beam adds the live Hono context to `ctx.requestContext`.

```tsx
export function inspectRequestContext(ctx: BeamContext<Env>) {
  return ctx.render(
    <pre>
      {JSON.stringify({
        method: ctx.requestContext?.req.method,
        path: ctx.requestContext?.req.path,
        action: ctx.requestContext?.req.param("action"),
        traceId: ctx.requestContext?.get("rpcTraceId"),
      }, null, 2)}
    </pre>,
    { target: "#result" },
  );
}
```

`ctx.requestContext` is useful when middleware has already loaded request-scoped data that your action wants to read. It is optional because direct Beam execution paths may not always have a live Hono request context attached.

### Request Lifecycle

Each RPC action call creates a **fresh** internal Hono request/context.

- Hono context is **not reused** across RPC calls
- WebSocket session can stay open while many internal Hono requests come and go
- a streamed action keeps its Hono request alive only for the lifetime of that stream
- after the action/stream completes, the Hono request is over

This is important for request-scoped systems like Hyperdrive: Beam does **not** hold one Hono request open for the whole WebSocket session.

### Streaming Still Works

Per-call middleware works with normal actions and async-generator streaming actions.

```tsx
export async function* streamRequestContext(ctx: BeamContext<Env>) {
  yield ctx.render(<div id="status">Connecting…</div>);

  await delay(300);

  yield ctx.render(
    <div id="status">
      Trace: {ctx.requestContext?.get("rpcTraceId")}
    </div>,
  );
}
```

Beam keeps the internal Hono request alive for that stream, reads the streamed response, and forwards each chunk back to the browser over WebSocket.

### Low-Level Override: `actionFetcher`

If you want full control over how Beam dispatches internal action requests, use `actionFetcher`:

```typescript
beam.init(app, {
  actionFetcher: (request, env) => myInternalApp.fetch(request, env),
});
```

Use `rpcMiddlewareApp` when you want the normal Hono experience. Use `actionFetcher` when you need a lower-level custom bridge.

---

## Programmatic API

Call actions directly from JavaScript using `window.beam`:

```javascript
// Call action with RPC only (no DOM update)
const response = await window.beam.logout();

// Call action and swap HTML into target
await window.beam.getCartBadge({}, "#cart-count");

// With swap mode
await window.beam.loadMoreProducts(
  { page: 2 },
  { target: "#products", swap: "append" },
);

// Full options object
await window.beam.addToCart(
  { productId: 123 },
  {
    target: "#cart-badge",
    swap: "replace", // 'replace' | 'append' | 'prepend'
  },
);
```

### API Signature

```typescript
window.beam.actionName(data?, options?) → Promise<ActionResponse>

// data: Record<string, unknown> - parameters passed to the action
// options: string | { target?: string, swap?: string }
//   - string shorthand: treated as target selector
//   - object: full options with target and swap mode

// ActionResponse: { html?: string | string[], script?: string, redirect?: string, target?: string }
```

### Response Handling

The API automatically handles:

- **HTML swapping**: If `options.target` is provided, swaps HTML into the target element
- **Script execution**: If response contains a script, executes it
- **Redirects**: If response contains a redirect URL, navigates to it

```javascript
// Server returns script - executed automatically
await window.beam.showNotification({ message: "Hello!" });

// Server returns redirect - navigates automatically
await window.beam.logout(); // ctx.redirect('/login')

// Server returns HTML + script - both handled
await window.beam.addToCart({ id: 42 }, "#cart-badge");
```

### Utility Methods

```javascript
window.beam.showToast(message, type?)  // Show toast notification
window.beam.closeModal()                // Close current modal
window.beam.closeDrawer()               // Close current drawer
window.beam.clearCache()                // Clear action cache
window.beam.isOnline()                  // Check connection status
window.beam.getSession()                // Get current session ID
window.beam.clearScrollState()          // Clear saved scroll state
```

---

## Server Redirects

Actions can trigger client-side redirects using `ctx.redirect()`:

```typescript
// app/actions/auth.tsx
export function logout(ctx: BeamContext<Env>) {
  // Clear session, etc.
  return ctx.redirect("/login");
}

export function requireAuth(ctx: BeamContext<Env>) {
  const user = ctx.session.get("user");
  if (!user) {
    return ctx.redirect("/login?next=" + encodeURIComponent(ctx.req.url));
  }
  // Continue with action...
}
```

The redirect is handled automatically on the client side, whether triggered via:

- Button/link click (`beam-action`)
- Form submission
- Programmatic call (`window.beam.actionName()`)

---

## State Preservation

### Pagination URL State

For pagination, users expect the back button to return them to the same page. Use `beam-replace` to update the URL without a full page reload:

```html
<button
  beam-action="getProducts"
  beam-params='{"page": 2}'
  beam-target="#product-list"
  beam-replace="?page=2"
>
  Page 2
</button>
```

When the user navigates away and clicks back, the browser loads the URL with `?page=2`, and your page can read this to show the correct page.

```tsx
// In your route handler
const page = parseInt(c.req.query("page") || "1");
const products = await getProducts(page);
```

### Infinite Scroll & Load More State

For infinite scroll and load more, Beam automatically preserves:

- **Loaded content**: All items that were loaded
- **Scroll position**: Where the user was on the page

This happens automatically when using `beam-infinite` or `beam-load-more`. The state is stored in the browser's `sessionStorage` with a 30-minute TTL.

#### Infinite Scroll (auto-trigger on visibility)

```tsx
<div id="product-list" class="product-grid">
  {products.map((p) => (
    <ProductCard product={p} />
  ))}
  {hasMore && (
    <div
      class="load-more-sentinel"
      beam-infinite
      beam-action="loadMoreInfinite"
      beam-params='{"page": 2}'
      beam-target="#product-list"
    />
  )}
</div>
```

#### Load More Button (click to trigger)

```tsx
<div id="product-list" class="product-grid">
  {products.map((p) => (
    <ProductCard product={p} />
  ))}
  {hasMore && (
    <button
      class="load-more-btn"
      beam-load-more
      beam-action="loadMoreProducts"
      beam-params='{"page": 2}'
      beam-target="#product-list"
    >
      Load More
    </button>
  )}
</div>
```

Both patterns work the same way:

1. User loads more content (scroll or click)
2. User navigates away (clicks a product)
3. User clicks the back button
4. Content and scroll position are restored
5. Fresh server data is applied over cached items (using `beam-item-id`)

#### Keeping Items Fresh with `beam-item-id`

When restoring from cache, the server still renders fresh Page 1 data. To sync fresh data with cached items, add `beam-item-id` to your list items:

```tsx
<!-- Any repeated list item with a stable unique identifier -->
<div class="product-card" beam-item-id={product.id}>...</div>
<div class="comment" beam-item-id={comment.id}>...</div>
<article beam-item-id={post.slug}>...</article>
```

Use `beam-item-id` for repeated records instead of plain `id`. It is purpose-built for deduplication, cache restore, and append/prepend freshness.

On back navigation:

1. Cache is restored (all loaded items + scroll position)
2. Fresh server items are applied over matching cached items
3. Server data takes precedence for items in both

This ensures Page 1 items always have fresh data (prices, stock, etc.) while preserving the full scroll state.

#### Automatic Deduplication

When using `beam-item-id`, Beam automatically handles duplicate items when appending or prepending content:

1. **Duplicates are replaced**: If an item with the same `beam-item-id` already exists, it's updated with fresh data
2. **No double-insertion**: The duplicate is removed from incoming HTML after updating

This is useful when:

- New items are inserted while the user is scrolling (causing offset shifts)
- Real-time updates add items that might already exist
- Race conditions between pagination requests

```html
<!-- Items with beam-item-id are automatically deduplicated -->
<div id="feed" class="post-list">
  <article beam-item-id="post-123">...</article>
  <article beam-item-id="post-124">...</article>
</div>
```

If incoming content contains `post-123` again, the existing one is updated with fresh data instead of adding a duplicate.

The action should return the new items plus the next trigger (sentinel or button):

```tsx
// app/actions/loadMore.tsx
export async function loadMoreProducts(ctx, { page }) {
  const items = await getItems(page);
  const hasMore = await hasMoreItems(page);

  return (
    <>
      {items.map((item) => (
        <ProductCard product={item} />
      ))}
      {hasMore ? (
        <button
          beam-load-more
          beam-action="loadMoreProducts"
          beam-params={JSON.stringify({ page: page + 1 })}
          beam-target="#product-list"
        >
          Load More
        </button>
      ) : (
        <p>No more items</p>
      )}
    </>
  );
}
```

#### Clearing Scroll State

To manually clear the saved scroll state:

```javascript
window.beam.clearScrollState();
```

This is useful when you want to force a fresh load, such as after a filter change or form submission.

---

## Browser Support

Beam requires modern browsers with WebSocket support:

- Chrome 16+
- Firefox 11+
- Safari 7+
- Edge 12+

---

## License

MIT
