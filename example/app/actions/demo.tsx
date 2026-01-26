import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext } from '@benqoder/beam'
import type { Env } from '../types'

function render(node: HtmlEscapedString | Promise<HtmlEscapedString>): Promise<string> {
  return Promise.resolve(node).then(n => n.toString())
}

// Simple delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// In-memory state for demo
let counter = 0
let itemIdCounter = 3
const items = [
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
  { id: 3, name: 'Item 3' },
]

export async function increment(_ctx: BeamContext<Env>, _params: Record<string, unknown>): Promise<string> {
  counter++
  return render(
    <div class="demo-box">
      Count: <span id="count">{counter}</span>
    </div>
  )
}

export async function decrement(_ctx: BeamContext<Env>, _params: Record<string, unknown>): Promise<string> {
  counter--
  return render(
    <div class="demo-box">
      Count: <span id="count">{counter}</span>
    </div>
  )
}

export async function greet(_ctx: BeamContext<Env>, { name, emoji }: Record<string, unknown>): Promise<string> {
  return render(
    <div class="demo-box">
      {emoji} Hello, {name as string}!
    </div>
  )
}

export async function slowAction(_ctx: BeamContext<Env>, { type }: Record<string, unknown>): Promise<string> {
  await delay(5000)
  return render(
    <div class="demo-box">
      ✅ {type === 'save' ? 'Saved' : 'Deleted'} successfully at {new Date().toLocaleTimeString()}
    </div>
  )
}

export async function deleteItem(_ctx: BeamContext<Env>, { id }: Record<string, unknown>): Promise<string> {
  await delay(5000)
  const index = items.findIndex(item => item.id === Number(id))
  if (index !== -1) {
    items.splice(index, 1)
  }

  return render(
    <>
      {items.map(item => (
        <div class="item-row">
          <span>{item.name}</span>
          <span beam-loading-for="deleteItem" beam-loading-data-id={String(item.id)} class="item-status">
            Deleting...
          </span>
          <button beam-action="deleteItem" beam-data-id={String(item.id)} beam-target="#items-list">
            Delete
          </button>
        </div>
      ))}
      {items.length === 0 && <div class="demo-box">No items left!</div>}
    </>
  )
}

export async function toggleTest(_ctx: BeamContext<Env>, _params: Record<string, unknown>): Promise<string> {
  await delay(5000)
  return render(
    <div class="demo-box">
      Updated at {new Date().toLocaleTimeString()}
    </div>
  )
}

export async function hideTest(_ctx: BeamContext<Env>, _params: Record<string, unknown>): Promise<string> {
  await delay(5000)
  return render(
    <>
      <span beam-loading-for="hideTest" beam-loading-remove>
        Content loaded at {new Date().toLocaleTimeString()}
      </span>
      <span beam-loading-for="hideTest">Loading content...</span>
    </>
  )
}

export async function addItem(_ctx: BeamContext<Env>, _params: Record<string, unknown>): Promise<string> {
  itemIdCounter++
  return render(
    <div class="list-item">New Item {itemIdCounter} (added at {new Date().toLocaleTimeString()})</div>
  )
}

export async function replaceList(_ctx: BeamContext<Env>, _params: Record<string, unknown>): Promise<string> {
  return render(
    <>
      <div class="list-item">Replaced Item A</div>
      <div class="list-item">Replaced Item B</div>
      <div class="list-item">Replaced Item C</div>
    </>
  )
}

export async function oobUpdate(_ctx: BeamContext<Env>, _params: Record<string, unknown>): Promise<string> {
  const time = new Date().toLocaleTimeString()
  return render(
    <>
      <div class="demo-box">Main updated at {time}</div>
      <template beam-touch="#oob-sidebar">
        <div class="demo-box">Sidebar updated at {time}</div>
      </template>
      <template beam-touch="#oob-footer">
        <div class="demo-box">Footer updated at {time}</div>
      </template>
    </>
  )
}

// ============ VALIDATION DEMO ============

