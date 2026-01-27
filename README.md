# Beam

A lightweight, declarative UI framework for building interactive web applications with WebSocket RPC. Beam provides Unpoly-like functionality with zero JavaScript configuration—just add attributes to your HTML.

## Features

- **WebSocket RPC** - Real-time communication without HTTP overhead
- **Declarative** - No JavaScript needed, just HTML attributes
- **Auto-discovery** - Handlers are automatically found via Vite plugin
- **Modals & Drawers** - Built-in overlay components
- **Smart Loading** - Per-action loading indicators with parameter matching
- **DOM Morphing** - Smooth updates via Idiomorph
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
- **Boost Links** - Upgrade regular links to AJAX
- **History Management** - Push/replace browser history
- **Placeholders** - Show loading content in target
- **Keep Elements** - Preserve elements during updates
- **Toggle** - Client-side show/hide with transitions (no server)
- **Dropdowns** - Click-outside closing, Escape key support (no server)
- **Collapse** - Expand/collapse with text swap (no server)
- **Class Toggle** - Toggle CSS classes on elements (no server)
- **Multi-Render** - Update multiple targets in a single action response
- **Async Components** - Full support for HonoX async components in `ctx.render()`

## Installation

```bash
npm install @benqoder/beam
```

## Quick Start

### 1. Add the Vite Plugin

```typescript
// vite.config.ts
import { beamPlugin } from '@benqoder/beam/vite'

export default defineConfig({
  plugins: [
    beamPlugin({
      actions: './actions/*.tsx',
    }),
  ],
})
```

### 2. Initialize Beam Server

```typescript
// app/server.ts
import { createApp } from 'honox/server'
import { beam } from 'virtual:beam'

const app = createApp({
  init: beam.init,
})

export default app
```

### 3. Add the Client Script

```typescript
// app/client.ts
import '@benqoder/beam/client'
```

### 4. Create an Action

```tsx
// app/actions/counter.tsx
export function increment(c) {
  const count = parseInt(c.req.query('count') || '0')
  return <div>Count: {count + 1}</div>
}
```

### 5. Use in HTML

```html
<div id="counter">Count: 0</div>
<button beam-action="increment" beam-target="#counter">
  Increment
</button>
```

---

## Core Concepts

### Actions

Actions are server functions that return HTML. They're the primary way to handle user interactions.

```tsx
// app/actions/demo.tsx
export function greet(c) {
  const name = c.req.query('name') || 'World'
  return <div>Hello, {name}!</div>
}
```

```html
<button
  beam-action="greet"
  beam-data-name="Alice"
  beam-target="#greeting"
>
  Say Hello
</button>
<div id="greeting"></div>
```

### Modals

Two ways to open modals:

**1. `beam-modal` attribute** - Explicitly opens the action result in a modal, with optional placeholder:

```html
<!-- Shows placeholder while loading, then replaces with action result -->
<button beam-modal="confirmDelete" beam-data-id="123" beam-size="small"
        beam-placeholder="<div>Loading...</div>">
  Delete Item
</button>
```

**2. `beam-action` with `ctx.modal()`** - Action decides to return a modal:

```tsx
// app/actions/confirm.tsx
export function confirmDelete(ctx: BeamContext<Env>, { id }: Record<string, unknown>) {
  return ctx.modal(
    <div>
      <h2>Confirm Delete</h2>
      <p>Are you sure you want to delete item {id}?</p>
      <button beam-action="deleteItem" beam-data-id={id} beam-close>Delete</button>
      <button beam-close>Cancel</button>
    </div>
  , { size: 'small' })
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
<button beam-drawer="openCart" beam-position="right" beam-size="medium"
        beam-placeholder="<div>Loading cart...</div>">
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
    </div>
  , { position: 'right', size: 'medium' })
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
    { target: '#stats, #users, #revenue' }
  )
}
```

**2. Auto-detect by ID (no targets needed)**

```tsx
export function refreshDashboard(ctx: BeamContext<Env>) {
  // Client automatically finds elements by id, beam-id, or beam-item-id
  return ctx.render([
    <div id="stats">Visits: {visits}</div>,
    <div id="users">Users: {users}</div>,
    <div id="revenue">Revenue: ${revenue}</div>,
  ])
}
```

**3. Mixed approach**

