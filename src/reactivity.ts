// ============ BEAM REACTIVITY ============
// Arrow.js-inspired reactivity for UI components (carousels, tabs, accordions, etc.)
// All declarative via HTML attributes, no JS config required.
// Can be used standalone without Beam server.
//
// Usage (multiple syntax options):
//
//   Simple value (uses beam-id as property name):
//   <div beam-state="false" beam-id="open">
//     <button beam-click="open = !open">Toggle</button>
//     <div beam-show="open">Content</div>
//   </div>
//
//   Key-value pairs:
//   <div beam-state="tab: 0; total: 5">
//     <button beam-click="tab = (tab + 1) % total">Next</button>
//   </div>
//
//   JSON (for arrays/nested objects):
//   <div beam-state='{"items": [1, 2, 3]}'>
//     ...
//   </div>
//
// beam-class syntax options:
//
//   Simplified (semicolon-separated key-value pairs):
//   <button beam-class="active: tab === 0">Tab 1</button>
//   <div beam-class="text-red: hasError; text-green: !hasError">
//
//   Multiple classes with one condition (quote the class names):
//   <div beam-class="'text-green italic': !hasError; bold: important">
//
//   JSON (backward compatible):
//   <button beam-class="{ active: tab === 0, highlight: selected }">

// --- Signal Primitives ---
interface ReactiveSignal<T> {
  value: T
  subs: Set<ReactiveEffect>
}

interface ReactiveEffect {
  run: () => void
  deps: Set<ReactiveSignal<unknown>>
}

let activeReactiveEffect: ReactiveEffect | null = null
const pendingReactiveEffects = new Set<ReactiveEffect>()
let flushScheduled = false

function createSignal<T>(value: T): ReactiveSignal<T> {
  return { value, subs: new Set() }
}

function readSignal<T>(s: ReactiveSignal<T>): T {
  if (activeReactiveEffect) {
    s.subs.add(activeReactiveEffect)
    activeReactiveEffect.deps.add(s as ReactiveSignal<unknown>)
  }
  return s.value
}

function writeSignal<T>(s: ReactiveSignal<T>, value: T): void {
  if (s.value !== value) {
    s.value = value
    s.subs.forEach((e) => pendingReactiveEffects.add(e))
    scheduleFlush()
  }
}

function scheduleFlush(): void {
  if (!flushScheduled) {
    flushScheduled = true
    queueMicrotask(flushReactiveEffects)
  }
}

function flushReactiveEffects(): void {
  flushScheduled = false
  const effects = Array.from(pendingReactiveEffects)
  pendingReactiveEffects.clear()
  effects.forEach(runReactiveEffect)
}

function createReactiveEffect(fn: () => void): ReactiveEffect {
  const e: ReactiveEffect = { run: fn, deps: new Set() }
  runReactiveEffect(e)
  return e
}

function runReactiveEffect(e: ReactiveEffect): void {
  // Clean up old deps
  e.deps.forEach((s) => s.subs.delete(e))
  e.deps.clear()
  // Run with tracking
  const prev = activeReactiveEffect
  activeReactiveEffect = e
  try {
    e.run()
  } finally {
    activeReactiveEffect = prev
  }
}

// --- Reactive Proxy (deep) ---
const reactiveProxyCache = new WeakMap<object, object>()

function createReactiveProxy<T extends object>(obj: T): T {
  // Return cached proxy if exists
  if (reactiveProxyCache.has(obj)) {
    return reactiveProxyCache.get(obj) as T
  }

  const signals = new Map<string | symbol, ReactiveSignal<unknown>>()

  const proxy = new Proxy(obj, {
    get(target, prop) {
      if (typeof prop === 'symbol') return (target as Record<symbol, unknown>)[prop]
      if (!signals.has(prop)) {
        let val = (target as Record<string, unknown>)[prop]
        // Make nested objects reactive
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          val = createReactiveProxy(val as object)
            ; (target as Record<string, unknown>)[prop] = val
        }
        signals.set(prop, createSignal(val))
      }
      return readSignal(signals.get(prop)!)
    },
    set(target, prop, value) {
      if (typeof prop === 'symbol') {
        ; (target as Record<symbol, unknown>)[prop] = value
        return true
      }
      if (!signals.has(prop)) {
        signals.set(prop, createSignal(value))
      } else {
        writeSignal(signals.get(prop)!, value)
      }
      ; (target as Record<string, unknown>)[prop] = value
      return true
    },
  }) as T

  reactiveProxyCache.set(obj, proxy)
  return proxy
}