export async function validateForm(_ctx: BeamContext<Env>, { email, username, _validate }: Record<string, unknown>): Promise<string> {
  // Simulate async validation
  await delay(300)

  // Check which field is being validated
  if (_validate === 'email') {
    const emailStr = email as string || ''
    if (!emailStr) {
      return render(<span class="error">Email is required</span>)
    }
    if (!emailStr.includes('@')) {
      return render(<span class="error">Please enter a valid email</span>)
    }
    if (emailStr === 'taken@example.com') {
      return render(<span class="error">This email is already registered</span>)
    }
    return render(<span class="success">Email is available</span>)
  }

  if (_validate === 'username') {
    const usernameStr = username as string || ''
    if (!usernameStr) {
      return render(<span class="error">Username is required</span>)
    }
    if (usernameStr.length < 3) {
      return render(<span class="error">Username must be at least 3 characters</span>)
    }
    if (usernameStr === 'admin') {
      return render(<span class="error">Username "admin" is reserved</span>)
    }
    return render(<span class="success">Username is available</span>)
  }

  // Full form submission
  return render(
    <div class="demo-box success-box">
      Form submitted successfully with email: {email as string} and username: {username as string}
    </div>
  )
}

// ============ DEFERRED LOADING DEMO ============

export async function loadComments(_ctx: BeamContext<Env>, _params: Record<string, unknown>): Promise<string> {
  // Simulate loading delay
  await delay(1500)
  return render(
    <div class="comments-loaded">
      <div class="comment">
        <strong>Alice</strong>: Great product! Highly recommended.
      </div>
      <div class="comment">
        <strong>Bob</strong>: Fast shipping, exactly as described.
      </div>
      <div class="comment">
        <strong>Charlie</strong>: Will buy again!
      </div>
    </div>
  )
}

export async function loadRecommendations(_ctx: BeamContext<Env>, _params: Record<string, unknown>): Promise<string> {
  await delay(2000)
  return render(
    <div class="recommendations-loaded">
      <div class="rec-item">Product A - $29.99</div>
      <div class="rec-item">Product B - $39.99</div>
      <div class="rec-item">Product C - $19.99</div>
    </div>
  )
}

// ============ POLLING DEMO ============

let pollCount = 0
export async function getServerTime(_ctx: BeamContext<Env>, _params: Record<string, unknown>): Promise<string> {
  pollCount++
  return render(
    <div class="poll-result">
      <div>Server Time: <strong>{new Date().toLocaleTimeString()}</strong></div>
      <div class="poll-count">Poll count: {pollCount}</div>
    </div>
  )
}

let stockPrice = 150.00
export async function getStockPrice(_ctx: BeamContext<Env>, _params: Record<string, unknown>): Promise<string> {
  // Simulate price fluctuation
  stockPrice = stockPrice + (Math.random() - 0.5) * 5
  stockPrice = Math.round(stockPrice * 100) / 100
  const change = stockPrice > 150 ? 'up' : stockPrice < 150 ? 'down' : 'neutral'

  return render(
    <div class={`stock-price stock-${change}`}>
      <span class="symbol">BEAM</span>
      <span class="price">${stockPrice.toFixed(2)}</span>
      <span class="indicator">{change === 'up' ? '↑' : change === 'down' ? '↓' : '→'}</span>
    </div>
  )
}

// ============ HUNGRY ELEMENT DEMO ============

let cartCount = 0
export async function addToCartDemo(_ctx: BeamContext<Env>, { product }: Record<string, unknown>): Promise<string> {
  cartCount++
  const time = new Date().toLocaleTimeString()

  // Return the main content plus the hungry cart badge will auto-update
  return render(
    <>
      <div class="demo-box success-box">
        Added "{product as string}" to cart at {time}
      </div>
      {/* This element has same ID as the hungry element, so it will auto-update */}
      <span id="cart-badge" class="cart-badge">{cartCount}</span>
    </>
  )
}

export async function clearCartDemo(_ctx: BeamContext<Env>, _params: Record<string, unknown>): Promise<string> {
  cartCount = 0
  return render(
    <>
      <div class="demo-box">Cart cleared</div>
      <span id="cart-badge" class="cart-badge">0</span>
    </>
  )
}

// ============ SETTINGS DEMO (for drawer) ============

export async function saveSettings(_ctx: BeamContext<Env>, { theme, notifications }: Record<string, unknown>): Promise<string> {
  await delay(500)
  return render(
    <div class="demo-box success-box">
      Settings saved! Theme: {theme as string}, Notifications: {notifications ? 'On' : 'Off'}
    </div>
  )
}

