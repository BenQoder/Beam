import { beamReactivity, createReactiveState } from './reactivity'

export type BehaviorUpdateKind = 'props' | 'content'

export interface BehaviorUpdate {
  readonly kind: BehaviorUpdateKind
}

export interface BehaviorInstance {
  update?(change: BehaviorUpdate): void | Promise<void>
}

export interface BehaviorContext<Props> {
  readonly root: HTMLElement
  readonly props: Props
  readonly signal: AbortSignal

  reactive<T extends object>(initial: T): T
  effect(fn: () => void): void
  on(
    target: EventTarget,
    event: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ): void
  cleanup(fn: () => void | Promise<void>): void

  getState(id: string): object | undefined
}

export type Behavior<Props = Record<string, unknown>> = (
  context: BehaviorContext<Props>,
) => void | BehaviorInstance | Promise<void | BehaviorInstance>

export interface BehaviorCapabilities {
  readonly actions?: readonly string[]
  readonly readsState?: readonly string[]
  readonly writesState?: readonly string[]
  readonly roles?: readonly string[]
}

export interface BehaviorDefinition<Props = Record<string, unknown>> {
  readonly mount: Behavior<Props>
  readonly parseProps?: (value: string | null, root: HTMLElement) => Props
  readonly capabilities?: BehaviorCapabilities
}

type AnyBehaviorDefinition = BehaviorDefinition<any>

interface CleanupRecord {
  called: boolean
  fn: () => void | Promise<void>
}

interface MountedBehavior {
  root: HTMLElement
  name: string
  definition: AnyBehaviorDefinition
  props: unknown
  controller: AbortController
  cleanups: CleanupRecord[]
  settleScopes: Set<Node>
  missingStateWarnings: Set<string>
  instance?: BehaviorInstance
  state: 'mounting' | 'mounted' | 'failed' | 'destroyed'
  mountTask: Promise<void>
  pendingUpdates: Set<BehaviorUpdateKind>
  updateWorkerRunning: boolean
}

interface TrackedTask {
  entry?: MountedBehavior
  promise: Promise<void>
}

const registrations = new Map<string, AnyBehaviorDefinition>()
const mounted = new Map<HTMLElement, MountedBehavior>()
const destroyingRoots = new WeakSet<HTMLElement>()
const propParseFailures = new WeakMap<HTMLElement, { name: string; value: string | null }>()
const warnedMissingRegistrations = new Set<string>()
const trackedTasks = new Set<TrackedTask>()
let observer: MutationObserver | undefined
let reconcileScheduled = false

const ABORTED = Symbol('behavior-aborted')

function asDefinition<Props>(
  behavior: Behavior<Props> | BehaviorDefinition<Props>,
): BehaviorDefinition<Props> {
  return typeof behavior === 'function' ? { mount: behavior } : behavior
}

export function defineBehavior<Props = Record<string, unknown>>(
  behavior: Behavior<Props>,
): BehaviorDefinition<Props>
export function defineBehavior<Props = Record<string, unknown>>(
  behavior: BehaviorDefinition<Props>,
): BehaviorDefinition<Props>
export function defineBehavior<Props = Record<string, unknown>>(
  behavior: Behavior<Props> | BehaviorDefinition<Props>,
): BehaviorDefinition<Props> {
  return asDefinition(behavior)
}

function track(promise: Promise<void>, entry?: MountedBehavior): Promise<void> {
  const task: TrackedTask = { entry, promise }
  trackedTasks.add(task)
  void promise.then(
    () => trackedTasks.delete(task),
    () => trackedTasks.delete(task),
  )
  return promise
}

function reportError(
  root: HTMLElement,
  name: string,
  phase: string,
  error: unknown,
): void {
  console.error(`[beam] Behavior "${name}" failed during ${phase}`, error)
  root.dispatchEvent(new CustomEvent('beam:behavior-error', {
    bubbles: true,
    detail: { root, name, phase, error },
  }))
}

function defaultParseProps(value: string | null): Record<string, unknown> {
  if (value === null || value.trim() === '') return {}
  const parsed: unknown = JSON.parse(value)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('beam-behavior-props must contain a JSON object')
  }
  return parsed as Record<string, unknown>
}

function parseProps(root: HTMLElement, definition: AnyBehaviorDefinition): unknown {
  const value = root.getAttribute('beam-behavior-props')
  return definition.parseProps
    ? definition.parseProps(value, root)
    : defaultParseProps(value)
}

