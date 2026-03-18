import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { beamReactivity } from '../src/reactivity'

describe('reactivity directives', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('updates beam-text, beam-show, beam-class, and beam-attr bindings', async () => {
    document.body.innerHTML = `
      <div beam-state="count: 0; open: false; disabled: true">
        <span id="text" beam-text="count"></span>
        <div id="panel" beam-show="open">Panel</div>
        <button id="button" beam-class="active: open" beam-attr-disabled="disabled"></button>
        <button id="inc" beam-click="count++; open = true; disabled = false"></button>
      </div>
    `

    beamReactivity.init()
    await Promise.resolve()

    document.querySelector<HTMLElement>('#inc')?.click()
    await Promise.resolve()

    expect(document.querySelector('#text')?.textContent).toBe('1')
    expect((document.querySelector('#panel') as HTMLElement).style.display).toBe('')
    expect(document.querySelector('#button')?.classList.contains('active')).toBe(true)
    expect(document.querySelector('#button')?.hasAttribute('disabled')).toBe(false)
  })

  it('supports beam-model and beam-state-toggle', async () => {
    document.body.innerHTML = `
      <div beam-state="count: 0; open: false">
        <input id="input" beam-model="count" type="number" />
        <span id="text" beam-text="count"></span>
        <button id="toggle" beam-state-toggle="open" aria-expanded="false"></button>
        <div id="panel" beam-show="open">Panel</div>
      </div>
    `

    beamReactivity.init()
    await Promise.resolve()

    const input = document.querySelector<HTMLInputElement>('#input')!
    input.value = '7'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    document.querySelector<HTMLElement>('#toggle')?.click()
    await Promise.resolve()

    expect(document.querySelector('#text')?.textContent).toBe('7')
    expect((document.querySelector('#toggle') as HTMLElement).getAttribute('aria-pressed')).toBe('true')
    expect((document.querySelector('#toggle') as HTMLElement).getAttribute('aria-expanded')).toBe('true')
    expect((document.querySelector('#panel') as HTMLElement).style.display).toBe('')
  })

  it('runs beam-init and exposes named state via beam-state-ref', async () => {
    document.body.innerHTML = `
      <div beam-state="count: 1; doubled: 0" beam-id="counter" beam-init="doubled = count * 2" beam-cloak>
        <span id="local" beam-text="doubled"></span>
      </div>
      <span id="remote" beam-state-ref="counter" beam-text="doubled"></span>
    `

    beamReactivity.init()
    await Promise.resolve()
    await Promise.resolve()

    expect(document.querySelector('#local')?.textContent).toBe('2')
    expect(document.querySelector('#remote')?.textContent).toBe('2')
    expect(document.querySelector('[beam-id="counter"]')?.hasAttribute('beam-cloak')).toBe(false)
  })
})
