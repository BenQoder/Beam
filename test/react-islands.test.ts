import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, useState } from 'react'

import { registerIslands, lazyIsland } from '../src/islands'
import { useBeamAction, useBeamState, useBeamEvent } from '../src/react'
import { beamReactivity } from '../src/reactivity'
import { __beamCreateBeamInternals } from '../src/createBeam'

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

describe('react island mounting', () => {
  it('mounts a registered component with props from beam-props', async () => {
    function Greeting({ name }: { name?: string }) {
      return createElement('span', { className: 'greeting' }, `Hello, ${name}!`)
    }
    registerIslands({ Greeting })

    document.body.innerHTML = `
      <div beam-island="Greeting" beam-props='{"name":"Beam"}'>
        <span class="placeholder">loading…</span>
      </div>
    `

    await until(() => document.querySelector('.greeting') !== null)
    expect(document.querySelector('.greeting')?.textContent).toBe('Hello, Beam!')
    expect(document.querySelector('.placeholder')).toBeNull()
  })

  it('re-renders with new props when beam-props changes (ctx.island path)', async () => {
    function Badge({ count }: { count?: number }) {
      return createElement('span', { className: 'badge' }, String(count ?? 0))
    }
    registerIslands({ Badge })

    document.body.innerHTML = `<div id="host" beam-island="Badge" beam-props='{"count":1}'></div>`
    await until(() => document.querySelector('.badge')?.textContent === '1')

    document.querySelector('#host')!.setAttribute('beam-props', '{"count":7}')
    await until(() => document.querySelector('.badge')?.textContent === '7')
  })

  it('keeps local React state across props updates', async () => {
    function Counter({ label }: { label?: string }) {
      const [n, setN] = useState(0)
      return createElement(
        'div',
        null,
        createElement('span', { className: 'label' }, label ?? ''),
        createElement('button', { className: 'inc', onClick: () => setN(n + 1) }, String(n))
      )
    }
    registerIslands({ Counter })

    document.body.innerHTML = `<div id="c" beam-island="Counter" beam-props='{"label":"v1"}'></div>`
    await until(() => document.querySelector('.label')?.textContent === 'v1')

    const button = document.querySelector<HTMLButtonElement>('.inc')!
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await until(() => document.querySelector('.inc')?.textContent === '1')

    document.querySelector('#c')!.setAttribute('beam-props', '{"label":"v2"}')
    await until(() => document.querySelector('.label')?.textContent === 'v2')
    expect(document.querySelector('.inc')?.textContent).toBe('1')
  })

  it('unmounts the React root when the element is removed', async () => {
    function Ephemeral() {
      return createElement('span', { className: 'ephemeral' }, 'here')
    }
    registerIslands({ Ephemeral })

    document.body.innerHTML = `<div id="wrap"><div beam-island="Ephemeral" beam-props='{}'></div></div>`
    await until(() => document.querySelector('.ephemeral') !== null)

    const host = document.querySelector('[beam-island="Ephemeral"]')!
    document.querySelector('#wrap')!.remove()
    // trigger another mutation so the sweep runs, then give React a beat
    document.body.appendChild(document.createElement('i'))
    await flush()
    await flush()

    expect(host.isConnected).toBe(false)
    // root.unmount() clears the container
    expect(host.childNodes.length).toBe(0)
  })

  it('mounts lazily-registered islands from glob-style path keys', async () => {
    function LazyThing({ msg }: { msg?: string }) {
      return createElement('em', { className: 'lazy-thing' }, msg ?? '')
    }
    registerIslands({
      '/app/islands/LazyThing.tsx': () => Promise.resolve({ default: LazyThing }),
    })

    document.body.innerHTML = `<div beam-island="LazyThing" beam-props='{"msg":"deferred"}'></div>`
    await until(() => document.querySelector('.lazy-thing')?.textContent === 'deferred')
  })

  it('supports lazyIsland() wrappers under plain name keys', async () => {
    function Wrapped() {
      return createElement('b', { className: 'wrapped' }, 'ok')
    }
    registerIslands({ Wrapped: lazyIsland(() => Promise.resolve({ default: Wrapped })) })

    document.body.innerHTML = `<div beam-island="Wrapped"></div>`
    await until(() => document.querySelector('.wrapped') !== null)
  })

  it('warns when an island is not registered', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    document.body.innerHTML = `<div beam-island="NopeNotRegistered"></div>`
    await flush()
    await flush()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('NopeNotRegistered'))
  })
})

describe('useBeamState', () => {
  it('re-renders when the server updates the named state', async () => {
    function CartBadge() {
      const cart = useBeamState('rct_cart', { count: 0 })
      return createElement('span', { className: 'cart-count' }, String(cart.count))
    }
    registerIslands({ CartBadge })

    document.body.innerHTML = `<div beam-island="CartBadge"></div>`
    await until(() => document.querySelector('.cart-count')?.textContent === '0')

    beamReactivity.batch(() => {
      beamReactivity.updateState('rct_cart', { count: 5 })
    })
    await until(() => document.querySelector('.cart-count')?.textContent === '5')
  })

  it('propagates React-side mutations to other subscribers (two-way)', async () => {
    function CartButton() {
      const cart = useBeamState<{ count: number }>('rct_cart2', { count: 0 })
      return createElement(
        'button',
        { className: 'add', onClick: () => { cart.count++ } },
        String(cart.count)
      )
    }
    registerIslands({ CartButton })

    document.body.innerHTML = `<div beam-island="CartButton"></div>`
    await until(() => document.querySelector('.add') !== null)

    const seen: number[] = []
    const dispose = beamReactivity.effect(() => {
      const state = beamReactivity.getState('rct_cart2') as { count: number } | undefined
      if (state) seen.push(state.count)
    })

    document.querySelector<HTMLButtonElement>('.add')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    )
    await until(() => document.querySelector('.add')?.textContent === '1')
    expect(seen).toContain(1)
    dispose()
  })
})

