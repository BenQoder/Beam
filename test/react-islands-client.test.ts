import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, useState } from 'react'

// client.ts connects over capnweb at module scope helpers — mock it out
vi.mock('capnweb', () => ({
  newWebSocketRpcSession: vi.fn(() => ({
    authenticate: vi.fn(async () => ({
      registerCallback: vi.fn(async () => {}),
      visit: vi.fn(),
      call: vi.fn(),
    })),
  })),
}))

import { registerIslands } from '../src/islands'

class FakeIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// client.ts touches browser APIs jsdom lacks at module scope — stub them
// before importing it (dynamically, so the stubs are in place first).
let __beamClientInternals: typeof import('../src/client')['__beamClientInternals']

beforeAll(async () => {
  ;(globalThis as any).__BEAM_DISABLE_AUTO_CONNECT__ = true
  ;(globalThis as any).IntersectionObserver = FakeIntersectionObserver
  ;(window as any).scrollTo = vi.fn()
  ;(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
    cb(0)
    return 1
  }
  __beamClientInternals = (await import('../src/client')).__beamClientInternals
})

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

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(async () => {
  document.body.innerHTML = ''
  await flush()
  vi.restoreAllMocks()
})

function StatefulLabel({ label }: { label?: string }) {
  const [n, setN] = useState(0)
  return createElement(
    'div',
    null,
    createElement('span', { className: 'label' }, label ?? ''),
    createElement('button', { className: 'inc', onClick: () => setN(n + 1) }, String(n))
  )
}

describe('islands across beam swaps', () => {
  it('preserves the mounted island (and its React state) and adopts fresh props', async () => {
    registerIslands({ StatefulLabel })

    document.body.innerHTML = `
      <div id="zone">
        <div beam-island="StatefulLabel" beam-id="swapDemo" beam-props='{"label":"v1"}'></div>
      </div>
    `
    await until(() => document.querySelector('.label')?.textContent === 'v1')

    const before = document.querySelector('[beam-island="StatefulLabel"]')!
    document.querySelector<HTMLButtonElement>('.inc')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    )
    await until(() => document.querySelector('.inc')?.textContent === '1')

    // Server re-renders the whole zone with new island props
    __beamClientInternals.swap(
      document.querySelector('#zone')!,
      `<p class="around">fresh server content</p>
       <div beam-island="StatefulLabel" beam-id="swapDemo" beam-props='{"label":"v2"}'></div>`,
      'replace'
    )

    await until(() => document.querySelector('.label')?.textContent === 'v2')
    const after = document.querySelector('[beam-island="StatefulLabel"]')!
    expect(after).toBe(before) // same element instance — root survived
    expect(document.querySelector('.inc')?.textContent).toBe('1') // React state kept
    expect(document.querySelector('.around')).not.toBeNull()
  })

  it('remounts fresh when beam-island-remount is set', async () => {
    registerIslands({ StatefulLabel })

    document.body.innerHTML = `
      <div id="zone2">
        <div beam-island="StatefulLabel" beam-id="remountDemo" beam-island-remount beam-props='{"label":"a"}'></div>
      </div>
    `
    await until(() => document.querySelector('#zone2 .label')?.textContent === 'a')
    const before = document.querySelector('#zone2 [beam-island]')!

    document.querySelector<HTMLButtonElement>('#zone2 .inc')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    )
    await until(() => document.querySelector('#zone2 .inc')?.textContent === '1')

    __beamClientInternals.swap(
      document.querySelector('#zone2')!,
      `<div beam-island="StatefulLabel" beam-id="remountDemo" beam-island-remount beam-props='{"label":"b"}'></div>`,
      'replace'
    )

    await until(() => document.querySelector('#zone2 .label')?.textContent === 'b')
    const after = document.querySelector('#zone2 [beam-island]')!
    expect(after).not.toBe(before)
    expect(document.querySelector('#zone2 .inc')?.textContent).toBe('0') // state reset
  })
})