// ============ SCRIPT EXECUTION TESTS ============

// Test 1: Script only (no HTML)
export function testScriptOnly(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  return ctx.script('console.log("Script executed!"); window.beam.showToast("Script only - success!")')
}

// Test 2: HTML + Script
export async function testHtmlAndScript(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  const html = await render(
    <div class="demo-box success-box">
      HTML rendered at {new Date().toLocaleTimeString()}
    </div>
  )
  return ctx.render(html, { script: 'console.log("Script also executed!"); window.beam.showToast("HTML + Script - success!")' })
}

// Test 3: HTML only using ctx.render
export async function testHtmlOnly(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  const html = await render(
    <div class="demo-box">
      HTML only at {new Date().toLocaleTimeString()}
    </div>
  )
  return ctx.render(html)
}

// Test 4: Redirect
export function testRedirect(ctx: BeamContext<Env>, { url }: Record<string, unknown>) {
  return ctx.redirect((url as string) || '/')
}

// ============ SERVER-SIDE TARGETS ============

// Server specifies target A
export async function serverTargetA(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  const html = await render(
    <div class="demo-box" style="background: #dcfce7;">
      Target A updated at {new Date().toLocaleTimeString()}
    </div>
  )
  return ctx.render(html, { target: '#server-target-a' })
}

// Server specifies target B
export async function serverTargetB(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  const html = await render(
    <div class="demo-box" style="background: #dbeafe;">
      Target B updated at {new Date().toLocaleTimeString()}
    </div>
  )
  return ctx.render(html, { target: '#server-target-b' })
}

// Server updates all targets using OOB
export async function serverTargetAll(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  const time = new Date().toLocaleTimeString()
  const html = await render(
    <>
      <div class="demo-box" style="background: #fef08a;">
        Target A: {time}
      </div>
      <template beam-touch="#server-target-b">
        <div class="demo-box" style="background: #fef08a;">
          Target B: {time}
        </div>
      </template>
      <template beam-touch="#server-target-c">
        <div class="demo-box" style="background: #fef08a;">
          Target C: {time}
        </div>
      </template>
    </>
  )
  return ctx.render(html, { target: '#server-target-a' })
}

// Server specifies append swap mode
export async function serverTargetAppend(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  const html = await render(
    <div style="background: #e9d5ff; padding: 0.5rem; margin-top: 0.5rem; border-radius: 4px;">
      Appended at {new Date().toLocaleTimeString()}
    </div>
  )
  return ctx.render(html, { target: '#server-target-a', swap: 'append' })
}

// ============ MODAL & DRAWER DEMOS ============

// Modal with default settings
export async function demoModal(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  return ctx.modal(render(
    <div>
      <header class="modal-header">
        <h2>Demo Modal</h2>
        <button type="button" beam-close aria-label="Close" class="modal-close">
          &times;
        </button>
      </header>
      <div class="modal-body">
        <p>This modal was returned directly from an action using <code>ctx.modal()</code>.</p>
        <p>It uses the default 15px padding and 'medium' size.</p>
      </div>
      <div class="modal-actions">
        <button type="button" beam-close>Close</button>
      </div>
    </div>
  ))
}

// Modal with custom size and spacing
export async function demoModalLarge(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  return ctx.modal(render(
    <div>
      <header class="modal-header">
        <h2>Large Modal with Custom Spacing</h2>
        <button type="button" beam-close aria-label="Close" class="modal-close">
          &times;
        </button>
      </header>
      <div class="modal-body">
        <p>This modal uses <code>size: 'large'</code> and <code>spacing: 30</code>.</p>
        <p>The padding is 30px instead of the default 15px.</p>
      </div>
      <div class="modal-actions">
        <button type="button" beam-close>Close</button>
      </div>
    </div>
  ), { size: 'large', spacing: 30 })
}