// --- State Storage ---
const reactiveElStates = new WeakMap<Element, object>()
const reactiveNamedStates = new Map<string, object>()

// --- Get State (walks up DOM tree) ---
function getReactiveState(el: Element): object | null {
  let current: Element | null = el
  while (current) {
    // Check for beam-state-ref (reference to named state)
    const ref = current.getAttribute?.('beam-state-ref')
    if (ref) return reactiveNamedStates.get(ref) || null

    // Check for local state
    if (reactiveElStates.has(current)) return reactiveElStates.get(current)!

    current = current.parentElement
  }
  return null
}

// --- Expression Evaluation ---
function evalReactiveExpr(expr: string, state: object | null, extras: Record<string, unknown> = {}): unknown {
  if (!state) return undefined
  try {
    // Create a function that uses 'with' to allow direct property access and mutation
    // The state object is passed as $s, and we use 'with($s)' to scope property access
    const extraKeys = Object.keys(extras)
    const extraVals = Object.values(extras)
    // For expressions with semicolons (multiple statements), execute all and return last result
    // For single expressions, just return the result
    const hasMultipleStatements = expr.includes(';')
    const fnBody = hasMultipleStatements
      ? `with($s) { ${expr} }` // Multiple statements - execute all
      : `with($s) { return (${expr}) }` // Single expression - return result
    const fn = new Function('$s', ...extraKeys, fnBody)
    return fn(state, ...extraVals)
  } catch (e) {
    console.warn('[beam] Reactive expression error:', expr, e)
    return undefined
  }
}

// --- Scope Check (don't process elements in nested scopes) ---
function isInReactiveScope(el: Element, scopeRoot: Element): boolean {
  let parent = el.parentElement
  while (parent && parent !== scopeRoot) {
    if (parent.hasAttribute('beam-state')) return false
    parent = parent.parentElement
  }
  return true
}

