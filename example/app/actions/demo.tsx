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
