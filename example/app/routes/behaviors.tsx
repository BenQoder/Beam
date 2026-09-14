import { createRoute } from 'honox/factory'
import { Layout } from '../components/Layout'

const carouselProps = {
  initialIndex: 0,
  autoplayMs: 8000,
  wrap: true,
}

const accordionProps = {
  multiple: true,
  collapsible: true,
  open: ['what-is-a-behavior'],
}

const productProps = {
  currency: 'USD',
  initial: { color: 'midnight', size: 'S' },
  options: [
    {
      name: 'color',
      label: 'Color',
      values: [
        { value: 'midnight', label: 'Midnight' },
        { value: 'sand', label: 'Sand' },
        { value: 'coral', label: 'Coral' },
      ],
    },
    {
      name: 'size',
      label: 'Size',
      values: [
        { value: 'S', label: 'Small' },
        { value: 'M', label: 'Medium' },
        { value: 'L', label: 'Large' },
      ],
    },
  ],
  variants: [
    { id: 'shirt-midnight-s', values: { color: 'midnight', size: 'S' }, price: 68, stock: 4, swatch: '#172033' },
    { id: 'shirt-midnight-m', values: { color: 'midnight', size: 'M' }, price: 68, stock: 0, swatch: '#172033' },
    { id: 'shirt-midnight-l', values: { color: 'midnight', size: 'L' }, price: 72, stock: 2, swatch: '#172033' },
    { id: 'shirt-sand-s', values: { color: 'sand', size: 'S' }, price: 68, stock: 0, swatch: '#d8c6a5' },
    { id: 'shirt-sand-m', values: { color: 'sand', size: 'M' }, price: 68, stock: 5, swatch: '#d8c6a5' },
    { id: 'shirt-sand-l', values: { color: 'sand', size: 'L' }, price: 72, stock: 1, swatch: '#d8c6a5' },
    { id: 'shirt-coral-s', values: { color: 'coral', size: 'S' }, price: 70, stock: 3, swatch: '#e96f62' },
    { id: 'shirt-coral-m', values: { color: 'coral', size: 'M' }, price: 70, stock: 6, swatch: '#e96f62' },
    { id: 'shirt-coral-l', values: { color: 'coral', size: 'L' }, price: 74, stock: 0, swatch: '#e96f62' },
  ],
}

