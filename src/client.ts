import { Idiomorph } from 'idiomorph'
import { newWebSocketRpcSession, type RpcStub } from 'capnweb'
import { beamReactivity } from './reactivity'

// ============ BEAM - capnweb RPC Client ============
//
// Uses capnweb for:
// - Promise pipelining (multiple calls in one round-trip)
// - Bidirectional RPC (server can call client callbacks)
// - Automatic reconnection
// - Type-safe method calls
//
// SECURITY: Implements in-band authentication pattern
// - WebSocket connections start unauthenticated (PublicApi)
// - Client must call authenticate(token) to get AuthenticatedApi
// - Token is obtained from same-origin page (prevents CSWSH attacks)

// Get endpoint from meta tag or default to /beam
// Usage: <meta name="beam-endpoint" content="/custom-endpoint">
function getEndpoint(): string {
  const meta = document.querySelector('meta[name="beam-endpoint"]')
  return meta?.getAttribute('content') ?? '/beam'
}

// Get auth token from meta tag
// Usage: <meta name="beam-token" content="...">
function getAuthToken(): string {
  const meta = document.querySelector('meta[name="beam-token"]')
  return meta?.getAttribute('content') ?? ''
}

// Action response type (mirrors server-side)
interface ActionResponse {
  html?: string | string[]
  script?: string
  redirect?: string
  target?: string  // Can be comma-separated: "#a, #b, #c"
  swap?: string
  modal?: string | { html: string; size?: string; spacing?: number }
  drawer?: string | { html: string; position?: string; size?: string; spacing?: number }
}

// BeamServer interface (authenticated API - mirrors server-side RpcTarget)
interface BeamServer {
  call(action: string, data?: Record<string, unknown>): Promise<ActionResponse>
  registerCallback(callback: (event: string, data: unknown) => void): Promise<void>
}

// PublicBeamServer interface (unauthenticated - only has authenticate method)
interface PublicBeamServer {
  authenticate(token: string): Promise<BeamServer>
}

// RPC stub types
type BeamServerStub = RpcStub<BeamServer>
type PublicBeamServerStub = RpcStub<PublicBeamServer>

let isOnline = navigator.onLine
let rpcSession: BeamServerStub | null = null
let connectingPromise: Promise<BeamServerStub> | null = null
let wsConnected = false
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY_BASE = 1000

// Client callback handler for server-initiated updates
function handleServerEvent(event: string, data: unknown): void {
  // Dispatch custom event for app to handle
  window.dispatchEvent(new CustomEvent('beam:server-event', { detail: { event, data } }))

  // Built-in handlers
  if (event === 'toast') {
    const { message, type } = data as { message: string; type?: 'success' | 'error' }
    showToast(message, type || 'success')
  } else if (event === 'refresh') {
    const { selector } = data as { selector: string }
    // Could trigger a refresh of specific elements
    window.dispatchEvent(new CustomEvent('beam:refresh', { detail: { selector } }))
  }
}

// Handle WebSocket disconnection
function handleWsDisconnect(error: unknown): void {
  console.warn('[beam] WebSocket disconnected:', error)
  wsConnected = false
  rpcSession = null
  connectingPromise = null

  // Dispatch event for app to handle
  window.dispatchEvent(new CustomEvent('beam:disconnected', { detail: { error } }))
  document.body.classList.add('beam-disconnected')

  // Show any disconnect indicators
  document.querySelectorAll<HTMLElement>('[beam-disconnected]').forEach((el) => {
    el.style.display = ''
  })

  // Auto-reconnect with exponential backoff
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    const delay = RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttempts)
    reconnectAttempts++
    console.log(`[beam] Reconnecting in ${delay}ms (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`)

    setTimeout(() => {
      connect().then(() => {
        console.log('[beam] Reconnected')
        document.body.classList.remove('beam-disconnected')
        document.querySelectorAll<HTMLElement>('[beam-disconnected]').forEach((el) => {
          el.style.display = 'none'
        })
        window.dispatchEvent(new CustomEvent('beam:reconnected'))
      }).catch((err) => {
        console.error('[beam] Reconnect failed:', err)
      })
    }, delay)
  } else {
    console.error('[beam] Max reconnect attempts reached')
    showToast('Connection lost. Please refresh the page.', 'error')
    window.dispatchEvent(new CustomEvent('beam:reconnect-failed'))
  }
}

function connect(): Promise<BeamServerStub> {
  if (connectingPromise) {
    return connectingPromise
  }

  if (rpcSession) {
    return Promise.resolve(rpcSession)
  }

  connectingPromise = (async () => {
    try {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
      const endpoint = getEndpoint()
      const url = `${protocol}//${location.host}${endpoint}`

      // Get auth token from page (proves same-origin access)
      const token = getAuthToken()
      if (!token) {
        throw new Error('No auth token found. Ensure <meta name="beam-token" content="..."> is set.')
      }

      // Create capnweb RPC session - starts with PublicBeamServer
      const publicSession = newWebSocketRpcSession<PublicBeamServer>(url)

      // Authenticate to get the full BeamServer API
      // This is the capnweb in-band authentication pattern
      // @ts-ignore - capnweb stub methods are dynamically typed
      const authenticatedSession = await publicSession.authenticate(token) as BeamServerStub

      // Register client callback for bidirectional communication
      // @ts-ignore - capnweb stub methods are dynamically typed
      authenticatedSession.registerCallback?.(handleServerEvent)?.catch?.(() => {
        // Server may not support callbacks, that's ok
      })

      // Handle connection broken (WebSocket disconnect)
      // @ts-ignore - onRpcBroken is available on capnweb stubs
      if (typeof authenticatedSession.onRpcBroken === 'function') {
        authenticatedSession.onRpcBroken(handleWsDisconnect)
      }

      rpcSession = authenticatedSession
      connectingPromise = null
      wsConnected = true
      reconnectAttempts = 0
      window.dispatchEvent(new CustomEvent('beam:connected'))
      return authenticatedSession
    } catch (err) {
      connectingPromise = null
      throw err
    }
  })()

  return connectingPromise
}

async function ensureConnected(): Promise<BeamServerStub> {
  if (rpcSession) {
    return rpcSession
  }
  return connect()
}

/**
 * Execute a script string safely
 */
function executeScript(code: string): void {
  try {
    new Function(code)()
  } catch (err) {
    console.error('[beam] Script execution error:', err)
  }
}

// API wrapper that ensures connection before calls
const api = {
  async call(action: string, data: Record<string, unknown> = {}): Promise<ActionResponse> {
    const session = await ensureConnected()
    // @ts-ignore - capnweb stub methods are dynamically typed
    return session.call(action, data)
  },

  // Direct access to RPC session for advanced usage (promise pipelining, etc.)
  async getSession(): Promise<BeamServerStub> {
    return ensureConnected()
  },
}

// ============ DOM HELPERS ============

let activeModal: HTMLElement | null = null
let activeDrawer: HTMLElement | null = null

function $(selector: string): Element | null {
  return document.querySelector(selector)
}

function $$(selector: string): NodeListOf<Element> {
  return document.querySelectorAll(selector)
}

function morph(target: Element, html: string, options?: { keepElements?: string[] }): void {
  const keepSelectors = options?.keepElements || []

  // @ts-ignore - idiomorph types
  Idiomorph.morph(target, html, {
    morphStyle: 'innerHTML',
    callbacks: {
      // Skip morphing elements marked with beam-keep (preserves their current value)
      // This only applies when both old and new DOM have a matching element
      beforeNodeMorphed: (fromEl: Element, toEl: Element) => {
        // Only handle Element nodes
        if (!(fromEl instanceof Element)) return true

        // Check if element has beam-keep attribute
        if (fromEl.hasAttribute('beam-keep')) {
          // Don't morph this element - keep it as is
          return false
        }

        // Check if element matches any keep selectors
        for (const selector of keepSelectors) {
          try {
            if (fromEl.matches(selector)) {
              return false
            }
          } catch {
            // Invalid selector, ignore
          }
        }

        return true
      }
      // Note: We intentionally do NOT prevent removal of beam-keep elements.
      // If an element doesn't exist in the new DOM, it should be removed.
      // beam-keep only preserves values during morphing, not during removal.
    }
  })
}

function getParams(el: HTMLElement): Record<string, unknown> {
  // Start with beam-params JSON if present
  const params: Record<string, unknown> = JSON.parse(el.getAttribute('beam-params') || '{}')

  // Collect beam-data-* attributes
  for (const attr of el.attributes) {
    if (attr.name.startsWith('beam-data-')) {
      const key = attr.name.slice(10) // remove 'beam-data-'
      // Try to parse as JSON for numbers/booleans, fallback to string
      try {
        params[key] = JSON.parse(attr.value)
      } catch {
        params[key] = attr.value
      }
    }
  }

  // Handle beam-include: collect values from referenced inputs
  const includeAttr = el.getAttribute('beam-include')
  if (includeAttr) {
    const ids = includeAttr.split(',').map(id => id.trim())
    for (const id of ids) {
      // Find element by beam-id, id, or name (priority order)
      const inputEl = document.querySelector(`[beam-id="${id}"]`) ||
                      document.getElementById(id) ||
                      document.querySelector(`[name="${id}"]`)

      if (inputEl) {
        params[id] = getIncludedInputValue(inputEl)
      }
    }
  }

  return params
}

// Get value from an included input element with proper type conversion
function getIncludedInputValue(el: Element): unknown {
  if (el.tagName === 'INPUT') {
    const input = el as unknown as HTMLInputElement
    if (input.type === 'checkbox') return input.checked
    if (input.type === 'radio') return input.checked ? input.value : ''
    if (input.type === 'number' || input.type === 'range') {
      const num = parseFloat(input.value)
      return isNaN(num) ? 0 : num
    }
    return input.value
  }
  if (el.tagName === 'TEXTAREA') return (el as unknown as HTMLTextAreaElement).value
  if (el.tagName === 'SELECT') return (el as unknown as HTMLSelectElement).value
  return ''
}

// ============ CONFIRMATION DIALOGS ============
// Usage: <button beam-action="delete" beam-confirm="Are you sure?">Delete</button>
// Usage: <button beam-action="delete" beam-confirm.prompt="Type DELETE to confirm|DELETE">Delete</button>

function checkConfirm(el: HTMLElement): boolean {
  const confirmMsg = el.getAttribute('beam-confirm')
  if (!confirmMsg) return true

  // Check for .prompt modifier (e.g., beam-confirm.prompt="message|expected")
  if (el.hasAttribute('beam-confirm-prompt')) {
    const [message, expected] = (el.getAttribute('beam-confirm-prompt') || '').split('|')
    const input = prompt(message)
    return input === expected
  }

  return confirm(confirmMsg)
}

// ============ LOADING INDICATORS ============

// Store active actions with their params: Map<action, Set<paramsJSON>>
const activeActions = new Map<string, Set<string>>()

// Store disabled elements during request
const disabledElements = new Map<HTMLElement, { elements: HTMLElement[]; originalStates: boolean[] }>()

