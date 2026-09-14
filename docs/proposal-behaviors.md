# Beam behaviors proposal

Status: implemented for Beam 1.5.0. This document is retained as the design
record; [Client Behaviors](./behaviors.md) is the supported user guide and API
reference.

This proposal develops the behavior direction identified in [the client-interactivity handoff](./handoff-client-interactivity.md). It does not propose adopting Alpine or Unpoly, replacing Beam reactivity, or moving server authority into the browser.

## Summary

A Beam behavior is trusted client code attached to one server-rendered element, with private state and a deterministic DOM lifetime.

Behaviors fill the gap between Beam's declarative attributes and React islands:

- Declarative attributes remain appropriate for small expressions and simple local state.
- Behaviors enhance existing SSR markup without owning its rendering.
- React islands remain appropriate when React owns the component subtree and rendering lifecycle.

The first behavior runtime should provide registration, inert JSON props, per-element reactive state, automatically owned effects/listeners/cleanup, content and props updates, cancellation, error isolation, and deterministic destruction.

It should not initially provide remote behavior modules, arbitrary generated scripts, multiple behaviors on one element, automatic global-store creation, action invocation, or a separate public `bind`, `data`, or `store` facade.

## Goals

- Let trusted application bundles register reusable behaviors by name.
- Let server-rendered and generated markup reference an approved behavior without embedding executable code.
- Give every listener, reactive effect, observer, timer, async task, and third-party widget an explicit DOM owner.
- Mount behavior roots present at startup and roots introduced by every Beam update path.
- Update surviving behavior roots when their props or child content changes.
- Destroy removed behavior instances exactly once.
- Keep independent behavior instances isolated by default.
- Reuse Beam's existing reactive state engine rather than introducing a parallel state graph.
- Preserve SSR content and useful fallback behavior when registration or mounting fails.
- Make behavior names, versions, props, roles, actions, and shared-state access visible to application audits.
- Support real storefront interactions such as galleries, variant selection, quantity constraints, and shared cart mirrors without making client state authoritative for commerce.

## Non-goals

- Installing Alpine or Unpoly, or reproducing all of their APIs and plugins.
- Replacing Blade/SSR or Beam's WebSocket action transport.
- Treating behavior props, selected variants, prices, quantities, or stock as trusted server input.
- Allowing generated markup to register JavaScript, choose module URLs, or weaken content security policy.
- Automatically preserving behavior roots across outer replacements.
- Making stores durable, offline, cross-tab, customer-independent, or tenant-independent.
- Solving action concurrency, server reconciliation, strict CSP, or no-JS commerce entirely inside the behavior API.
- Replacing React islands for JavaScript-rendered component subtrees.

## Locked context kernel

The following interface is the v1 kernel:

```ts
interface BehaviorContext<Props> {
  readonly root: HTMLElement
  readonly props: Props
  readonly signal: AbortSignal

  reactive<T extends object>(initial: T): T
  effect(fn: () => void): void
  on(
    target: EventTarget,
    event: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ): void
  cleanup(fn: () => void | Promise<void>): void

  getState(id: string): object | undefined
}
```

### Context semantics

`root` is the behavior-owning element. The behavior must scope DOM queries and delegated events to this root unless it intentionally registers an external target through `on()`.

`props` is read-only to behavior code. It is implemented as a getter and returns the latest successfully parsed props. A props update does not replace private behavior state automatically.

`signal` is aborted before destruction begins. Async work should observe it. If async setup finishes after the instance has been destroyed, any cleanup it registers must run immediately.

`reactive(initial)` creates private, per-instance reactive state using Beam's state engine. It is not registered by `beam-id`, cannot leak into another instance, and becomes unreachable when the behavior is destroyed.

`effect(fn)` creates an instance-owned reactive effect. The runtime stops it automatically during destruction. The function can observe private state created by `reactive()` or an existing named state returned by `getState()`.

`on(target, event, listener, options)` installs an instance-owned event listener. The runtime removes it automatically during destruction using the same target, event, listener, and capture semantics.

`cleanup(fn)` registers any other cleanup work, including disconnecting observers, clearing timers, destroying widgets, releasing resources, and undoing external subscriptions. Cleanup functions may be asynchronous, must be called at most once, and should be executed in reverse registration order.

`getState(id)` reads an existing Beam named state. It does not silently create one. Shared-state ownership remains with server markup or explicit application setup.

Beam state scopes must initialize before behaviors mount. If a requested named state is missing, development builds should warn. When that state is registered later, the affected behavior must receive an update or otherwise be able to observe its creation; this must be specified before implementation.

## Definition and registration API

The proposed definition types are:

```ts
type BehaviorUpdateKind = 'props' | 'content'

interface BehaviorUpdate {
  readonly kind: BehaviorUpdateKind
}

interface BehaviorInstance {
  update?(change: BehaviorUpdate): void | Promise<void>
}

type Behavior<Props> = (
  context: BehaviorContext<Props>,
) =>
  | void
  | BehaviorInstance
  | Promise<void | BehaviorInstance>
```

Cleanup is always registered through `context.cleanup()`. The returned instance exists to handle updates, not to establish a second destruction mechanism.

Registration should follow the existing islands convention:

```ts
import {
  defineBehavior,
  registerBehaviors,
} from '@benqoder/beam/behaviors'

registerBehaviors({
  'gallery@1': defineBehavior<GalleryProps>((ctx) => {
    // Mount one gallery instance.
  }),
})
```

