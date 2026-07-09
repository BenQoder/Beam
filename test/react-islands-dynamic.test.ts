import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, useState } from 'react'

import { allowIslandSources, registerIslands, __beamIslandsInternals } from '../src/islands'
import { beamIslandImportMap, ISLAND_SHARED_MODULES } from '../src/island'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

async function until(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition')
    }
    await flush()
  }
}

function RemoteWidget({ label }: { label?: string }) {
  const [n, setN] = useState(0)
  return createElement(
    'button',
    { className: 'remote-widget', onClick: () => setN(n + 1) },
    `${label ?? 'remote'}:${n}`
  )
}

beforeEach(() => {
  document.body.innerHTML = ''
  document.head.querySelectorAll('meta[name="beam-island-sources"]').forEach((m) => m.remove())
  __beamIslandsInternals.resetDynamicSources()
})

afterEach(async () => {
  document.body.innerHTML = ''
  await flush()
  vi.restoreAllMocks()
})

describe('dynamic island sources (beam-island-src)', () => {
  it('loads and mounts a component from an allowed source URL', async () => {
    const importer = vi.fn(async () => ({ default: RemoteWidget }))
    __beamIslandsInternals.setRemoteImporter(importer)
    allowIslandSources(['/islands/'])

    document.body.innerHTML = `
      <div beam-island="RemoteWidget" beam-island-src="/islands/RemoteWidget.js" beam-props='{"label":"dyn"}'>
        <span class="ph">loading…</span>
      </div>
    `

    await until(() => document.querySelector('.remote-widget')?.textContent === 'dyn:0')
    expect(importer).toHaveBeenCalledTimes(1)
    // resolved to an absolute URL before importing
    expect(importer).toHaveBeenCalledWith(expect.stringMatching(/^https?:\/\/.+\/islands\/RemoteWidget\.js$/))
    expect(document.querySelector('.ph')).toBeNull()
  })

  it('refuses sources outside the allowlist without importing', async () => {
    const importer = vi.fn(async () => ({ default: RemoteWidget }))
    __beamIslandsInternals.setRemoteImporter(importer)
    allowIslandSources(['/islands/'])
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    document.body.innerHTML = `
      <div beam-island="Evil" beam-island-src="https://evil.example.com/x.js"></div>
      <div beam-island="Sneaky" beam-island-src="/other/path.js"></div>
    `
    await flush()
    await flush()

    expect(importer).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith(expect.stringContaining('evil.example.com'))
    expect(error).toHaveBeenCalledWith(expect.stringContaining('/other/path.js'))
  })

  it('rejects sibling-path bypasses of a path prefix (segment-boundary match)', async () => {
    const importer = vi.fn(async () => ({ default: RemoteWidget }))
    __beamIslandsInternals.setRemoteImporter(importer)
    // prefix WITHOUT a trailing slash — the classic startsWith footgun
    allowIslandSources(['/islands'])
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    document.body.innerHTML = `
      <div beam-island="Evil1" beam-island-src="/islands-evil/x.js"></div>
      <div beam-island="Evil2" beam-island-src="/islandsX.js"></div>
      <div beam-island="Good" beam-island-src="/islands/ok.js" beam-props='{"label":"ok"}'></div>
    `
    await until(() => document.querySelector('.remote-widget')?.textContent === 'ok:0')

    // only the genuine descendant loaded; siblings refused
    expect(importer).toHaveBeenCalledTimes(1)
    expect(importer).toHaveBeenCalledWith(expect.stringMatching(/\/islands\/ok\.js$/))
    expect(error).toHaveBeenCalledWith(expect.stringContaining('/islands-evil/x.js'))
    expect(error).toHaveBeenCalledWith(expect.stringContaining('/islandsX.js'))
  })

  it('rejects a cross-origin subdomain lookalike', async () => {
    const importer = vi.fn(async () => ({ default: RemoteWidget }))
    __beamIslandsInternals.setRemoteImporter(importer)
    allowIslandSources(['https://cdn.example.com'])
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    document.body.innerHTML = `
      <div beam-island="Look" beam-island-src="https://cdn.example.com.evil.com/x.js"></div>
    `
    await flush()
    await flush()
    expect(importer).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith(expect.stringContaining('cdn.example.com.evil.com'))
  })

  it('refuses all sources when no allowlist is configured (secure default)', async () => {
    const importer = vi.fn(async () => ({ default: RemoteWidget }))
    __beamIslandsInternals.setRemoteImporter(importer)
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    document.body.innerHTML = `<div beam-island="W" beam-island-src="/islands/W.js"></div>`
    await flush()
    await flush()

    expect(importer).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalled()
  })

  it('reads allowed prefixes from the beam-island-sources meta tag', async () => {
    const importer = vi.fn(async () => ({ default: RemoteWidget }))
    __beamIslandsInternals.setRemoteImporter(importer)

    const meta = document.createElement('meta')
    meta.setAttribute('name', 'beam-island-sources')
    meta.setAttribute('content', '/plugins/, /islands/')
    document.head.appendChild(meta)

    document.body.innerHTML = `<div beam-island="MetaWidget" beam-island-src="/plugins/MetaWidget.js"></div>`
    await until(() => document.querySelector('.remote-widget') !== null)
    expect(importer).toHaveBeenCalledTimes(1)
  })

  it('caches remote modules by URL across multiple islands', async () => {
    const importer = vi.fn(async () => ({ default: RemoteWidget }))
    __beamIslandsInternals.setRemoteImporter(importer)
    allowIslandSources(['/islands/'])

    document.body.innerHTML = `
      <div beam-island="A" beam-island-src="/islands/shared.js" beam-props='{"label":"a"}'></div>
      <div beam-island="B" beam-island-src="/islands/shared.js" beam-props='{"label":"b"}'></div>
    `
    await until(() => document.querySelectorAll('.remote-widget').length === 2)
    expect(importer).toHaveBeenCalledTimes(1)
  })

  it('lets beam-island-src win over a registered component of the same name', async () => {
    function Registered() {
      return createElement('span', { className: 'registered' }, 'registered version')
    }
    registerIslands({ Overridable: Registered })

    const importer = vi.fn(async () => ({ default: RemoteWidget }))
    __beamIslandsInternals.setRemoteImporter(importer)
    allowIslandSources(['/islands/'])

    document.body.innerHTML = `
      <div beam-island="Overridable" beam-island-src="/islands/override.js" beam-props='{"label":"src-wins"}'></div>
    `
    await until(() => document.querySelector('.remote-widget')?.textContent === 'src-wins:0')
    expect(document.querySelector('.registered')).toBeNull()
    expect(importer).toHaveBeenCalledTimes(1)
  })

  it('supports server-driven props updates on dynamic islands', async () => {
    const importer = vi.fn(async () => ({ default: RemoteWidget }))
    __beamIslandsInternals.setRemoteImporter(importer)
    allowIslandSources(['/islands/'])

    document.body.innerHTML = `
      <div id="dyn" beam-island="RW" beam-island-src="/islands/rw.js" beam-props='{"label":"v1"}'></div>
    `
    await until(() => document.querySelector('.remote-widget')?.textContent === 'v1:0')

    document.querySelector('#dyn')!.setAttribute('beam-props', '{"label":"v2"}')
    await until(() => document.querySelector('.remote-widget')?.textContent === 'v2:0')
  })
})