describe('useBeamEvent', () => {
  it('receives server-pushed events', async () => {
    const received: unknown[] = []
    function Listener() {
      useBeamEvent('order:shipped', (data) => received.push(data))
      return createElement('span', { className: 'listener' }, 'listening')
    }
    registerIslands({ Listener })

    document.body.innerHTML = `<div beam-island="Listener"></div>`
    await until(() => document.querySelector('.listener') !== null)
    // let passive effects attach the listener — events before subscription
    // are intentionally dropped, like any event listener
    await flush()
    await flush()

    window.dispatchEvent(
      new CustomEvent('beam:server-event', { detail: { event: 'order:shipped', data: { id: 42 } } })
    )
    window.dispatchEvent(
      new CustomEvent('beam:server-event', { detail: { event: 'other', data: 'ignored' } })
    )
    await flush()

    expect(received).toEqual([{ id: 42 }])
  })
})

describe('useBeamAction', () => {
  it('calls window.beam actions and tracks loading state', async () => {
    let release!: (value: { html?: string }) => void
    const pending = new Promise<{ html?: string }>((resolve) => { release = resolve })
    const actionFn = vi.fn(() => pending)
    ;(window as unknown as { beam: Record<string, unknown> }).beam = { rctSave: actionFn }

    function SaveButton() {
      const { call, loading, data } = useBeamAction('rctSave')
      return createElement(
        'button',
        { className: 'save', onClick: () => { void call({ id: 9 }) } },
        loading ? 'saving' : data ? 'saved' : 'save'
      )
    }
    registerIslands({ SaveButton })

    document.body.innerHTML = `<div beam-island="SaveButton"></div>`
    await until(() => document.querySelector('.save')?.textContent === 'save')

    document.querySelector<HTMLButtonElement>('.save')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    )
    await until(() => document.querySelector('.save')?.textContent === 'saving')
    expect(actionFn).toHaveBeenCalledWith({ id: 9 }, undefined)

    release({ html: '<div>ok</div>' })
    await until(() => document.querySelector('.save')?.textContent === 'saved')
  })

  it('surfaces ctx.json payloads via the json field and the resolved response', async () => {
    const actionFn = vi.fn(async () => ({ json: { items: ['a', 'b'] } }))
    ;(window as unknown as { beam: Record<string, unknown> }).beam = { rctSearch: actionFn }

    let resolved: unknown = null
    function Search() {
      const { call, json } = useBeamAction<{ items: string[] }>('rctSearch')
      return createElement(
        'button',
        {
          className: 'search',
          onClick: () => {
            void call({ q: 'x' }).then((r) => { resolved = r.json })
          },
        },
        json ? json.items.join(',') : 'search'
      )
    }
    registerIslands({ Search })

    document.body.innerHTML = `<div beam-island="Search"></div>`
    await until(() => document.querySelector('.search')?.textContent === 'search')

    document.querySelector<HTMLButtonElement>('.search')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    )
    await until(() => document.querySelector('.search')?.textContent === 'a,b')
    expect(resolved).toEqual({ items: ['a', 'b'] })
  })
})

describe('server context helpers', () => {
  function makeCtx() {
    return __beamCreateBeamInternals.createBeamContext({
      env: {},
      user: null,
      request: new Request('http://localhost/'),
      session: { get: async () => null, set: async () => {}, delete: async () => {} },
    })
  }

  it('ctx.island builds islands responses (single and multi)', () => {
    const ctx = makeCtx()
    expect(ctx.island('chart', { series: [1, 2] })).toEqual({
      islands: { chart: { series: [1, 2] } },
    })
    expect(ctx.island({ a: { x: 1 }, b: { y: 2 } })).toEqual({
      islands: { a: { x: 1 }, b: { y: 2 } },
    })
  })

  it('ctx.event builds event responses', () => {
    const ctx = makeCtx()
    expect(ctx.event('toast', { message: 'hi' })).toEqual({
      event: { name: 'toast', data: { message: 'hi' } },
    })
    expect(ctx.event('ping')).toEqual({ event: { name: 'ping' } })
  })

  it('ctx.island with options builds upsert responses', () => {
    const ctx = makeCtx()
    expect(
      ctx.island('recs', { items: [1] }, { component: 'RecRail', target: '#below-cart', swap: 'append' })
    ).toEqual({
      islandUpserts: {
        recs: { component: 'RecRail', target: '#below-cart', swap: 'append', props: { items: [1] } },
      },
    })
  })

  it('ctx.removeIsland builds removal responses', () => {
    const ctx = makeCtx()
    expect(ctx.removeIsland('recs')).toEqual({ removeIslands: ['recs'] })
    expect(ctx.removeIsland('a', 'b')).toEqual({ removeIslands: ['a', 'b'] })
  })

  it('ctx.json builds plain data responses', () => {
    const ctx = makeCtx()
    expect(ctx.json({ items: [1, 2] })).toEqual({ json: { items: [1, 2] } })
    expect(ctx.json(42)).toEqual({ json: 42 })
    expect(ctx.json(null)).toEqual({ json: null })
  })
})