function clonePrivateState<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (value === null || typeof value !== 'object') return value
  const cached = seen.get(value)
  if (cached) return cached as T

  if (Array.isArray(value)) {
    const copy: unknown[] = []
    seen.set(value, copy)
    for (const item of value) copy.push(clonePrivateState(item, seen))
    return copy as T
  }

  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) return value

  const copy: Record<string, unknown> = {}
  seen.set(value, copy)
  for (const [key, item] of Object.entries(value)) {
    copy[key] = clonePrivateState(item, seen)
  }
  return copy as T
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return value !== null
    && (typeof value === 'object' || typeof value === 'function')
    && typeof (value as PromiseLike<unknown>).then === 'function'
}

async function abortable<T>(
  value: T | PromiseLike<T>,
  signal: AbortSignal,
): Promise<T | typeof ABORTED> {
  if (signal.aborted) return ABORTED

  const outcome = Promise.resolve(value).then(
    (result) => ({ result } as const),
    (error) => ({ error } as const),
  )
  let resolveAbort!: (value: typeof ABORTED) => void
  const aborted = new Promise<typeof ABORTED>((resolve) => { resolveAbort = resolve })
  const onAbort = () => resolveAbort(ABORTED)
  signal.addEventListener('abort', onAbort, { once: true })
  const result = await Promise.race([outcome, aborted])
  signal.removeEventListener('abort', onAbort)
  if (result === ABORTED) return ABORTED
  if ('error' in result) throw result.error
  return result.result
}

function runCleanup(record: CleanupRecord, entry: MountedBehavior): Promise<void> {
  if (record.called) return Promise.resolve()
  record.called = true
  return Promise.resolve()
    .then(() => record.fn())
    .catch((error) => reportError(entry.root, entry.name, 'cleanup', error))
}

function registerCleanup(entry: MountedBehavior, fn: () => void | Promise<void>): void {
  const record: CleanupRecord = { called: false, fn }
  if (entry.state === 'destroyed' || entry.controller.signal.aborted) {
    void track(runCleanup(record, entry), entry)
    return
  }
  entry.cleanups.push(record)
}

function createContext(entry: MountedBehavior): BehaviorContext<any> {
  const context = {
    root: entry.root,
    signal: entry.controller.signal,
    reactive<T extends object>(initial: T): T {
      return createReactiveState(clonePrivateState(initial))
    },
    effect(fn: () => void): void {
      if (entry.controller.signal.aborted) return
      const dispose = beamReactivity.effect(() => {
        try {
          const result: unknown = fn()
          if (isPromiseLike(result)) {
            void Promise.resolve(result).catch((error) => {
              reportError(entry.root, entry.name, 'effect', error)
            })
          }
        } catch (error) {
          reportError(entry.root, entry.name, 'effect', error)
        }
      })
      registerCleanup(entry, dispose)
    },
    on(
      target: EventTarget,
      event: string,
      listener: EventListener,
      options?: AddEventListenerOptions,
    ): void {
      if (entry.controller.signal.aborted) return
      const wrapped: EventListener = (value) => {
        try {
          const result: unknown = listener.call(target, value)
          if (isPromiseLike(result)) {
            void Promise.resolve(result).catch((error) => {
              reportError(entry.root, entry.name, 'listener', error)
            })
          }
        } catch (error) {
          reportError(entry.root, entry.name, 'listener', error)
        }
      }
      target.addEventListener(event, wrapped, options)
      registerCleanup(entry, () => target.removeEventListener(event, wrapped, options))
    },
    cleanup(fn: () => void | Promise<void>): void {
      registerCleanup(entry, fn)
    },
    getState(id: string): object | undefined {
      const state = beamReactivity.getState(id)
      if (!state && !entry.missingStateWarnings.has(id)) {
        entry.missingStateWarnings.add(id)
        console.warn(`[beam] State "${id}" requested by behavior "${entry.name}" was not found`)
      }
      return state
    },
  } as BehaviorContext<any>

  Object.defineProperty(context, 'props', {
    enumerable: true,
    get: () => entry.props,
  })
  return context
}

function isInsideIsland(root: HTMLElement): boolean {
  return root.closest('[beam-island]') !== null
}

function recordSettleScopes(entry: MountedBehavior): void {
  let current: Node | null = entry.root
  while (current) {
    entry.settleScopes.add(current)
    current = current.parentNode
  }
}

