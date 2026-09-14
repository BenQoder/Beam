import {
  defineBehavior,
  registerBehaviors,
  type BehaviorContext,
} from '@benqoder/beam/behaviors'

function ownedElements<T extends Element>(root: HTMLElement, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector)).filter(
    (element) => element.closest('[beam-behavior]') === root,
  )
}

function ownedTarget(root: HTMLElement, target: EventTarget | null, selector: string): HTMLElement | null {
  if (!(target instanceof Element)) return null
  const match = target.closest<HTMLElement>(selector)
  return match?.closest('[beam-behavior]') === root ? match : null
}

type CarouselProps = {
  initialIndex?: number
  autoplayMs?: number
  wrap?: boolean
}

const carousel = defineBehavior<CarouselProps>({
  capabilities: { roles: ['slide', 'previous', 'next', 'dot', 'autoplay'] },
  parseProps(value) {
    const parsed = value ? JSON.parse(value) as CarouselProps : {}
    return {
      initialIndex: Math.max(0, Number(parsed.initialIndex) || 0),
      autoplayMs: Math.max(0, Number(parsed.autoplayMs) || 0),
      wrap: parsed.wrap !== false,
    }
  },
  mount(ctx) {
    const state = ctx.reactive({
      index: ctx.props.initialIndex ?? 0,
      paused: false,
    })
    let timer: ReturnType<typeof setInterval> | undefined

    const slides = () => ownedElements<HTMLElement>(ctx.root, '[data-carousel-slide]')

    const normalize = (index: number) => {
      const count = slides().length
      if (count === 0) return 0
      if (ctx.props.wrap) return (index + count) % count
      return Math.max(0, Math.min(index, count - 1))
    }

    const move = (delta: number) => {
      state.index = normalize(state.index + delta)
    }

    const restartAutoplay = () => {
      if (timer) clearInterval(timer)
      timer = undefined
      if (!state.paused && (ctx.props.autoplayMs ?? 0) > 0) {
        timer = setInterval(() => move(1), ctx.props.autoplayMs)
      }
    }

    const render = () => {
      const items = slides()
      state.index = normalize(state.index)
      items.forEach((slide, index) => {
        const active = index === state.index
        slide.hidden = !active
        slide.setAttribute('aria-hidden', String(!active))
      })

      ownedElements<HTMLButtonElement>(ctx.root, '[data-carousel-dot]').forEach((dot, index) => {
        const active = index === state.index
        dot.setAttribute('aria-current', active ? 'true' : 'false')
        dot.toggleAttribute('data-active', active)
      })

      const previous = ownedElements<HTMLButtonElement>(ctx.root, '[data-carousel-previous]')[0]
      const next = ownedElements<HTMLButtonElement>(ctx.root, '[data-carousel-next]')[0]
      if (previous) previous.disabled = !ctx.props.wrap && state.index === 0
      if (next) next.disabled = !ctx.props.wrap && state.index === items.length - 1

      const status = ownedElements<HTMLElement>(ctx.root, '[data-carousel-status]')[0]
      if (status) status.textContent = `${state.index + 1} / ${items.length}`
      const autoplay = ownedElements<HTMLButtonElement>(ctx.root, '[data-carousel-autoplay]')[0]
      if (autoplay) {
        autoplay.textContent = state.paused ? 'Resume autoplay' : 'Pause autoplay'
        autoplay.setAttribute('aria-pressed', String(state.paused))
      }
    }

    ctx.on(ctx.root, 'click', (event) => {
      const control = ownedTarget(ctx.root, event.target, '[data-carousel-action]')
      const action = control?.dataset.carouselAction
      if (!action) return
      if (action === 'previous') move(-1)
      if (action === 'next') move(1)
      if (action === 'dot') state.index = normalize(Number(control.dataset.carouselIndex))
      if (action === 'autoplay') {
        state.paused = !state.paused
        restartAutoplay()
      }
    })

    ctx.on(ctx.root, 'keydown', (event) => {
      const keyboardEvent = event as KeyboardEvent
      if (keyboardEvent.key !== 'ArrowLeft' && keyboardEvent.key !== 'ArrowRight') return
      keyboardEvent.preventDefault()
      move(keyboardEvent.key === 'ArrowLeft' ? -1 : 1)
    })

    ctx.effect(render)
    ctx.cleanup(() => {
      if (timer) clearInterval(timer)
    })
    restartAutoplay()

    return {
      update(change) {
        if (change.kind === 'props') restartAutoplay()
        render()
      },
    }
  },
})

type AccordionProps = {
  multiple?: boolean
  collapsible?: boolean
  open?: string[]
}