// Confirm delete modal (replaces old modal handler)
export async function confirmDeleteModal(ctx: BeamContext<Env>, { id, name, target = '#product-list' }: Record<string, unknown>) {
  return ctx.modal(render(
    <div>
      <header class="modal-header">
        <h2>Confirm Delete</h2>
        <button type="button" beam-close aria-label="Close" class="modal-close">
          &times;
        </button>
      </header>
      <div class="modal-body">
        <p>Are you sure you want to delete <strong>"{name}"</strong>?</p>
        <p class="text-muted">This action cannot be undone.</p>
      </div>
      <div class="modal-actions">
        <button type="button" beam-close>Cancel</button>
        <button
          beam-action="deleteProduct"
          beam-params={JSON.stringify({ id })}
          beam-target={target as string}
          beam-close
          class="btn-danger"
        >
          Delete
        </button>
      </div>
    </div>
  ), { size: 'small' })
}

// Drawer with default settings
export async function demoDrawer(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  return ctx.drawer(render(
    <div>
      <header class="drawer-header">
        <h2>Demo Drawer</h2>
        <button type="button" beam-close aria-label="Close" class="drawer-close">
          &times;
        </button>
      </header>
      <div class="drawer-body">
        <p>This drawer was returned directly from an action using <code>ctx.drawer()</code>.</p>
        <p>It uses the default 'right' position, 'medium' size, and 15px padding.</p>
      </div>
      <div class="drawer-actions">
        <button type="button" beam-close>Close</button>
      </div>
    </div>
  ))
}

// Drawer with custom position and size
export async function demoDrawerLeft(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  return ctx.drawer(render(
    <div>
      <header class="drawer-header">
        <h2>Left Drawer</h2>
        <button type="button" beam-close aria-label="Close" class="drawer-close">
          &times;
        </button>
      </header>
      <div class="drawer-body">
        <p>This drawer opens from the left using <code>position: 'left'</code>.</p>
        <p>It also has <code>size: 'large'</code> and <code>spacing: 20</code>.</p>
      </div>
      <div class="drawer-actions">
        <button type="button" beam-close>Close</button>
      </div>
    </div>
  ), { position: 'left', size: 'large', spacing: 20 })
}

// Simple modal with just a string (shorthand)
export function simpleModal(_ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  return { modal: '<div><h2>Quick Message</h2><p>This modal was returned as a simple string.</p><button beam-close>OK</button></div>' }
}

// ============ MULTI-RENDER ARRAY API ============

// Example 1: Multi-render with explicit targets (comma-separated)
export function multiRenderExplicit(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  const time = new Date().toLocaleTimeString()
  return ctx.render(
    [
      <div class="demo-box" style="background: #dcfce7;">Stats updated at {time}</div>,
      <div class="demo-box" style="background: #dbeafe;">Notifications updated at {time}</div>,
      <div class="demo-box" style="background: #fef08a;">Last updated at {time}</div>,
    ],
    { target: '#multi-stats, #multi-notifications, #multi-last-updated' }
  )
}

// Example 2: Multi-render without targets - uses IDs from HTML fragments
export function multiRenderAutoId(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  const time = new Date().toLocaleTimeString()
  return ctx.render([
    <div id="auto-panel-a" class="demo-box" style="background: #e9d5ff;">Panel A: {time}</div>,
    <div id="auto-panel-b" class="demo-box" style="background: #fbcfe8;">Panel B: {time}</div>,
    <div id="auto-panel-c" class="demo-box" style="background: #fecaca;">Panel C: {time}</div>,
  ])
  // No target needed! Client finds #auto-panel-a, #auto-panel-b, #auto-panel-c on page
}

// Example 3: Mixed approach - some explicit targets, some by ID
export function multiRenderMixed(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  const time = new Date().toLocaleTimeString()
  return ctx.render(
    [
      <div class="demo-box" style="background: #bfdbfe;">Header: {time}</div>,
      <div id="mixed-content" class="demo-box" style="background: #bbf7d0;">Content: {time}</div>,
      // Third item has no explicit target and no ID - will be skipped gracefully
      <div class="demo-box">This won't render (no target)</div>,
    ],
    { target: '#mixed-header', script: 'console.log("Mixed multi-render executed!")' }
  )
  // First goes to #mixed-header (explicit), second finds #mixed-content (by ID), third is skipped
}