`defineBehavior()` is primarily a type and definition helper. A richer definition can supply props parsing and audit metadata:

```ts
registerBehaviors({
  'product-purchase@1': defineBehavior({
    parseProps(value, root) {
      return parseProductPurchaseProps(value)
    },

    capabilities: {
      actions: ['addToCart'],
      readsState: ['pageState'],
      writesState: [],
      roles: [
        'option',
        'quantity-input',
        'add-to-cart',
      ],
    },

    mount(ctx) {
      // Mount one product purchase instance.
    },
  }),
})
```

Capability metadata is an auditable declaration, not a JavaScript sandbox. The application authoring and acceptance layer decides which behavior names and versions are allowed on each generated surface.

Multiple calls to `registerBehaviors()` should merge registrations. Re-registering a name should warn and remount matching instances in development to support hot replacement. Production duplicate-registration behavior must be deterministic and documented.

## Markup contract

The proposed attributes are:

```html
<section
  beam-behavior="gallery@1"
  beam-behavior-props='{"initialIndex":0,"wrap":true}'
>
  <!-- Useful SSR markup -->
</section>
```

- `beam-behavior` contains one opaque registered behavior identifier.
- `beam-behavior-props` contains inert JSON configuration.
- Behavior identifiers should be versioned when referenced by generated or persisted artifacts, for example `gallery@1`.
- The first version permits exactly one behavior per element. Behaviors compose by nesting roots rather than by sharing one root.
- Application behaviors should use documented, inert `data-*` hooks for descendants.
- A behavior marker does not automatically preserve the element across a Beam swap.

One behavior per root keeps props, private state, update ordering, error status, and teardown ownership unambiguous. Multiple behaviors on the same element can be reconsidered only after a real composition case demonstrates the need.

Large props may eventually support an inert document reference, but inline JSON is sufficient for the first spike. No evaluated factory expression or behavior-selected module URL is allowed.

## Lifecycle contract

### Mount

The runtime discovers behavior roots in initial SSR content and newly connected subtrees. A registered behavior mounts once per connected element/name pair.

Before calling the behavior:

1. Parse and validate props.
2. Create the instance `AbortController` and cleanup registry.
3. Make private reactivity available.
4. Mark the element as pending.

After successful setup, mark the element as mounted. A missing registration leaves SSR content untouched, warns once in development, and can mount later if the behavior is registered.

### Update

A surviving root receives a coalesced update when:

- Its `beam-behavior-props` value changes: `update({ kind: 'props' })`.
- Descendant content is inserted, removed, or replaced: `update({ kind: 'content' })`.

The runtime must not call `update()` once for every low-level mutation. Changes in one DOM operation are coalesced per instance and microtask. If both props and content change, props must be parsed first and the ordering must be deterministic.

An inner replacement of a behavior root keeps the same instance and private state, then delivers a content update. An outer replacement destroys the old element's instance and mounts the new element as a fresh instance.

### Destroy

When a mounted root is no longer connected:

1. Abort `context.signal`.
2. Prevent future updates and effects.
3. Remove listeners registered by `on()`.
4. Stop effects registered by `effect()`.
5. Run cleanup functions exactly once in reverse registration order.
6. Remove the instance from the mounted registry.

Temporary detach/reinsert operations used by preservation must not destroy an element that is connected again by the end of the mutation batch. A behavior explicitly placed on a `beam-keep` element remains mounted because the actual element remains; `beam-keep` continues to mean that the preserved client element wins over its server placeholder.

### Async behavior setup

Behavior setup and updates may be asynchronous. Async completion must be cancellation-safe:

- Destroying an instance aborts its signal immediately.
- Late setup or update results may not mutate a replacement instance.
- Cleanup registered after abort runs immediately.
- One async behavior does not block unrelated synchronous behaviors from mounting.
- The definition of a settled subtree must account for pending async setup.

### Nested ownership and islands

Nested behavior roots are independent owners. Removing a parent destroys all removed descendants as well as the parent, exactly once each.

Beam must not mount behaviors inside DOM owned by a mounted React island. A behavior may exist outside an island and listen to an intentional public event from it, but neither runtime should scan or mutate the other's owned descendants.

## Runtime status and errors

The runtime should expose progressive-enhancement status without hiding SSR content by default:

```html
<section
  beam-behavior="gallery@1"
  data-beam-behavior-status="mounted"
>
```

Candidate status values are `pending`, `mounted`, `updating`, and `error`.

Errors should dispatch:

```text
beam:behavior-error
```

with detail containing the behavior name, phase (`props`, `mount`, `update`, or `cleanup`), root element, and error. An error in one behavior must not prevent another behavior from mounting or updating. SSR content remains in place.

Routine mounted, updated, and destroyed events may be useful for development and tests, but should not become a noisy production contract without demonstrated consumers.

## Settled state and test integration

Preview and browser acceptance need a reliable moment at which async enhancements have completed:

```ts
await behaviorsSettled(document)
await behaviorsSettled(productRoot)
```

A subtree is settled when every behavior root currently in scope has either mounted, failed with a reported error, or been aborted because it disappeared. Content or props mutations start a new settling cycle.

The runtime should also export a manual scoped scanner for detached documents, shadow roots, and tests, similar to the islands runtime:

```ts
scanBehaviors(root)
```

Normal Beam application paths should not need to call it manually.

## General state-to-UI model

