type DevManifest = {
  version: string
  assets?: string
}

type DevRefreshConfig = {
  manifestUrl: string
  interval: number
}

type BeamDevRefreshGlobal = {
  __BEAM_DISABLE_DEV_REFRESH__?: boolean
}

type BeamRuntimeGlobal = Window & {
  beam?: {
    scan?: (root?: unknown) => void
  }
  beamReactivity?: {
    scan?: (root?: unknown) => void
  }
}

const DEFAULT_MANIFEST_URL = '/__beam_dev.json'
const DEFAULT_INTERVAL = 700

function readConfig(): DevRefreshConfig {
  const script = document.currentScript as HTMLScriptElement | null
  const manifestUrl = script?.dataset.beamManifest || DEFAULT_MANIFEST_URL
  const interval = Number(script?.dataset.beamInterval || DEFAULT_INTERVAL)
  return {
    manifestUrl,
    interval: Number.isFinite(interval) && interval >= 100 ? interval : DEFAULT_INTERVAL,
  }
}

async function fetchManifest(url: string): Promise<DevManifest | null> {
  try {
    const response = await fetch(`${url}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    })
    if (!response.ok) return null
    const manifest = await response.json() as Partial<DevManifest>
    return typeof manifest.version === 'string' ? { version: manifest.version, assets: manifest.assets } : null
  } catch {
    return null
  }
}

function rootSelector(): string {
  const explicit = document.querySelector<HTMLElement>('[beam-dev-refresh-root]')
  if (explicit?.id) return `#${cssEscape(explicit.id)}`
  if (explicit) return '[beam-dev-refresh-root]'
  const boost = document.querySelector<HTMLElement>('[beam-boost]')
  if (boost?.id) return `#${cssEscape(boost.id)}`
  return 'body'
}

function cssEscape(value: string): string {
  return globalThis.CSS?.escape ? globalThis.CSS.escape(value) : value.replace(/[^a-zA-Z0-9_-]/g, '\\$&')
}

async function morphCurrentPage(): Promise<boolean> {
  const selector = rootSelector()
  const response = await fetch(location.href, {
    cache: 'no-store',
    headers: {
      accept: 'text/html',
      'beam-dev-refresh': '1',
    },
  })
  if (!response.ok) return false

  const html = await response.text()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const source = selector === 'body' ? doc.body : doc.querySelector(selector)
  const target = selector === 'body' ? document.body : document.querySelector(selector)
  if (!source || !target) return false

  document.title = doc.title || document.title
  preserveAndSwap(target, source)
  notifyAfterMorph(target)
  return true
}

function preserveAndSwap(target: Element, source: Element): void {
  const active = document.activeElement
  const activeSelector = active instanceof HTMLElement && target.contains(active)
    ? identitySelector(active, target)
    : null
  const selection = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
    ? {
      start: active.selectionStart,
      end: active.selectionEnd,
      direction: active.selectionDirection,
    }
    : null

  morphElement(target, source)

  if (activeSelector) {
    const nextActive = target.querySelector(activeSelector)
    if (nextActive instanceof HTMLElement) {
      nextActive.focus()
      if (selection && (nextActive instanceof HTMLInputElement || nextActive instanceof HTMLTextAreaElement)) {
        try {
          if (typeof selection.start === 'number' && typeof selection.end === 'number') {
            nextActive.setSelectionRange(selection.start, selection.end, selection.direction || undefined)
          }
        } catch {
          // Ignore selection restore errors
        }
      }
    }
  }
}

function morphElement(target: Element, source: Element): void {
  syncAttributes(target, source)

  const sourceChildren = Array.from(source.childNodes)
  const targetChildren = Array.from(target.childNodes)
  const max = Math.max(sourceChildren.length, targetChildren.length)

  for (let index = 0; index < max; index += 1) {
    const sourceChild = sourceChildren[index]
    const targetChild = target.childNodes[index]

    if (!sourceChild && targetChild) {
      targetChild.remove()
      continue
    }
    if (sourceChild && !targetChild) {
      target.appendChild(sourceChild.cloneNode(true))
      continue
    }
    if (!sourceChild || !targetChild) continue

    morphNode(targetChild, sourceChild)
  }
}

function morphNode(target: Node, source: Node): void {
  if (target.nodeType !== source.nodeType) {
    target.parentNode?.replaceChild(source.cloneNode(true), target)
    return
  }

  if (target.nodeType === Node.TEXT_NODE) {
    if (target.textContent !== source.textContent) target.textContent = source.textContent
    return
  }

  if (!(target instanceof Element) || !(source instanceof Element)) {
    if (target.textContent !== source.textContent) target.textContent = source.textContent
    return
  }

  if (target.hasAttribute('beam-keep')) return
  if (target.tagName !== source.tagName || elementKey(target) !== elementKey(source)) {
    target.replaceWith(source.cloneNode(true))
    return
  }

  morphElement(target, source)
}

function syncAttributes(target: Element, source: Element): void {
  for (const attr of Array.from(target.attributes)) {
    if (!source.hasAttribute(attr.name)) target.removeAttribute(attr.name)
  }
  for (const attr of Array.from(source.attributes)) {
    if (target.getAttribute(attr.name) !== attr.value) target.setAttribute(attr.name, attr.value)
  }
}

function elementKey(el: Element): string {
  return el.getAttribute('beam-key')
    || el.getAttribute('beam-id')
    || el.getAttribute('beam-item-id')
    || el.id
    || ''
}

function notifyAfterMorph(root: Element): void {
  const runtime = window as BeamRuntimeGlobal
  const scan = runtime.beam?.scan || runtime.beamReactivity?.scan
  scan?.(root)
  window.dispatchEvent(new CustomEvent('beam:dev-refresh', { detail: { root } }))
}

function identitySelector(el: Element, root: Element): string | null {
  const key = elementKey(el)
  if (key) {
    const attr = el.id ? `#${cssEscape(el.id)}` : `[beam-id="${cssEscape(key)}"], [beam-key="${cssEscape(key)}"], [beam-item-id="${cssEscape(key)}"]`
    try {
      if (root.querySelectorAll(attr).length === 1) return attr
    } catch {
      return null
    }
  }
  return null
}

async function startDevRefresh(): Promise<void> {
  const config = readConfig()
  let current = await fetchManifest(config.manifestUrl)
  if (!current) return

  setInterval(async () => {
    const previous = current
    const next = await fetchManifest(config.manifestUrl)
    if (!next || !previous || next.version === previous.version) return

    const assetsChanged = previous.assets !== next.assets
    current = next

    if (assetsChanged) {
      location.reload()
      return
    }

    try {
      const applied = await morphCurrentPage()
      if (!applied) location.reload()
    } catch {
      location.reload()
    }
  }, config.interval)
}

export const __beamDevRefreshInternals = {
  morphElement,
  preserveAndSwap,
  notifyAfterMorph,
  rootSelector,
  elementKey,
}

if (!(globalThis as BeamDevRefreshGlobal).__BEAM_DISABLE_DEV_REFRESH__) {
  startDevRefresh()
}