```tsx
export function updateDashboard(ctx: BeamContext<Env>) {
  return ctx.render(
    [
      <div>Header content</div>,           // Uses explicit target
      <div id="content">Main content</div>, // Auto-detected by ID
    ],
    { target: '#header' }  // Only first item gets explicit target
  )
}
```

**Target Resolution Order:**
1. Explicit target from comma-separated list (by index)
2. ID from the HTML fragment's root element (`id`, `beam-id`, or `beam-item-id`)
3. Frontend fallback (`beam-target` on the triggering element)
4. Skip if no target found

**Exclusion:** Use `!selector` to explicitly skip an item:
```tsx
ctx.render(
  [<Box1 />, <Box2 />, <Box3 />],
  { target: '#a, !#skip, #c' }  // Box2 is skipped
)
```

### Async Components

`ctx.render()` fully supports HonoX async components:

```tsx
// Async component that fetches data
async function UserCard({ userId }: { userId: string }) {
  const user = await db.getUser(userId)  // Async data fetch
  return (
    <div class="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  )
}

// Use directly in ctx.render() - no wrapper needed
export function loadUser(ctx: BeamContext<Env>, { id }: Record<string, unknown>) {
  return ctx.render(<UserCard userId={id as string} />, { target: '#user' })
}

// Works with arrays too
export function loadUsers(ctx: BeamContext<Env>) {
  return ctx.render([
    <UserCard userId="1" />,
    <UserCard userId="2" />,
    <UserCard userId="3" />,
  ], { target: '#user1, #user2, #user3' })
}

// Mixed sync and async
export function loadDashboard(ctx: BeamContext<Env>) {
  return ctx.render([
    <div>Static header</div>,      // Sync
    <UserCard userId="current" />,  // Async
    <StatsWidget />,                // Async
  ])
}
```

Async components are awaited automatically - no manual `Promise.resolve()` or helper functions needed.

---

## Attribute Reference

### Actions

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-action` | Action name to call | `beam-action="increment"` |
| `beam-target` | CSS selector for where to render response | `beam-target="#counter"` |
| `beam-data-*` | Pass data to the action | `beam-data-id="123"` |
| `beam-swap` | How to swap content: `morph`, `append`, `prepend`, `replace` | `beam-swap="append"` |
| `beam-confirm` | Show confirmation dialog before action | `beam-confirm="Delete this item?"` |
| `beam-confirm-prompt` | Require typing text to confirm | `beam-confirm-prompt="Type DELETE\|DELETE"` |
| `beam-instant` | Trigger on mousedown instead of click | `beam-instant` |
| `beam-disable` | Disable element(s) during request | `beam-disable` or `beam-disable="#btn"` |
| `beam-placeholder` | Show placeholder in target while loading | `beam-placeholder="<p>Loading...</p>"` |
| `beam-push` | Push URL to browser history after action | `beam-push="/new-url"` |
| `beam-replace` | Replace current URL in history | `beam-replace="?page=2"` |

### Modals & Drawers

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-modal` | Action to call and display result in modal | `beam-modal="editUser"` |
| `beam-drawer` | Action to call and display result in drawer | `beam-drawer="openCart"` |
| `beam-size` | Size for modal/drawer: `small`, `medium`, `large` | `beam-size="large"` |
| `beam-position` | Drawer position: `left`, `right` | `beam-position="left"` |
| `beam-placeholder` | HTML to show while loading | `beam-placeholder="<p>Loading...</p>"` |
| `beam-close` | Close the current modal/drawer when clicked | `beam-close` |

Modals and drawers can also be returned from `beam-action` using context helpers:

```tsx
// Modal with options
return ctx.modal(render(<MyModal />), { size: 'large', spacing: 20 })

// Drawer with options
return ctx.drawer(render(<MyDrawer />), { position: 'left', size: 'medium' })
```

### Forms

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-action` | Action to call on submit (on `<form>`) | `<form beam-action="saveUser">` |
| `beam-reset` | Reset form after successful submit | `beam-reset` |

### Loading States

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-loading-for` | Show element while action is loading | `beam-loading-for="saveUser"` |
| `beam-loading-for="*"` | Show for any loading action | `beam-loading-for="*"` |
| `beam-loading-data-*` | Match specific parameters | `beam-loading-data-id="123"` |
| `beam-loading-class` | Add class while loading | `beam-loading-class="opacity-50"` |
| `beam-loading-remove` | Hide element while NOT loading | `beam-loading-remove` |