function mountElement(root: HTMLElement): void {
  if (
    !root.isConnected
    || (typeof ShadowRoot !== 'undefined' && root.getRootNode() instanceof ShadowRoot)
    || mounted.has(root)
    || destroyingRoots.has(root)
    || isInsideIsland(root)
  ) return
  const name = root.getAttribute('beam-behavior')?.trim()
  if (!name) return

  const definition = registrations.get(name)
  if (!definition) {
    if (!warnedMissingRegistrations.has(name)) {
      warnedMissingRegistrations.add(name)
      console.warn(`[beam] Behavior "${name}" is not registered; leaving its SSR content unchanged`)
    }
    return
  }

  let props: unknown
  const rawProps = root.getAttribute('beam-behavior-props')
  const priorFailure = propParseFailures.get(root)
  if (priorFailure?.name === name && priorFailure.value === rawProps) return
  try {
    props = parseProps(root, definition)
    propParseFailures.delete(root)
  } catch (error) {
    propParseFailures.set(root, { name, value: rawProps })
    root.setAttribute('data-beam-behavior-status', 'error')
    reportError(root, name, 'props', error)
    return
  }

  const entry: MountedBehavior = {
    root,
    name,
    definition,
    props,
    controller: new AbortController(),
    cleanups: [],
    settleScopes: new Set(),
    missingStateWarnings: new Set(),
    state: 'mounting',
    mountTask: Promise.resolve(),
    pendingUpdates: new Set(),
    updateWorkerRunning: false,
  }
  recordSettleScopes(entry)
  mounted.set(root, entry)
  root.setAttribute('data-beam-behavior-status', 'pending')

  const context = createContext(entry)
  entry.mountTask = (async () => {
    try {
      const result = await abortable(definition.mount(context), entry.controller.signal)
      if (result === ABORTED || entry.state === 'destroyed') return
      entry.instance = result ?? undefined
      entry.state = 'mounted'
      root.setAttribute('data-beam-behavior-status', 'mounted')
    } catch (error) {
      if (entry.state === 'destroyed') return
      entry.state = 'failed'
      entry.controller.abort()
      root.setAttribute('data-beam-behavior-status', 'error')
      reportError(root, name, 'mount', error)
      const cleanups = entry.cleanups.splice(0).reverse()
      for (const cleanup of cleanups) await runCleanup(cleanup, entry)
    }
  })()
  track(entry.mountTask, entry)
}

async function destroyEntry(entry: MountedBehavior): Promise<void> {
  if (entry.state === 'destroyed') return
  entry.state = 'destroyed'
  entry.pendingUpdates.clear()
  entry.controller.abort()
  if (mounted.get(entry.root) === entry) mounted.delete(entry.root)
  entry.root.removeAttribute('data-beam-behavior-status')
  destroyingRoots.add(entry.root)

  try {
    const cleanups = entry.cleanups.splice(0).reverse()
    for (const cleanup of cleanups) await runCleanup(cleanup, entry)
  } finally {
    destroyingRoots.delete(entry.root)
    if (entry.root.isConnected) scheduleReconcile()
  }
}

function queueUpdate(entry: MountedBehavior, kind: BehaviorUpdateKind): void {
  if (entry.state === 'destroyed') return
  entry.pendingUpdates.add(kind)
  if (entry.updateWorkerRunning) return
  entry.updateWorkerRunning = true

  const worker = (async () => {
    await entry.mountTask
    while (entry.pendingUpdates.size > 0 && entry.state === 'mounted') {
      const propsChanged = entry.pendingUpdates.delete('props')
      const contentChanged = entry.pendingUpdates.delete('content')
      let hadError = false
      entry.root.setAttribute('data-beam-behavior-status', 'updating')

      if (propsChanged) {
        try {
          entry.props = parseProps(entry.root, entry.definition)
          const result = entry.instance?.update?.({ kind: 'props' })
          if (result) await abortable(result, entry.controller.signal)
        } catch (error) {
          hadError = true
          reportError(entry.root, entry.name, 'props update', error)
        }
      }

      if (contentChanged && entry.state === 'mounted') {
        try {
          const result = entry.instance?.update?.({ kind: 'content' })
          if (result) await abortable(result, entry.controller.signal)
        } catch (error) {
          hadError = true
          reportError(entry.root, entry.name, 'content update', error)
        }
      }

      if (entry.state === 'mounted') {
        entry.root.setAttribute('data-beam-behavior-status', hadError ? 'error' : 'mounted')
      }
    }
  })().finally(() => {
    entry.updateWorkerRunning = false
    if (entry.pendingUpdates.size > 0 && entry.state === 'mounted') {
      queueUpdate(entry, entry.pendingUpdates.values().next().value as BehaviorUpdateKind)
    }
  })
  track(worker, entry)
}