The behavior runtime is a general state-to-UI controller. Product purchase, galleries, lists, charts, and other widgets are examples that exercise the primitive; none of them defines the core architecture.

The central loop is:

```text
local interaction or server update
              -> reactive state changes
              -> owned effects rerun
              -> behavior updates the UI
```

A behavior can project state into any DOM or widget concern it owns:

- Text content.
- Visibility.
- Disabled and selected states.
- ARIA attributes.
- Classes, styles, and `data-*` attributes.
- Form values.
- Images and links.
- A single repeated item or an entire keyed collection.
- A chart, map, editor, media player, or other third-party widget.

The runtime does not assign special meaning to any of these projections. The registered behavior defines how its state affects its UI.

### Three update sources

#### Private behavior state

Local interaction mutates private state created by `ctx.reactive()`:

```ts
const local = ctx.reactive({
  expanded: false,
  saving: false,
})

local.expanded = true
```

Only effects that observe the changed properties rerun. This state belongs to the behavior instance and is not automatically shared or server-addressable.

#### Existing named Beam state

The behavior may read an explicitly shared or server-confirmed named state:

```ts
const account = ctx.getState(
  ctx.props.stateId,
) as AccountState
```

The server can update that state through the existing response channel:

```ts
return ctx.state('account', {
  balance: 5000,
  canEdit: true,
})
```

When Beam applies the response, behavior effects observing `balance` or `canEdit` rerun automatically.

#### Props and content

Server markup may change the behavior's inert props or owned content. These environmental changes use the instance lifecycle:

```ts
instance.update({ kind: 'props' })
instance.update({ kind: 'content' })
```

Props/content updates are distinct from reactive state changes. A normal state mutation must not invoke `instance.update()`.

The separation is:

```text
reactive state changed -> ctx.effect()
props/content changed  -> instance.update()
root removed           -> signal abort + owned cleanup
```

### General example

```ts
registerBehaviors({
  'account-summary@1': defineBehavior((ctx) => {
    const local = ctx.reactive({
      expanded: false,
      saving: false,
    })

    const account = ctx.getState(
      ctx.props.stateId,
    ) as AccountState

    const name = ctx.root.querySelector<HTMLElement>(
      '[data-account-name]',
    )!
    const balance = ctx.root.querySelector<HTMLElement>(
      '[data-account-balance]',
    )!
    const details = ctx.root.querySelector<HTMLElement>(
      '[data-account-details]',
    )!
    const warning = ctx.root.querySelector<HTMLElement>(
      '[data-account-warning]',
    )!
    const saveButton = ctx.root.querySelector<HTMLButtonElement>(
      '[data-account-save]',
    )!

    ctx.on(ctx.root, 'click', (event) => {
      if ((event.target as Element).closest('[data-account-toggle]')) {
        local.expanded = !local.expanded
      }
    })

    ctx.effect(() => {
      name.textContent = account.name
      balance.textContent = account.formattedBalance
      details.hidden = !local.expanded
      warning.hidden = account.balance >= 0
      saveButton.disabled = local.saving || !account.canEdit

      ctx.root.toggleAttribute(
        'data-overdrawn',
        account.balance < 0,
      )
    })
  }),
})
```

This uses the same behavior contract as product purchase without introducing a product-specific runtime concept.

### Collections are ordinary state

A collection is one possible state value:

```ts
const state = ctx.reactive({
  items: [] as Product[],
})
```

The initial contract can update collections through immutable property replacement, which matches Beam's current reliable tracking boundary:

```ts
state.items = [...state.items, newItem]

state.items = state.items.filter(
  (item) => item.id !== removedId,
)

state.items = state.items.map((item) =>
  item.id === updatedId
    ? {
        ...item,
        inventory: {
          ...item.inventory,
          stock: updatedStock,
        },
      }
    : item,
)
```

An owned effect decides how the current collection affects the UI:

```ts
ctx.effect(() => {
  renderProducts(state.items)
})
```

Efficient keyed reconciliation, `<template>` cloning, append, prepend, upsert, remove, move, and deep-item update operations may later be provided by an optional helper such as `keyedTemplateList()`. That helper must remain outside `BehaviorContext` and must not shape the core behavior lifecycle.

The runtime spike should therefore prove general state/effect/lifecycle behavior. It should not expand into a comprehensive list renderer merely because a list is a useful fixture.

## Product purchase behavior

The following is an application case study, not an additional core runtime abstraction. Variant selection, option availability, quantity constraints, and the add-to-cart payload form one coherent state machine. They should initially be owned by one behavior:

```html
<section
  beam-behavior="product-purchase@1"
  beam-behavior-props="..."
>
```

Separate `option`, `variant`, and `quantity` behaviors would require avoidable cross-behavior coordination because selecting a variant changes quantity minimums, maximums, steps, purchase eligibility, price, stock, and possibly media.

### Server-prepared projection

For client projection mode, the server supplies the option group order, current selection, and a client-readable variant projection:

```json
{
  "productId": 42,
  "groups": ["color", "size"],
  "selected": {
    "color": "black",
    "size": "medium"
  },
  "unavailablePresentation": "disabled",
  "variants": [
    {
      "id": 501,
      "options": {
        "color": "black",
        "size": "medium"
      },
      "purchasable": true,
      "price": "₦120.00",
      "stockLabel": "2 left",
      "minQuantity": 1,
      "maxQuantity": 2,
      "quantityStep": 1
    },
    {
      "id": 502,
      "options": {
        "color": "black",
        "size": "large"
      },
      "purchasable": false,
      "price": "₦120.00",
      "stockLabel": "Sold out",
      "minQuantity": 1,
      "maxQuantity": 0,
      "quantityStep": 1
    }
  ]
}
```