### Validation

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-validate` | Target selector to update with validation | `beam-validate="#email-error"` |
| `beam-watch` | Event to trigger validation: `input`, `change` | `beam-watch="input"` |
| `beam-debounce` | Debounce delay in milliseconds | `beam-debounce="300"` |

### Input Watchers

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-watch` | Event to trigger action: `input`, `change` | `beam-watch="input"` |
| `beam-debounce` | Debounce delay in milliseconds | `beam-debounce="300"` |
| `beam-throttle` | Throttle interval in milliseconds (alternative to debounce) | `beam-throttle="100"` |
| `beam-watch-if` | Condition that must be true to trigger | `beam-watch-if="value.length >= 3"` |
| `beam-cast` | Cast input value: `number`, `integer`, `boolean`, `trim` | `beam-cast="number"` |
| `beam-loading-class` | Add class to input while request is in progress | `beam-loading-class="loading"` |
| `beam-keep` | Preserve input focus and cursor position after morph | `beam-keep` |

### Dirty Form Tracking

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-dirty-track` | Enable dirty tracking on a form | `<form beam-dirty-track>` |
| `beam-dirty-indicator` | Show element when form is dirty | `beam-dirty-indicator="#my-form"` |
| `beam-dirty-class` | Toggle class instead of visibility | `beam-dirty-class="has-changes"` |
| `beam-warn-unsaved` | Warn before leaving page with unsaved changes | `<form beam-warn-unsaved>` |
| `beam-revert` | Button to revert form to original values | `beam-revert="#my-form"` |
| `beam-show-if-dirty` | Show element when form is dirty | `beam-show-if-dirty="#my-form"` |
| `beam-hide-if-dirty` | Hide element when form is dirty | `beam-hide-if-dirty="#my-form"` |

### Conditional Form Fields

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-enable-if` | Enable field when condition is true | `beam-enable-if="#subscribe:checked"` |
| `beam-disable-if` | Disable field when condition is true | `beam-disable-if="#country[value='']"` |
| `beam-visible-if` | Show field when condition is true | `beam-visible-if="#source[value='other']"` |
| `beam-hidden-if` | Hide field when condition is true | `beam-hidden-if="#premium:checked"` |
| `beam-required-if` | Make field required when condition is true | `beam-required-if="#business:checked"` |

### Deferred Loading

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-defer` | Load content when element enters viewport | `beam-defer` |
| `beam-action` | Action to call (used with `beam-defer`) | `beam-action="loadComments"` |

### Polling

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-poll` | Enable polling on this element | `beam-poll` |
| `beam-interval` | Poll interval in milliseconds | `beam-interval="5000"` |
| `beam-action` | Action to call on each poll | `beam-action="getStatus"` |

### Hungry Elements

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-hungry` | Auto-update when any response contains matching ID | `beam-hungry` |

### Out-of-Band Updates

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-touch` | Update additional elements (on server response) | `beam-touch="#sidebar,#footer"` |

### Optimistic UI

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-optimistic` | Immediately update with this HTML before response | `beam-optimistic="<div>Saving...</div>"` |

### Preloading & Caching

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-preload` | Preload on hover: `hover`, `mount` | `beam-preload="hover"` |
| `beam-cache` | Cache duration in seconds | `beam-cache="60"` |

### Infinite Scroll

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-infinite` | Load more when scrolled near bottom (auto-trigger) | `beam-infinite` |
| `beam-load-more` | Load more on click (manual trigger) | `beam-load-more` |
| `beam-action` | Action to call for next page | `beam-action="loadMore"` |
| `beam-item-id` | Unique ID for list items (deduplication + fresh data sync) | `beam-item-id={item.id}` |

### Navigation Feedback

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-nav` | Mark container as navigation (children get `.beam-current`) | `<nav beam-nav>` |
| `beam-nav-exact` | Only match exact URL paths | `beam-nav-exact` |

### Offline Detection

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-offline` | Show element when offline, hide when online | `beam-offline` |
| `beam-offline-class` | Toggle class instead of visibility | `beam-offline-class="offline-warning"` |
| `beam-offline-disable` | Disable element when offline | `beam-offline-disable` |

### Conditional Show/Hide

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-switch` | Watch this field and control target elements | `beam-switch=".options"` |
| `beam-show-for` | Show when switch value matches | `beam-show-for="premium"` |
| `beam-hide-for` | Hide when switch value matches | `beam-hide-for="free"` |
| `beam-enable-for` | Enable when switch value matches | `beam-enable-for="admin"` |
| `beam-disable-for` | Disable when switch value matches | `beam-disable-for="guest"` |