// Example 4: Dashboard refresh - common real-world use case
let dashboardVisits = 0
let dashboardUsers = 0
let dashboardRevenue = 0
export function refreshDashboard(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  // Simulate data updates
  dashboardVisits += Math.floor(Math.random() * 100)
  dashboardUsers += Math.floor(Math.random() * 10)
  dashboardRevenue += Math.floor(Math.random() * 1000)

  return ctx.render([
    <div id="dashboard-visits" class="stat-card">
      <div class="stat-value">{dashboardVisits.toLocaleString()}</div>
      <div class="stat-label">Total Visits</div>
    </div>,
    <div id="dashboard-users" class="stat-card">
      <div class="stat-value">{dashboardUsers.toLocaleString()}</div>
      <div class="stat-label">Active Users</div>
    </div>,
    <div id="dashboard-revenue" class="stat-card">
      <div class="stat-value">${dashboardRevenue.toLocaleString()}</div>
      <div class="stat-label">Revenue</div>
    </div>,
  ])
}

// Example 5: Exclusion - use !selector to block frontend fallback
export function multiRenderExclusion(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  const time = new Date().toLocaleTimeString()
  // Frontend has beam-target="#exclude-fallback"
  // We return 3 items: first gets explicit target, second is excluded, third uses frontend fallback
  return ctx.render(
    [
      <div class="demo-box" style="background: #dcfce7;">Box 1: {time} (explicit #exclude-a)</div>,
      <div class="demo-box" style="background: #fee2e2;">Box 2: {time} (excluded, won't render)</div>,
      <div class="demo-box" style="background: #dbeafe;">Box 3: {time} (frontend fallback)</div>,
    ],
    { target: '#exclude-a, !#exclude-fallback' }
    // Item 0 → #exclude-a (explicit)
    // Item 1 → skipped (!#exclude-fallback excludes it)
    // Item 2 → #exclude-fallback (frontend fallback, but it's excluded so won't render)
  )
}

// Example 6: Frontend fallback demo - server provides partial targets
export function multiRenderFallback(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  const time = new Date().toLocaleTimeString()
  // Frontend has beam-target="#fallback-target"
  // Server only provides 1 target, remaining items use frontend fallback
  return ctx.render(
    [
      <div class="demo-box" style="background: #fef08a;">First: {time} (server target)</div>,
      <div class="demo-box" style="background: #e9d5ff;">Second: {time} (frontend fallback)</div>,
    ],
    { target: '#fallback-first' }
    // Item 0 → #fallback-first (server)
    // Item 1 → #fallback-target (frontend fallback)
  )
}

// Example 7: Auto-detect by id, beam-id, and beam-item-id
export function multiRenderAutoDetect(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  const time = new Date().toLocaleTimeString()
  // No explicit targets - auto-detects by id, beam-id, beam-item-id on root elements
  return ctx.render([
    <div id="auto-by-id" class="demo-box" style="background: #dcfce7;">By id: {time}</div>,
    <div beam-id="auto-by-beam-id" class="demo-box" style="background: #dbeafe;">By beam-id: {time}</div>,
    <div beam-item-id="auto-by-item-id" class="demo-box" style="background: #fef08a;">By beam-item-id: {time}</div>,
  ])
}

// ============ ASYNC COMPONENT TEST ============

// Async component - simulates fetching data
async function AsyncUserCard({ userId }: { userId: string }) {
  // Simulate async data fetch
  await delay(500)
  const user = { id: userId, name: `User ${userId}`, role: 'Admin' }
  return (
    <div class="demo-box" style="background: #dcfce7;">
      <strong>{user.name}</strong>
      <div style="font-size: 0.875rem; color: #666;">Role: {user.role}</div>
    </div>
  )
}

// Example 8: Async component in single render
// ctx.render() handles async components internally via Promise.resolve().then()
export function testAsyncSingle(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  return ctx.render(<AsyncUserCard userId="42" />, { target: '#async-single-result' })
}

// Example 9: Async components in array render
export function testAsyncArray(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  return ctx.render([
    <AsyncUserCard userId="1" />,
    <AsyncUserCard userId="2" />,
  ], { target: '#async-array-1, #async-array-2' })
}

// Example 10: Mixed sync and async in array
export function testAsyncMixed(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  const time = new Date().toLocaleTimeString()
  return ctx.render([
    <div class="demo-box" style="background: #fef08a;">Sync: {time}</div>,
    <AsyncUserCard userId="99" />,
  ], { target: '#async-mixed-1, #async-mixed-2' })
}