function setLoading(el: HTMLElement, loading: boolean, action?: string, params?: Record<string, unknown>): void {
  // Loading state on trigger element
  el.toggleAttribute('beam-loading', loading)

  // Handle beam-disable
  if (loading && el.hasAttribute('beam-disable')) {
    const disableSelector = el.getAttribute('beam-disable')
    let elementsToDisable: HTMLElement[]

    if (!disableSelector || disableSelector === '' || disableSelector === 'true') {
      // Disable the element itself and its children
      elementsToDisable = [el, ...Array.from(el.querySelectorAll<HTMLElement>('button, input, select, textarea'))]
    } else {
      // Disable specific elements by selector
      elementsToDisable = Array.from(document.querySelectorAll<HTMLElement>(disableSelector))
    }

    const originalStates = elementsToDisable.map((e) => (e as HTMLButtonElement).disabled || false)
    elementsToDisable.forEach((e) => ((e as HTMLButtonElement).disabled = true))
    disabledElements.set(el, { elements: elementsToDisable, originalStates })
  } else if (!loading && disabledElements.has(el)) {
    // Restore disabled state
    const { elements, originalStates } = disabledElements.get(el)!
    elements.forEach((e, i) => ((e as HTMLButtonElement).disabled = originalStates[i]))
    disabledElements.delete(el)
  }

  // Legacy: disable buttons inside if no beam-disable specified
  if (!el.hasAttribute('beam-disable')) {
    el.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input[type="submit"]').forEach((child) => {
      child.disabled = loading
    })
  }

  // Set .beam-active class on element during loading
  el.classList.toggle('beam-active', loading)

  // Broadcast to loading indicators
  if (action) {
    const paramsKey = JSON.stringify(params || {})
    if (loading) {
      if (!activeActions.has(action)) {
        activeActions.set(action, new Set())
      }
      activeActions.get(action)!.add(paramsKey)
    } else {
      activeActions.get(action)?.delete(paramsKey)
      if (activeActions.get(action)?.size === 0) {
        activeActions.delete(action)
      }
    }
    updateLoadingIndicators()
  }
}

function getLoadingParams(el: HTMLElement): Record<string, unknown> {
  // Start with beam-loading-params JSON if present
  const params: Record<string, unknown> = JSON.parse(el.getAttribute('beam-loading-params') || '{}')

  // Collect beam-loading-data-* attributes (override JSON params)
  for (const attr of el.attributes) {
    if (attr.name.startsWith('beam-loading-data-')) {
      const key = attr.name.slice(18) // remove 'beam-loading-data-'
      try {
        params[key] = JSON.parse(attr.value)
      } catch {
        params[key] = attr.value
      }
    }
  }
  return params
}

function matchesParams(required: Record<string, unknown>, activeParamsSet: Set<string>): boolean {
  const requiredKeys = Object.keys(required)
  if (requiredKeys.length === 0) return true // No params required, match any

  for (const paramsJson of activeParamsSet) {
    const params = JSON.parse(paramsJson)
    const matches = requiredKeys.every((key) => String(params[key]) === String(required[key]))
    if (matches) return true
  }
  return false
}

function updateLoadingIndicators(): void {
  document.querySelectorAll<HTMLElement>('[beam-loading-for]').forEach((el) => {
    const targets = el
      .getAttribute('beam-loading-for')!
      .split(',')
      .map((s) => s.trim())
    const requiredParams = getLoadingParams(el)

    let isActive = false
    if (targets.includes('*')) {
      // Match any action
      isActive = activeActions.size > 0
    } else {
      // Match specific action(s) with optional params
      isActive = targets.some((action) => {
        const actionParams = activeActions.get(action)
        return actionParams && matchesParams(requiredParams, actionParams)
      })
    }

    // Show/hide
    if (el.hasAttribute('beam-loading-remove')) {
      el.style.display = isActive ? 'none' : ''
    } else if (!el.hasAttribute('beam-loading-class')) {
      el.style.display = isActive ? '' : 'none'
    }

    // Add/remove class
    const loadingClass = el.getAttribute('beam-loading-class')
    if (loadingClass) {
      el.classList.toggle(loadingClass, isActive)
    }
  })
}

// Hide loading indicators by default on page load
document.querySelectorAll<HTMLElement>('[beam-loading-for]:not([beam-loading-remove]):not([beam-loading-class])').forEach((el) => {
  el.style.display = 'none'
})

// ============ OPTIMISTIC UI ============

interface OptimisticHandle {
  rollback: () => void
}

function optimistic(el: HTMLElement): OptimisticHandle {
  const template = el.getAttribute('beam-optimistic')
  const targetSelector = el.getAttribute('beam-target')
  let snapshot: string | null = null

  if (template && targetSelector) {
    const targetEl = $(targetSelector)
    if (targetEl) {
      snapshot = targetEl.innerHTML
      const params = getParams(el)
      const html = template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(params[key] ?? ''))
      morph(targetEl, html)
    }
  }

  return {
    rollback() {
      if (snapshot && targetSelector) {
        const targetEl = $(targetSelector)
        if (targetEl) morph(targetEl, snapshot)
      }
    },
  }
}

// ============ PLACEHOLDER ============
// Usage: <button beam-action="load" beam-target="#content" beam-placeholder="<p>Loading...</p>">

interface PlaceholderHandle {
  restore: () => void
}

function showPlaceholder(el: HTMLElement): PlaceholderHandle {
  const placeholder = el.getAttribute('beam-placeholder')
  const targetSelector = el.getAttribute('beam-target')
  let snapshot: string | null = null

  if (placeholder && targetSelector) {
    const targetEl = $(targetSelector)
    if (targetEl) {
      snapshot = targetEl.innerHTML
      // Check if placeholder is a selector (starts with # or .)
      if (placeholder.startsWith('#') || placeholder.startsWith('.')) {
        const tpl = document.querySelector(placeholder)
        if (tpl instanceof HTMLTemplateElement) {
          targetEl.innerHTML = tpl.innerHTML
        } else if (tpl) {
          targetEl.innerHTML = tpl.innerHTML
        }
      } else {
        targetEl.innerHTML = placeholder
      }
    }
  }

  return {
    restore() {
      if (snapshot && targetSelector) {
        const targetEl = $(targetSelector)
        if (targetEl) targetEl.innerHTML = snapshot
      }
    },
  }
}

// ============ SWAP STRATEGIES ============

/**
 * Deduplicate items by beam-item-id before inserting.
 * - Updates existing items with fresh data (morphs in place)
 * - Removes duplicates from incoming HTML (so they don't double-insert)
 */
function dedupeItems(target: Element, html: string): string {
  const temp = document.createElement('div')
  temp.innerHTML = html

  // Collect existing item IDs
  const existingIds = new Set<string>()
  target.querySelectorAll('[beam-item-id]').forEach((el) => {
    const id = el.getAttribute('beam-item-id')
    if (id) existingIds.add(id)
  })

  // Process incoming items
  temp.querySelectorAll('[beam-item-id]').forEach((el) => {
    const id = el.getAttribute('beam-item-id')
    if (id && existingIds.has(id)) {
      // Morph existing item with fresh data
      const existing = target.querySelector(`[beam-item-id="${id}"]`)
      if (existing) {
        morph(existing, el.outerHTML)
      }
      // Remove from incoming HTML (already updated in place)
      el.remove()
    }
  })

  return temp.innerHTML
}

function swap(target: Element, html: string, mode: string, trigger?: HTMLElement): void {
  const { main, oob } = parseOobSwaps(html)

  switch (mode) {
    case 'append':
      trigger?.remove()
      target.insertAdjacentHTML('beforeend', dedupeItems(target, main))
      break
    case 'prepend':
      trigger?.remove()
      target.insertAdjacentHTML('afterbegin', dedupeItems(target, main))
      break
    case 'replace':
      target.innerHTML = main
      break
    case 'delete':
      target.remove()
      break
    case 'morph':
    default:
      morph(target, main)
      break
  }

  // Out-of-band swaps
  for (const { selector, content, swapMode } of oob) {
    const oobTarget = $(selector)
    if (oobTarget) {
      if (swapMode === 'morph' || !swapMode) {
        morph(oobTarget, content)
      } else {
        swap(oobTarget, content, swapMode)
      }
    }
  }

  // Process hungry elements - auto-update elements that match IDs in response
  processHungryElements(html)
}

/**
 * Handle HTML response - supports both single string and array of HTML strings.
 * Target resolution order (server wins, frontend is fallback):
 * 1. Server target from comma-separated list (by index)
 *    - Use "!selector" to exclude that selector (blocks frontend fallback too)
 * 2. Frontend target (beam-target) as fallback for remaining items
 * 3. ID from HTML fragment's root element
 * 4. Skip if none found
 */
function handleHtmlResponse(
  response: ActionResponse,
  frontendTarget: string | null,
  frontendSwap: string,
  trigger?: HTMLElement
): void {
  if (!response.html) return

  const htmlArray = Array.isArray(response.html) ? response.html : [response.html]
  // Server targets take priority, collect exclusions
  const serverTargets = response.target ? response.target.split(',').map(s => s.trim()) : []
  const excluded = new Set(serverTargets.filter(t => t.startsWith('!')).map(t => t.slice(1)))
  const swapMode = response.swap || frontendSwap

  htmlArray.forEach((htmlItem, index) => {
    const serverTarget = serverTargets[index]

    // Skip if this is an exclusion marker
    if (serverTarget?.startsWith('!')) {
      return
    }

    // Priority 1: Server target (by index)
    let explicitTarget = serverTarget

    // Priority 2: Frontend target as fallback (only if no server target and not excluded)
    if (!explicitTarget && frontendTarget && !excluded.has(frontendTarget)) {
      explicitTarget = frontendTarget
    }

    if (explicitTarget) {
      // Explicit target provided - use normal swap
      const target = $(explicitTarget)
      if (target) {
        swap(target, htmlItem, swapMode, trigger)
      } else {
        console.warn(`[beam] Target "${explicitTarget}" not found on page, skipping`)
      }
    } else {
      // Priority 3: id, beam-id, or beam-item-id on root element
      const temp = document.createElement('div')
      temp.innerHTML = htmlItem.trim()
      const rootEl = temp.firstElementChild

      // Check id first, then beam-id, then beam-item-id
      const id = rootEl?.id
      const beamId = rootEl?.getAttribute('beam-id')
      const beamItemId = rootEl?.getAttribute('beam-item-id')
      const selector = id ? `#${id}`
        : beamId ? `[beam-id="${beamId}"]`
        : beamItemId ? `[beam-item-id="${beamItemId}"]`
        : null

      if (selector && !excluded.has(selector)) {
        const target = $(selector)
        if (target) {
          // Replace entire element using outerHTML (preserves styles/classes)
          target.outerHTML = htmlItem.trim()
        } else {
          console.warn(`[beam] Target "${selector}" (from HTML) not found on page, skipping`)
        }
      }
      // If no id/beam-id/beam-item-id found or excluded, skip silently
    }
  })
}

function parseOobSwaps(html: string): { main: string; oob: Array<{ selector: string; content: string; swapMode: string }> } {
  const temp = document.createElement('div')
  temp.innerHTML = html

  const oob: Array<{ selector: string; content: string; swapMode: string }> = []

  temp.querySelectorAll('template[beam-touch]').forEach((tpl) => {
    const selector = tpl.getAttribute('beam-touch')
    const swapMode = tpl.getAttribute('beam-swap') || 'morph'
    if (selector) {
      oob.push({ selector, content: (tpl as HTMLTemplateElement).innerHTML, swapMode })
    }
    tpl.remove()
  })

  return { main: temp.innerHTML, oob }
}

// ============ RPC WRAPPER ============