### Auto-submit Forms

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-autosubmit` | Submit form when any field changes | `beam-autosubmit` |
| `beam-debounce` | Debounce delay in milliseconds | `beam-debounce="300"` |

### Boost Links

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-boost` | Upgrade links to AJAX (on container or link) | `<main beam-boost>` |
| `beam-boost-off` | Exclude specific links from boosting | `beam-boost-off` |

### Keep Elements

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-keep` | Preserve element during DOM updates | `<video beam-keep>` |

### Client-Side UI State (No Server Round-Trip)

These attributes handle UI state entirely on the client, without making server requests. Perfect for menus, dropdowns, accordions, and other interactive UI patterns.

#### Toggle

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-toggle` | Toggle visibility of target element | `beam-toggle="#menu"` |
| `beam-hidden` | Mark element as initially hidden | `<div beam-hidden>` |
| `beam-transition` | Add transition effect: `fade`, `slide`, `scale` | `beam-transition="fade"` |

#### Dropdown

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-dropdown` | Container for dropdown (provides positioning) | `<div beam-dropdown>` |
| `beam-dropdown-trigger` | Button that opens the dropdown | `<button beam-dropdown-trigger>` |
| `beam-dropdown-content` | The dropdown content (add `beam-hidden`) | `<div beam-dropdown-content beam-hidden>` |

#### Collapse

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-collapse` | Toggle collapsed state of target | `beam-collapse="#details"` |
| `beam-collapsed` | Mark element as initially collapsed | `<div beam-collapsed>` |
| `beam-collapse-text` | Swap button text when toggled | `beam-collapse-text="Show less"` |

#### Class Toggle

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-class-toggle` | CSS class to toggle | `beam-class-toggle="active"` |
| `beam-class-target` | Target element (defaults to self) | `beam-class-target="#sidebar"` |

---

## Swap Modes

Control how content is inserted into the target element:

| Mode | Description |
|------|-------------|
| `morph` | Smart DOM diffing (default) - preserves focus, animations |
| `replace` | Replace innerHTML completely |
| `append` | Add to the end of target |
| `prepend` | Add to the beginning of target |

```html
<!-- Append new items to a list -->
<button beam-action="addItem" beam-swap="append" beam-target="#items">
  Add Item
</button>

<!-- Smooth morph update -->
<button beam-action="refresh" beam-swap="morph" beam-target="#content">
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
  const data = await c.req.parseBody()
  const validateField = data._validate

  if (validateField === 'email') {
    // Return just the validation feedback
    if (data.email === 'taken@example.com') {
      return <div class="error">Email already taken</div>
    }
    return <div class="success">Email available</div>
  }

  // Full form submission
  return <div>Form submitted!</div>
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

### Preserving Focus

Use `beam-keep` to preserve focus and cursor position after the response morphs the DOM:

```html
<input
  name="bio"
  beam-action="validateBio"
  beam-target="#bio-feedback"
  beam-watch="input"
  beam-keep
/>
```

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
  [beam-dirty-indicator] { display: none; color: orange; }
</style>
```

### Revert Changes

Add a button to restore original values:

```html
<form id="profile-form" beam-dirty-track>
  <input name="username" value="johndoe" />
  <input name="email" value="john@example.com" />

  <button type="button" beam-revert="#profile-form" beam-show-if-dirty="#profile-form">
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
  <div beam-hide-if-dirty="#settings">
    All changes saved
  </div>
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

Elements marked with `beam-hungry` automatically update whenever any action returns HTML with a matching ID:

```html
<!-- This badge updates when any action returns #cart-count -->
<span id="cart-count" beam-hungry>0</span>

<!-- Clicking this updates both #cart-result AND #cart-count -->
<button beam-action="addToCart" beam-target="#cart-result">
  Add to Cart
</button>
```

```tsx
export function addToCart(c) {
  const cartCount = getCartCount() + 1
  return (
    <>
      <div>Item added to cart!</div>
      {/* This updates the hungry element */}
      <span id="cart-count">{cartCount}</span>
    </>
  )
}
```

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
  )
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
<button beam-action="navigate" beam-instant>
  Next Page
</button>
```

---

## Disable During Request

Prevent double-submissions by disabling elements during requests:

```html
<!-- Disable the button itself -->
<button beam-action="save" beam-disable>
  Save