const accordion = defineBehavior<AccordionProps>({
  capabilities: { roles: ['trigger', 'panel'] },
  parseProps(value) {
    const parsed = value ? JSON.parse(value) as AccordionProps : {}
    return {
      multiple: parsed.multiple === true,
      collapsible: parsed.collapsible !== false,
      open: Array.isArray(parsed.open) ? parsed.open.map(String) : [],
    }
  },
  mount(ctx) {
    const state = ctx.reactive({ open: [...(ctx.props.open ?? [])] })

    const triggers = () => ownedElements<HTMLButtonElement>(ctx.root, '[data-accordion-trigger]')

    const render = () => {
      const open = new Set(state.open)
      for (const trigger of triggers()) {
        const key = trigger.dataset.accordionTrigger ?? ''
        const expanded = open.has(key)
        trigger.setAttribute('aria-expanded', String(expanded))
        trigger.toggleAttribute('data-open', expanded)
      }
      for (const panel of ownedElements<HTMLElement>(ctx.root, '[data-accordion-panel]')) {
        panel.hidden = !open.has(panel.dataset.accordionPanel ?? '')
      }
    }

    ctx.on(ctx.root, 'click', (event) => {
      const trigger = ownedTarget(ctx.root, event.target, '[data-accordion-trigger]')
      const key = trigger?.dataset.accordionTrigger
      if (!key) return
      const isOpen = state.open.includes(key)
      if (isOpen) {
        if (ctx.props.collapsible || state.open.length > 1) {
          state.open = state.open.filter((value) => value !== key)
        }
      } else {
        state.open = ctx.props.multiple ? [...state.open, key] : [key]
      }
    })

    ctx.on(ctx.root, 'keydown', (event) => {
      const keyboardEvent = event as KeyboardEvent
      const trigger = ownedTarget(ctx.root, event.target, '[data-accordion-trigger]')
      if (!trigger) return
      const buttons = triggers()
      const current = buttons.indexOf(trigger as HTMLButtonElement)
      let next = current
      if (keyboardEvent.key === 'ArrowDown') next = (current + 1) % buttons.length
      else if (keyboardEvent.key === 'ArrowUp') next = (current - 1 + buttons.length) % buttons.length
      else if (keyboardEvent.key === 'Home') next = 0
      else if (keyboardEvent.key === 'End') next = buttons.length - 1
      else return
      keyboardEvent.preventDefault()
      buttons[next]?.focus()
    })

    ctx.effect(render)
    return {
      update(change) {
        if (change.kind === 'props') state.open = [...(ctx.props.open ?? [])]
        render()
      },
    }
  },
})

type ProductOption = { name: string; label: string; values: Array<{ value: string; label: string }> }
type ProductVariant = {
  id: string
  values: Record<string, string>
  price: number
  stock: number
  swatch: string
}
type ProductOptionsProps = {
  currency?: string
  initial: Record<string, string>
  options: ProductOption[]
  variants: ProductVariant[]
}

function matchesSelection(variant: ProductVariant, selected: Record<string, string>): boolean {
  return Object.entries(selected).every(([name, value]) => variant.values[name] === value)
}