export default createRoute((c) => {
  const authToken = c.get('beamAuthToken')

  return c.html(
    <Layout title="Behavior Examples" authToken={authToken}>
      <header class="behavior-page-header">
        <span class="behavior-eyebrow">Client behavior runtime</span>
        <h1>Useful SSR, richer interaction</h1>
        <p>
          These examples start as accessible server-rendered HTML, then a trusted registered behavior adds
          private reactive state, events, and automatic cleanup. No component framework is required.
        </p>
      </header>

      <nav class="behavior-jump-links" aria-label="Behavior examples">
        <a href="#carousel-example">Carousel</a>
        <a href="#accordion-example">Accordion</a>
        <a href="#product-options-example">Product options</a>
        <a href="#css-animation-example">CSS animation</a>
      </nav>

      <section id="carousel-example" class="behavior-example-section">
        <div class="behavior-copy">
          <span class="behavior-kicker">Example 01</span>
          <h2>Accessible carousel</h2>
          <p>
            Private index state drives slides, dots, controls, and a live status. Arrow keys work when the
            carousel is focused, autoplay is lifecycle-owned, and every instance remains isolated.
          </p>
          <ul class="behavior-feature-list">
            <li>Keyboard and button navigation</li>
            <li>Optional wrapping and autoplay via inert JSON props</li>
            <li>Timers automatically cleared on removal</li>
          </ul>
        </div>

        <div
          class="behavior-carousel"
          beam-behavior="demo-carousel@1"
          beam-behavior-props={JSON.stringify(carouselProps)}
          role="region"
          aria-roledescription="carousel"
          aria-label="Beam highlights"
          tabindex="0"
        >
          <div class="behavior-carousel-viewport">
            <article class="behavior-slide behavior-slide-violet" data-carousel-slide aria-hidden="false">
              <span class="behavior-slide-number">01</span>
              <h3>Server rendered first</h3>
              <p>The first slide remains useful even before JavaScript mounts.</p>
            </article>
            <article class="behavior-slide behavior-slide-blue" data-carousel-slide hidden aria-hidden="true">
              <span class="behavior-slide-number">02</span>
              <h3>State stays local</h3>
              <p>Each carousel gets its own index, effects, listeners, and timer.</p>
            </article>
            <article class="behavior-slide behavior-slide-amber" data-carousel-slide hidden aria-hidden="true">
              <span class="behavior-slide-number">03</span>
              <h3>Swaps stay predictable</h3>
              <p>Known Beam content swaps trigger one controlled behavior update.</p>
            </article>
          </div>

          <div class="behavior-carousel-toolbar">
            <button type="button" data-carousel-action="previous" data-carousel-previous aria-label="Previous slide">←</button>
            <div class="behavior-carousel-dots" aria-label="Choose slide">
              {[0, 1, 2].map((index) => (
                <button
                  type="button"
                  data-carousel-action="dot"
                  data-carousel-dot
                  data-carousel-index={String(index)}
                  data-active={index === 0 ? '' : undefined}
                  aria-current={index === 0 ? 'true' : 'false'}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            <span data-carousel-status aria-live="polite">1 / 3</span>
            <button type="button" data-carousel-action="next" data-carousel-next aria-label="Next slide">→</button>
          </div>
          <button type="button" class="behavior-autoplay" data-carousel-action="autoplay" data-carousel-autoplay aria-pressed="false">
            Pause autoplay
          </button>
        </div>

        <details class="behavior-code">
          <summary>Carousel markup</summary>
          <pre><code>{`<section
  beam-behavior="demo-carousel@1"
  beam-behavior-props='{"autoplayMs":8000,"wrap":true}'
  aria-roledescription="carousel"
>
  <article data-carousel-slide>...</article>
  <button data-carousel-action="previous">Previous</button>
  <button data-carousel-action="next">Next</button>
</section>`}</code></pre>
        </details>
      </section>

      <section id="accordion-example" class="behavior-example-section behavior-example-split">
        <div class="behavior-copy">
          <span class="behavior-kicker">Example 02</span>
          <h2>Composable accordion</h2>
          <p>
            The same definition supports single or multiple open panels. It owns ARIA state, visibility,
            click handling, and roving keyboard focus without leaking into nested behavior roots.
          </p>
        </div>

        <div
          class="behavior-accordion"
          beam-behavior="demo-accordion@1"
          beam-behavior-props={JSON.stringify(accordionProps)}
        >
          <article class="behavior-accordion-item">
            <h3>
              <button
                type="button"
                id="accordion-trigger-what"
                data-accordion-trigger="what-is-a-behavior"
                aria-controls="accordion-panel-what"
                aria-expanded="true"
                data-open
              >
                What is a Beam behavior?
                <span aria-hidden="true">+</span>
              </button>
            </h3>
            <div
              id="accordion-panel-what"
              data-accordion-panel="what-is-a-behavior"
              role="region"
              aria-labelledby="accordion-trigger-what"
            >
              <p>A trusted client controller attached to semantic SSR markup by a versioned name.</p>
            </div>
          </article>
          <article class="behavior-accordion-item">
            <h3>
              <button
                type="button"
                id="accordion-trigger-state"
                data-accordion-trigger="where-state-lives"
                aria-controls="accordion-panel-state"
                aria-expanded="false"
              >
                Where does its state live?
                <span aria-hidden="true">+</span>
              </button>
            </h3>
            <div
              id="accordion-panel-state"
              data-accordion-panel="where-state-lives"
              role="region"
              aria-labelledby="accordion-trigger-state"
              hidden
            >
              <p>Private state belongs to one mounted root. Shared server state remains explicit through <code>getState()</code>.</p>
            </div>
          </article>
          <article class="behavior-accordion-item">
            <h3>
              <button
                type="button"
                id="accordion-trigger-cleanup"
                data-accordion-trigger="cleanup"
                aria-controls="accordion-panel-cleanup"
                aria-expanded="false"
              >
                What happens after a swap?
                <span aria-hidden="true">+</span>
              </button>
            </h3>
            <div
              id="accordion-panel-cleanup"
              data-accordion-panel="cleanup"
              role="region"
              aria-labelledby="accordion-trigger-cleanup"
              hidden
            >
              <p>Inner swaps update the surviving instance. Outer replacement aborts it and runs cleanup exactly once.</p>
            </div>
          </article>
        </div>

        <details class="behavior-code">
          <summary>Accordion registration</summary>
          <pre><code>{`registerBehaviors({
  'demo-accordion@1': defineBehavior((ctx) => {
    const state = ctx.reactive({ open: [...ctx.props.open] })
    ctx.on(ctx.root, 'click', handleTrigger)
    ctx.effect(() => renderAccordion(ctx.root, state.open))
  }),
})`}</code></pre>
        </details>
      </section>

      <section id="product-options-example" class="behavior-example-section">
        <div class="behavior-copy">
          <span class="behavior-kicker">Example 03</span>
          <h2>Production-style product options</h2>
          <p>
            Color and size resolve an exact variant, project its live price and stock, clamp quantity, and
            write only the selected variant ID and quantity into the existing Beam action payload.
          </p>
          <p class="behavior-note">
            Try Sand: its sold-out Small combination clears the incompatible size so you can choose Medium or Large.
          </p>
        </div>

        <article
          class="behavior-product"
          beam-behavior="demo-product-options@1"
          beam-behavior-props={JSON.stringify(productProps)}
        >
          <div class="behavior-product-preview" data-product-preview style="--product-swatch: #172033;">
            <span>BEAM / 01</span>
            <strong>Everyday overshirt</strong>
            <small data-product-summary>midnight · S</small>
          </div>

          <div class="behavior-product-config">
            <div class="behavior-product-heading">
              <div>
                <span class="behavior-product-label">Studio essentials</span>
                <h3>Everyday overshirt</h3>
              </div>
              <strong data-product-price>$68.00</strong>
            </div>
            <p class="behavior-stock" data-product-stock aria-live="polite">4 in stock</p>

            {productProps.options.map((option) => (
              <fieldset class="behavior-option-group">
                <legend>{option.label}</legend>
                <div class="behavior-option-values">
                  {option.values.map((item) => {
                    const selected = productProps.initial[option.name] === item.value
                    const available = productProps.variants.some(
                      (variant) => variant.stock > 0 && variant.values[option.name] === item.value,
                    )
                    return (
                      <button
                        type="button"
                        data-product-option
                        data-option-name={option.name}
                        data-option-value={item.value}
                        data-selected={selected ? '' : undefined}
                        data-unavailable={!available ? '' : undefined}
                        aria-pressed={selected ? 'true' : 'false'}
                        disabled={!available}
                      >
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            ))}

            <div class="behavior-purchase-row">
              <div class="behavior-quantity" aria-label="Quantity">
                <button type="button" data-quantity-decrease disabled aria-label="Decrease quantity">−</button>
                <input data-product-quantity type="number" min="1" max="4" value="1" aria-label="Quantity" />
                <button type="button" data-quantity-increase aria-label="Increase quantity">+</button>
              </div>
              <button
                type="button"
                class="btn-primary behavior-add-button"
                data-product-add
                beam-action="addToCart"
                beam-target="#cart-badge"
                beam-data-product-id="shirt-midnight-s"
                beam-data-qty="1"
              >
                Add selected variant
              </button>
            </div>
          </div>
        </article>

        <details class="behavior-code">
          <summary>Product behavior contract</summary>
          <pre><code>{`const state = ctx.reactive({
  selected: { ...ctx.props.initial },
  quantity: 1,
})

ctx.effect(() => {
  const variant = resolveVariant(state.selected)
  addButton.disabled = !variant
  addButton.setAttribute('beam-data-product-id', variant.id)
  addButton.setAttribute('beam-data-qty', String(state.quantity))
})`}</code></pre>
        </details>
      </section>

      <section id="css-animation-example" class="behavior-example-section behavior-example-split">
        <div class="behavior-copy">
          <span class="behavior-kicker">Example 04</span>
          <h2>Raw CSS animation</h2>
          <p>
            The behavior only owns state and accessibility. It toggles one <code>data-open</code> attribute;
            CSS handles the reveal, transforms, color shift, and keyframes without JavaScript timing code.
          </p>
          <ul class="behavior-feature-list">
            <li>No animation-library dependency</li>
            <li>Replayable from mouse, touch, or keyboard</li>
            <li>Respects <code>prefers-reduced-motion</code></li>
          </ul>
        </div>

        <div
          class="behavior-css-reveal"
          beam-behavior="demo-css-reveal@1"
          beam-behavior-props='{"open":false}'
        >
          <div class="behavior-css-reveal-heading">
            <div>
              <span class="behavior-product-label">CSS owns the motion</span>
              <h3>Attribute-driven reveal</h3>
            </div>
            <button
              type="button"
              class="behavior-css-reveal-trigger"
              data-css-reveal-trigger
              aria-controls="css-animation-panel"
              aria-expanded="false"
            >
              <span data-css-reveal-label>Run CSS animation</span>
              <span aria-hidden="true">↗</span>
            </button>
          </div>

          <div
            id="css-animation-panel"
            class="behavior-css-reveal-panel"
            data-css-reveal-panel
            aria-hidden="true"
          >
            <div class="behavior-css-reveal-clip">
              <div class="behavior-css-reveal-card">
                <div class="behavior-css-orbit" aria-hidden="true">
                  <span />
                  <i />
                </div>
                <div>
                  <strong>State changed. CSS took it from here.</strong>
                  <p>The runtime remains responsible for lifecycle and cleanup—not animation frames.</p>
                </div>
              </div>
            </div>
          </div>

          <details class="behavior-code behavior-css-code">
            <summary>Raw CSS contract</summary>
            <pre><code>{`[beam-behavior="demo-css-reveal@1"] .behavior-css-reveal-panel {
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(-12px);
  transition: grid-template-rows .55s, opacity .35s, transform .55s;
}

[beam-behavior="demo-css-reveal@1"][data-open] .behavior-css-reveal-panel {
  grid-template-rows: 1fr;
  opacity: 1;
  transform: translateY(0);
}`}</code></pre>
          </details>
        </div>
      </section>

      <aside class="behavior-source-note">
        <div>
          <span class="behavior-kicker">Source layout</span>
          <h2>Definitions stay in application code</h2>
        </div>
        <p>
          Markup can only reference names registered by the app. Props remain inert JSON, while prices,
          stock, and cart authority are still revalidated by server actions in a real storefront.
        </p>
        <code>example/app/behaviors.ts</code>
      </aside>
    </Layout>,
  )
})