</button>

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
  <a href="/home">Home</a>        <!-- Gets .beam-current when on /home -->
  <a href="/products">Products</a> <!-- Gets .beam-current when on /products/* -->
  <a href="/about" beam-nav-exact>About</a> <!-- Only exact match -->
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
<button beam-action="save" beam-offline-disable>
  Save
</button>
```

The `body` also gets `.beam-offline` class when disconnected.

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
<form beam-action="filterProducts" beam-target="#products" beam-autosubmit beam-debounce="300">
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

## Boost Links

Upgrade regular links to use AJAX navigation:

```html
<!-- Boost all links in a container -->
<main beam-boost>
  <a href="/page1">Page 1</a>  <!-- Now uses AJAX -->
  <a href="/page2">Page 2</a>  <!-- Now uses AJAX -->
  <a href="/external.com" beam-boost-off>External</a> <!-- Not boosted -->
</main>

<!-- Or boost individual links -->
<a href="/about" beam-boost beam-target="#content">About</a>
```

Boosted links:
- Fetch pages via AJAX
- Update the specified target (default: `body`)
- Push to browser history
- Update page title
- Fall back to normal navigation on error

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

## Client-Side UI State

These features handle UI interactions entirely on the client without server requests. They replace common Alpine.js patterns.

### Toggle

Show/hide elements with optional transitions:

```html
<!-- Basic toggle -->
<button beam-toggle="#menu">Toggle Menu</button>
<div id="menu" beam-hidden>
  <a href="/home">Home</a>
  <a href="/about">About</a>
</div>

<!-- With fade transition -->
<button beam-toggle="#panel">Show Panel</button>
<div id="panel" beam-hidden beam-transition="fade">
  Fades in and out smoothly
</div>

<!-- With slide transition -->
<button beam-toggle="#dropdown">Open</button>
<div id="dropdown" beam-hidden beam-transition="slide">
  Slides down from top
</div>
```

The trigger button automatically gets `aria-expanded` attribute updated.

### Dropdown

Dropdowns with automatic outside-click closing and Escape key support:

```html
<div beam-dropdown>
  <button beam-dropdown-trigger>Account ▼</button>
  <div beam-dropdown-content beam-hidden>
    <a href="/profile">Profile</a>
    <a href="/settings">Settings</a>
    <a href="/logout">Logout</a>
  </div>
</div>
```

Features:
- Click outside to close
- Press Escape to close
- Only one dropdown open at a time
- Automatic `aria-expanded` management

### Collapse

Expand/collapse content with automatic button text swapping:

```html
<button beam-collapse="#details" beam-collapse-text="Show less">
  Show more
</button>
<div id="details" beam-collapsed>
  <p>This content is initially hidden.</p>
  <p>Click the button to expand/collapse.</p>
  <p>Notice the button text changes automatically!</p>
</div>
```

The button text swaps between "Show more" and "Show less" on each click.

### Class Toggle

Toggle CSS classes on elements:

```html
<!-- Toggle class on another element -->
<button beam-class-toggle="active" beam-class-target="#sidebar">
  Toggle Sidebar
</button>
<div id="sidebar">Sidebar content</div>

<!-- Toggle class on self -->
<button beam-class-toggle="pressed">
  Toggle Me
</button>
```

### CSS for Transitions

Include the Beam CSS for transition support:

```css
/* Required base styles */
[beam-hidden] { display: none !important; }
[beam-collapsed] { display: none !important; }

/* Fade transition */
[beam-transition="fade"] {
  transition: opacity 150ms ease-out;
}
[beam-transition="fade"][beam-hidden] {
  opacity: 0;
  pointer-events: none;
  display: block !important;
}

/* Slide transition */
[beam-transition="slide"] {
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}
[beam-transition="slide"][beam-hidden] {
  opacity: 0;
  transform: translateY(-10px);
  pointer-events: none;
  display: block !important;
}
```

Or import the included CSS:

```typescript
import '@benqoder/beam/styles'
// or
import '@benqoder/beam/beam.css'
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
<div>
  <button beam-toggle="#menu">Menu</button>
  <div id="menu" beam-hidden>Content</div>
</div>
```

**Before (Alpine.js dropdown):**
```html
<div x-data="{ open: false }" @click.outside="open = false">
  <button @click="open = !open">Account</button>
  <div x-show="open">Dropdown</div>
