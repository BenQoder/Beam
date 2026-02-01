# Beam Islands

Beam Islands provide first-class client-side interactivity that integrates seamlessly with Beam's HTML-over-WebSocket model.

## Overview

Islands are isolated, stateful client components that:

- **Auto-initialize** when Beam injects content (modals, drawers, action responses)
- **Survive morphdom updates** via hydration markers
- **Accept only primitives** (string, number, boolean) for security
- **Work with Beam actions** for server communication

## Quick Start

### 1. Configure Vite Plugin

```typescript
// vite.config.ts
import { beamPlugin } from '@benqoder/beam/vite'

export default defineConfig({
  plugins: [
    beamPlugin({
      actions: '/app/actions/*.tsx',
      islands: '/app/islands/*.tsx',  // Enable islands
    }),
  ],
})
```

### 2. Set Up Client

```typescript
// app/client.ts
import '@benqoder/beam/client'

// Import islands to register them
const islandModules = import.meta.glob('/app/islands/*.tsx', { eager: true })
Object.values(islandModules).forEach(() => {})
```

### 3. Create an Island

```typescript
// app/islands/Counter.tsx
import { defineIsland } from '@benqoder/beam/islands'

export default defineIsland('Counter', (props) => {
  const { initial = 0, step = 1 } = props

  const container = document.createElement('div')
  let count = initial

  const display = document.createElement('span')
  display.textContent = String(count)

  const btn = document.createElement('button')
  btn.textContent = '+'
  btn.onclick = () => {
    count += step
    display.textContent = String(count)
  }

  container.appendChild(display)
  container.appendChild(btn)
  return container
})
```

### 4. Use in HTML

```html
<div beam-island="Counter" data-initial="10" data-step="5"></div>
```

## API Reference

### `defineIsland(name, component)`

Defines and registers an island component.

**Parameters:**
- `name` (string): The name used in `beam-island` attribute
- `component` (function): Component function that receives props and returns a DOM element

**Returns:** The component function (for tree-shaking)

**Example:**
```typescript
export default defineIsland('MyIsland', (props) => {
  // Create and return DOM elements
  return document.createElement('div')
})
```

### `hydrateIslands(root?)`

Manually hydrate islands within a root element.

**Parameters:**
- `root` (Document | Element): The root element to scan (defaults to document)

**Example:**
```typescript
import { hydrateIslands } from '@benqoder/beam/islands'

// Hydrate islands in a specific container
const container = document.getElementById('dynamic-content')
hydrateIslands(container)
```

**Note:** This is called automatically by Beam after DOM updates, modals, and drawers.

### `registerIsland(name, component)`

Low-level API to manually register an island.

**Parameters:**
- `name` (string): The island name
- `component` (function): The component function

**Example:**
```typescript
import { registerIsland } from '@benqoder/beam/islands'

registerIsland('CustomIsland', (props) => {
  return document.createElement('div')
})
```

## Props and Data Attributes

Islands receive props from `data-*` attributes. Only primitives are supported:

### Supported Types

| Type | Example | Parsed Value |
|------|---------|--------------|
| String | `data-name="Widget"` | `"Widget"` |
| Number | `data-max="50"` | `50` |
| Number | `data-price="99.99"` | `99.99` |
| Boolean | `data-featured="true"` | `true` |
| Boolean | `data-active="false"` | `false` |

### Type Inference

The parser follows these rules:
1. Exact match `"true"` → boolean `true`
2. Exact match `"false"` → boolean `false`
3. Valid number pattern (e.g., `"42"`, `"3.14"`, `"-10"`) → number
4. Everything else → string

### Examples

```html
<!-- String props -->
<div beam-island="Card" data-title="Hello" data-subtitle="World"></div>

<!-- Number props -->
<div beam-island="Counter" data-initial="10" data-step="5"></div>

<!-- Boolean props -->
<div beam-island="Toggle" data-checked="true" data-disabled="false"></div>

<!-- Mixed props -->
<div 
  beam-island="ProductCard"
  data-id="123"
  data-name="Widget"
  data-price="99.99"
  data-featured="true"
></div>
```

## Security Model

### Why Only Primitives?

Islands enforce primitive-only props to prevent security vulnerabilities:

