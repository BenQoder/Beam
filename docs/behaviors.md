# Client Behaviors

Available in Beam 1.5.0 and later.

Client behaviors are Beam's lifecycle-owned progressive-enhancement layer.
They attach trusted application code to useful server-rendered HTML without
requiring a component framework or moving UI authority into arbitrary markup.

Use a behavior when an interaction needs reusable client logic, private state,
event delegation, effects, timers, observers, or animation timelines. Keep
server actions authoritative for pricing, inventory, permissions, and other
trusted data.

## Setup

Define behaviors in application code and import the registration module from
the client entry:

```ts
// app/client.ts
import '@benqoder/beam/client'
import './behaviors'
```

```ts
// app/behaviors.ts
import { defineBehavior, registerBehaviors } from '@benqoder/beam/behaviors'

const counter = defineBehavior<{ initial?: number }>((ctx) => {
  const state = ctx.reactive({ count: ctx.props.initial ?? 0 })
  const output = ctx.root.querySelector<HTMLElement>('[data-count]')!

  ctx.on(ctx.root, 'click', (event) => {
    if (!(event.target instanceof Element)) return
    if (event.target.closest('[data-increment]')) state.count += 1
  })

  ctx.effect(() => {
    output.textContent = String(state.count)
  })
})

registerBehaviors({
  'app-counter@1': counter,
})
```

```html
<section
  beam-behavior="app-counter@1"
  beam-behavior-props='{"initial":2}'
>
  <output data-count>2</output>
  <button type="button" data-increment>Increment</button>
</section>
```

Names should be explicit and versioned. Markup can reference only definitions
registered by trusted application code. An unknown name logs one warning and
leaves its SSR content unchanged.

## Defining a behavior

`defineBehavior()` accepts either a mount function or a definition object:

```ts
const tabs = defineBehavior<TabsProps>({
  capabilities: {
    actions: ['selectTab'],
    readsState: ['account'],
    roles: ['tab', 'panel'],
  },
  parseProps(value, root) {
    const input = value ? JSON.parse(value) : {}
    return { initial: Number(input.initial) || 0 }
  },
  async mount(ctx) {
    // Set up the instance.
    return {
      async update(change) {
        if (change.kind === 'props') {
          // ctx.props is the latest successfully parsed value.
        }
        if (change.kind === 'content') {
          // Re-query content changed by a known Beam swap.
        }
      },
    }
  },
})
```

Without `parseProps`, `beam-behavior-props` must contain a JSON object. Missing
or empty props become `{}`. If initial parsing fails, Beam keeps the SSR markup,
marks the root as errored, and does not mount it. A failed props update leaves
the last valid props active.

`capabilities` is descriptive metadata for audits and tooling. It does not
grant permissions or dynamically load code.

## Context API

| Member | Purpose |
| --- | --- |
| `root` | The behavior's owning `HTMLElement`. |
| `props` | The latest successfully parsed props value. |
| `signal` | Aborted before cleanup begins when the instance is removed or replaced. |
| `reactive(initial)` | Creates private reactive state cloned for this instance. |
| `effect(fn)` | Runs a tracked Beam effect and disposes it automatically. |
| `on(target, event, listener, options?)` | Adds an owned listener and removes it automatically. |
| `cleanup(fn)` | Registers synchronous or asynchronous cleanup. |
| `getState(id)` | Reads an explicitly named shared Beam state. |

Resources registered after abort are suppressed or cleaned immediately.
Application code should still check `ctx.signal.aborted` after an `await`
before performing late DOM work; aborting cannot stop arbitrary JavaScript.

## Guarding programmatic action responses

Beam 1.5.1 adds a pre-apply guard for behaviors that dispatch actions
imperatively. This lets an instance implement latest-intent-wins without
allowing an older response to overwrite newer server-confirmed UI:

```ts
const productOptions = defineBehavior((ctx) => {
  let latestIntent = 0

  ctx.on(ctx.root, 'click', async (event) => {
    const option = ownedTarget(ctx.root, event.target, '[data-option]')
    if (!option) return

    // Do not also let beam-action dispatch the same interaction.
    event.preventDefault()

    const intent = ++latestIntent
    try {
      const response = await window.beam.selectProductOption(
        { value: option.dataset.option },
        {
          guard: () => !ctx.signal.aborted && intent === latestIntent,
        },
      )

      // The guard protects Beam-owned effects. Guard local reconciliation too.
      if (ctx.signal.aborted || intent !== latestIntent) return
      reconcile(response.json)
    } catch (error) {
      // Transport failures reject independently. Ignore stale local failures.
      if (ctx.signal.aborted || intent !== latestIntent) return
      showFailure(error)
    }
  })
})
```

The `guard(response)` callback is synchronous and runs exactly once for each
action-response chunk, immediately before Beam applies that chunk. Returning
`false` skips the complete chunk: errors, redirects, modals, drawers, named
state, island updates/upserts/removals, events, HTML, and scripts are all
suppressed. Beam never partially applies a vetoed chunk. The raw chunk is still
read from the stream and can still be the value returned when the action
promise resolves.

Streaming guards are deliberately **per chunk**, not whole-response buffers.
An accepted progress chunk remains applied; if a newer intent begins, later
chunks from the older stream can be rejected. Use one final effect-bearing
chunk when a stream must commit atomically as a whole.

If the guard throws, the action promise rejects and that chunk is not applied.
A non-boolean return value—including a `Promise` from an async guard—also
rejects before application; guards must make their decision synchronously.
A transport failure has no response to guard: it rejects that dispatch and
emits the normal `beam:action-error`, without cancelling or suppressing another
dispatch. Revision-check a behavior's local `catch` and post-`await`
reconciliation as shown above.