// --- Binding Processor ---
function processReactiveBindings(root: HTMLElement, _state: object): void {
  // beam-state-toggle: toggle (or set) a boolean state property
  // Usage:
  //   <button beam-state-toggle="open">Toggle</button>
  //   <button beam-state-toggle="open=true">Open</button>
  //   <button beam-state-toggle="open=false">Close</button>
  // Works with named state via beam-state-ref.
  root.querySelectorAll<HTMLElement>('[beam-state-toggle]').forEach((el) => {
    if (!isInReactiveScope(el, root)) return
    if (el.hasAttribute('beam-state-toggle-bound')) return
    el.setAttribute('beam-state-toggle-bound', '')

    const spec = (el.getAttribute('beam-state-toggle') || '').trim()
    if (!spec) {
      console.warn('[beam] beam-state-toggle requires a property name (e.g., beam-state-toggle="open")')
      return
    }

    const [rawKey, rawValue] = spec.split('=', 2)
    const key = rawKey.trim()
    const valueSpec = rawValue?.trim()

    el.addEventListener('click', () => {
      const state = getReactiveState(el) as Record<string, unknown> | null
      if (!state) return

      const current = state[key]
      let next: unknown

      if (valueSpec === 'true') next = true
      else if (valueSpec === 'false') next = false
      else if (valueSpec === 'null') next = null
      else if (valueSpec != null && valueSpec !== '') {
        // If value is provided but not a boolean keyword, store as string
        next = valueSpec
      } else {
        // Default: boolean toggle
        next = !Boolean(current)
      }

      state[key] = next

      if (typeof next === 'boolean') {
        el.setAttribute('aria-pressed', String(next))
        if (el.hasAttribute('aria-expanded')) {
          el.setAttribute('aria-expanded', String(next))
        }
      }
    })
  })

  // beam-text: text interpolation
  root.querySelectorAll<HTMLElement>('[beam-text]').forEach((el) => {
    if (!isInReactiveScope(el, root)) return
    const expr = el.getAttribute('beam-text')!
    createReactiveEffect(() => {
      el.textContent = String(evalReactiveExpr(expr, getReactiveState(el)) ?? '')
    })
  })

  // beam-attr-*: attribute binding
  root.querySelectorAll('*').forEach((el) => {
    if (!isInReactiveScope(el, root)) return
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('beam-attr-')) {
        const name = attr.name.slice(10) // remove 'beam-attr-'
        const expr = attr.value
        createReactiveEffect(() => {
          const val = evalReactiveExpr(expr, getReactiveState(el))
          if (val === false || val == null) {
            el.removeAttribute(name)
          } else if (val === true) {
            el.setAttribute(name, '')
          } else {
            el.setAttribute(name, String(val))
          }
        })
      }
    }
  })

  // beam-show: visibility binding
  root.querySelectorAll<HTMLElement>('[beam-show]').forEach((el) => {
    if (!isInReactiveScope(el, root)) return
    const expr = el.getAttribute('beam-show')!
    createReactiveEffect(() => {
      el.style.display = evalReactiveExpr(expr, getReactiveState(el)) ? '' : 'none'
    })
  })

  // beam-class: class toggling
  root.querySelectorAll<HTMLElement>('[beam-class]').forEach((el) => {
    if (!isInReactiveScope(el, root)) return
    const raw = el.getAttribute('beam-class')!
    const expr = parseClassExpr(raw)
    createReactiveEffect(() => {
      const classes = evalReactiveExpr(expr, getReactiveState(el))
      if (typeof classes === 'object' && classes) {
        for (const [cls, active] of Object.entries(classes as Record<string, boolean>)) {
          // Support space-separated class names (e.g., 'text-red bold')
          for (const c of cls.split(/\s+/).filter(Boolean)) {
            el.classList.toggle(c, Boolean(active))
          }
        }
      }
    })
  })

  // beam-click: click handler
  root.querySelectorAll<HTMLElement>('[beam-click]').forEach((el) => {
    if (!isInReactiveScope(el, root)) return
    // Skip if already has reactive click handler
    if (el.hasAttribute('beam-click-reactive')) return
    el.setAttribute('beam-click-reactive', '')

    const expr = el.getAttribute('beam-click')!
    el.addEventListener('click', (e) => {
      const state = getReactiveState(el)
      if (state) {
        evalReactiveExpr(expr, state, { $event: e })
      }
    })
  })

  // beam-model: two-way binding for inputs
  root.querySelectorAll<HTMLElement>('[beam-model]').forEach((el) => {
    if (!isInReactiveScope(el, root)) return
    // Skip if already has model binding
    if (el.hasAttribute('beam-model-bound')) return
    el.setAttribute('beam-model-bound', '')

    const prop = el.getAttribute('beam-model')!
    const inputEl = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

    // Set initial value from state
    createReactiveEffect(() => {
      const state = getReactiveState(el)
      if (state) {
        const val = (state as Record<string, unknown>)[prop]
        if (inputEl instanceof HTMLInputElement && (inputEl.type === 'checkbox' || inputEl.type === 'radio')) {
          inputEl.checked = Boolean(val)
        } else {
          inputEl.value = String(val ?? '')
        }
      }
    })

    // Update state on input
    const updateState = () => {
      const state = getReactiveState(el)
      if (state) {
        let val: unknown
        if (inputEl instanceof HTMLInputElement && inputEl.type === 'checkbox') {
          val = inputEl.checked
        } else if (inputEl instanceof HTMLInputElement && inputEl.type === 'number') {
          val = inputEl.valueAsNumber
        } else {
          val = inputEl.value
        }
        ; (state as Record<string, unknown>)[prop] = val
      }
    }
    el.addEventListener('input', updateState)
    el.addEventListener('change', updateState)
  })

  // beam-init: run expression once for child elements inside this scope.
  // The state container's own beam-init is handled in setupReactiveScope after this function.
  root.querySelectorAll<HTMLElement>('[beam-init]').forEach((el) => {
    if (!isInReactiveScope(el, root)) return
    if (el.hasAttribute('beam-init-run')) return
    el.setAttribute('beam-init-run', '')
    const expr = el.getAttribute('beam-init')!
    evalReactiveExpr(expr, getReactiveState(el))
  })
}

// --- Class Expression Parsing ---
function parseClassExpr(raw: string): string {
  const trimmed = raw.trim()

  // If starts with '{', it's already a JS object expression
  if (trimmed.startsWith('{')) {
    return trimmed
  }

  // Parse "class: expr; class2: expr2" into "{ 'class': expr, 'class2': expr2 }"
  // Also supports quoted class names for multiple classes: "'text-red bold': condition"
  const pairs = trimmed.split(';').map((p) => p.trim()).filter(Boolean)
  const entries: string[] = []

  for (const pair of pairs) {
    const colonIdx = pair.indexOf(':')
    if (colonIdx === -1) continue

    const className = pair.slice(0, colonIdx).trim()
    const expr = pair.slice(colonIdx + 1).trim()

    // Check if already quoted (for space-separated class names)
    if ((className.startsWith("'") && className.endsWith("'")) ||
      (className.startsWith('"') && className.endsWith('"'))) {
      entries.push(`${className}: ${expr}`)
    } else {
      // Quote the class name to handle hyphens (e.g., 'text-red')
      entries.push(`'${className}': ${expr}`)
    }
  }

  return `{ ${entries.join(', ')} }`
}