describe('beamIslandImportMap', () => {
  it('emits an import map covering every shared module', () => {
    const tag = beamIslandImportMap()
    expect(tag).toMatch(/^<script type="importmap">/)
    const json = JSON.parse(tag.replace('<script type="importmap">', '').replace('</script>', ''))
    for (const [specifier, file] of Object.entries(ISLAND_SHARED_MODULES)) {
      expect(json.imports[specifier]).toBe(`/static/beam-shared/${file}`)
    }
  })

  it('respects a custom base', () => {
    const tag = beamIslandImportMap('/assets/shared/')
    expect(tag).toContain('"react":"/assets/shared/react.js"')
  })

  it('accepts an options object with base', () => {
    const tag = beamIslandImportMap({ base: '/cdn/shared/' })
    expect(tag).toContain('"react":"/cdn/shared/react.js"')
  })

  it('merges extra entries (the shared-UI registry trick)', () => {
    const tag = beamIslandImportMap({
      extra: {
        '@ui/button': '/islands/ui/button@f3a9.js',
        '@ui/badge': '/islands/ui/badge@77aa.js',
      },
    })
    const json = JSON.parse(tag.replace('<script type="importmap">', '').replace('</script>', ''))
    expect(json.imports['@ui/button']).toBe('/islands/ui/button@f3a9.js')
    expect(json.imports['@ui/badge']).toBe('/islands/ui/badge@77aa.js')
    expect(json.imports['react']).toBe('/static/beam-shared/react.js')
  })

  it('lets extra entries win on conflict', () => {
    const tag = beamIslandImportMap({ extra: { react: 'https://cdn.example.com/react.js' } })
    expect(tag).toContain('"react":"https://cdn.example.com/react.js"')
  })
})