</div>
```

**After (Beam):**
```html
<div beam-dropdown>
  <button beam-dropdown-trigger>Account</button>
  <div beam-dropdown-content beam-hidden>Dropdown</div>
</div>
```

---

## Server API

### createBeam

Creates a Beam instance with handlers:

```typescript
import { createBeam } from '@benqoder/beam'

const beam = createBeam<Env>({
  actions: { increment, decrement, openModal, openCart },
})
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
  actions: '/app/actions/*.tsx',   // default
})
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
let todos = ['Learn Beam', 'Build something']

export function addTodo(c) {
  const text = c.req.query('text')
  if (text) todos.push(text)
  return <TodoList todos={todos} />
}

export function deleteTodo(c) {
  const index = parseInt(c.req.query('index'))
  todos.splice(index, 1)
  return <TodoList todos={todos} />
}

function TodoList({ todos }) {
  return (
    <ul>
      {todos.map((todo, i) => (
        <li>
          {todo}
          <button beam-action="deleteTodo" beam-data-index={i} beam-target="#todos">
            Delete
          </button>
        </li>
      ))}
    </ul>
  )
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
  const query = c.req.query('q') || ''
  const results = searchDatabase(query)

  return (
    <ul>
      {results.map(item => (
        <li>{item.name}</li>
      ))}
    </ul>
  )
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
let cart = []

export function addToCart(c) {
  const product = c.req.query('product')
  cart.push(product)

  return (
    <>
      <div>Added {product} to cart!</div>
      <span id="cart-badge">{cart.length}</span>
    </>
  )
}
```

```html
<span id="cart-badge" beam-hungry>0</span>

<button beam-action="addToCart" beam-data-product="Widget" beam-target="#message">
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
  actions: '/app/actions/*.tsx',
  session: true, // Enable with defaults (cookie storage)
})
```

2. **Add SESSION_SECRET to wrangler.toml:**

```toml
[vars]
SESSION_SECRET = "your-secret-key-change-in-production"
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
const cart = await ctx.session.get<CartItem[]>('cart')

// Set a value
await ctx.session.set('cart', [{ productId: '123', qty: 1 }])

// Delete a value
await ctx.session.delete('cart')
```

### Storage Options

#### Cookie Storage (Default)

Session data is stored in a signed cookie. Good for small data (~4KB limit).

```typescript
beamPlugin({
  session: true, // Uses cookie storage
})

// Or with custom options:
beamPlugin({
  session: {
    secretEnvKey: 'MY_SECRET',  // Default: 'SESSION_SECRET'
    cookieName: 'my_sid',       // Default: 'beam_sid'
    maxAge: 86400,              // Default: 1 year (in seconds)
  },
})
```

#### KV Storage (For WebSocket Actions)

Cookie storage is read-only in WebSocket context. For actions that modify session data via WebSocket, use KV storage:

```typescript
// vite.config.ts
beamPlugin({
  session: { storage: '/app/session-storage.ts' },
})
```

```typescript
// app/session-storage.ts
import { KVSession } from '@benqoder/beam'

export default (sessionId: string, env: { KV: KVNamespace }) =>
  new KVSession(sessionId, env.KV)
```

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "KV"
id = "your-kv-namespace-id"

[vars]
SESSION_SECRET = "your-secret-key"
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
  actions: '/app/actions/*.tsx',
  session: true, // Uses env.SESSION_SECRET
})
```

#### 2. Use authMiddleware

```typescript
// app/server.ts
import { createApp } from 'honox/server'
import { beam } from 'virtual:beam'

const app = createApp({
  init(app) {
    app.use('*', beam.authMiddleware()) // Generates token
    beam.init(app)
  }
})

export default app
```

#### 3. Inject Token in Layout

```tsx
// app/routes/_renderer.tsx
import { jsxRenderer } from 'hono/jsx-renderer'

export default jsxRenderer((c, { children }) => {
  const token = c.get('beamAuthToken')

  return (
    <html>
      <head>
        <meta name="beam-token" content={token} />
        <script type="module" src="/app/client.ts"></script>
      </head>
      <body>{children}</body>
    </html>
  )
})
```

Or use the helper:

```tsx
import { beamTokenMeta } from '@benqoder/beam'
import { Raw } from 'hono/html'

<head>
  <Raw html={beamTokenMeta(c.get('beamAuthToken'))} />
</head>
```