function collectBehaviorRoots(root: ParentNode): HTMLElement[] {
  const roots: HTMLElement[] = []
  if (root instanceof HTMLElement && root.matches('[beam-behavior]')) roots.push(root)
  roots.push(...Array.from(root.querySelectorAll<HTMLElement>('[beam-behavior]')))
  return roots
}

function sweepDisconnected(): Promise<void>[] {
  const tasks: Promise<void>[] = []
  for (const entry of mounted.values()) {
    const currentName = entry.root.getAttribute('beam-behavior')?.trim()
    if (!entry.root.isConnected || currentName !== entry.name || isInsideIsland(entry.root)) {
      tasks.push(track(destroyEntry(entry), entry))
    }
  }
  return tasks
}

function ensureObserver(): void {
  if (observer || typeof document === 'undefined' || !document.documentElement) return
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === 'attributes'
        && mutation.attributeName === 'beam-behavior-props'
        && mutation.target instanceof HTMLElement
      ) {
        const entry = mounted.get(mutation.target)
        if (entry && mutation.target.getAttribute('beam-behavior')?.trim() === entry.name) {
          queueUpdate(entry, 'props')
        }
      }
    }
    scheduleReconcile()
  })
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['beam-behavior', 'beam-behavior-props', 'beam-island'],
  })
}

function scheduleReconcile(): void {
  if (reconcileScheduled) return
  reconcileScheduled = true
  queueMicrotask(() => {
    reconcileScheduled = false
    scanBehaviors(document)
  })
}

export function scanBehaviors(root: ParentNode = document): void {
  ensureObserver()
  sweepDisconnected()
  for (const behaviorRoot of collectBehaviorRoots(root)) {
    const entry = mounted.get(behaviorRoot)
    if (entry) recordSettleScopes(entry)
    else mountElement(behaviorRoot)
  }
}

export function notifyBehaviorContentChanged(changedRoot: Element): void {
  for (const entry of mounted.values()) {
    if (entry.state === 'destroyed' || !entry.root.isConnected) continue
    if (
      entry.root.getAttribute('beam-behavior')?.trim() === entry.name
      && (entry.root === changedRoot || entry.root.contains(changedRoot))
    ) {
      queueUpdate(entry, 'content')
    }
  }
  scheduleReconcile()
}

export function registerBehaviors(
  definitions: Record<string, Behavior<any> | BehaviorDefinition<any>>,
): void {
  const replaced = new Set<string>()
  for (const [name, behavior] of Object.entries(definitions)) {
    if (!name.trim()) throw new TypeError('Behavior names must not be empty')
    if (registrations.has(name)) {
      console.warn(`[beam] Behavior "${name}" was re-registered; remounting matching instances`)
      replaced.add(name)
    }
    registrations.set(name, asDefinition(behavior))
    warnedMissingRegistrations.delete(name)
  }

  const destroys: Promise<void>[] = []
  for (const entry of mounted.values()) {
    if (replaced.has(entry.name)) destroys.push(destroyEntry(entry))
  }
  const task = Promise.all(destroys).then(() => scanBehaviors(document))
  track(task)
}

function taskInScope(task: TrackedTask, scope: ParentNode): boolean {
  if (!task.entry) return true
  if (scope === document) return true
  const root = task.entry.root
  return root === scope
    || task.entry.settleScopes.has(scope as Node)
    || (scope instanceof Node && scope.contains(root))
}

export async function behaviorsSettled(scope: ParentNode = document): Promise<void> {
  ensureObserver()
  await Promise.resolve()
  scanBehaviors(scope)

  while (true) {
    await Promise.resolve()
    const tasks = Array.from(trackedTasks)
      .filter((task) => taskInScope(task, scope))
      .map((task) => task.promise)
    if (tasks.length === 0) break
    await Promise.all(tasks)
  }

  await Promise.resolve()
}

export const __beamBehaviorInternals = {
  registrations,
  mounted,
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scanBehaviors(document), { once: true })
  } else {
    // Give an importing registration module the rest of its evaluation turn
    // before reporting unknown names found in already-parsed SSR markup.
    queueMicrotask(() => scanBehaviors(document))
  }
}
