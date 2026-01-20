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
      modals: './modals/*.tsx',
      drawers: './drawers/*.tsx',
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

Modals are overlay dialogs rendered from server components.

```tsx
// app/modals/confirm.tsx
import { ModalFrame } from '@benqoder/beam'

export function confirmDelete(c) {
  const id = c.req.query('id')
  return (
    <ModalFrame title="Confirm Delete">
      <p>Are you sure you want to delete item {id}?</p>
      <button beam-action="deleteItem" beam-data-id={id} beam-close>
        Delete
      </button>
      <button beam-close>Cancel</button>
    </ModalFrame>
  )
}
```

```html
<button beam-modal="confirmDelete" beam-data-id="123">
  Delete Item
</button>
```

### Drawers

Drawers are slide-in panels from the left or right edge.

```tsx
// app/drawers/cart.tsx
import { DrawerFrame } from '@benqoder/beam'

export function shoppingCart(c) {
  return (
    <DrawerFrame title="Shopping Cart">
      <div class="cart-items">
        {/* Cart contents */}
      </div>
    </DrawerFrame>
  )
}
```

```html
<button beam-drawer="shoppingCart" beam-position="right" beam-size="medium">
  Open Cart
</button>
```

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

### Modals

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-modal` | Modal handler name to open | `beam-modal="editUser"` |
| `beam-close` | Close the current modal when clicked | `beam-close` |

### Drawers

| Attribute | Description | Example |
|-----------|-------------|---------|
| `beam-drawer` | Drawer handler name to open | `beam-drawer="settings"` |
| `beam-position` | Side to open from: `left`, `right` | `beam-position="left"` |
| `beam-size` | Drawer width: `small`, `medium`, `large` | `beam-size="large"` |
| `beam-close` | Close the current drawer when clicked | `beam-close` |

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
| `beam-infinite` | Load more when scrolled near bottom | `beam-infinite` |
| `beam-action` | Action to call for next page | `beam-action="loadMore"` |

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
  actions: { increment, decrement },
  modals: { editUser, confirmDelete },
  drawers: { settings, cart },
})
```

### ModalFrame

Wrapper component for modals:

```tsx
import { ModalFrame } from '@benqoder/beam'

export function myModal(c) {
  return (
    <ModalFrame title="Modal Title">
      <p>Modal content</p>
    </ModalFrame>
  )
}
```

### DrawerFrame

Wrapper component for drawers:

```tsx
import { DrawerFrame } from '@benqoder/beam'

export function myDrawer(c) {
  return (
    <DrawerFrame title="Drawer Title">
      <p>Drawer content</p>
    </DrawerFrame>
  )
}
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
  // Glob patterns for handler files (must start with '/' for virtual modules)
  actions: '/app/actions/*.tsx',   // default
  modals: '/app/modals/*.tsx',     // default
  drawers: '/app/drawers/*.tsx',   // default
})
```

---

## TypeScript

### Handler Types

```typescript
import type { ActionHandler, ModalHandler, DrawerHandler } from '@benqoder/beam'

const myAction: ActionHandler<Env> = (c) => {
  return <div>Hello</div>
}

const myModal: ModalHandler<Env> = (c) => {
  return <ModalFrame title="Hi"><p>Content</p></ModalFrame>
}

const myDrawer: DrawerHandler<Env> = (c) => {
  return <DrawerFrame title="Hi"><p>Content</p></DrawerFrame>
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
  modals: '/app/modals/*.tsx',
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

## Browser Support

Beam requires modern browsers with WebSocket support:
- Chrome 16+
- Firefox 11+
- Safari 7+
- Edge 12+

---

## License

MIT
