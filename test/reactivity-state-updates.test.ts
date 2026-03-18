import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { beamReactivity } from '../src/reactivity'

describe('server-driven named state updates', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('shallow merges object updates into existing named state', async () => {
    document.body.innerHTML = `
      <div beam-state='{"count": 1, "message": "Initial"}' beam-id="persistDemo">
        <span id="count" beam-text="count"></span>
        <span id="message" beam-text="message"></span>
      </div>
      <div id="mirror" beam-state-ref="persistDemo" beam-text="message"></div>
    `

    beamReactivity.init()
    await Promise.resolve()

    beamReactivity.batch(() => {
      beamReactivity.updateState('persistDemo', { message: 'Updated from server' })
    })

    const state = beamReactivity.getState('persistDemo') as Record<string, unknown>
    expect(state.count).toBe(1)
    expect(state.message).toBe('Updated from server')
    expect(document.querySelector('#count')?.textContent).toBe('1')
    expect(document.querySelector('#message')?.textContent).toBe('Updated from server')
    expect(document.querySelector('#mirror')?.textContent).toBe('Updated from server')
  })

  it('replaces simple named state values', async () => {
    document.body.innerHTML = `
      <div beam-state="0" beam-id="clicks">
        <span id="value" beam-text="clicks"></span>
      </div>
      <button id="reset" beam-state-ref="clicks" beam-click="clicks = 0">Reset</button>
    `

    beamReactivity.init()
    await Promise.resolve()

    beamReactivity.batch(() => {
      beamReactivity.updateState('clicks', 12)
    })

    const state = beamReactivity.getState('clicks') as Record<string, unknown>
    expect(state.clicks).toBe(12)
    expect(document.querySelector('#value')?.textContent).toBe('12')
  })

  it('supports updating multiple named states in one batch', async () => {
    document.body.innerHTML = `
      <div beam-state='{"items": 1, "total": 9.99}' beam-id="cart">
        <span id="cart-items" beam-text="items"></span>
      </div>
      <div beam-state="0" beam-id="sharedCount">
        <span id="shared-count" beam-text="sharedCount"></span>
      </div>
      <div id="cart-total" beam-state-ref="cart" beam-text="total.toFixed(2)"></div>
      <div id="shared-mirror" beam-state-ref="sharedCount" beam-text="sharedCount"></div>
    `

    beamReactivity.init()
    await Promise.resolve()

    beamReactivity.batch(() => {
      beamReactivity.updateState('cart', { items: 3, total: 29.99 })
      beamReactivity.updateState('sharedCount', 7)
    })

    const cartState = beamReactivity.getState('cart') as Record<string, unknown>
    const sharedState = beamReactivity.getState('sharedCount') as Record<string, unknown>
    expect(document.querySelector('#cart-items')?.textContent).toBe('3')
    expect(cartState.total).toBe(29.99)
    expect(document.querySelector('#shared-count')?.textContent).toBe('7')
    expect(sharedState.sharedCount).toBe(7)
  })

  it('warns and skips when a named state is missing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const updated = beamReactivity.updateState('missing-state', { value: 1 })

    expect(updated).toBe(false)
    expect(warn).toHaveBeenCalledWith('[beam] State "missing-state" not found on page, skipping state update')
  })
})