async function rpc(action: string, data: Record<string, unknown>, el: HTMLElement): Promise<void> {
  const frontendTarget = el.getAttribute('beam-target')
  const frontendSwap = el.getAttribute('beam-swap') || 'morph'
  const opt = optimistic(el)
  const placeholder = showPlaceholder(el)

  setLoading(el, true, action, data)

  try {
    const response = await api.call(action, data)

    // Handle redirect (if present) - takes priority
    if (response.redirect) {
      location.href = response.redirect
      return
    }

    // Handle modal (if present)
    if (response.modal) {
      const modalData = typeof response.modal === 'string'
        ? { html: response.modal } : response.modal
      openModal(modalData.html, modalData.size || 'medium', modalData.spacing)
    }

    // Handle drawer (if present)
    if (response.drawer) {
      const drawerData = typeof response.drawer === 'string'
        ? { html: response.drawer } : response.drawer
      openDrawer(drawerData.html, drawerData.position || 'right', drawerData.size || 'medium', drawerData.spacing)
    }

    // Handle HTML (if present) - supports single string or array
    handleHtmlResponse(response, frontendTarget, frontendSwap, el)

    // Execute script (if present)
    if (response.script) {
      executeScript(response.script)
    }

    // Handle history
    handleHistory(el)
  } catch (err) {
    opt.rollback()
    placeholder.restore()
    showToast('Something went wrong. Please try again.', 'error')
    console.error('RPC error:', err)
  } finally {
    setLoading(el, false, action, data)
  }
}

// ============ HISTORY MANAGEMENT ============
// Usage: <a beam-action="load" beam-push="/new-url">Link</a>
// Usage: <button beam-action="filter" beam-replace="?sort=name">Filter</button>

function handleHistory(el: HTMLElement): void {
  const pushUrl = el.getAttribute('beam-push')
  const replaceUrl = el.getAttribute('beam-replace')

  if (pushUrl) {
    history.pushState({ beam: true }, '', pushUrl)
  } else if (replaceUrl) {
    history.replaceState({ beam: true }, '', replaceUrl)
  }
}

// Handle back/forward navigation
window.addEventListener('popstate', (e) => {
  // Reload page on back/forward for now
  // Could be enhanced to restore content from cache
  if (e.state?.beam) {
    location.reload()
  }
})

// ============ BUTTON HANDLING ============

// Instant click - trigger on mousedown for faster response
document.addEventListener('mousedown', async (e) => {
  const target = e.target as Element
  if (!target?.closest) return
  const btn = target.closest('[beam-action][beam-instant]:not(form):not([beam-load-more]):not([beam-infinite])') as HTMLElement | null
  if (!btn || btn.tagName === 'FORM') return

  // Skip if submit button inside a beam form
  if (btn.closest('form[beam-action]') && btn.getAttribute('type') === 'submit') return

  e.preventDefault()

  // Check confirmation
  if (!checkConfirm(btn)) return

  const action = btn.getAttribute('beam-action')
  if (!action) return

  const params = getParams(btn)
  await rpc(action, params, btn)

  if (btn.hasAttribute('beam-close')) {
    closeModal()
    closeDrawer()
  }
})

// Regular click handling
document.addEventListener('click', async (e) => {
  const target = e.target as Element
  if (!target?.closest) return
  const btn = target.closest('[beam-action]:not(form):not([beam-instant]):not([beam-load-more]):not([beam-infinite]):not([beam-watch])') as HTMLElement | null
  if (!btn || btn.tagName === 'FORM') return

  // Skip if submit button inside a beam form
  if (btn.closest('form[beam-action]') && btn.getAttribute('type') === 'submit') return

  e.preventDefault()

  // Check confirmation
  if (!checkConfirm(btn)) return

  const action = btn.getAttribute('beam-action')
  if (!action) return

  const params = getParams(btn)

  await rpc(action, params, btn)

  if (btn.hasAttribute('beam-close')) {
    closeModal()
    closeDrawer()
  }
})

// ============ MODALS & DRAWERS ============

// beam-modal trigger - calls action and opens result in modal
document.addEventListener('click', async (e) => {
  const target = e.target as Element
  if (!target?.closest) return

  const trigger = target.closest('[beam-modal]') as HTMLElement | null
  if (trigger) {
    e.preventDefault()

    // Check confirmation
    if (!checkConfirm(trigger)) return

    const action = trigger.getAttribute('beam-modal')
    if (!action) return

    const size = trigger.getAttribute('beam-size') || 'medium'
    const params = getParams(trigger)
    const placeholder = trigger.getAttribute('beam-placeholder')

    // Show placeholder modal while loading
    if (placeholder) {
      openModal(placeholder, size)
    }

    setLoading(trigger, true, action, params)

    try {
      const response = await api.call(action, params)

      // Handle the response - if it returns modal, use that, otherwise use html
      if (response.modal) {
        const modalData = typeof response.modal === 'string'
          ? { html: response.modal } : response.modal
        openModal(modalData.html, modalData.size || size, modalData.spacing)
      } else if (response.html) {
        // For modals, use first item if array, otherwise use as-is
        const htmlStr = Array.isArray(response.html) ? response.html[0] : response.html
        if (htmlStr) openModal(htmlStr, size)
      }

      // Execute script if present
      if (response.script) {
        executeScript(response.script)
      }
    } catch (err) {
      closeModal()
      showToast('Failed to open modal.', 'error')
      console.error('Modal error:', err)
    } finally {
      setLoading(trigger, false, action, params)
    }
  }
})

// beam-drawer trigger - calls action and opens result in drawer
document.addEventListener('click', async (e) => {
  const target = e.target as Element
  if (!target?.closest) return

  const trigger = target.closest('[beam-drawer]') as HTMLElement | null
  if (trigger) {
    e.preventDefault()

    // Check confirmation
    if (!checkConfirm(trigger)) return

    const action = trigger.getAttribute('beam-drawer')
    if (!action) return

    const position = trigger.getAttribute('beam-position') || 'right'
    const size = trigger.getAttribute('beam-size') || 'medium'
    const params = getParams(trigger)
    const placeholder = trigger.getAttribute('beam-placeholder')

    // Show placeholder drawer while loading
    if (placeholder) {
      openDrawer(placeholder, position, size)
    }

    setLoading(trigger, true, action, params)

    try {
      const response = await api.call(action, params)

      // Handle the response - if it returns drawer, use that, otherwise use html
      if (response.drawer) {
        const drawerData = typeof response.drawer === 'string'
          ? { html: response.drawer } : response.drawer
        openDrawer(drawerData.html, drawerData.position || position, drawerData.size || size, drawerData.spacing)
      } else if (response.html) {
        // For drawers, use first item if array, otherwise use as-is
        const htmlStr = Array.isArray(response.html) ? response.html[0] : response.html
        if (htmlStr) openDrawer(htmlStr, position, size)
      }

      // Execute script if present
      if (response.script) {
        executeScript(response.script)
      }
    } catch (err) {
      closeDrawer()
      showToast('Failed to open drawer.', 'error')
      console.error('Drawer error:', err)
    } finally {
      setLoading(trigger, false, action, params)
    }
  }
})

// Close handlers
document.addEventListener('click', (e) => {
  const target = e.target as Element
  if (!target?.closest) return

  // Close on backdrop click
  if (target.matches?.('#modal-backdrop')) {
    closeModal()
  }
  if (target.matches?.('#drawer-backdrop')) {
    closeDrawer()
  }

  // Close button (handles both modal and drawer)
  const closeBtn = target.closest('[beam-close]') as HTMLElement | null
  if (closeBtn && !closeBtn.hasAttribute('beam-action')) {
    if (activeDrawer) {
      closeDrawer()
    } else {
      closeModal()
    }
  }
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (activeDrawer) {
      closeDrawer()
    } else if (activeModal) {
      closeModal()
    }
  }
})

function openModal(html: string, size: string = 'medium', spacing?: number): void {
  // Close any existing drawer first (modal takes priority)
  if (activeDrawer) {
    closeDrawer()
  }

  let backdrop = $('#modal-backdrop') as HTMLElement | null
  if (!backdrop) {
    backdrop = document.createElement('div')
    backdrop.id = 'modal-backdrop'
    document.body.appendChild(backdrop)
  }

  const style = spacing !== undefined ? `padding: ${spacing}px;` : ''
  backdrop.innerHTML = `
    <div id="modal-content" role="dialog" aria-modal="true" data-size="${size}" style="${style}">
      ${html}
    </div>
  `

  backdrop.offsetHeight
  backdrop.classList.add('open')
  document.body.classList.add('modal-open')

  activeModal = $('#modal-content') as HTMLElement

  const autoFocus = activeModal?.querySelector<HTMLElement>('[autofocus]')
  const firstInput = activeModal?.querySelector<HTMLElement>('input, button, textarea, select')
  ;(autoFocus || firstInput)?.focus()
}

function closeModal(): void {
  const backdrop = $('#modal-backdrop') as HTMLElement | null
  if (backdrop) {
    backdrop.classList.remove('open')
    setTimeout(() => {
      backdrop.remove()
    }, 200)
  }
  document.body.classList.remove('modal-open')
  activeModal = null
}

// ============ DRAWERS ============

function openDrawer(html: string, position: string = 'right', size: string = 'medium', spacing?: number): void {
  // Close any existing modal first (drawer takes priority)
  if (activeModal) {
    closeModal()
  }
  let backdrop = $('#drawer-backdrop') as HTMLElement | null
  if (!backdrop) {
    backdrop = document.createElement('div')
    backdrop.id = 'drawer-backdrop'
    document.body.appendChild(backdrop)
  }

  const style = spacing !== undefined ? `padding: ${spacing}px;` : ''
  backdrop.innerHTML = `
    <div id="drawer-content" role="dialog" aria-modal="true" data-position="${position}" data-size="${size}" style="${style}">
      ${html}
    </div>
  `

  backdrop.offsetHeight // Force reflow
  backdrop.classList.add('open')
  document.body.classList.add('drawer-open')

  activeDrawer = $('#drawer-content') as HTMLElement

  const autoFocus = activeDrawer?.querySelector<HTMLElement>('[autofocus]')
  const firstInput = activeDrawer?.querySelector<HTMLElement>('input, button, textarea, select')
  ;(autoFocus || firstInput)?.focus()
}

function closeDrawer(): void {
  const backdrop = $('#drawer-backdrop') as HTMLElement | null
  if (backdrop) {
    backdrop.classList.remove('open')
    setTimeout(() => {
      backdrop.remove()
    }, 200)
  }
  document.body.classList.remove('drawer-open')
  activeDrawer = null
}

// ============ TOAST NOTIFICATIONS ============

function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  let container = $('#toast-container') as HTMLElement | null
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    document.body.appendChild(container)
  }

  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.textContent = message
  toast.setAttribute('role', 'alert')
  container.appendChild(toast)

  requestAnimationFrame(() => {
    toast.classList.add('show')
  })

  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

// ============ OFFLINE DETECTION ============
// Usage: <div beam-offline>You are offline</div>
// Usage: <button beam-action="save" beam-offline-disable>Save</button>

function updateOfflineState(): void {
  isOnline = navigator.onLine

  // Show/hide offline indicators
  document.querySelectorAll<HTMLElement>('[beam-offline]').forEach((el) => {
    const showClass = el.getAttribute('beam-offline-class')
    if (showClass) {
      el.classList.toggle(showClass, !isOnline)
    } else {
      el.style.display = isOnline ? 'none' : ''
    }
  })

  // Disable/enable elements when offline
  document.querySelectorAll<HTMLElement>('[beam-offline-disable]').forEach((el) => {
    ;(el as HTMLButtonElement).disabled = !isOnline
  })

  // Add/remove body class
  document.body.classList.toggle('beam-offline', !isOnline)
}