An accepted chunk may contain both `error` and authoritative effects. Beam
reports the error and still applies co-located state, HTML, and other fields;
this matters when a server mutation commits but rendering its fragment fails.
Use `response.json` to distinguish mutation outcome from presentation outcome.
For shared mirrors such as cart counts, include a server revision in the same
effect-bearing chunk and reject revisions older than the newest confirmed one:

```ts
import type { BeamResponseGuard } from '@benqoder/beam'

let newestCartRevision = 0

const guard: BeamResponseGuard = (response) => {
  const revision = (response.json as { cartRevision?: number } | undefined)
    ?.cartRevision
  if (revision == null) return true
  if (revision < newestCartRevision) return false
  newestCartRevision = revision
  return true
}
```

A guard cannot order a shared-state chunk that carries no ordering identity;
the server must colocate the revision with the effects it protects.

The guard is available only on programmatic calls (`window.beam.*`,
`callBeamAction`, and `useBeamAction` options). Declarative `beam-action`,
polling, visits, and server-pushed events keep their existing behavior. Calls
without a guard are unchanged.

Feature-detect the API before using it when an application may run against
different Beam client builds:

```ts
const supportsGuard =
  window.beam.runtime?.capabilities?.actionResponseGuard === true

console.log(window.beam.runtime.version) // "1.5.1"
```

## Lifecycle and updates

- Beam mounts one behavior instance per connected `beam-behavior` root.
- Async mount is abortable from the runtime's perspective.
- Props and content updates are coalesced and processed serially after mount.
- Changing or removing `beam-behavior`, disconnecting the root, or moving it
  under a `beam-island` destroys the instance.
- Cleanup runs in reverse registration order, exactly once. Beam aborts the
  context signal before cleanup begins.
- Re-registering a name replaces its definition and remounts matching roots.
- `data-beam-behavior-status` reports `pending`, `mounted`, `updating`, or
  `error` while the root is active.

Beam does not infer a content update from every DOM mutation. That would let a
rendering effect trigger itself forever. Known Beam swap paths notify surviving
behaviors explicitly through `notifyBehaviorContentChanged()`.

## DOM ownership

Behaviors may be nested, so delegated selectors should operate only on elements
owned by the current root:

```ts
function ownedTarget(root: HTMLElement, target: EventTarget | null, selector: string) {
  if (!(target instanceof Element)) return null
  const match = target.closest<HTMLElement>(selector)
  return match?.closest('[beam-behavior]') === root ? match : null
}
```

Apply the same closest-owner check to queries. This prevents an outer behavior
from handling or rendering controls owned by a nested behavior. Beam never
mounts behaviors inside `beam-island` roots or their descendants; the island
owns that subtree.

## CSS and animation libraries

Raw CSS can own all animation frames while a behavior owns only state and
accessibility:

```ts
const reveal = defineBehavior((ctx) => {
  const state = ctx.reactive({ open: false })
  const button = ctx.root.querySelector<HTMLButtonElement>('button')!

  ctx.on(button, 'click', () => { state.open = !state.open })
  ctx.effect(() => {
    ctx.root.toggleAttribute('data-open', state.open)
    button.setAttribute('aria-expanded', String(state.open))
  })
})
```

```css
[beam-behavior="app-reveal@1"] .panel {
  opacity: 0;
  transform: translateY(-0.75rem);
  transition: opacity 300ms, transform 500ms;
}

[beam-behavior="app-reveal@1"][data-open] .panel {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  [beam-behavior="app-reveal@1"] .panel {
    transition: none;
  }
}
```

DOM-focused libraries such as GSAP, Motion, or Anime.js follow the same model:
create a timeline during mount and destroy it through owned cleanup.

```ts
const animated = defineBehavior(async (ctx) => {
  const timeline = createTimeline(ctx.root)
  ctx.cleanup(() => timeline.destroy())
})
```

An animation library should stay within the behavior root and should not replace
that root. Register global listeners, observers, and timelines with
`ctx.cleanup()`.

## Shared state

`ctx.reactive()` is private to one instance. Use `ctx.getState(id)` only when a
behavior intentionally coordinates with named Beam state:

```ts
ctx.effect(() => {
  const cart = ctx.getState('cart') as { count?: number } | undefined
  badge.textContent = String(cart?.count ?? 0)
})
```

Effects that read a missing named state react when that state is created later.
Repeated behavior roots should not share DOM carrier IDs accidentally; give
each server-action payload carrier a unique identity or keep it inside its
owning root.

## Errors

Mount, update, props, effect, listener, and cleanup failures are isolated from
other behavior instances. Beam logs the failure and dispatches a bubbling
event from the behavior root:

```ts
document.addEventListener('beam:behavior-error', (event) => {
  const detail = (event as CustomEvent).detail
  reportError(detail.name, detail.phase, detail.error)
})
```

## Testing and manual scans

The runtime scans automatically. The public helpers are also useful for tests
and integrations:

```ts
import {
  behaviorsSettled,
  notifyBehaviorContentChanged,
  scanBehaviors,
} from '@benqoder/beam/behaviors'

scanBehaviors(document)
notifyBehaviorContentChanged(container)
await behaviorsSettled(document)
```

`behaviorsSettled(scope)` waits for tracked mount, update, replacement, and
cleanup work in that scope. It is intended for deterministic DOM assertions;
it does not wait for application timers or indefinitely running external work.

See the runnable examples in `example/app/routes/behaviors.tsx` and their
definitions in `example/app/behaviors.ts`.