Formatted price, labels, and availability are an SSR/client display snapshot. The server must re-read and validate the product, variant, price, stock, quantity, customer, business, and purchase rules during add-to-cart.

Do not infer numeric limits from presentation strings such as `2 left`. The server projection supplies explicit numbers.

### Product markup hooks

The behavior acts on semantic hooks rather than presentation classes:

```html
<section
  beam-behavior="product-purchase@1"
  beam-behavior-props="..."
>
  <fieldset data-option-group="color">
    <legend>Color</legend>

    <button
      type="button"
      data-option-button
      data-option-name="color"
      data-option-value="black"
      aria-pressed="true"
    >
      Black
    </button>

    <button
      type="button"
      data-option-button
      data-option-name="color"
      data-option-value="blue"
      aria-pressed="false"
    >
      Blue
    </button>
  </fieldset>

  <fieldset data-option-group="size">
    <legend>Size</legend>

    <button
      type="button"
      data-option-button
      data-option-name="size"
      data-option-value="medium"
    >
      M
    </button>

    <button
      type="button"
      data-option-button
      data-option-name="size"
      data-option-value="large"
    >
      L
    </button>
  </fieldset>

  <p data-selection-incomplete>
    Please choose a color and size.
  </p>

  <div data-variant-summary hidden>
    <span data-variant-price></span>
    <span data-variant-stock></span>
  </div>

  <div data-quantity-controls hidden>
    <button
      type="button"
      data-quantity-decrease
      aria-label="Decrease quantity"
    >
      −
    </button>

    <input
      type="number"
      data-quantity-input
      beam-id="product-detail-qty"
      value="1"
      min="1"
      step="1"
    />

    <button
      type="button"
      data-quantity-increase
      aria-label="Increase quantity"
    >
      +
    </button>
  </div>

  <p data-quantity-limit hidden aria-live="polite"></p>

  <button
    type="button"
    data-add-to-cart
    beam-action="addToCart"
    beam-data-product-id="42"
    beam-include="product-detail-qty"
    disabled
  >
    Add to cart
  </button>
</section>
```

Generated layouts may change structure and classes while preserving these required hooks and their ownership relationships.

### Private product state

The behavior creates independent state for each product purchase root:

```ts
const state = ctx.reactive({
  selected: { ...ctx.props.selected },
  variant: null as VariantProjection | null,
  quantity: 1,
  pending: false,
  error: null as string | null,
})
```

This state is not shared merely because two product cards reference the same behavior name. Shared confirmed mirrors, such as cart count or resource-keyed favourites, remain explicit named Beam state.

### Delegated option interaction

One listener on the root handles current and newly inserted option buttons:

```ts
ctx.on(ctx.root, 'click', (event) => {
  const button = (event.target as Element)
    .closest<HTMLButtonElement>('[data-option-button]')

  if (!button || button.disabled || !ctx.root.contains(button)) return

  selectOption(
    button.dataset.optionName!,
    button.dataset.optionValue!,
  )
})
```

The behavior does not need to install a listener on every button, and content replacements beneath the surviving root do not duplicate handlers.

### Cascading option resolution

Option groups are ordered. Availability for a value is computed against selections in preceding groups, not every current selection.

When an earlier group changes:

1. Store the newly selected value.
2. Walk later groups in order.
3. Preserve a later selection if a compatible variant still exists.
4. Clear a later selection if it is no longer compatible.
5. Recompute availability for every displayed value.
6. Resolve an exact variant only when every required group is selected.
7. Reconcile quantity against the resolved variant.

This permits a customer to change color even when the previously selected size does not exist in that color. A strictly all-other-selections algorithm can trap customers by disabling the route needed to reach another valid combination.

### Showing, hiding, disabling, and styling

The behavior reflects state through native and semantic attributes:

- `aria-pressed="true|false"` for option selection.
- `disabled` for unavailable or currently blocked controls.
- `hidden` for regions that are not applicable.
- `data-selected` and `data-unavailable` as optional styling hooks.
- `textContent` for prepared price and stock labels.
- `beam-data-variant-id` for the live add-to-cart payload.

Conceptually:

```ts
function renderOptionButtons() {
  for (const button of ctx.root.querySelectorAll<HTMLButtonElement>(
    '[data-option-button]',
  )) {
    const name = button.dataset.optionName!
    const value = button.dataset.optionValue!
    const selected = state.selected[name] === value
    const available = optionIsAvailable(name, value)

    button.setAttribute('aria-pressed', String(selected))
    button.toggleAttribute('data-selected', selected)
    button.toggleAttribute('data-unavailable', !available)
    button.disabled = state.pending || !available
    button.hidden =
      ctx.props.unavailablePresentation === 'hidden' &&
      !available
  }
}
```

Unavailable option values should be disabled by default rather than hidden. A visible sold-out or incompatible option communicates the product model and preserves layout stability. Hiding is an explicit presentation policy.

The behavior must not hardcode utility or design-system class names. Layouts can style semantic attributes:

```css
[data-option-button][aria-pressed="true"] {
  border-color: black;
  background: black;
  color: white;
}

[data-option-button]:disabled {
  opacity: 0.4;
  text-decoration: line-through;
}
```