window.addEventListener('online', updateOfflineState)
window.addEventListener('offline', updateOfflineState)

// Initialize offline state
updateOfflineState()

// ============ NAVIGATION FEEDBACK ============
// Usage: <nav beam-nav><a href="/home">Home</a></nav>
// Links get .beam-current when they match current URL

function updateNavigation(): void {
  const currentPath = location.pathname
  const currentUrl = location.href

  document.querySelectorAll('[beam-nav] a, a[beam-nav]').forEach((link) => {
    const href = link.getAttribute('href')
    if (!href) return

    // Check if link matches current path
    const linkUrl = new URL(href, location.origin)
    const isExact = linkUrl.pathname === currentPath
    const isPartial = currentPath.startsWith(linkUrl.pathname) && linkUrl.pathname !== '/'

    // Exact match or partial match (for section highlighting)
    const isCurrent = link.hasAttribute('beam-nav-exact') ? isExact : isExact || isPartial

    link.classList.toggle('beam-current', isCurrent)
    if (isCurrent) {
      link.setAttribute('aria-current', 'page')
    } else {
      link.removeAttribute('aria-current')
    }
  })
}

// Update navigation on page load and history changes
updateNavigation()
window.addEventListener('popstate', updateNavigation)

// ============ CONDITIONAL SHOW/HIDE (beam-switch) ============
// Usage: <select name="type" beam-switch=".type-options">
//          <option value="a">A</option>
//          <option value="b">B</option>
//        </select>
//        <div class="type-options" beam-show-for="a">Options for A</div>
//        <div class="type-options" beam-show-for="b">Options for B</div>

function setupSwitch(el: HTMLElement): void {
  const targetSelector = el.getAttribute('beam-switch')!
  const event = el.getAttribute('beam-switch-event') || 'input'

  const updateTargets = () => {
    const value = (el as HTMLInputElement | HTMLSelectElement).value

    // Find targets within the switch region or document
    const region = el.closest('[beam-switch-region]') || el.closest('form') || document
    region.querySelectorAll<HTMLElement>(targetSelector).forEach((target) => {
      const showFor = target.getAttribute('beam-show-for')
      const hideFor = target.getAttribute('beam-hide-for')
      const enableFor = target.getAttribute('beam-enable-for')
      const disableFor = target.getAttribute('beam-disable-for')

      // Handle show/hide
      if (showFor !== null) {
        const values = showFor.split(',').map((v) => v.trim())
        const shouldShow = values.includes(value) || (showFor === '' && value !== '')
        target.style.display = shouldShow ? '' : 'none'
      }
      if (hideFor !== null) {
        const values = hideFor.split(',').map((v) => v.trim())
        const shouldHide = values.includes(value)
        target.style.display = shouldHide ? 'none' : ''
      }

      // Handle enable/disable
      if (enableFor !== null) {
        const values = enableFor.split(',').map((v) => v.trim())
        const shouldEnable = values.includes(value)
        ;(target as HTMLButtonElement).disabled = !shouldEnable
      }
      if (disableFor !== null) {
        const values = disableFor.split(',').map((v) => v.trim())
        const shouldDisable = values.includes(value)
        ;(target as HTMLButtonElement).disabled = shouldDisable
      }
    })
  }

  el.addEventListener(event, updateTargets)

  // Initial state
  updateTargets()
}

// Observe switch elements
const switchObserver = new MutationObserver(() => {
  document.querySelectorAll<HTMLElement>('[beam-switch]:not([beam-switch-observed])').forEach((el) => {
    el.setAttribute('beam-switch-observed', '')
    setupSwitch(el)
  })
})

switchObserver.observe(document.body, { childList: true, subtree: true })

// Initialize existing switch elements
document.querySelectorAll<HTMLElement>('[beam-switch]').forEach((el) => {
  el.setAttribute('beam-switch-observed', '')
  setupSwitch(el)
})

// ============ AUTO-SUBMIT FORMS ============
// Usage: <form beam-action="filter" beam-autosubmit beam-debounce="300">

function setupAutosubmit(form: HTMLFormElement): void {
  const debounce = parseInt(form.getAttribute('beam-debounce') || '300', 10)
  const event = form.getAttribute('beam-autosubmit-event') || 'input'
  let timeout: ReturnType<typeof setTimeout>

  const submitForm = () => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    }, debounce)
  }

  form.querySelectorAll('input, select, textarea').forEach((input) => {
    input.addEventListener(event, submitForm)
    // Also listen to change for selects and checkboxes
    if (input.tagName === 'SELECT' || (input as HTMLInputElement).type === 'checkbox' || (input as HTMLInputElement).type === 'radio') {
      input.addEventListener('change', submitForm)
    }
  })
}

// Observe autosubmit forms
const autosubmitObserver = new MutationObserver(() => {
  document.querySelectorAll<HTMLFormElement>('form[beam-autosubmit]:not([beam-autosubmit-observed])').forEach((form) => {
    form.setAttribute('beam-autosubmit-observed', '')
    setupAutosubmit(form)
  })
})

autosubmitObserver.observe(document.body, { childList: true, subtree: true })

// Initialize existing autosubmit forms
document.querySelectorAll<HTMLFormElement>('form[beam-autosubmit]').forEach((form) => {
  form.setAttribute('beam-autosubmit-observed', '')
  setupAutosubmit(form)
})

// ============ BOOST LINKS ============
// Usage: <main beam-boost>...all links become AJAX...</main>
// Usage: <a href="/page" beam-boost>Single boosted link</a>

document.addEventListener('click', async (e) => {
  const target = e.target as Element
  if (!target?.closest) return

  // Check if click is on a link within a boosted container or a boosted link itself
  const link = target.closest('a[href]') as HTMLAnchorElement | null
  if (!link) return

  const isBoosted = link.hasAttribute('beam-boost') || link.closest('[beam-boost]')
  if (!isBoosted) return

  // Skip if explicitly not boosted
  if (link.hasAttribute('beam-boost-off')) return

  // Skip external links
  if (link.host !== location.host) return

  // Skip if modifier keys or non-left click
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return

  // Skip if target="_blank"
  if (link.target === '_blank') return

  // Skip if download link
  if (link.hasAttribute('download')) return

  e.preventDefault()

  // Check confirmation
  if (!checkConfirm(link)) return

  const href = link.href
  const targetSelector = link.getAttribute('beam-target') || 'body'
  const swapMode = link.getAttribute('beam-swap') || 'morph'

  // Show placeholder if specified
  const placeholder = showPlaceholder(link)

  link.classList.add('beam-active')

  try {
    // Fetch the page
    const response = await fetch(href, {
      headers: { 'X-Beam-Boost': 'true' },
    })
    const html = await response.text()

    // Parse response and extract target content
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // Get content from target selector
    const sourceEl = doc.querySelector(targetSelector)
    if (sourceEl) {
      const target = $(targetSelector)
      if (target) {
        swap(target, sourceEl.innerHTML, swapMode)
      }
    }

    // Update title
    const title = doc.querySelector('title')
    if (title) {
      document.title = title.textContent || ''
    }

    // Push to history
    if (!link.hasAttribute('beam-replace')) {
      history.pushState({ beam: true, url: href }, '', href)
    } else {
      history.replaceState({ beam: true, url: href }, '', href)
    }

    // Update navigation state
    updateNavigation()
  } catch (err) {
    placeholder.restore()
    // Fallback to normal navigation
    console.error('Boost error, falling back to navigation:', err)
    location.href = href
  } finally {
    link.classList.remove('beam-active')
  }
})

// ============ INFINITE SCROLL & LOAD MORE ============
// Usage: <div beam-infinite beam-action="loadMore" beam-params='{"page":2}' beam-target="#list"></div>
// Usage: <button beam-load-more beam-action="loadMore" beam-params='{"page":2}' beam-target="#list">Load More</button>

// Scroll state persistence for infinite scroll and load more
interface ScrollState {
  html: string
  scrollY: number
  timestamp: number
}

const SCROLL_STATE_KEY_PREFIX = 'beam_scroll_'
const SCROLL_STATE_TTL = 5 * 60 * 1000 // 5 minutes

function getScrollStateKey(action: string): string {
  return SCROLL_STATE_KEY_PREFIX + location.pathname + location.search + '_' + action
}

function saveScrollState(targetSelector: string, action: string): void {
  const target = $(targetSelector) as HTMLElement | null
  if (!target) return

  const state: ScrollState = {
    html: target.innerHTML,
    scrollY: window.scrollY,
    timestamp: Date.now(),
  }

  try {
    sessionStorage.setItem(getScrollStateKey(action), JSON.stringify(state))
  } catch (e) {
    // sessionStorage might be full or disabled
    console.warn('[beam] Could not save scroll state:', e)
  }
}

function restoreScrollState(): boolean {
  // Find infinite scroll or load more container
  const sentinel = document.querySelector('[beam-infinite], [beam-load-more]')
  if (!sentinel) return false

  const action = sentinel.getAttribute('beam-action')
  const targetSelector = sentinel.getAttribute('beam-target')
  if (!action || !targetSelector) return false

  const key = getScrollStateKey(action)
  const stored = sessionStorage.getItem(key)
  if (!stored) return false

  try {
    const state: ScrollState = JSON.parse(stored)

    // Check if state is expired
    if (Date.now() - state.timestamp > SCROLL_STATE_TTL) {
      sessionStorage.removeItem(key)
      return false
    }

    const target = $(targetSelector) as HTMLElement | null
    if (!target) return false

    // Disable browser's automatic scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }

    // Capture fresh server-rendered content before replacing
    const freshHtml = target.innerHTML
    const freshContainer = document.createElement('div')
    freshContainer.innerHTML = freshHtml

    // Hide content before restoring to prevent jump
    target.style.opacity = '0'
    target.style.transition = 'opacity 0.15s ease-out'

    // Restore cached content (has all pages)
    target.innerHTML = state.html

    // Morph fresh server data over cached data (server takes precedence)
    // Match elements by beam-item-id attribute
    freshContainer.querySelectorAll('[beam-item-id]').forEach((freshEl) => {
      const itemId = freshEl.getAttribute('beam-item-id')
      const cachedEl = target.querySelector(`[beam-item-id="${itemId}"]`)
      if (cachedEl) {
        morph(cachedEl, freshEl.outerHTML)
      }
    })

    // Also match by id attribute as fallback
    freshContainer.querySelectorAll('[id]').forEach((freshEl) => {
      const cachedEl = target.querySelector(`#${freshEl.id}`)
      if (cachedEl && !freshEl.hasAttribute('beam-item-id')) {
        morph(cachedEl, freshEl.outerHTML)
      }
    })

    // Restore scroll position and fade in
    requestAnimationFrame(() => {
      window.scrollTo(0, state.scrollY)
      requestAnimationFrame(() => {
        target.style.opacity = '1'
      })
    })

    // Re-observe any new sentinels in restored content
    target.querySelectorAll('[beam-infinite]:not([beam-observed])').forEach((el) => {
      el.setAttribute('beam-observed', '')
      infiniteObserver.observe(el)
    })

    // Don't clear state here - it persists until refresh or new content is loaded
    // State is cleared in tryRestoreScrollState() when navType is not 'back_forward'

    return true
  } catch (e) {
    console.warn('[beam] Could not restore scroll state:', e)
    sessionStorage.removeItem(key)
    return false
  }
}

