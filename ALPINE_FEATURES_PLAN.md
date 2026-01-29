# Alpine.js Features Plan for Beam

## Current State: What Beam Already Has

| Beam Feature | Alpine Equivalent | Status |
|--------------|-------------------|--------|
| `beam-toggle` / `beam-hidden` | `x-show` | ✅ Complete |
| `beam-transition="fade\|slide\|scale"` | `x-transition` | ✅ Complete |
| `beam-switch` / `beam-show-for` | Conditional rendering | ✅ Complete |
| `beam-enable-if` / `beam-visible-if` | `:disabled`, `x-show` with expressions | ✅ Complete |
| `beam-dropdown` | Dropdown pattern | ✅ Complete |
| `beam-collapse` | Accordion pattern | ✅ Complete |
| `beam-modal` / `beam-drawer` | Modal patterns | ✅ Complete |
| `beam-watch` (input watching) | `@input` handlers | ✅ Complete |
| `beam-class-toggle` | `:class` binding | ⚠️ Partial (single class only) |

## Key Architectural Difference

- **Beam** = Server-rendered with WebSocket RPC (state lives on server)
- **Alpine** = Client-side reactive (state lives in browser)

We should adopt Alpine features that **enhance client-side UX** without duplicating server-side responsibilities.

---

## High Priority Features

### 1. `beam-ref` / `$refs` - Element References

```html
<!-- Alpine -->
<input x-ref="search">
<button @click="$refs.search.focus()">Focus</button>

<!-- Proposed Beam -->
<input beam-ref="search">
<button beam-focus="search">Focus</button>
<!-- Or via JS: window.beam.refs.search.focus() -->
```

**Why:** Eliminates `document.querySelector()` boilerplate. Essential for focus management, scroll-to, clipboard operations.

---

### 2. `beam-bind:*` / `:*` - Dynamic Attribute Binding

```html
<!-- Alpine -->
<button :class="{ 'active': isOpen }" :disabled="loading">

<!-- Proposed Beam -->
<button beam-bind:class="active:isOpen" beam-bind:disabled="loading">
<!-- Or shorthand -->
<button :class="active:#checkbox:checked" :disabled="#form:invalid">
```

**Why:** Beam's `beam-class-toggle` only toggles ONE class. Need multi-class conditional binding and arbitrary attribute binding.

---

### 3. `beam-cloak` - Prevent Flash of Unstyled Content

```html
<!-- Alpine -->
<div x-cloak>Hidden until Alpine loads</div>

<!-- Proposed Beam -->
<div beam-cloak>Hidden until Beam initializes</div>
```

**Why:** Prevents jarring FOUC when page loads before Beam JS initializes. Simple CSS + attribute removal.

---

### 4. `beam-text` / `beam-html` - Client-Side Text Interpolation

```html
<!-- Alpine -->
<span x-text="count"></span>

<!-- Proposed Beam (read from another element) -->
<input id="name" value="John">
<span beam-text="#name">John</span>  <!-- Updates live as #name changes -->

<!-- With formatting -->
<input type="range" id="price" value="50">
<span beam-text="#price" beam-format="$%s">$50</span>
```

**Why:** Live preview without server round-trip. Perfect for sliders, character counts, live form previews.

---

### 5. `beam-dispatch` - Custom Events

```html
<!-- Alpine -->
<button @click="$dispatch('notify', { message: 'Hello' })">

<!-- Proposed Beam -->
<button beam-dispatch="notify" beam-dispatch-detail='{"message": "Hello"}'>

<!-- Listen -->
<div beam-on:notify="showToast">
```

**Why:** Enables component-to-component communication without coupling. Critical for decoupled UI patterns.

---

### 6. `beam-teleport` - Move Elements in DOM

```html
<!-- Alpine -->
<template x-teleport="body">
  <div class="tooltip">...</div>
</template>

<!-- Proposed Beam -->
<template beam-teleport="body">
  <div class="tooltip">...</div>
</template>
```

**Why:** Tooltips/popovers need to escape parent `overflow:hidden` and z-index stacking contexts.

---

## Medium Priority Features

### 7. `beam-scope` - Local UI State

```html
<!-- Alpine -->
<div x-data="{ open: false, count: 0 }">

<!-- Proposed Beam -->
<div beam-scope="{ open: false, count: 0 }">
  <button beam-set="open = !open">Toggle</button>
  <div beam-show="open">Content</div>
  <button beam-set="count++">+</button>
  <span beam-text="count">0</span>
</div>
```

**Why:** Some UI state (hover menus, tab selections, counters) shouldn't require server round-trips.

---

### 8. `beam-model` - Two-Way Binding

```html
<!-- Alpine -->
<input x-model="name">
<p>Hello, <span x-text="name"></span></p>

<!-- Proposed Beam -->
<input beam-model="name">
<p>Hello, <span beam-text="name"></span></p>
```

**Why:** Live form previews, character counters, real-time formatting. Only for UI feedback.

---

### 9. `beam-effect` - Reactive Side Effects

```html
<!-- Alpine -->
<div x-effect="console.log(count)">

<!-- Proposed Beam -->
<div beam-effect="localStorage.setItem('count', this.count)">
```

**Why:** Sync local state to localStorage, update document title, trigger analytics.

---

### 10. Enhanced Transitions

```html
<!-- Alpine granular control -->
<div x-show="open"
     x-transition:enter="transition ease-out duration-300"
     x-transition:enter-start="opacity-0 scale-90"
     x-transition:enter-end="opacity-100 scale-100">

<!-- Proposed Beam -->
<div beam-toggle="#btn"
     beam-transition-enter="ease-out duration-300"
     beam-transition-enter-from="opacity-0 scale-90"
     beam-transition-leave="ease-in duration-200">
```

**Why:** Custom enter/leave classes enable Tailwind-style transitions.

---

## Lower Priority (Server-Rendered Handles These)

| Feature | Alpine | Why Lower Priority |
|---------|--------|-------------------|
| `x-for` | Client loops | Server renders lists |
| `x-if` | DOM removal | Server handles conditionals |
| `$watch` | Data watching | Server-driven updates |
| `$nextTick` | Post-update | Idiomorph handles DOM sync |

---

## Implementation Plan

### Phase 1 - Quick Wins

| Feature | DX Impact | Complexity |
|---------|-----------|------------|
| `beam-cloak` | High | Very Low |
| `beam-ref` | High | Low |

### Phase 2 - Core Enhancements

| Feature | DX Impact | Complexity |
|---------|-----------|------------|
| `beam-text` | High | Medium |
| Enhanced `beam-bind:class` | High | Medium |

### Phase 3 - Advanced Patterns

| Feature | DX Impact | Complexity |
|---------|-----------|------------|
| `beam-dispatch` | Medium | Low |
| `beam-teleport` | Medium | Medium |
| `beam-scope` | Medium | High |

---

## Design Principle

Beam's strength is **server-driven UI**. Don't replicate Alpine's full reactivity.

Add Alpine features that handle **micro-interactions** without server involvement:

- Focus management (`beam-ref`)
- Visual feedback (`beam-text`, `beam-cloak`)
- Dynamic styling (`beam-bind:class`)
- Component communication (`beam-dispatch`)
- Layout escape hatches (`beam-teleport`)