const productOptions = defineBehavior<ProductOptionsProps>({
  capabilities: {
    actions: ['addToCart'],
    roles: ['option', 'quantity', 'price', 'stock', 'add-to-cart'],
  },
  parseProps(value) {
    if (!value) throw new Error('Product options require props')
    const props = JSON.parse(value) as ProductOptionsProps
    if (!Array.isArray(props.options) || !Array.isArray(props.variants)) {
      throw new Error('Invalid product option props')
    }
    return props
  },
  mount(ctx: BehaviorContext<ProductOptionsProps>) {
    const state = ctx.reactive({
      selected: { ...ctx.props.initial },
      quantity: 1,
    })

    const exactVariant = () => {
      const complete = ctx.props.options.every((option) => state.selected[option.name])
      if (!complete) return undefined
      return ctx.props.variants.find((variant) => matchesSelection(variant, state.selected))
    }

    const clampQuantity = () => {
      const variant = exactVariant()
      const maximum = Math.max(1, variant?.stock ?? 1)
      state.quantity = Math.max(1, Math.min(Math.round(state.quantity) || 1, maximum))
    }

    const select = (name: string, value: string) => {
      const selected = { ...state.selected, [name]: value }
      const compatible = ctx.props.variants.some(
        (variant) => variant.stock > 0 && matchesSelection(variant, selected),
      )
      if (!compatible) {
        for (const option of ctx.props.options) {
          if (option.name !== name) delete selected[option.name]
        }
      }
      state.selected = selected
      clampQuantity()
    }

    const render = () => {
      const variant = exactVariant()
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: ctx.props.currency ?? 'USD',
      })

      for (const button of ownedElements<HTMLButtonElement>(ctx.root, '[data-product-option]')) {
        const name = button.dataset.optionName ?? ''
        const value = button.dataset.optionValue ?? ''
        const selected = state.selected[name] === value
        const available = ctx.props.variants.some(
          (candidate) => candidate.stock > 0 && candidate.values[name] === value,
        )
        button.disabled = !available
        button.setAttribute('aria-pressed', String(selected))
        button.toggleAttribute('data-selected', selected)
        button.toggleAttribute('data-unavailable', !available)
      }

      const price = ownedElements<HTMLElement>(ctx.root, '[data-product-price]')[0]
      const stock = ownedElements<HTMLElement>(ctx.root, '[data-product-stock]')[0]
      const summary = ownedElements<HTMLElement>(ctx.root, '[data-product-summary]')[0]
      const preview = ownedElements<HTMLElement>(ctx.root, '[data-product-preview]')[0]
      if (price) price.textContent = variant ? formatter.format(variant.price) : 'Choose all options'
      if (stock) stock.textContent = variant ? `${variant.stock} in stock` : 'Select a compatible size'
      if (summary) {
        summary.textContent = ctx.props.options
          .map((option) => state.selected[option.name] ?? '—')
          .join(' · ')
      }
      if (preview && variant) preview.style.setProperty('--product-swatch', variant.swatch)

      const input = ownedElements<HTMLInputElement>(ctx.root, '[data-product-quantity]')[0]
      if (input) {
        input.value = String(state.quantity)
        input.max = String(Math.max(1, variant?.stock ?? 1))
      }
      const decrease = ownedElements<HTMLButtonElement>(ctx.root, '[data-quantity-decrease]')[0]
      const increase = ownedElements<HTMLButtonElement>(ctx.root, '[data-quantity-increase]')[0]
      if (decrease) decrease.disabled = !variant || state.quantity <= 1
      if (increase) increase.disabled = !variant || state.quantity >= variant.stock

      const add = ownedElements<HTMLButtonElement>(ctx.root, '[data-product-add]')[0]
      if (add) {
        add.disabled = !variant || variant.stock < 1
        add.setAttribute('beam-data-qty', String(state.quantity))
        if (variant) add.setAttribute('beam-data-product-id', variant.id)
        else add.removeAttribute('beam-data-product-id')
      }
    }

    ctx.on(ctx.root, 'click', (event) => {
      const option = ownedTarget(ctx.root, event.target, '[data-product-option]')
      if (option && !option.hasAttribute('disabled')) {
        select(option.dataset.optionName ?? '', option.dataset.optionValue ?? '')
        return
      }
      if (ownedTarget(ctx.root, event.target, '[data-quantity-decrease]')) state.quantity -= 1
      if (ownedTarget(ctx.root, event.target, '[data-quantity-increase]')) state.quantity += 1
      clampQuantity()
    })

    ctx.on(ctx.root, 'change', (event) => {
      const input = ownedTarget(ctx.root, event.target, '[data-product-quantity]') as HTMLInputElement | null
      if (!input) return
      state.quantity = Number(input.value)
      clampQuantity()
    })

    ctx.effect(render)
    return {
      update(change) {
        if (change.kind === 'props') state.selected = { ...ctx.props.initial }
        clampQuantity()
        render()
      },
    }
  },
})

type CssRevealProps = {
  open?: boolean
}

const cssReveal = defineBehavior<CssRevealProps>({
  capabilities: { roles: ['trigger', 'content'] },
  parseProps(value) {
    const parsed = value ? JSON.parse(value) as CssRevealProps : {}
    return { open: parsed.open === true }
  },
  mount(ctx) {
    const state = ctx.reactive({ open: ctx.props.open === true })

    const render = () => {
      ctx.root.toggleAttribute('data-open', state.open)
      const trigger = ownedElements<HTMLButtonElement>(ctx.root, '[data-css-reveal-trigger]')[0]
      const panel = ownedElements<HTMLElement>(ctx.root, '[data-css-reveal-panel]')[0]
      const label = ownedElements<HTMLElement>(ctx.root, '[data-css-reveal-label]')[0]
      if (trigger) trigger.setAttribute('aria-expanded', String(state.open))
      if (panel) panel.setAttribute('aria-hidden', String(!state.open))
      if (label) label.textContent = state.open ? 'Reset CSS animation' : 'Run CSS animation'
    }

    ctx.on(ctx.root, 'click', (event) => {
      if (!ownedTarget(ctx.root, event.target, '[data-css-reveal-trigger]')) return
      state.open = !state.open
    })

    ctx.effect(render)
    return {
      update(change) {
        if (change.kind === 'props') state.open = ctx.props.open === true
        render()
      },
    }
  },
})

registerBehaviors({
  'demo-carousel@1': carousel,
  'demo-accordion@1': accordion,
  'demo-product-options@1': productOptions,
  'demo-css-reveal@1': cssReveal,
})