// Save scroll position when navigating away (for back button restoration)
window.addEventListener('pagehide', () => {
  // Find any infinite scroll or load more element to get the target and action
  const sentinel = document.querySelector('[beam-infinite], [beam-load-more]')
  if (!sentinel) return

  const action = sentinel.getAttribute('beam-action')
  const targetSelector = sentinel.getAttribute('beam-target')
  if (!action || !targetSelector) return

  // Update the saved state with current scroll position
  const key = getScrollStateKey(action)
  const stored = sessionStorage.getItem(key)
  if (!stored) return

  try {
    const state: ScrollState = JSON.parse(stored)
    state.scrollY = window.scrollY
    state.timestamp = Date.now()
    sessionStorage.setItem(key, JSON.stringify(state))
  } catch (e) {
    // Ignore errors
  }
})

// Track the target selector for saving state
let infiniteScrollTarget: string | null = null

const infiniteObserver = new IntersectionObserver(
  async (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue

      const sentinel = entry.target as HTMLElement
      if (sentinel.hasAttribute('beam-loading')) continue

      const action = sentinel.getAttribute('beam-action')
      const targetSelector = sentinel.getAttribute('beam-target')
      const swapMode = sentinel.getAttribute('beam-swap') || 'append'
      if (!action || !targetSelector) continue

      // Track target for state saving
      infiniteScrollTarget = targetSelector

      // Check confirmation
      if (!checkConfirm(sentinel)) continue

      const params = getParams(sentinel)

      sentinel.setAttribute('beam-loading', '')
      sentinel.classList.add('loading')
      setLoading(sentinel, true, action, params)

      try {
        const response = await api.call(action, params)

        if (response.html) {
          // For infinite scroll, always use the specified target (not auto-detect from HTML)
          const target = $(targetSelector)
          if (target) {
            // Handle single html string for infinite scroll (array not typically used here)
            const htmlStr = Array.isArray(response.html) ? response.html.join('') : response.html
            swap(target, htmlStr, swapMode, sentinel)
          }

          // Save scroll state after content is loaded
          requestAnimationFrame(() => {
            saveScrollState(targetSelector, action)
          })
        }

        // Execute script if present
        if (response.script) {
          executeScript(response.script)
        }
      } catch (err) {
        console.error('Infinite scroll error:', err)
        sentinel.removeAttribute('beam-loading')
        sentinel.classList.remove('loading')
        sentinel.classList.add('error')
      } finally {
        setLoading(sentinel, false, action, params)
      }
    }
  },
  { rootMargin: '200px' }
)

// Observe sentinels (now and future)
new MutationObserver(() => {
  document.querySelectorAll('[beam-infinite]:not([beam-observed])').forEach((el) => {
    el.setAttribute('beam-observed', '')
    infiniteObserver.observe(el)
  })
}).observe(document.body, { childList: true, subtree: true })

document.querySelectorAll('[beam-infinite]').forEach((el) => {
  el.setAttribute('beam-observed', '')
  infiniteObserver.observe(el)
})

// ============ LOAD MORE (Click-based) ============
// Usage: <button beam-load-more beam-action="loadMore" beam-params='{"page":2}' beam-target="#list">Load More</button>

document.addEventListener('click', async (e) => {
  const target = e.target as Element
  if (!target?.closest) return

  const trigger = target.closest('[beam-load-more]') as HTMLElement | null
  if (!trigger) return

  e.preventDefault()

  if (trigger.hasAttribute('beam-loading')) return

  const action = trigger.getAttribute('beam-action')
  const targetSelector = trigger.getAttribute('beam-target')
  const swapMode = trigger.getAttribute('beam-swap') || 'append'
  if (!action || !targetSelector) return

  // Check confirmation
  if (!checkConfirm(trigger)) return

  const params = getParams(trigger)

  trigger.setAttribute('beam-loading', '')
  trigger.classList.add('loading')
  setLoading(trigger, true, action, params)

  try {
    const response = await api.call(action, params)

    if (response.html) {
      // For load more, always use the specified target (not auto-detect from HTML)
      const targetEl = $(targetSelector)
      if (targetEl) {
        // Handle single html string for load more (array not typically used here)
        const htmlStr = Array.isArray(response.html) ? response.html.join('') : response.html
        swap(targetEl, htmlStr, swapMode, trigger)
      }

      // Save scroll state after content is loaded
      requestAnimationFrame(() => {
        saveScrollState(targetSelector, action)
      })
    }

    // Execute script if present
    if (response.script) {
      executeScript(response.script)
    }

    // Handle history
    handleHistory(trigger)
  } catch (err) {
    console.error('Load more error:', err)
    trigger.removeAttribute('beam-loading')
    trigger.classList.remove('loading')
    trigger.classList.add('error')
    showToast('Failed to load more. Please try again.', 'error')
  } finally {
    setLoading(trigger, false, action, params)
  }
})


// Restore scroll state on page load (for back navigation only, not refresh)
function tryRestoreScrollState(): void {
  // Only restore on back/forward navigation, not on refresh or direct navigation
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  const navType = navEntry?.type

  // 'back_forward' = back/forward button, 'reload' = refresh, 'navigate' = direct navigation
  if (navType !== 'back_forward') {
    // Clear scroll state on refresh or direct navigation
    clearScrollState()
    // Disable browser's automatic scroll restoration and scroll to top
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)
    return
  }

  if (document.querySelector('[beam-infinite], [beam-load-more]')) {
    restoreScrollState()
  }
}

// Restore scroll state when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryRestoreScrollState)
} else {
  tryRestoreScrollState()
}

// ============ PRELOADING & CACHING ============
// Usage: <a beam-action="getProduct" beam-data-id="1" beam-preload>View</a>
// Usage: <button beam-action="getList" beam-cache="30s">Load</button>

interface CacheEntry {
  response: ActionResponse
  expires: number
}

const cache = new Map<string, CacheEntry>()
const preloading = new Set<string>()

function getCacheKey(action: string, params: Record<string, unknown>): string {
  return `${action}:${JSON.stringify(params)}`
}

function parseCacheDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h)?$/)
  if (!match) return 0
  const value = parseInt(match[1], 10)
  const unit = match[2] || 's'
  switch (unit) {
    case 'm':
      return value * 60 * 1000
    case 'h':
      return value * 60 * 60 * 1000
    default:
      return value * 1000
  }
}

async function fetchWithCache(action: string, params: Record<string, unknown>, cacheDuration?: string): Promise<ActionResponse> {
  const key = getCacheKey(action, params)

  // Check cache
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.response
  }

  // Fetch fresh
  const response = await api.call(action, params)

  // Store in cache if duration specified
  if (cacheDuration) {
    const duration = parseCacheDuration(cacheDuration)
    if (duration > 0) {
      cache.set(key, { response, expires: Date.now() + duration })
    }
  }

  return response
}

async function preload(el: HTMLElement): Promise<void> {
  const action = el.getAttribute('beam-action')
  if (!action) return

  const params = getParams(el)
  const key = getCacheKey(action, params)

  // Skip if already cached or preloading
  if (cache.has(key) || preloading.has(key)) return

  preloading.add(key)

  try {
    const response = await api.call(action, params)
    // Cache for 30 seconds by default for preloaded content
    cache.set(key, { response, expires: Date.now() + 30000 })
  } catch {
    // Silently fail preload
  } finally {
    preloading.delete(key)
  }
}

// Preload on hover
document.addEventListener(
  'mouseenter',
  (e) => {
    const target = e.target as Element
    if (!target?.closest) return
    const el = target.closest('[beam-preload][beam-action]') as HTMLElement | null
    if (el) {
      preload(el)
    }
  },
  true
)

// Preload on touchstart for mobile
document.addEventListener(
  'touchstart',
  (e) => {
    const target = e.target as Element
    if (!target?.closest) return
    const el = target.closest('[beam-preload][beam-action]') as HTMLElement | null
    if (el) {
      preload(el)
    }
  },
  { passive: true }
)

// Clear cache utility
function clearCache(action?: string): void {
  if (action) {
    for (const key of cache.keys()) {
      if (key.startsWith(action + ':')) {
        cache.delete(key)
      }
    }
  } else {
    cache.clear()
  }
}

// ============ PROGRESSIVE ENHANCEMENT ============
// Links with href fallback to full page navigation if JS fails
// Usage: <a href="/products/1" beam-action="getProduct" beam-target="#main">View</a>

document.addEventListener(
  'click',
  async (e) => {
    const target = e.target as Element
    if (!target?.closest) return
    const link = target.closest('a[beam-action][href]:not([beam-instant])') as HTMLAnchorElement | null
    if (!link) return

    // Let normal navigation happen if:
    // - Meta/Ctrl key held (new tab)
    // - Middle click
    // - Link has target="_blank"
    if (e.metaKey || e.ctrlKey || e.button !== 0 || link.target === '_blank') return

    e.preventDefault()

    // Check confirmation
    if (!checkConfirm(link)) return

    const action = link.getAttribute('beam-action')
    if (!action) return

    const params = getParams(link)
    const cacheDuration = link.getAttribute('beam-cache')

    // Use cached result if available
    const key = getCacheKey(action, params)
    const cached = cache.get(key)

    const targetSelector = link.getAttribute('beam-target')
    const swapMode = link.getAttribute('beam-swap') || 'morph'

    // Show placeholder
    const placeholder = showPlaceholder(link)

    setLoading(link, true, action, params)

    try {
      const response = cached && cached.expires > Date.now() ? cached.response : await fetchWithCache(action, params, cacheDuration || undefined)

      // Handle redirect (if present) - takes priority
      if (response.redirect) {
        location.href = response.redirect
        return
      }

      // Handle HTML (if present) - supports single string or array
      handleHtmlResponse(response, targetSelector, swapMode, link)

      // Execute script (if present)
      if (response.script) {
        executeScript(response.script)
      }

      // Handle history
      handleHistory(link)

      // Update navigation
      updateNavigation()
    } catch (err) {
      placeholder.restore()
      // Fallback to normal navigation on error
      console.error('Beam link error, falling back to navigation:', err)
      location.href = link.href
    } finally {
      setLoading(link, false, action, params)
    }
  },
  true
)

// ============ FORM HANDLING ============
// Pure RPC forms - no traditional POST
// Usage: <form beam-action="createProduct" beam-target="#result">

document.addEventListener('submit', async (e) => {
  const target = e.target as Element
  if (!target?.closest) return
  const form = target.closest('form[beam-action]') as HTMLFormElement | null
  if (!form) return

  e.preventDefault()

  // Check confirmation
  if (!checkConfirm(form)) return

  const action = form.getAttribute('beam-action')
  if (!action) return

  const data = Object.fromEntries(new FormData(form))
  const targetSelector = form.getAttribute('beam-target')
  const swapMode = form.getAttribute('beam-swap') || 'morph'

  // Show placeholder
  const placeholder = showPlaceholder(form)

  setLoading(form, true, action, data as Record<string, unknown>)

  try {
    const response = await api.call(action, data as Record<string, unknown>)

    // Handle redirect (if present) - takes priority
    if (response.redirect) {
      location.href = response.redirect
      return
    }

    // Handle modal (if present)
    if (response.modal) {
      const modalData = typeof response.modal === 'string'
        ? { html: response.modal } : response.modal
      openModal(modalData.html, modalData.size || 'medium', modalData.spacing)
    }

    // Handle drawer (if present)
    if (response.drawer) {
      const drawerData = typeof response.drawer === 'string'
        ? { html: response.drawer } : response.drawer
      openDrawer(drawerData.html, drawerData.position || 'right', drawerData.size || 'medium', drawerData.spacing)
    }

    // Handle HTML (if present) - supports single string or array
    handleHtmlResponse(response, targetSelector, swapMode)

    // Execute script (if present)
    if (response.script) {
      executeScript(response.script)
    }

    if (form.hasAttribute('beam-reset')) {
      form.reset()
    }
    if (form.hasAttribute('beam-close')) {
      closeModal()
    }

    // Handle history
    handleHistory(form)
  } catch (err) {
    placeholder.restore()
    console.error('Beam form error:', err)
    showToast('Something went wrong. Please try again.', 'error')
  } finally {
    setLoading(form, false, action, data as Record<string, unknown>)
  }
})