// --- State Value Parsing ---
function parseSimpleValue(val: string): unknown {
  // Boolean
  if (val === 'true') return true
  if (val === 'false') return false
  if (val === 'null') return null

  // Number
  if (/^-?\d+(\.\d+)?$/.test(val)) {
    return parseFloat(val)
  }

  // Quoted string
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    return val.slice(1, -1)
  }

  return undefined // Not a simple value
}

function parseStateValue(raw: string, beamId: string | null): object {
  const trimmed = raw.trim()

  // 1. JSON object or array
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed)
  }

  // 2. Simple value → { [beamId]: value }
  const simple = parseSimpleValue(trimmed)
  if (simple !== undefined) {
    if (!beamId) {
      console.warn('[beam] Simple beam-state requires beam-id for property name')
      return { value: simple } // Fallback
    }
    return { [beamId]: simple }
  }

  // 3. Key-value pairs: "key: value; key2: value2"
  const result: Record<string, unknown> = {}
  const pairs = trimmed.split(';').map((p) => p.trim()).filter(Boolean)

  for (const pair of pairs) {
    const colonIdx = pair.indexOf(':')
    if (colonIdx === -1) continue

    const key = pair.slice(0, colonIdx).trim()
    const val = pair.slice(colonIdx + 1).trim()
    const parsed = parseSimpleValue(val)
    result[key] = parsed !== undefined ? parsed : val
  }

  return result
}

// --- Setup Reactive Scope ---
function setupReactiveScope(el: HTMLElement): void {
  const stateAttr = el.getAttribute('beam-state')
  if (!stateAttr) return

  const id = el.getAttribute('beam-id')

  // Warn about dashed beam-ids (they won't work in JS expressions)
  if (id && id.includes('-')) {
    console.warn(
      `[beam] beam-id="${id}" contains dashes which won't work in expressions. Use camelCase instead (e.g., "${id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}")`
    )
  }

  // Check if named state already exists (preserve state across updates)
  let state: object
  if (id && reactiveNamedStates.has(id)) {
    // Reuse existing named state - preserves state after server-driven DOM updates
    state = reactiveNamedStates.get(id)!
  } else {
    // Create new state from attribute
    let initial: object
    if (stateAttr.startsWith('#')) {
      // Script element reference (always JSON)
      const scriptEl = document.querySelector(stateAttr)
      initial = JSON.parse(scriptEl?.textContent || '{}')
    } else {
      // Parse state value (JSON, simple value, or key-value pairs)
      initial = parseStateValue(stateAttr, id)
    }
    state = createReactiveProxy(initial)

    // Register named state if beam-id is present
    if (id) {
      reactiveNamedStates.set(id, state)
    }
  }

  reactiveElStates.set(el, state)
  processReactiveBindings(el, state)

  // beam-init on the container element itself (not picked up by processReactiveBindings
  // since querySelectorAll('[beam-init]') only finds descendants, not the root).
  // Useful for setInterval (auto-play), setTimeout, or computing derived values.
  const initExpr = el.getAttribute('beam-init')
  if (initExpr && !el.hasAttribute('beam-init-run')) {
    el.setAttribute('beam-init-run', '')
    evalReactiveExpr(initExpr, state)
  }
}