describe('applyResponse island + event handling', () => {
  it('applies ctx.island() responses to mounted islands', async () => {
    registerIslands({ StatefulLabel })

    document.body.innerHTML = `
      <div beam-island="StatefulLabel" beam-id="pushDemo" beam-props='{"label":"before"}'></div>
    `
    await until(() => document.querySelector('.label')?.textContent === 'before')

    __beamClientInternals.applyResponse(
      { islands: { pushDemo: { label: 'after' } } },
      null,
      'replace'
    )

    await until(() => document.querySelector('.label')?.textContent === 'after')
  })

  it('warns when the island id is unknown', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    __beamClientInternals.applyResponse(
      { islands: { ghost: { a: 1 } } },
      null,
      'replace'
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('ghost'))
  })

  it('mounts islands arriving inside action HTML responses (targets and modals)', async () => {
    registerIslands({ StatefulLabel })

    // HTML response into a target — e.g. ctx.render(<Island .../>, { target: '#panel' })
    document.body.innerHTML = `<div id="panel"></div>`
    __beamClientInternals.applyResponse(
      {
        html: `<div beam-island="StatefulLabel" beam-id="fromAction" beam-props='{"label":"from action"}'></div>`,
        target: '#panel',
      },
      null,
      'replace'
    )
    await until(() => document.querySelector('#panel .label')?.textContent === 'from action')

    // Modal response — e.g. ctx.modal(<Island .../>)
    __beamClientInternals.applyResponse(
      {
        modal: {
          html: `<div beam-island="StatefulLabel" beam-id="fromModal" beam-props='{"label":"in modal"}'></div>`,
        },
      },
      null,
      'replace'
    )
    await until(() =>
      Array.from(document.querySelectorAll('.label')).some((el) => el.textContent === 'in modal')
    )
  })

  it('creates islands via upserts and removes them via removeIslands', async () => {
    registerIslands({ StatefulLabel })
    document.body.innerHTML = `<div id="spawn-zone"><p class="existing">content</p></div>`

    // create (append)
    __beamClientInternals.applyResponse(
      {
        islandUpserts: {
          spawned: {
            component: 'StatefulLabel',
            target: '#spawn-zone',
            props: { label: 'spawned!' },
          },
        },
      },
      null,
      'replace'
    )
    await until(() => document.querySelector('#spawn-zone .label')?.textContent === 'spawned!')
    const created = document.querySelector('[beam-id="spawned"]')!
    expect(created.getAttribute('beam-island')).toBe('StatefulLabel')
    expect(document.querySelector('#spawn-zone .existing')).not.toBeNull() // append kept content

    // upsert again → props update on the same element, no recreate
    __beamClientInternals.applyResponse(
      { islandUpserts: { spawned: { props: { label: 'updated!' } } } },
      null,
      'replace'
    )
    await until(() => document.querySelector('#spawn-zone .label')?.textContent === 'updated!')
    expect(document.querySelector('[beam-id="spawned"]')).toBe(created)

    // remove
    __beamClientInternals.applyResponse({ removeIslands: ['spawned'] }, null, 'replace')
    await until(() => document.querySelector('[beam-id="spawned"]') === null)
    expect(document.querySelector('#spawn-zone .existing')).not.toBeNull()
  })

  it('upsert with swap replace clears the target first', async () => {
    registerIslands({ StatefulLabel })
    document.body.innerHTML = `<div id="rep-zone"><p class="old">old stuff</p></div>`

    __beamClientInternals.applyResponse(
      {
        islandUpserts: {
          replacer: {
            component: 'StatefulLabel',
            target: '#rep-zone',
            swap: 'replace',
            props: { label: 'took over' },
          },
        },
      },
      null,
      'replace'
    )
    await until(() => document.querySelector('#rep-zone .label')?.textContent === 'took over')
    expect(document.querySelector('#rep-zone .old')).toBeNull()
  })

  it('skips upserts with missing target or component, with warnings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    __beamClientInternals.applyResponse(
      {
        islandUpserts: {
          noTarget: { component: 'StatefulLabel', props: {} },
          noComp: { target: 'body', props: {} },
          ghostTarget: { component: 'StatefulLabel', target: '#nope', props: {} },
        },
      },
      null,
      'replace'
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('noTarget'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('noComp'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('ghostTarget'))
  })

  it('dispatches ctx.event() responses as beam:server-event', () => {
    const received: unknown[] = []
    const listener = (e: Event) => received.push((e as CustomEvent).detail)
    window.addEventListener('beam:server-event', listener)

    __beamClientInternals.applyResponse(
      { event: { name: 'order:shipped', data: { id: 7 } } },
      null,
      'replace'
    )

    window.removeEventListener('beam:server-event', listener)
    expect(received).toEqual([{ event: 'order:shipped', data: { id: 7 } }])
  })
})