❌ **What Islands Prevent:**
```typescript
// This is NOT POSSIBLE with islands
const product = {
  id: 123,
  name: "Secret Product",
  internalPrice: 50.00,
  publicPrice: 99.99,
  secretKey: "abc123"
}

// Islands won't let you do this
<div beam-island="Card" data-product={product}></div>
```

✅ **What Islands Enforce:**
```html
<!-- Only expose what's needed -->
<div 
  beam-island="Card"
  data-id="123"
  data-name="Secret Product"
  data-price="99.99"
></div>
```

### Benefits

1. **No Data Leaks**: Complex objects can't accidentally expose sensitive fields
2. **Explicit Data Flow**: You must consciously decide what to expose
3. **Smaller DOM**: No JSON blobs in HTML
4. **Better Performance**: Primitives are faster to parse than JSON

### Complex Data Strategies

If you need complex data in an island:

**Option 1: Fetch client-side**
```typescript
defineIsland('ProductDetails', async ({ productId }) => {
  const response = await fetch(`/api/products/${productId}`)
  const product = await response.json()
  // Use product data...
})
```

**Option 2: Use Beam actions**
```html
<!-- Island handles UI, Beam action handles data -->
<div beam-island="QuantitySelector" data-product-id="123"></div>
<button 
  beam-action="addToCart"
  beam-data-product-id="123"
  beam-include="quantity"
>
  Add to Cart
</button>
```

## Integration with Beam

### Islands in Modals

Islands automatically hydrate when modals open:

```typescript
// Server action
export function openProductModal(ctx, data) {
  return ctx.modal(`
    <div>
      <h2>Product</h2>
      <!-- Island auto-hydrates in modal -->
      <div beam-island="QuantitySelector" data-max="10"></div>
    </div>
  `)
}
```

### Islands in Drawers

Same auto-hydration for drawers:

```typescript
export function openCartDrawer(ctx, data) {
  return ctx.drawer(`
    <div>
      <!-- Islands in drawer auto-hydrate -->
      <div beam-island="CartItems"></div>
    </div>
  `)
}
```

### Islands with Beam Actions

Islands can trigger Beam actions:

```typescript
defineIsland('QuantitySelector', ({ productId, max }) => {
  const container = document.createElement('div')
  let qty = 1

  // ... create UI elements ...

  // Add hidden input that Beam actions can read
  const input = document.createElement('input')
  input.type = 'hidden'
  input.name = 'quantity'
  input.value = String(qty)
  container.appendChild(input)

  return container
})
```

```html
<div beam-island="QuantitySelector" data-product-id="123" data-max="10"></div>
<button 
  beam-action="addToCart"
  beam-include="quantity"
  beam-data-product-id="123"
>
  Add to Cart
</button>
```

### Morphdom Preservation

Islands are marked with `data-beam-hydrated` to survive morphdom updates:

```html
<!-- Before morphdom -->
<div beam-island="Counter" data-initial="5" data-beam-hydrated="true">
  <!-- Hydrated island content -->
</div>

<!-- After morphdom update -->
<div beam-island="Counter" data-initial="5" data-beam-hydrated="true">
  <!-- Island content preserved, not re-hydrated -->
</div>
```

## Advanced Patterns

### State Management

```typescript
defineIsland('TodoList', ({ userId }) => {
  const container = document.createElement('div')
  const todos = []

  const addTodo = (text) => {
    todos.push({ id: Date.now(), text, done: false })
    render()
  }

  const toggleTodo = (id) => {
    const todo = todos.find(t => t.id === id)
    if (todo) todo.done = !todo.done
    render()
  }

  const render = () => {
    container.innerHTML = ''
    // Render todos...
  }

  render()
  return container
})
```

### Event Delegation

```typescript
defineIsland('DataTable', ({ endpoint }) => {
  const table = document.createElement('table')

  // Event delegation for dynamic rows
  table.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (target.matches('.delete-btn')) {
      const id = target.dataset.id
      // Handle delete...
    }
  })

  return table
})
```

### Lifecycle Hooks

```typescript
defineIsland('AutoRefresh', ({ interval = 5000 }) => {
  const container = document.createElement('div')
  
  const timer = setInterval(() => {
    // Refresh data...
  }, interval)

  // Cleanup when element is removed
  const observer = new MutationObserver((mutations) => {
    if (!document.contains(container)) {
      clearInterval(timer)
      observer.disconnect()
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })

  return container
})
```