// ============ REAL-TIME VALIDATION ============
// Usage: <input name="email" beam-validate="#email-errors" beam-watch="input" beam-debounce="300">

function setupValidation(el: HTMLElement): void {
  const event = el.getAttribute('beam-watch') || 'change'
  const debounce = parseInt(el.getAttribute('beam-debounce') || '300', 10)
  const targetSelector = el.getAttribute('beam-validate')!

  let timeout: ReturnType<typeof setTimeout>

  el.addEventListener(event, () => {
    clearTimeout(timeout)
    timeout = setTimeout(async () => {
      const form = el.closest('form') as HTMLFormElement | null
      if (!form) return

      const action = form.getAttribute('beam-action')
      if (!action) return

      const fieldName = el.getAttribute('name')
      if (!fieldName) return

      const formData = Object.fromEntries(new FormData(form))
      const data = { ...formData, _validate: fieldName }

      try {
        const response = await api.call(action, data as Record<string, unknown>)
        if (response.html) {
          const target = $(targetSelector)
          if (target) {
            // For validation, use first item if array, otherwise use as-is
            const htmlStr = Array.isArray(response.html) ? response.html[0] : response.html
            if (htmlStr) morph(target, htmlStr)
          }
        }
        // Execute script (if present)
        if (response.script) {
          executeScript(response.script)
        }
      } catch (err) {
        console.error('Validation error:', err)
      }
    }, debounce)
  })
}

// Observe validation elements (current and future)
const validationObserver = new MutationObserver(() => {
  document.querySelectorAll<HTMLElement>('[beam-validate]:not([beam-validation-observed])').forEach((el) => {
    el.setAttribute('beam-validation-observed', '')
    setupValidation(el)
  })
})

validationObserver.observe(document.body, { childList: true, subtree: true })

// Initialize existing validation elements
document.querySelectorAll<HTMLElement>('[beam-validate]').forEach((el) => {
  el.setAttribute('beam-validation-observed', '')
  setupValidation(el)
})

// ============ INPUT WATCHERS ============
// Usage: <input name="q" beam-action="search" beam-target="#results" beam-watch="input" beam-debounce="300">
// Usage: <input type="range" beam-action="update" beam-watch="input" beam-throttle="100">
// Usage: <input beam-watch="input" beam-watch-if="value.length >= 3">
// Handles standalone inputs with beam-action + beam-watch (not using beam-validate)

function isInputElement(el: Element): boolean {
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'
}

function getInputValue(el: Element): string | boolean {
  if (el.tagName === 'INPUT') {
    const input = el as unknown as HTMLInputElement
    if (input.type === 'checkbox') return input.checked
    if (input.type === 'radio') return input.checked ? input.value : ''
    return input.value
  }
  if (el.tagName === 'TEXTAREA') return (el as unknown as HTMLTextAreaElement).value
  if (el.tagName === 'SELECT') return (el as unknown as HTMLSelectElement).value
  return ''
}

// Cast value based on beam-cast attribute
function castValue(value: unknown, castType: string | null): unknown {
  if (!castType || typeof value !== 'string') return value
  switch (castType) {
    case 'number':
      const num = parseFloat(value)
      return isNaN(num) ? 0 : num
    case 'integer':
      const int = parseInt(value, 10)
      return isNaN(int) ? 0 : int
    case 'boolean':
      return value === 'true' || value === '1' || value === 'yes'
    case 'trim':
      return value.trim()
    default:
      return value
  }
}

// Check if condition is met for beam-watch-if
function checkWatchCondition(el: HTMLElement, value: unknown): boolean {
  const condition = el.getAttribute('beam-watch-if')
  if (!condition) return true

  try {
    // Create a function that evaluates the condition with 'value' and 'this' context
    const fn = new Function('value', `with(this) { return ${condition} }`)
    return Boolean(fn.call(el, value))
  } catch (e) {
    console.warn('[beam] Invalid beam-watch-if condition:', condition, e)
    return true
  }
}

// Create throttle function
function createThrottle(fn: () => void, limit: number): () => void {
  let lastRun = 0
  let timeout: ReturnType<typeof setTimeout> | null = null

  return () => {
    const now = Date.now()
    const timeSinceLastRun = now - lastRun

    if (timeSinceLastRun >= limit) {
      lastRun = now
      fn()
    } else if (!timeout) {
      // Schedule to run after remaining time
      timeout = setTimeout(() => {
        lastRun = Date.now()
        timeout = null
        fn()
      }, limit - timeSinceLastRun)
    }
  }
}

function setupInputWatcher(el: Element): void {
  if (!isInputElement(el)) return

  const htmlEl = el as HTMLElement
  const event = htmlEl.getAttribute('beam-watch') || 'change'
  const debounceMs = htmlEl.getAttribute('beam-debounce')
  const throttleMs = htmlEl.getAttribute('beam-throttle')
  const action = htmlEl.getAttribute('beam-action')
  const targetSelector = htmlEl.getAttribute('beam-target')
  const swapMode = htmlEl.getAttribute('beam-swap') || 'morph'
  const castType = htmlEl.getAttribute('beam-cast')
  const loadingClass = htmlEl.getAttribute('beam-loading-class')

  if (!action) return

  let debounceTimeout: ReturnType<typeof setTimeout>

  const executeAction = async (eventType: string) => {
    const name = htmlEl.getAttribute('name')
    let value = getInputValue(el)

    // Apply type casting
    value = castValue(value, castType) as string | boolean

    // Check conditional trigger
    if (!checkWatchCondition(htmlEl, value)) return

    const params = getParams(htmlEl)

    // Add the input's value to params
    if (name) {
      params[name] = value
    }

    // Handle checkboxes specially - they might be part of a group
    if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'checkbox') {
      const form = el.closest('form')
      if (form && name) {
        const checkboxes = form.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="${name}"]`)
        if (checkboxes.length > 1) {
          const values = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value)
          params[name] = values
        }
      }
    }

    // Add loading class if specified
    if (loadingClass) htmlEl.classList.add(loadingClass)

    // Mark touched
    htmlEl.setAttribute('beam-touched', '')

    try {
      const response = await api.call(action, params)

      if (response.html && targetSelector) {
        const targets = $$(targetSelector)
        const htmlArray = Array.isArray(response.html) ? response.html : [response.html]

        targets.forEach((target, i) => {
          const html = htmlArray[i] || htmlArray[0]
          if (html) {
            if (swapMode === 'append') {
              target.insertAdjacentHTML('beforeend', html)
            } else if (swapMode === 'prepend') {
              target.insertAdjacentHTML('afterbegin', html)
            } else if (swapMode === 'replace') {
              target.outerHTML = html
            } else {
              morph(target, html)
            }
          }
        })
      }

      // Process OOB updates (beam-touch templates)
      if (response.html) {
        const htmlStr = Array.isArray(response.html) ? response.html.join('') : response.html
        const { oob } = parseOobSwaps(htmlStr)
        for (const { selector, content, swapMode: oobSwapMode } of oob) {
          const oobTarget = $(selector)
          if (oobTarget) {
            if (oobSwapMode === 'morph' || !oobSwapMode) {
              morph(oobTarget, content)
            } else {
              swap(oobTarget, content, oobSwapMode)
            }
          }
        }
      }

      // Execute script if present
      if (response.script) {
        executeScript(response.script)
      }
    } catch (err) {
      console.error('Input watcher error:', err)
    } finally {
      // Remove loading class
      if (loadingClass) htmlEl.classList.remove(loadingClass)
    }
  }

  // Create the appropriate handler based on throttle vs debounce
  let handler: (e: Event) => void

  if (throttleMs) {
    // Use throttle mode
    const throttle = parseInt(throttleMs, 10)
    const throttledFn = createThrottle(() => executeAction('input'), throttle)
    handler = (e: Event) => {
      throttledFn()
    }
  } else {
    // Use debounce mode (default)
    const debounce = parseInt(debounceMs || '300', 10)
    handler = (e: Event) => {
      clearTimeout(debounceTimeout)
      const eventType = e.type
      debounceTimeout = setTimeout(() => executeAction(eventType), debounce)
    }
  }

  // Support multiple events (comma-separated)
  const events = event.split(',').map(e => e.trim())
  events.forEach(evt => {
    htmlEl.addEventListener(evt, handler)
  })
}

// Observe input watcher elements (current and future)
const inputWatcherObserver = new MutationObserver(() => {
  // Select inputs with beam-action + beam-watch but NOT beam-validate (which has its own handler)
  document.querySelectorAll<HTMLElement>('[beam-action][beam-watch]:not([beam-validate]):not([beam-input-observed])').forEach((el) => {
    if (!isInputElement(el)) return
    el.setAttribute('beam-input-observed', '')
    setupInputWatcher(el)
  })
})

inputWatcherObserver.observe(document.body, { childList: true, subtree: true })

// Initialize existing input watcher elements
document.querySelectorAll<HTMLElement>('[beam-action][beam-watch]:not([beam-validate])').forEach((el) => {
  if (!isInputElement(el)) return
  el.setAttribute('beam-input-observed', '')
  setupInputWatcher(el)
})

// ============ DEFERRED LOADING ============
// Usage: <div beam-defer beam-action="loadComments" beam-target="#comments">Loading...</div>

const deferObserver = new IntersectionObserver(
  async (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue

      const el = entry.target as HTMLElement
      if (el.hasAttribute('beam-defer-loaded')) continue

      el.setAttribute('beam-defer-loaded', '')
      deferObserver.unobserve(el)

      const action = el.getAttribute('beam-action')
      if (!action) continue

      const params = getParams(el)
      const targetSelector = el.getAttribute('beam-target')
      const swapMode = el.getAttribute('beam-swap') || 'morph'

      setLoading(el, true, action, params)

      try {
        const response = await api.call(action, params)
        if (response.html) {
          const target = targetSelector ? $(targetSelector) : el
          if (target) {
            // For deferred loading, use first item if array, otherwise use as-is
            const htmlStr = Array.isArray(response.html) ? response.html[0] : response.html
            if (htmlStr) swap(target, htmlStr, swapMode)
          }
        }
        // Execute script (if present)
        if (response.script) {
          executeScript(response.script)
        }
      } catch (err) {
        console.error('Defer error:', err)
      } finally {
        setLoading(el, false, action, params)
      }
    }
  },
  { rootMargin: '100px' }
)

// Observe defer elements (current and future)
const deferMutationObserver = new MutationObserver(() => {
  document.querySelectorAll<HTMLElement>('[beam-defer]:not([beam-defer-observed])').forEach((el) => {
    el.setAttribute('beam-defer-observed', '')
    deferObserver.observe(el)
  })
})

deferMutationObserver.observe(document.body, { childList: true, subtree: true })

// Initialize existing defer elements
document.querySelectorAll<HTMLElement>('[beam-defer]').forEach((el) => {
  el.setAttribute('beam-defer-observed', '')
  deferObserver.observe(el)
})

// ============ POLLING ============
// Usage: <div beam-poll beam-interval="5000" beam-action="getStatus" beam-target="#status">...</div>

const pollingElements = new Map<HTMLElement, ReturnType<typeof setInterval>>()

function startPolling(el: HTMLElement): void {
  if (pollingElements.has(el)) return

  const interval = parseInt(el.getAttribute('beam-interval') || '5000', 10)
  const action = el.getAttribute('beam-action')
  if (!action) return

  const poll = async () => {
    // Stop if element is no longer in DOM
    if (!document.body.contains(el)) {
      stopPolling(el)
      return
    }

    // Skip if offline
    if (!isOnline) return

    const params = getParams(el)
    const targetSelector = el.getAttribute('beam-target')
    const swapMode = el.getAttribute('beam-swap') || 'morph'

    try {
      const response = await api.call(action, params)
      if (response.html) {
        const target = targetSelector ? $(targetSelector) : el
        if (target) {
          // For polling, use first item if array, otherwise use as-is
          const htmlStr = Array.isArray(response.html) ? response.html[0] : response.html
          if (htmlStr) swap(target, htmlStr, swapMode)
        }
      }
      // Execute script (if present)
      if (response.script) {
        executeScript(response.script)
      }
    } catch (err) {
      console.error('Poll error:', err)
    }
  }

  const timerId = setInterval(poll, interval)
  pollingElements.set(el, timerId)

  // Initial poll immediately (unless beam-poll-delay is set)
  if (!el.hasAttribute('beam-poll-delay')) {
    poll()
  }
}

function stopPolling(el: HTMLElement): void {
  const timerId = pollingElements.get(el)
  if (timerId) {
    clearInterval(timerId)
    pollingElements.delete(el)
  }
}

// Observe polling elements (current and future)
const pollMutationObserver = new MutationObserver(() => {
  document.querySelectorAll<HTMLElement>('[beam-poll]:not([beam-poll-observed])').forEach((el) => {
    el.setAttribute('beam-poll-observed', '')
    startPolling(el)
  })
})

pollMutationObserver.observe(document.body, { childList: true, subtree: true })

// Initialize existing polling elements
document.querySelectorAll<HTMLElement>('[beam-poll]').forEach((el) => {
  el.setAttribute('beam-poll-observed', '')
  startPolling(el)
})

// ============ HUNGRY AUTO-REFRESH ============
// Usage: <span id="cart-count" beam-hungry>0</span>
// When any RPC response contains an element with id="cart-count", it auto-updates

function processHungryElements(html: string): void {
  const temp = document.createElement('div')
  temp.innerHTML = html

  // Find hungry elements on the page
  document.querySelectorAll<HTMLElement>('[beam-hungry]').forEach((hungry) => {
    const id = hungry.id
    if (!id) return

    // Look for matching element in response
    const fresh = temp.querySelector(`#${id}`)
    if (fresh) {
      morph(hungry, fresh.innerHTML)
    }
  })
}