### Quantity minimum, maximum, and step

The resolved variant supplies:

- `minQuantity`, defaulting to `1`.
- `maxQuantity`, where `null` means no client-visible upper bound.
- `quantityStep`, defaulting to `1`.

The first contract should support integer quantities. Fractional weight or measurement products need a separate exact representation rather than relying on ordinary floating-point stepping.

When a selection resolves a new variant, preserve the customer's current draft when possible and clamp it to the new range:

```text
Quantity 3 -> variant maximum 8 -> remains 3
Quantity 3 -> variant maximum 2 -> becomes 2
Quantity 1 -> variant minimum 5 -> becomes 5
```

```ts
function reconcileQuantity() {
  const variant = state.variant
  if (!variant) return

  const min = variant.minQuantity ?? 1
  const max = variant.maxQuantity

  state.quantity = Math.max(min, state.quantity)

  if (max !== null) {
    state.quantity = Math.min(max, state.quantity)
  }
}
```

The behavior synchronizes the input and buttons:

```ts
function renderQuantity() {
  const variant = state.variant
  const controls = ctx.root.querySelector<HTMLElement>(
    '[data-quantity-controls]',
  )!

  controls.hidden = !variant
  if (!variant) return

  const input = ctx.root.querySelector<HTMLInputElement>(
    '[data-quantity-input]',
  )!
  const decrease = ctx.root.querySelector<HTMLButtonElement>(
    '[data-quantity-decrease]',
  )!
  const increase = ctx.root.querySelector<HTMLButtonElement>(
    '[data-quantity-increase]',
  )!

  const min = variant.minQuantity ?? 1
  const max = variant.maxQuantity
  const step = variant.quantityStep ?? 1

  input.value = String(state.quantity)
  input.min = String(min)
  input.step = String(step)

  if (max === null) input.removeAttribute('max')
  else input.max = String(max)

  decrease.disabled =
    state.pending ||
    !variant.purchasable ||
    state.quantity <= min

  increase.disabled =
    state.pending ||
    !variant.purchasable ||
    (max !== null && state.quantity >= max)
}
```

Stepper clicks update by `quantityStep`, then clamp. Manual numeric entry should be normalized on `change` or blur rather than every keystroke, so temporary empty and partial input states remain editable.

`maxQuantity: 0`, `minQuantity > maxQuantity`, or `purchasable: false` makes the variant non-purchasable. The Add button remains disabled when no exact variant is resolved or the current quantity is invalid.

### Add-to-cart payload

When an exact variant is resolved, the behavior writes the live variant ID:

```ts
addButton.setAttribute(
  'beam-data-variant-id',
  String(state.variant.id),
)
```

When no exact variant exists, it removes the attribute and disables the action. The quantity input remains a normal `beam-include` carrier. Beam reads both values at click time.

The server must never accept client-submitted price, stock, availability, minimum, or maximum as authority. On add-to-cart it revalidates the variant and quantity. If stock or a purchase limit changed, the response should return current constraints and feedback; the behavior then reconciles and clamps its local draft.

### Client and server projection modes

The same semantic markup can support two operating modes.

#### Client projection mode

The initial page contains the complete client-readable variant projection. Option clicks are synchronous and do not invoke a server action. Add-to-cart remains a server action and is authoritative.

This is the preferred mode for ordinary product details when the projection is reasonably small and its staleness risk is acceptable.

#### Server projection mode

Option buttons retain `beam-action="selectProductOption"` and exact application payload carriers. The behavior can immediately reflect the pending choice, while the server recalculates and returns the purchase fragment.

The surviving product behavior receives a content update after the fragment replacement and reconciles its local intent with the server-rendered selection. Server mode is appropriate for large variant spaces, volatile rules, or option systems that cannot be safely projected.

Server mode requires a reliable action lifecycle to clear pending state on both successful HTML updates and failures. Observing DOM replacement alone is insufficient when an action fails without returning HTML.

### Variant change events

After resolving or clearing a variant, the product behavior may dispatch a bubbling domain event:

```ts
ctx.root.dispatchEvent(
  new CustomEvent('beam:variant-change', {
    bubbles: true,
    detail: {
      productId: ctx.props.productId,
      variantId: state.variant?.id ?? null,
      selectedOptions: { ...state.selected },
      media: state.variant?.media ?? null,
    },
  }),
)
```

Gallery, URL synchronization, analytics, and other trusted platform code can consume this without being embedded inside the product selection state machine. Event detail remains advisory and must not become server authority.

## Pure models and DOM adapters

Non-trivial behaviors should separate pure state transitions from DOM integration:

```ts
const model = createProductPurchaseModel(ctx.props)

model.dispatch({
  type: 'select-option',
  name: 'color',
  value: 'black',
})

const view = model.getView()
```

The pure model owns option resolution, availability, selection cascading, quantity reconciliation, and purchase eligibility. The behavior adapter owns event listeners, DOM queries, semantic attributes, text, visibility, and Beam payload carriers.

This allows fast exhaustive unit tests for variant combinations and lets a storefront simulator share semantics without pretending to test DOM lifecycle or server actions. Browser tests remain responsible for actual Beam swaps, events, focus, accessibility, and request behavior.

## Client-to-server actions

Behaviors do not need a new transport or an action-calling method on `BehaviorContext`. Beam already exposes typed imperative actions through:

```ts
window.beam.actionName(data?, options?)
```

The generated action registry types the action name, parameters, and `ctx.json()` result. The caller consumes the existing WebSocket action stream; Beam applies every response chunk before resolving with the final `ActionResponse`.

A behavior can call the server directly:

```ts
ctx.on(ctx.root, 'click', async (event) => {
  const option = (event.target as Element)
    .closest<HTMLButtonElement>('[data-option-button]')

  if (!option) return

  state.pending = true

  try {
    await window.beam.selectProductOption({
      productId: ctx.props.productId,
      optionName: option.dataset.optionName,
      optionValue: option.dataset.optionValue,
      selectedOptions: state.selected,
    })
  } finally {
    if (!ctx.signal.aborted) {
      state.pending = false
    }
  }
})
```

Ordinary DOM-driven operations can continue to use declarative `beam-action` markup. A behavior should not imperatively call an action when the same interaction is already handled by a `beam-action` trigger.

## Backend-to-behavior communication

A behavior is not itself a new transport endpoint. It reacts to Beam state, events, and DOM changes delivered over the existing connection.

The current semantics are:

- A returned or streamed `ctx.state()` update changes an existing named Beam state. A behavior effect that reads that state reruns automatically.
- A returned or streamed `ctx.render()` response changes the DOM. A surviving behavior receives a content update; a replaced behavior is destroyed and a new instance mounts.
- A returned `ctx.json()` value is private to the caller. The behavior must reconcile it explicitly.
- A returned `ctx.event()` or server-initiated `ctx.notify()` dispatches `beam:server-event`. A behavior reacts only when it has registered a matching listener.
- An unrelated database or inventory change does nothing in the browser until application code publishes it to the relevant connected sessions.

### Automatic reaction through named state

The server-confirmed projection can live in an existing Beam named state declared before the behavior mounts:

```html
<section
  beam-behavior="product-purchase@1"
  beam-behavior-props='{
    "productId":42,
    "serverStateId":"productPurchase42"
  }'
  beam-state='{
    "revision":0,
    "selected":{},
    "variantId":null,
    "price":"",
    "stockLabel":"",
    "minQuantity":1,
    "maxQuantity":null,
    "purchasable":false
  }'
  beam-id="productPurchase42"
>
```

The behavior subscribes using its locked context:

```ts
const confirmed = ctx.getState(
  ctx.props.serverStateId,
) as ProductPurchaseProjection

ctx.effect(() => {
  const projection = {
    revision: confirmed.revision,
    selected: confirmed.selected,
    variantId: confirmed.variantId,
    price: confirmed.price,
    stockLabel: confirmed.stockLabel,
    minQuantity: confirmed.minQuantity,
    maxQuantity: confirmed.maxQuantity,
    purchasable: confirmed.purchasable,
  }

  reconcileWithServer(projection)
  render()
})
```

An action returns the existing server helper:

```ts
export async function selectProductOption(
  ctx: BeamContext<Env>,
  input: SelectProductOptionInput,
) {
  const product = await getProduct(input.productId)
  const projection = prepareProductProjection(
    product,
    input.selectedOptions,
  )

  return ctx.state('productPurchase42', {
    revision: input.revision,
    selected: projection.selected,
    variantId: projection.variantId,
    price: projection.price,
    stockLabel: projection.stockLabel,
    minQuantity: projection.minQuantity,
    maxQuantity: projection.maxQuantity,
    purchasable: projection.purchasable,
  })
}
```

Beam applies the state response to the named reactive proxy. The behavior's owned effect reruns in the normal reactive flush. No behavior-specific response type is required for this path.

The state ID in an action response must be derived or validated by trusted server code. Client-supplied targeting remains untrusted, even though changing another client-side state does not grant server authority.

### Streaming updates

An action can remain open and yield state as application data changes:

```ts
export async function* watchProductStock(
  ctx: BeamContext<Env>,
  input: WatchProductStockInput,
) {
  for await (const stock of subscribeToProductStock(input.productId)) {
    yield ctx.state(input.stateId, {
      stock: stock.available,
      maxQuantity: stock.maximum,
      purchasable: stock.available > 0,
    })
  }
}
```

The behavior starts the existing action:

```ts
void window.beam.watchProductStock({
  productId: ctx.props.productId,
  stateId: ctx.props.serverStateId,
})
```

Each streamed state chunk is automatically applied and reruns subscribed effects. A production subscription design must also define cancellation, disconnect cleanup, authorization, reconnect resubscription, and backpressure. Current imperative action options do not accept an `AbortSignal`, so the first behavior implementation must not claim that `context.signal` cancels an existing Beam action stream.

### Current server-initiated events

On a live WebSocket session, server code can push an event outside the current response stream:

```ts
await ctx.notify?.('product:stock-changed', {
  productId: 42,
  stock: 2,
  maxQuantity: 2,
})
```

The client dispatches this as `beam:server-event`. A behavior can listen with automatically owned cleanup:

```ts
ctx.on(window, 'beam:server-event', (rawEvent) => {
  const detail = (rawEvent as CustomEvent<{
    event: string
    data: ProductStockUpdate
  }>).detail

  if (detail.event !== 'product:stock-changed') return
  if (detail.data.productId !== ctx.props.productId) return

  state.stock = detail.data.stock
  state.maxQuantity = detail.data.maxQuantity
  state.purchasable = detail.data.stock > 0
  reconcileQuantity()
})
```