#### 4. Set Environment Variable

```bash
# .dev.vars (local) or Cloudflare dashboard (production)
SESSION_SECRET=your-secret-key-at-least-32-chars
```

### How It Works

| Step | What Happens |
|------|--------------|
| 1. Page Load | Server generates 5-minute token, embeds in HTML |
| 2. Client Connects | WebSocket opens, gets `PublicApi` (unauthenticated) |
| 3. Client Authenticates | Calls `publicApi.authenticate(token)` |
| 4. Server Validates | Verifies signature, expiration, session match |
| 5. Server Returns | Full `BeamServer` API (authenticated) |

### Security Properties

| Attack | Result |
|--------|--------|
| Cross-site WebSocket | Can connect, but `authenticate()` fails (no token) |
| Stolen token | Expires in 5 minutes, tied to session ID |
| Replay attack | Token is single-use per session |
| Token tampering | HMAC-SHA256 signature verification fails |

### Token Details

- **Algorithm**: HMAC-SHA256
- **Lifetime**: 5 minutes (configurable)
- **Payload**: `{ sid: sessionId, uid: userId, exp: timestamp }`
- **Format**: `base64(payload).base64(signature)`

### Generating Tokens Manually

If you need to generate tokens outside the middleware:

```typescript
const token = await beam.generateAuthToken(ctx)
```

---

## Programmatic API

Call actions directly from JavaScript using `window.beam`:

```javascript
// Call action with RPC only (no DOM update)
const response = await window.beam.logout()

// Call action and swap HTML into target
await window.beam.getCartBadge({}, '#cart-count')

// With swap mode
await window.beam.loadMoreProducts({ page: 2 }, { target: '#products', swap: 'append' })

// Full options object
await window.beam.addToCart({ productId: 123 }, {
  target: '#cart-badge',
  swap: 'morph'  // 'morph' | 'innerHTML' | 'append' | 'prepend'
})
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
await window.beam.showNotification({ message: 'Hello!' })

// Server returns redirect - navigates automatically
await window.beam.logout()  // ctx.redirect('/login')

// Server returns HTML + script - both handled
await window.beam.addToCart({ id: 42 }, '#cart-badge')
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
  return ctx.redirect('/login')
}

export function requireAuth(ctx: BeamContext<Env>) {
  const user = ctx.session.get('user')
  if (!user) {
    return ctx.redirect('/login?next=' + encodeURIComponent(ctx.req.url))
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
const page = parseInt(c.req.query('page') || '1')
const products = await getProducts(page)
```

### Infinite Scroll & Load More State

For infinite scroll and load more, Beam automatically preserves:
- **Loaded content**: All items that were loaded
- **Scroll position**: Where the user was on the page

This happens automatically when using `beam-infinite` or `beam-load-more`. The state is stored in the browser's `sessionStorage` with a 30-minute TTL.

#### Infinite Scroll (auto-trigger on visibility)

```html
<div id="product-list" class="product-grid">
  {products.map(p => <ProductCard product={p} />)}
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

```html
<div id="product-list" class="product-grid">
  {products.map(p => <ProductCard product={p} />)}
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
5. Fresh server data is morphed over cached items (using `beam-item-id`)

#### Keeping Items Fresh with `beam-item-id`

When restoring from cache, the server still renders fresh Page 1 data. To sync fresh data with cached items, add `beam-item-id` to your list items:

```html
<!-- Any list item with a unique identifier -->
<div class="product-card" beam-item-id={product.id}>...</div>
<div class="comment" beam-item-id={comment.id}>...</div>
<article beam-item-id={post.slug}>...</article>
```

On back navigation:
1. Cache is restored (all loaded items + scroll position)
2. Fresh server items are morphed over matching cached items
3. Server data takes precedence for items in both

This ensures Page 1 items always have fresh data (prices, stock, etc.) while preserving the full scroll state.

#### Automatic Deduplication

When using `beam-item-id`, Beam automatically handles duplicate items when appending or prepending content:

1. **Duplicates are replaced**: If an item with the same `beam-item-id` already exists, it's morphed with fresh data
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
  const items = await getItems(page)
  const hasMore = await hasMoreItems(page)

  return (
    <>
      {items.map(item => <ProductCard product={item} />)}
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
  )
}
```

#### Clearing Scroll State

To manually clear the saved scroll state:

```javascript
window.beam.clearScrollState()
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