// --- Setup standalone ref elements (elements with beam-state-ref outside any beam-state scope) ---
function setupRefElements(): void {
  // Find all elements with beam-state-ref that are NOT inside a beam-state scope
  document.querySelectorAll<HTMLElement>('[beam-state-ref]').forEach((el) => {
    // Skip if inside a beam-state scope (will be handled by that scope)
    if (el.closest('[beam-state]')) return
    // Skip if already initialized
    if (el.hasAttribute('beam-ref-init')) return
    el.setAttribute('beam-ref-init', '')

    // beam-text
    if (el.hasAttribute('beam-text')) {
      const expr = el.getAttribute('beam-text')!
      createReactiveEffect(() => {
        el.textContent = String(evalReactiveExpr(expr, getReactiveState(el)) ?? '')
      })
    }

    // beam-show
    if (el.hasAttribute('beam-show')) {
      const expr = el.getAttribute('beam-show')!
      createReactiveEffect(() => {
        el.style.display = evalReactiveExpr(expr, getReactiveState(el)) ? '' : 'none'
      })
    }

    // beam-class
    if (el.hasAttribute('beam-class')) {
      const raw = el.getAttribute('beam-class')!
      const expr = parseClassExpr(raw)
      createReactiveEffect(() => {
        const classes = evalReactiveExpr(expr, getReactiveState(el))
        if (typeof classes === 'object' && classes) {
          for (const [cls, active] of Object.entries(classes as Record<string, boolean>)) {
            // Support space-separated class names (e.g., 'text-red bold')
            for (const c of cls.split(/\s+/).filter(Boolean)) {
              el.classList.toggle(c, Boolean(active))
            }
          }
        }
      })
    }

    // beam-attr-*
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('beam-attr-')) {
        const name = attr.name.slice(10)
        const expr = attr.value
        createReactiveEffect(() => {
          const val = evalReactiveExpr(expr, getReactiveState(el))
          if (val === false || val == null) {
            el.removeAttribute(name)
          } else if (val === true) {
            el.setAttribute(name, '')
          } else {
            el.setAttribute(name, String(val))
          }
        })
      }
    }

    // beam-click
    if (el.hasAttribute('beam-click') && !el.hasAttribute('beam-click-reactive')) {
      el.setAttribute('beam-click-reactive', '')
      const expr = el.getAttribute('beam-click')!
      el.addEventListener('click', (e) => {
        const state = getReactiveState(el)
        if (state) {
          evalReactiveExpr(expr, state, { $event: e })
        }
      })
    }

    // beam-model
    if (el.hasAttribute('beam-model') && !el.hasAttribute('beam-model-bound')) {
      el.setAttribute('beam-model-bound', '')
      const prop = el.getAttribute('beam-model')!
      const inputEl = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

      createReactiveEffect(() => {
        const state = getReactiveState(el)
        if (state) {
          const val = (state as Record<string, unknown>)[prop]
          if (inputEl instanceof HTMLInputElement && (inputEl.type === 'checkbox' || inputEl.type === 'radio')) {
            inputEl.checked = Boolean(val)
          } else {
            inputEl.value = String(val ?? '')
          }
        }
      })

      const updateState = () => {
        const state = getReactiveState(el)
        if (state) {
          let val: unknown
          if (inputEl instanceof HTMLInputElement && inputEl.type === 'checkbox') {
            val = inputEl.checked
          } else if (inputEl instanceof HTMLInputElement && inputEl.type === 'number') {
            val = inputEl.valueAsNumber
          } else {
            val = inputEl.value
          }
          ; (state as Record<string, unknown>)[prop] = val
        }
      }
      el.addEventListener('input', updateState)
      el.addEventListener('change', updateState)
    }
  })
}

// --- Initialize ---
function initReactivity(): void {
  // MutationObserver for dynamic elements
  const reactiveStateObserver = new MutationObserver(() => {
    document.querySelectorAll<HTMLElement>('[beam-state]:not([beam-state-init])').forEach((el) => {
      el.setAttribute('beam-state-init', '')
      setupReactiveScope(el)
    })
    // Also setup any new ref elements
    setupRefElements()
  })
  reactiveStateObserver.observe(document.body, { childList: true, subtree: true })

  // Init existing elements
  document.querySelectorAll<HTMLElement>('[beam-state]').forEach((el) => {
    el.setAttribute('beam-state-init', '')
    setupReactiveScope(el)
  })

  // Setup standalone ref elements
  setupRefElements()
}

// --- Public API ---
export const beamReactivity = {
  /**
   * Get reactive state by element or named ID
   * @param elOrId - Element with beam-state or string ID from beam-id
   */
  getState: (elOrId: Element | string): object | undefined =>
    typeof elOrId === 'string' ? reactiveNamedStates.get(elOrId) : reactiveElStates.get(elOrId),

  /**
   * Batch multiple state updates into a single flush
   * @param fn - Function containing state mutations
   */
  batch: (fn: () => void): void => {
    fn()
    flushReactiveEffects()
  },

  /**
   * Manually initialize reactivity (called automatically on import)
   */
  init: initReactivity,
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReactivity)
  } else {
    initReactivity()
  }
}

// Expose on window for standalone usage
if (typeof window !== 'undefined') {
  ; (window as unknown as { beamReactivity: typeof beamReactivity }).beamReactivity = beamReactivity
}

// Export for standalone usage
export default beamReactivity