## Comparison with Other Approaches

| Feature | Beam Islands | HonoX Islands | Alpine.js | Hyperscript |
|---------|--------------|---------------|-----------|-------------|
| Props Security | ✅ Primitives only | ❌ JSON serialization | ❌ JSON in x-data | N/A |
| Auto-hydration | ✅ After Beam updates | ⚠️ SSR only | ✅ Via x-data | ✅ Via ` |
| Beam Integration | ✅ Native | ⚠️ Manual | ⚠️ Manual | ⚠️ Manual |
| Type Safety | ✅ TypeScript | ✅ TypeScript | ❌ Runtime only | ❌ Runtime only |
| Syntax | ✅ JavaScript/TS | ✅ JSX/React-like | ❌ HTML attributes | ❌ Custom syntax |
| Bundle Size | ~3KB | ~3KB | ~15KB | ~14KB |

## Best Practices

### Do's

✅ Use islands for isolated, stateful UI components
✅ Keep islands small and focused
✅ Use Beam actions for server communication
✅ Type your props for better DX
✅ Return DOM elements from component function

### Don'ts

❌ Don't try to pass complex objects as props (TypeScript will prevent this)
❌ Don't use islands for simple static content (use regular HTML)
❌ Don't recreate the entire page as an island (use Beam actions instead)
❌ Don't forget to import islands in client bundle

## Troubleshooting

### Islands not hydrating

**Check:**
1. Islands are imported in client.ts: `import.meta.glob('/app/islands/*.tsx', { eager: true })`
2. Vite plugin has `islands` configured
3. `beam-island` attribute matches registered name
4. Check browser console for errors

### Props not parsing correctly

**Check:**
1. Attribute starts with `data-` prefix
2. Value is a valid string representation
3. Boolean values are exact `"true"` or `"false"`
4. Number values match pattern: `^-?\d+\.?\d*$`

### Islands re-hydrating on every update

**Check:**
1. Element has `data-beam-hydrated` attribute after first hydration
2. Element is not being completely replaced (check morphdom config)

## Migration Guide

### From Alpine.js

**Before (Alpine.js):**
```html
<div x-data="{ count: 0 }">
  <span x-text="count"></span>
  <button @click="count++">+</button>
</div>
```

**After (Beam Islands):**
```typescript
// app/islands/Counter.tsx
export default defineIsland('Counter', ({ initial = 0 }) => {
  const container = document.createElement('div')
  let count = initial
  
  const display = document.createElement('span')
  display.textContent = String(count)
  
  const btn = document.createElement('button')
  btn.textContent = '+'
  btn.onclick = () => {
    count++
    display.textContent = String(count)
  }
  
  container.appendChild(display)
  container.appendChild(btn)
  return container
})
```

```html
<div beam-island="Counter" data-initial="0"></div>
```

### From HonoX Islands

**Before (HonoX Islands):**
```tsx
// island.tsx
export default function Counter({ initial, data }) {
  const [count, setCount] = useState(initial)
  return (
    <div>
      <span>{count}</span>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  )
}
```

```tsx
// Usage - exposes all data in DOM
<Counter initial={1} data={sensitiveObject} />
// Renders: <div data-serialized-props='{"initial":1,"data":{...}}'></div>
```

**After (Beam Islands):**
```tsx
// app/islands/Counter.tsx
export default defineIsland('Counter', ({ initial = 0 }) => {
  const container = document.createElement('div')
  let count = initial
  
  const display = document.createElement('span')
  display.textContent = String(count)
  
  const btn = document.createElement('button')
  btn.textContent = '+'
  btn.onclick = () => {
    count++
    display.textContent = String(count)
  }
  
  container.appendChild(display)
  container.appendChild(btn)
  return container
})
```

```html
<!-- Only primitives, no data leaks -->
<div beam-island="Counter" data-initial="1"></div>
```

## Examples

See the example app for complete working examples:
- `example/app/islands/Counter.tsx` - Simple counter with increment/decrement
- `example/app/islands/QuantitySelector.tsx` - E-commerce quantity selector
- `example/app/routes/islands-demo.tsx` - Demo page with multiple islands

## Contributing

Issues and PRs welcome! Please ensure:
- TypeScript compilation succeeds
- No security vulnerabilities (run `npm run security-check`)
- Example app builds successfully
- Code follows existing patterns
