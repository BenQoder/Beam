import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  behaviorsSettled,
  defineBehavior,
  notifyBehaviorContentChanged,
  registerBehaviors,
  scanBehaviors,
} from '../src/behaviors'
import { beamReactivity } from '../src/reactivity'

describe('behavior runtime', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(async () => {
    document.body.innerHTML = ''
    await behaviorsSettled(document)
    vi.restoreAllMocks()
  })

  it('mounts initial and later roots exactly once', async () => {
    const mounts: string[] = []
    document.body.innerHTML = '<div id="first" beam-behavior="mount-once@1"></div>'

    registerBehaviors({
      'mount-once@1': defineBehavior((ctx) => {
        mounts.push(ctx.root.id)
      }),
    })
    await behaviorsSettled(document)

    const later = document.createElement('div')
    later.id = 'later'
    later.setAttribute('beam-behavior', 'mount-once@1')
    document.body.appendChild(later)
    scanBehaviors(document)
    scanBehaviors(document)
    await behaviorsSettled(document)

    expect(mounts).toEqual(['first', 'later'])
    expect(later.getAttribute('data-beam-behavior-status')).toBe('mounted')
  })

  it('isolates private state and owns effects and listeners', async () => {
    registerBehaviors({
      'counter-private@1': defineBehavior((ctx) => {
        const state = ctx.reactive({ count: 0 })
        const output = ctx.root.querySelector('[data-count]')!
        ctx.effect(() => {
          output.textContent = String(state.count)
        })
        ctx.on(ctx.root, 'click', () => {
          state.count += 1
        })
      }),
    })
    document.body.innerHTML = `
      <button id="one" beam-behavior="counter-private@1"><span data-count></span></button>
      <button id="two" beam-behavior="counter-private@1"><span data-count></span></button>
    `
    await behaviorsSettled(document)

    document.querySelector<HTMLElement>('#one')!.click()
    await Promise.resolve()

    expect(document.querySelector('#one [data-count]')?.textContent).toBe('1')
    expect(document.querySelector('#two [data-count]')?.textContent).toBe('0')
  })

  it('parses props before updates and preserves the last valid props', async () => {
    const seen: string[] = []
    const errors: string[] = []
    document.addEventListener('beam:behavior-error', ((event: CustomEvent) => {
      errors.push(event.detail.phase)
    }) as EventListener)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    registerBehaviors({
      'props-order@1': defineBehavior<{ value: number }>((ctx) => ({
        update(change) {
          seen.push(`${change.kind}:${ctx.props.value}`)
        },
      })),
    })
    const root = document.createElement('div')
    root.setAttribute('beam-behavior', 'props-order@1')
    root.setAttribute('beam-behavior-props', '{"value":1}')
    document.body.appendChild(root)
    await behaviorsSettled(root)

    root.setAttribute('beam-behavior-props', '{"value":2}')
    notifyBehaviorContentChanged(root)
    await behaviorsSettled(root)
    expect(seen).toEqual(['props:2', 'content:2'])

    root.setAttribute('beam-behavior-props', '{bad json')
    await behaviorsSettled(root)
    notifyBehaviorContentChanged(root)
    await behaviorsSettled(root)

    expect(errors).toContain('props update')
    expect(seen.at(-1)).toBe('content:2')
  })

  it('serializes asynchronous updates without dropping later changes', async () => {
    let releaseProps!: () => void
    const propsGate = new Promise<void>((resolve) => { releaseProps = resolve })
    const order: string[] = []

    registerBehaviors({
      'serialized-updates@1': defineBehavior((ctx) => ({
        async update(change) {
          order.push(`start:${change.kind}`)
          if (change.kind === 'props') await propsGate
          order.push(`end:${change.kind}`)
        },
      })),
    })
    const root = document.createElement('div')
    root.setAttribute('beam-behavior', 'serialized-updates@1')
    document.body.appendChild(root)
    await behaviorsSettled(root)

    root.setAttribute('beam-behavior-props', '{"version":2}')
    await Promise.resolve()
    await Promise.resolve()
    expect(order).toEqual(['start:props'])

    notifyBehaviorContentChanged(root)
    releaseProps()
    await behaviorsSettled(root)

    expect(order).toEqual([
      'start:props',
      'end:props',
      'start:content',
      'end:content',
    ])
  })

  it('waits for asynchronous mount and cancels it when the root disappears', async () => {
    let finishMount!: () => void
    const gate = new Promise<void>((resolve) => { finishMount = resolve })
    const lateCleanup = vi.fn()
    const lateEffect = vi.fn()
    const lateListener = vi.fn()

    registerBehaviors({
      'async-abort@1': defineBehavior(async (ctx) => {
        await gate
        ctx.effect(lateEffect)
        ctx.on(window, 'late-behavior-event', lateListener as EventListener)
        ctx.cleanup(lateCleanup)
      }),
    })
    const root = document.createElement('div')
    root.setAttribute('beam-behavior', 'async-abort@1')
    document.body.appendChild(root)
    scanBehaviors(document)

    let settled = false
    const beforeRemoval = behaviorsSettled(root).then(() => { settled = true })
    await Promise.resolve()
    expect(settled).toBe(false)

    root.remove()
    await behaviorsSettled(document)
    expect(root.querySelector('[data-never]')).toBeNull()

    finishMount()
    await beforeRemoval
    await Promise.resolve()
    await Promise.resolve()
    expect(lateCleanup).toHaveBeenCalledOnce()
    expect(lateEffect).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('late-behavior-event'))
    expect(lateListener).not.toHaveBeenCalled()
  })

  it('preserves a synchronously reinserted root and cleans up once on removal', async () => {
    const cleanup = vi.fn()
    let mounts = 0
    registerBehaviors({
      'preserved-root@1': defineBehavior((ctx) => {
        mounts += 1
        ctx.cleanup(cleanup)
      }),
    })
    const root = document.createElement('div')
    root.setAttribute('beam-behavior', 'preserved-root@1')
    document.body.appendChild(root)
    await behaviorsSettled(document)

    root.remove()
    document.body.appendChild(root)
    await behaviorsSettled(document)
    expect(mounts).toBe(1)
    expect(cleanup).not.toHaveBeenCalled()

    root.remove()
    await behaviorsSettled(document)
    await behaviorsSettled(document)
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('isolates failures and does not infer content updates from behavior DOM writes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let healthyMounts = 0
    let inferredUpdates = 0

    registerBehaviors({
      'throws@1': defineBehavior(() => {
        throw new Error('mount failed')
      }),
      'healthy@1': defineBehavior((ctx) => {
        healthyMounts += 1
        const state = ctx.reactive({ label: 'ready' })
        ctx.effect(() => {
          ctx.root.textContent = state.label
        })
        return {
          update() {
            inferredUpdates += 1
          },
        }
      }),
    })
    document.body.innerHTML = `
      <div id="bad" beam-behavior="throws@1"></div>
      <div id="good" beam-behavior="healthy@1"></div>
    `
    await behaviorsSettled(document)
    await Promise.resolve()

    expect(document.querySelector('#bad')?.getAttribute('data-beam-behavior-status')).toBe('error')
    expect(document.querySelector('#good')?.textContent).toBe('ready')
    expect(healthyMounts).toBe(1)
    expect(inferredUpdates).toBe(0)
  })

  it('mounts nested behaviors independently but reserves React island subtrees', async () => {
    const mountedIds: string[] = []
    registerBehaviors({
      'nested-owned@1': defineBehavior((ctx) => {
        mountedIds.push(ctx.root.id)
      }),
    })
    document.body.innerHTML = `
      <section id="outer" beam-behavior="nested-owned@1">
        <div id="inner" beam-behavior="nested-owned@1"></div>
        <div beam-island="Example">
          <div id="island-child" beam-behavior="nested-owned@1"></div>
        </div>
      </section>
    `
    await behaviorsSettled(document)

    expect(mountedIds).toEqual(['outer', 'inner'])
    expect(document.querySelector('#island-child')?.hasAttribute('data-beam-behavior-status')).toBe(false)
  })

  it('reruns effects when a previously missing named state is created', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    registerBehaviors({
      'late-state@1': defineBehavior((ctx) => {
        ctx.effect(() => {
          const state = ctx.getState('lateBehaviorState') as { value: string } | undefined
          ctx.root.textContent = state?.value ?? 'missing'
        })
      }),
    })
    const root = document.createElement('div')
    root.setAttribute('beam-behavior', 'late-state@1')
    document.body.appendChild(root)
    await behaviorsSettled(document)
    expect(root.textContent).toBe('missing')

    const stateRoot = document.createElement('div')
    stateRoot.setAttribute('beam-id', 'lateBehaviorState')
    stateRoot.setAttribute('beam-state', '{"value":"available"}')
    document.body.appendChild(stateRoot)
    beamReactivity.scan(stateRoot)
    await Promise.resolve()

    expect(root.textContent).toBe('available')
  })
})