// ============ CLIENT-SIDE UI STATE (Alpine.js Replacement) ============
// Toggle, dropdown, collapse utilities that don't require server round-trips

// === TOGGLE ===
// Usage: <button beam-toggle="#menu">Menu</button>
//        <div id="menu" beam-hidden>Content</div>
document.addEventListener('click', (e) => {
  const target = e.target as Element
  if (!target?.closest) return

  const trigger = target.closest('[beam-toggle]') as HTMLElement | null
  if (trigger) {
    e.preventDefault()
    const selector = trigger.getAttribute('beam-toggle')!
    const targetEl = document.querySelector(selector) as HTMLElement | null
    if (targetEl) {
      const isHidden = targetEl.hasAttribute('beam-hidden')
      if (isHidden) {
        targetEl.removeAttribute('beam-hidden')
        trigger.setAttribute('aria-expanded', 'true')
        // Handle transition
        if (targetEl.hasAttribute('beam-transition')) {
          targetEl.style.display = ''
          // Force reflow for transition
          targetEl.offsetHeight
        }
      } else {
        targetEl.setAttribute('beam-hidden', '')
        trigger.setAttribute('aria-expanded', 'false')
      }
    }
  }
})

// === DROPDOWN (with outside-click auto-close) ===
// Usage: <div beam-dropdown>
//          <button beam-dropdown-trigger>Account ▼</button>
//          <div beam-dropdown-content beam-hidden>
//            <a href="/profile">Profile</a>
//          </div>
//        </div>
document.addEventListener('click', (e) => {
  const target = e.target as Element
  if (!target?.closest) return

  const trigger = target.closest('[beam-dropdown-trigger]') as HTMLElement | null
  if (trigger) {
    e.preventDefault()
    e.stopPropagation()

    const dropdown = trigger.closest('[beam-dropdown]')
    const content = dropdown?.querySelector('[beam-dropdown-content]') as HTMLElement | null
    if (content) {
      const isHidden = content.hasAttribute('beam-hidden')

      // Close all other dropdowns first
      document.querySelectorAll('[beam-dropdown-content]:not([beam-hidden])').forEach((el) => {
        if (el !== content) {
          el.setAttribute('beam-hidden', '')
          el.closest('[beam-dropdown]')?.querySelector('[beam-dropdown-trigger]')?.setAttribute('aria-expanded', 'false')
        }
      })

      // Toggle this dropdown
      if (isHidden) {
        content.removeAttribute('beam-hidden')
        trigger.setAttribute('aria-expanded', 'true')
      } else {
        content.setAttribute('beam-hidden', '')
        trigger.setAttribute('aria-expanded', 'false')
      }
    }
    return
  }

  // Close all dropdowns on outside click (if click is not inside a dropdown content)
  if (!target.closest('[beam-dropdown-content]')) {
    document.querySelectorAll('[beam-dropdown-content]:not([beam-hidden])').forEach((el) => {
      el.setAttribute('beam-hidden', '')
      el.closest('[beam-dropdown]')?.querySelector('[beam-dropdown-trigger]')?.setAttribute('aria-expanded', 'false')
    })
  }
})

// Close dropdowns on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('[beam-dropdown-content]:not([beam-hidden])').forEach((el) => {
      el.setAttribute('beam-hidden', '')
      el.closest('[beam-dropdown]')?.querySelector('[beam-dropdown-trigger]')?.setAttribute('aria-expanded', 'false')
    })
  }
})

// === COLLAPSE with text swap ===
// Usage: <button beam-collapse="#details" beam-collapse-text="Show less">Show more</button>
//        <div id="details" beam-collapsed>Expanded content...</div>
document.addEventListener('click', (e) => {
  const target = e.target as Element
  if (!target?.closest) return

  const trigger = target.closest('[beam-collapse]') as HTMLElement | null
  if (trigger) {
    e.preventDefault()
    const selector = trigger.getAttribute('beam-collapse')!
    const targetEl = document.querySelector(selector) as HTMLElement | null
    if (targetEl) {
      const isCollapsed = targetEl.hasAttribute('beam-collapsed')

      if (isCollapsed) {
        targetEl.removeAttribute('beam-collapsed')
        trigger.setAttribute('aria-expanded', 'true')
      } else {
        targetEl.setAttribute('beam-collapsed', '')
        trigger.setAttribute('aria-expanded', 'false')
      }

      // Swap button text if beam-collapse-text is specified
      const altText = trigger.getAttribute('beam-collapse-text')
      if (altText) {
        const currentText = trigger.textContent || ''
        trigger.textContent = altText
        trigger.setAttribute('beam-collapse-text', currentText)
      }
    }
  }
})

// === CLASS TOGGLE ===
// Usage: <button beam-class-toggle="active" beam-class-target="#sidebar">Toggle</button>
// Or toggle on self: <button beam-class-toggle="active">Toggle</button>
document.addEventListener('click', (e) => {
  const target = e.target as Element
  if (!target?.closest) return

  const trigger = target.closest('[beam-class-toggle]') as HTMLElement | null
  if (trigger) {
    const className = trigger.getAttribute('beam-class-toggle')!
    const targetSelector = trigger.getAttribute('beam-class-target')
    const targetEl = targetSelector ? document.querySelector(targetSelector) : trigger

    if (targetEl && className) {
      targetEl.classList.toggle(className)
    }
  }
})

// ============ DIRTY FORM TRACKING ============
// Usage: <form beam-dirty-track>...</form>
// Usage: <span beam-dirty-indicator="#my-form">*</span> (shows when form is dirty)
// Usage: <form beam-warn-unsaved>...</form> (warns on page leave)

// Store original form data for dirty checking
const formOriginalData = new WeakMap<HTMLFormElement, Map<string, string>>()
const dirtyForms = new Set<HTMLFormElement>()

function getFormDataMap(form: HTMLFormElement): Map<string, string> {
  const map = new Map<string, string>()
  const formData = new FormData(form)
  for (const [key, value] of formData.entries()) {
    const existing = map.get(key)
    if (existing) {
      // Handle multiple values (checkboxes, multi-select)
      map.set(key, existing + ',' + String(value))
    } else {
      map.set(key, String(value))
    }
  }
  return map
}

function isFormDirty(form: HTMLFormElement): boolean {
  const original = formOriginalData.get(form)
  if (!original) return false

  const current = getFormDataMap(form)

  // Check if any values changed
  for (const [key, value] of current.entries()) {
    if (original.get(key) !== value) return true
  }
  for (const [key, value] of original.entries()) {
    if (current.get(key) !== value) return true
  }
  return false
}

function updateDirtyState(form: HTMLFormElement): void {
  const isDirty = isFormDirty(form)

  if (isDirty) {
    dirtyForms.add(form)
    form.setAttribute('beam-dirty', '')
  } else {
    dirtyForms.delete(form)
    form.removeAttribute('beam-dirty')
  }

  // Update dirty indicators
  updateDirtyIndicators()
}

function updateDirtyIndicators(): void {
  document.querySelectorAll<HTMLElement>('[beam-dirty-indicator]').forEach((indicator) => {
    const formSelector = indicator.getAttribute('beam-dirty-indicator')
    if (!formSelector) return

    const form = document.querySelector(formSelector) as HTMLFormElement | null
    const isDirty = form ? dirtyForms.has(form) : false

    if (indicator.hasAttribute('beam-dirty-class')) {
      const className = indicator.getAttribute('beam-dirty-class')!
      indicator.classList.toggle(className, isDirty)
    } else {
      indicator.style.display = isDirty ? '' : 'none'
    }
  })

  // Update show-if-dirty elements
  document.querySelectorAll<HTMLElement>('[beam-show-if-dirty]').forEach((el) => {
    const formSelector = el.getAttribute('beam-show-if-dirty')
    const form = formSelector
      ? document.querySelector(formSelector) as HTMLFormElement | null
      : el.closest('form') as HTMLFormElement | null

    const isDirty = form ? dirtyForms.has(form) : false
    el.style.display = isDirty ? '' : 'none'
  })

  // Update hide-if-dirty elements
  document.querySelectorAll<HTMLElement>('[beam-hide-if-dirty]').forEach((el) => {
    const formSelector = el.getAttribute('beam-hide-if-dirty')
    const form = formSelector
      ? document.querySelector(formSelector) as HTMLFormElement | null
      : el.closest('form') as HTMLFormElement | null

    const isDirty = form ? dirtyForms.has(form) : false
    el.style.display = isDirty ? 'none' : ''
  })
}