Event delivery is automatic; interpretation is intentionally explicit. `ctx.notify()` targets the callback registered by the current connected client and is unavailable in the per-call HTTP middleware path. It is not a product-topic broadcast system.

### Proposed pushed response primitive

For unsolicited real-time state, event, island, or DOM updates, Beam should consider a general response push rather than adding behavior-specific messaging:

```ts
interface BeamContext {
  push?(response: ActionResponse): Promise<void>
}
```

Server code could then send an existing Beam response outside an action stream:

```ts
await ctx.push?.(
  ctx.state('productPurchase42', {
    stock: 2,
    maxQuantity: 2,
    purchasable: true,
  }),
)
```

It could combine normal response effects:

```ts
await ctx.push?.({
  ...ctx.state('productPurchase42', {
    stock: 2,
    maxQuantity: 2,
  }),
  ...ctx.event('product:stock-changed', {
    productId: 42,
  }),
})
```

The client callback would pass the pushed value through the same `applyResponse()` pipeline used for action chunks:

```text
backend publication
        -> ctx.push(ActionResponse)
        -> client applyResponse()
        -> named state / event / HTML update
        -> behavior effect or lifecycle update
```

`ctx.notify(name, data)` remains a backwards-compatible event convenience and could eventually be implemented in terms of pushing `ctx.event(name, data)`.

`ctx.push()` targets one connected Beam session. It does not determine which sessions care about a product or fan a database change out to them. Cross-client real-time updates still require application infrastructure:

```text
database or inventory change
        -> application pub/sub or product room
        -> each subscribed Beam session
        -> ctx.push() or ctx.notify()
        -> behavior reaction
```

The application must authenticate subscriptions, remove them on disconnect, restore them on reconnect, and choose whether state is keyed by resource, customer, tenant, or behavior instance. Beam should not infer those ownership rules.

### Communication choice

Use the smallest existing channel that matches the meaning:

| Channel | Use | Behavior reaction |
| --- | --- | --- |
| `ctx.state(id, value)` | Current shared or server-confirmed projection | Automatic through `ctx.effect()` |
| `ctx.render(html)` | Server-owned structural change | Automatic content update or remount |
| `ctx.json(value)` | Private request result | Explicit caller reconciliation |
| `ctx.event()` / `ctx.notify()` | Moment-in-time notification | Explicit registered listener |
| Proposed `ctx.push(response)` | Unsolicited full Beam response | Automatic through the existing response pipeline |

The behavior remains a consumer of reactive state and domain events, not a second RPC system.

## Action lifecycle companion proposal

Behaviors should not receive an action-calling method in the locked context. Existing `beam-action` markup continues to own transport.

Beam should separately consider dispatching:

```text
beam:action-start
beam:action-chunk
beam:action-end
```

with scoped detail such as:

```ts
interface BeamActionLifecycleDetail {
  action: string
  trigger: HTMLElement
  params: Record<string, unknown>
  response?: ActionResponse
  error?: unknown
}
```

A behavior can listen through its existing owned event API:

```ts
ctx.on(window, 'beam:action-end', handleActionEnd)
```

The trigger lets repeated product cards distinguish their own request from another instance's action. These events support pending UI and reconciliation but do not solve concurrency by themselves.

Beam's delegated action handler should honor `event.defaultPrevented`. A trusted behavior can then block an action after local validation using ordinary DOM semantics. A behavior must not call an action itself when the same interaction already bubbles to a `beam-action` trigger.

Request policies such as `latest`, `queue`, `drop`, or `parallel` belong to a separate action-concurrency design. Latest-response-wins can make sense for idempotent option or search projection requests; it must not be assumed safe for cart or other mutations because cancelling or ignoring a response does not undo server work.

## Generated artifact and capability policy

Behavior JavaScript is trusted platform code with page privileges. The safe generation model is:

- Trusted application bundles register behavior implementations.
- Generated artifacts reference approved names and versions.
- Props are inert and schema-validated.
- Semantic hooks and allowed nesting are contractually defined.
- Capability metadata exposes expected actions and shared-state access to audits.
- Commerce skeleton signatures account for behavior names, versions, required hooks, and immutable payload carriers.
- General generated sections receive only explicitly approved local behaviors and read-only shared mirrors.

A recognized `beam-behavior` name is not sufficient authorization. Application acceptance must validate the behavior's contract and the surrounding markup. A behavior implementation remains trusted code rather than sandboxed tenant code.

The first release must not include `beam-behavior-src`. Heavy trusted code may later be split by application-controlled lazy registration, but generated markup cannot select an arbitrary module URL.

## Future trusted lazy behaviors

After eager lifecycle behavior is proven, large trusted behaviors may use bundled lazy loaders:

```ts
registerBehaviors({
  'map@1': lazyBehavior(() => import('./behaviors/map')),
  'editor@1': lazyBehavior(() => import('./behaviors/editor')),
})
```

Potential mount strategies may mirror islands:

```html
beam-behavior-load="visible"
beam-behavior-load="idle"
```

These remain deferred. Most behaviors should be small, eagerly available, and usable immediately after SSR.

## Candidate behavior library

The behavior runtime can support a small, audited platform library:

- `gallery@1`: navigation, thumbnails, keyboard semantics, selected state, and hidden-media pause.
- `product-purchase@1`: option selection, variant resolution, quantity constraints, purchase payload, and pending reconciliation.
- `disclosure@1`: accessible disclosure with escape and optional outside-click behavior.
- `tabs@1`: keyboard navigation, focus movement, ARIA relationships, and selection.
- `combobox@1`: keyboard navigation and server-fed or local result presentation.
- `media-player@1`: playback coordination, visibility handling, async provider setup, and teardown.
- `copy@1`: clipboard interaction and temporary success/error feedback.
- `relative-time@1`: timer-driven formatting with automatic timer cleanup.
- `chart@1` or `map@1`: async third-party initialization and destruction.

Existing Beam features should not be duplicated merely to populate this library. The best initial proofs are:

1. `gallery@1` for delegated interaction and content updates.
2. `product-purchase@1` for private state, server actions, variants, and quantity reconciliation.
3. `chart@1` or `map@1` for async cancellation and third-party cleanup.

## Implementation direction

Use one behavior registry and one observer/runtime rather than one document observer per behavior. Track mounted instances by element, but retain enough iterable ownership information to sweep disconnected roots.

Mutation handling should:

1. Collect added behavior roots and descendants.
2. Collect removed mounted roots and descendants.
3. Identify surviving mounted ancestors whose child content changed.
4. Process name and props attribute changes.
5. Coalesce work per instance.
6. Wait until the mutation batch completes before deciding whether a removed node is still disconnected.
7. Destroy disconnected instances.
8. Mount newly connected instances.
9. Deliver deterministic updates to surviving instances.

Beam-controlled swaps may eventually call lifecycle hooks directly for stronger ordering, while the observer remains the common fallback for third-party DOM changes. The first implementation must avoid double lifecycle delivery when both paths see the same mutation.

Existing declarative reactivity effects and listeners should move toward the same element-owned cleanup substrate. Adding behaviors without addressing retained effects would formalize one lifecycle while leaving the older directive lifecycle incomplete.

## Acceptance criteria

The initial implementation and spike should prove:

- Initial SSR behavior roots mount once.
- A later registration mounts already connected matching roots.
- Two instances of the same behavior have independent private state.
- Shared named state can drive effects in multiple behavior instances.
- Append and prepend mount new descendant behavior roots.
- Inner replacement updates a surviving root without losing private state.
- Outer replacement destroys the old instance and mounts a fresh one.
- Delete destroys only after the element is actually removed.
- Multi-target and out-of-band swaps mount and destroy the correct instances.
- Modal, drawer, visit, hungry-region, streamed, optimistic, and rollback paths participate.
- Preserved nodes are not destroyed during temporary detach/reinsert.
- Nested behaviors have independent, exactly-once cleanup.
- React island descendants are not scanned or owned.
- Async setup is aborted safely and late cleanup is not lost.
- Props parser, mount, update, and cleanup errors are isolated and reported.
- A missing registration preserves SSR output.
- Repeated scans are idempotent.
- Repeated swaps do not grow listener, effect, timer, or observer counts.
- One interaction does not cause duplicate Beam action dispatch.
- `behaviorsSettled()` resolves correctly after success, failure, update, and abort.

The product pilot should additionally prove:

- Ordered option selection and downstream invalid-selection clearing.
- Exact variant resolution and incomplete-selection presentation.
- Disabled versus hidden unavailable-option policy.
- Selected and unavailable semantic attributes and ARIA state.
- Variant price and stock-label projection.
- Quantity minimum, maximum, step, clamping, and manual normalization.
- Quantity preservation across compatible variant changes.
- Live variant and quantity action payloads.
- Server rejection when client data is stale or tampered with.
- Reconciliation after stock or purchase-limit changes.
- Rapid option interaction policy and stale response behavior in server projection mode.
- Duplicate product surfaces do not leak state into each other.
- Variant change integration with gallery/media where supported.

## Rollout

1. Add red tests for the existing inserted-descendant and effect-cleanup lifecycle gaps.
2. Implement the behavior registry, context ownership primitives, observer, errors, and settled tracking without storefront integration.
3. Build two independent gallery/stepper fixtures with a shared counter and repeated child swaps.
4. Implement the pure product purchase model and exhaustively test option and quantity transitions.
5. Add the product DOM adapter and browser tests against the actual Beam client.
6. Add action lifecycle events needed for robust pending/error reconciliation.
7. Decide whether the first storefront pilot uses client or server projection based on projection size and business rules.
8. Extend Beam directive/behavior metadata and storefront capability descriptors.
9. Release Beam deliberately and update the storefront's vendored package.
10. Share the supported behavior registry with production preview; retain conservative simulator claims.
11. Remove duplicate observers or expressions only after production, preview, accessibility, security, and repeated-swap tests demonstrate parity.

## Deferred decisions

- Exact props parser and definition overload types.
- How a behavior observes a named state that is registered after it mounts.
- Whether props and content changes produce one combined update or two ordered updates.
- Development hot-replacement behavior for re-registered names.
- Whether routine lifecycle events are public, development-only, or test-only.
- Whether a strict-CSP profile excludes all evaluated Beam expression directives.
- Client projection size and caching limits for large variant catalogs.
- Product quantity preservation versus explicit reset for exceptional product types.
- URL or session persistence for selected options.
- Action concurrency syntax and semantics.
- A future application-controlled lazy behavior API and mount strategies.
- Whether a later reusable binding helper is justified by repeated behavior implementation code.

These decisions should be resolved through the smallest executable spike rather than by copying framework surface area in advance.