function setupDirtyTracking(form: HTMLFormElement): void {
  // Store original data
  formOriginalData.set(form, getFormDataMap(form))

  // Listen to input events on all form fields
  const checkDirty = () => updateDirtyState(form)

  form.addEventListener('input', checkDirty)
  form.addEventListener('change', checkDirty)

  // Reset dirty state on form submit
  form.addEventListener('submit', () => {
    // After successful submit, update original data
    setTimeout(() => {
      formOriginalData.set(form, getFormDataMap(form))
      updateDirtyState(form)
    }, 100)
  })

  // Handle form reset
  form.addEventListener('reset', () => {
    setTimeout(() => updateDirtyState(form), 0)
  })
}

// Observe dirty-tracked forms
const dirtyFormObserver = new MutationObserver(() => {
  document.querySelectorAll<HTMLFormElement>('form[beam-dirty-track]:not([beam-dirty-observed])').forEach((form) => {
    form.setAttribute('beam-dirty-observed', '')
    setupDirtyTracking(form)
  })
})

dirtyFormObserver.observe(document.body, { childList: true, subtree: true })

// Initialize existing dirty-tracked forms
document.querySelectorAll<HTMLFormElement>('form[beam-dirty-track]').forEach((form) => {
  form.setAttribute('beam-dirty-observed', '')
  setupDirtyTracking(form)
})

// Initialize dirty indicators (hidden by default)
document.querySelectorAll<HTMLElement>('[beam-dirty-indicator]:not([beam-dirty-class])').forEach((el) => {
  el.style.display = 'none'
})
document.querySelectorAll<HTMLElement>('[beam-show-if-dirty]').forEach((el) => {
  el.style.display = 'none'
})

// ============ UNSAVED CHANGES WARNING ============
// Usage: <form beam-warn-unsaved>...</form>
// Usage: <form beam-warn-unsaved="Are you sure? You have unsaved changes.">...</form>

window.addEventListener('beforeunload', (e) => {
  // Check if any form with beam-warn-unsaved is dirty
  const formsWithWarning = document.querySelectorAll<HTMLFormElement>('form[beam-warn-unsaved]')
  let hasDirtyForm = false

  formsWithWarning.forEach((form) => {
    if (dirtyForms.has(form)) {
      hasDirtyForm = true
    }
  })

  if (hasDirtyForm) {
    e.preventDefault()
    // Modern browsers ignore custom messages, but we need to return something
    e.returnValue = ''
    return ''
  }
})

// ============ FORM REVERT ============
// Usage: <button type="button" beam-revert="#my-form">Revert</button>
// Usage: <button type="button" beam-revert>Revert</button> (inside form)

document.addEventListener('click', (e) => {
  const target = e.target as Element
  if (!target?.closest) return

  const trigger = target.closest('[beam-revert]') as HTMLElement | null
  if (trigger) {
    e.preventDefault()

    const formSelector = trigger.getAttribute('beam-revert')
    const form = formSelector
      ? document.querySelector(formSelector) as HTMLFormElement | null
      : trigger.closest('form') as HTMLFormElement | null

    if (form) {
      const original = formOriginalData.get(form)
      if (original) {
        // Reset each field to its original value
        original.forEach((value, name) => {
          const fields = form.querySelectorAll(`[name="${name}"]`)
          fields.forEach((el) => {
            const field = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
            if (field instanceof HTMLInputElement && (field.type === 'checkbox' || field.type === 'radio')) {
              // For checkboxes/radios, check if their value was in the original
              const values = value.split(',')
              field.checked = values.includes(field.value)
            } else if ('value' in field) {
              field.value = value
            }
          })
        })

        // Handle fields that weren't in original (new fields) - reset them
        const currentFields = form.querySelectorAll('[name]')
        currentFields.forEach((el) => {
          const field = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
          const name = field.getAttribute('name')
          if (name && !original.has(name)) {
            if (field instanceof HTMLInputElement && (field.type === 'checkbox' || field.type === 'radio')) {
              field.checked = false
            } else if ('value' in field) {
              field.value = ''
            }
          }
        })

        // Dispatch input event for any watchers
        form.dispatchEvent(new Event('input', { bubbles: true }))
        updateDirtyState(form)
      }
    }
  }
})

// ============ CONDITIONAL FORM FIELDS ============
// Usage: <input name="other" beam-enable-if="#has-other:checked">
// Usage: <select beam-disable-if="#country[value='']">
// Usage: <div beam-visible-if="#show-details:checked">Details here</div>

function evaluateCondition(condition: string): boolean {
  // Parse condition: "#selector:pseudo" or "#selector[attr='value']"
  const match = condition.match(/^([^:\[]+)(?::(\w+))?(?:\[([^\]]+)\])?$/)
  if (!match) return false

  const [, selector, pseudo, attrCondition] = match
  const el = document.querySelector(selector)
  if (!el) return false

  // Check pseudo-class
  if (pseudo === 'checked') {
    return (el as HTMLInputElement).checked
  }
  if (pseudo === 'disabled') {
    return (el as HTMLInputElement).disabled
  }
  if (pseudo === 'empty') {
    return !(el as HTMLInputElement).value
  }

  // Check attribute condition
  if (attrCondition) {
    const attrMatch = attrCondition.match(/(\w+)([=!<>]+)'?([^']*)'?/)
    if (attrMatch) {
      const [, attr, op, expected] = attrMatch
      const actual = attr === 'value' ? (el as HTMLInputElement).value : el.getAttribute(attr)

      switch (op) {
        case '=':
        case '==':
          return actual === expected
        case '!=':
          return actual !== expected
        case '>':
          return Number(actual) > Number(expected)
        case '<':
          return Number(actual) < Number(expected)
        case '>=':
          return Number(actual) >= Number(expected)
        case '<=':
          return Number(actual) <= Number(expected)
      }
    }
  }

  // Default: check if element exists and has a truthy value
  if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox' || el.type === 'radio') {
      return el.checked
    }
    return Boolean(el.value)
  }
  if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    return Boolean(el.value)
  }

  return true
}

function updateConditionalFields(): void {
  // Enable-if
  document.querySelectorAll<HTMLElement>('[beam-enable-if]').forEach((el) => {
    const condition = el.getAttribute('beam-enable-if')!
    const shouldEnable = evaluateCondition(condition)
    ;(el as HTMLInputElement | HTMLButtonElement).disabled = !shouldEnable
  })

  // Disable-if
  document.querySelectorAll<HTMLElement>('[beam-disable-if]').forEach((el) => {
    const condition = el.getAttribute('beam-disable-if')!
    const shouldDisable = evaluateCondition(condition)
    ;(el as HTMLInputElement | HTMLButtonElement).disabled = shouldDisable
  })

  // Visible-if (show when condition is true)
  document.querySelectorAll<HTMLElement>('[beam-visible-if]').forEach((el) => {
    const condition = el.getAttribute('beam-visible-if')!
    const shouldShow = evaluateCondition(condition)
    el.style.display = shouldShow ? '' : 'none'
  })

  // Hidden-if (hide when condition is true)
  document.querySelectorAll<HTMLElement>('[beam-hidden-if]').forEach((el) => {
    const condition = el.getAttribute('beam-hidden-if')!
    const shouldHide = evaluateCondition(condition)
    el.style.display = shouldHide ? 'none' : ''
  })

  // Required-if
  document.querySelectorAll<HTMLElement>('[beam-required-if]').forEach((el) => {
    const condition = el.getAttribute('beam-required-if')!
    const shouldRequire = evaluateCondition(condition)
    ;(el as HTMLInputElement).required = shouldRequire
  })
}

// Listen for input/change events to update conditional fields
document.addEventListener('input', updateConditionalFields)
document.addEventListener('change', updateConditionalFields)

// Initial update
updateConditionalFields()

// Observe for new conditional elements
const conditionalObserver = new MutationObserver(updateConditionalFields)
conditionalObserver.observe(document.body, { childList: true, subtree: true })

// ============ EXPORTS ============

interface CallOptions {
  target?: string
  swap?: string  // 'morph' | 'innerHTML' | 'append' | 'prepend' | etc.
}

// Clear scroll state for current page or all pages
// Usage: clearScrollState() - clear all for current URL
//        clearScrollState('loadMore') - clear specific action
//        clearScrollState(true) - clear all scroll states
function clearScrollState(actionOrAll?: string | boolean): void {
  if (actionOrAll === true) {
    // Clear all scroll states
    const keysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(SCROLL_STATE_KEY_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key))
  } else if (typeof actionOrAll === 'string') {
    // Clear specific action's scroll state
    sessionStorage.removeItem(getScrollStateKey(actionOrAll))
  } else {
    // Clear all scroll states for current URL (any action)
    const prefix = SCROLL_STATE_KEY_PREFIX + location.pathname + location.search
    const keysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key))
  }
}

// Base utilities that are always available on window.beam
function checkWsConnected(): boolean {
  return wsConnected
}

function manualReconnect(): Promise<BeamServerStub> {
  reconnectAttempts = 0
  return connect()
}

const beamUtils = {
  showToast,
  closeModal,
  closeDrawer,
  clearCache,
  clearScrollState,
  isOnline: () => isOnline,
  isConnected: checkWsConnected,
  reconnect: manualReconnect,
  getSession: api.getSession,
  // Reactive state API (from reactivity.ts)
  ...beamReactivity,
}

// Type for the dynamic action caller
type ActionCaller = (data?: Record<string, unknown>, options?: string | CallOptions) => Promise<ActionResponse>

declare global {
  interface Window {
    beam: typeof beamUtils & {
      [action: string]: ActionCaller
    }
  }
}

// Create a Proxy that handles both utility methods and dynamic action calls
window.beam = new Proxy(beamUtils, {
  get(target, prop: string) {
    // Return existing utility methods
    if (prop in target) {
      return (target as any)[prop]
    }

    // Return a dynamic action caller for any other property
    return async (data: Record<string, unknown> = {}, options?: string | CallOptions): Promise<ActionResponse> => {
      const rawResponse = await api.call(prop, data)

      // Normalize response: string -> {html: string}, object -> as-is
      const response: ActionResponse = typeof rawResponse === 'string'
        ? { html: rawResponse }
        : rawResponse

      // Handle redirect (takes priority)
      if (response.redirect) {
        location.href = response.redirect
        return response
      }

      // Handle modal (if present)
      if (response.modal) {
        const modalData = typeof response.modal === 'string'
          ? { html: response.modal } : response.modal
        openModal(modalData.html, modalData.size || 'medium', modalData.spacing)
      }

      // Handle drawer (if present)
      if (response.drawer) {
        const drawerData = typeof response.drawer === 'string'
          ? { html: response.drawer } : response.drawer
        openDrawer(drawerData.html, drawerData.position || 'right', drawerData.size || 'medium', drawerData.spacing)
      }

      // Normalize options: string is shorthand for { target: string }
      const opts: CallOptions = typeof options === 'string'
        ? { target: options }
        : (options || {})

      // Server target/swap override frontend options
      const targetSelector = response.target || opts.target || null
      const swapMode = response.swap || opts.swap || 'morph'

      // Handle HTML swap - supports single string or array
      handleHtmlResponse(response, targetSelector, swapMode)

      // Execute script if present
      if (response.script) {
        executeScript(response.script)
      }

      return response
    }
  }
}) as typeof beamUtils & { [action: string]: ActionCaller }

// Legacy exports for backwards compatibility
;(window as any).showToast = showToast
;(window as any).closeModal = closeModal
;(window as any).closeDrawer = closeDrawer
;(window as any).clearCache = clearCache

// Initialize capnweb RPC connection
connect().catch(console.error)
