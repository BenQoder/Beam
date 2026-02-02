import { createRoute } from 'honox/factory'
import { Layout } from '../components/Layout'

export default createRoute((c) => {
  const authToken = c.get('beamAuthToken')

  return c.html(
    <Layout title="Reactivity Demo" authToken={authToken}>
      <h1>Beam Reactivity Demo</h1>
      <p class="text-muted">
        Pure client-side reactivity - no server round-trips needed.
        <br />
        <small>This works with just <code>import '@benqoder/beam/reactivity'</code> - no Beam server required!</small>
      </p>

      {/* NEW: Simplified Syntax */}
      <div class="demo-section highlight-new">
        <h2>🆕 Simplified Syntax (No JSON Required!)</h2>
        <p class="text-muted">
          New cleaner syntax options - no more quoting keys or escaping strings!
        </p>

        <h3>Simple Value + beam-id</h3>
        <p class="text-muted">For single values, use <code>beam-id</code> as the property name.</p>

        <div class="syntax-examples">
          {/* Boolean toggle */}
          <div beam-state="false" beam-id="menuOpen" class="syntax-box">
            <h4>Boolean Toggle</h4>
            <button beam-click="menuOpen = !menuOpen" class="btn-toggle">
              <span beam-show="!menuOpen">☰ Open Menu</span>
              <span beam-show="menuOpen">✕ Close Menu</span>
            </button>
            <div beam-show="menuOpen" class="menu-content">
              <a href="#">Home</a>
              <a href="#">About</a>
              <a href="#">Contact</a>
            </div>
          </div>

          {/* Counter */}
          <div beam-state="0" beam-id="clicks" class="syntax-box">
            <h4>Number Counter</h4>
            <button beam-click="clicks++" class="btn-click">
              Clicked <span beam-text="clicks"></span> times
            </button>
            <button beam-click="clicks = 0" class="btn-reset-small">Reset</button>
          </div>
        </div>

        <pre class="code-preview">{`<!-- Simple boolean - beam-id becomes property name -->
<div beam-state="false" beam-id="menuOpen">
  <button beam-click="menuOpen = !menuOpen">Toggle</button>
  <div beam-show="menuOpen">Menu content</div>
</div>

<!-- Simple number -->
<div beam-state="0" beam-id="clicks">
  <button beam-click="clicks++">Clicked <span beam-text="clicks"></span> times</button>
</div>`}</pre>

        <h3>Key-Value Pairs</h3>
        <p class="text-muted">Multiple values use <code>key: value; key2: value2</code> syntax.</p>

        {/* Tabs with key-value syntax */}
        <div beam-state="tab: 0; total: 4" class="syntax-box">
          <h4>Tab Navigation</h4>
          <div class="mini-tabs">
            <button beam-click="tab = 0" beam-class="active: tab === 0">One</button>
            <button beam-click="tab = 1" beam-class="active: tab === 1">Two</button>
            <button beam-click="tab = 2" beam-class="active: tab === 2">Three</button>
            <button beam-click="tab = 3" beam-class="active: tab === 3">Four</button>
          </div>
          <div class="tab-indicator">
            Tab <span beam-text="tab + 1"></span> of <span beam-text="total"></span>
          </div>
          <div class="nav-buttons">
            <button beam-click="tab = (tab - 1 + total) % total">← Prev</button>
            <button beam-click="tab = (tab + 1) % total">Next →</button>
          </div>
        </div>

        <pre class="code-preview">{`<!-- Key-value pairs (semicolon separated) -->
<div beam-state="tab: 0; total: 4">
  <button beam-click="tab = 0" beam-class="active: tab === 0">One</button>
  <span beam-text="tab + 1"></span> of <span beam-text="total"></span>
  <button beam-click="tab = (tab + 1) % total">Next</button>
</div>`}</pre>

        <h3>Form State with Strings</h3>
        <p class="text-muted">String values can use single or double quotes.</p>

        <div beam-state="name: 'World'; greeting: 'Hello'" class="syntax-box">
          <h4>Greeting Editor</h4>
          <div class="form-inline">
            <label>Greeting:</label>
            <input type="text" beam-model="greeting" />
          </div>
          <div class="form-inline">
            <label>Name:</label>
            <input type="text" beam-model="name" />
          </div>
          <p class="greeting-output">
            <span beam-text="greeting"></span>, <span beam-text="name"></span>!
          </p>
        </div>

        <pre class="code-preview">{`<!-- String values with quotes -->
<div beam-state="name: 'World'; greeting: 'Hello'">
  <input beam-model="greeting" />
  <input beam-model="name" />
  <span beam-text="greeting + ', ' + name + '!'"></span>
</div>`}</pre>

        <h3>Cross-Reference with beam-state-ref</h3>
        <p class="text-muted">Access named state from anywhere on the page.</p>

        <div class="cross-ref-demo">
          <div beam-state="0" beam-id="sharedCount" class="syntax-box compact">
            <h4>State Owner</h4>
            <button beam-click="sharedCount++">Add +1</button>
            <span class="count-badge" beam-text="sharedCount"></span>
          </div>

          <div class="syntax-box compact">
            <h4>Remote Display</h4>
            <div class="remote-value" beam-state-ref="sharedCount" beam-text="sharedCount"></div>
            <button beam-state-ref="sharedCount" beam-click="sharedCount = 0" class="btn-reset-small">Reset from here</button>
          </div>
        </div>

        <pre class="code-preview">{`<!-- Define state with beam-id -->
<div beam-state="0" beam-id="sharedCount">
  <button beam-click="sharedCount++">Add</button>
</div>

<!-- Reference from anywhere -->
<div beam-state-ref="sharedCount" beam-text="sharedCount"></div>
<button beam-state-ref="sharedCount" beam-click="sharedCount = 0">Reset</button>`}</pre>

        <h3>beam-class Simplified Syntax</h3>
        <p class="text-muted">No more JSON for class bindings! Use <code>class: condition</code> syntax.</p>

        <div beam-state="status: 'idle'; hasError: false" class="syntax-box">
          <h4>Status Indicator</h4>
          <div class="status-buttons">
            <button beam-click="status = 'idle'; hasError = false">Idle</button>
            <button beam-click="status = 'loading'; hasError = false">Loading</button>
            <button beam-click="status = 'success'; hasError = false">Success</button>
            <button beam-click="status = 'error'; hasError = true">Error</button>
          </div>
          <div
            class="status-badge"
            beam-class="status-idle: status === 'idle'; status-loading: status === 'loading'; status-success: status === 'success'; status-error: status === 'error'"
          >
            <span beam-text="status"></span>
          </div>
          <p class="text-muted" style="margin-top: 0.5rem; font-size: 0.8rem;">
            Multiple classes, one condition each - no JSON needed!
          </p>
        </div>

        <pre class="code-preview">{`<!-- Simplified beam-class syntax -->
<div beam-class="status-idle: status === 'idle'; status-error: status === 'error'">
  ...
</div>`}</pre>

        <h3>Multiple Classes with One Condition</h3>
        <p class="text-muted">Quote class names to toggle multiple classes together.</p>

        <div beam-state="isActive: false" class="syntax-box">
          <h4>Multi-Class Toggle</h4>
          <button beam-click="isActive = !isActive" class="btn-toggle">
            Toggle Active State
          </button>
          <div
            class="multi-class-demo"
            beam-class="'bg-green text-white shadow-lg': isActive; 'bg-gray text-dark': !isActive"
          >
            <span beam-show="isActive">Active!</span>
            <span beam-show="!isActive">Inactive</span>
          </div>
          <p class="text-muted" style="margin-top: 0.5rem; font-size: 0.8rem;">
            <code>'bg-green text-white shadow-lg'</code> toggles 3 classes at once!
          </p>
        </div>

        <pre class="code-preview">{`<!-- Multiple classes with one condition (use quotes) -->
<div beam-class="'bg-green text-white shadow-lg': isActive; 'bg-gray text-dark': !isActive">
  ...
</div>`}</pre>

        <h3>Animated Carousel</h3>
        <p class="text-muted">Smooth transitions using the new beam-class syntax.</p>

        <div beam-state="slide: 0; total: 4" class="animated-carousel">
          <div class="carousel-viewport">
            <div class="carousel-track" beam-attr-style="'transform: translateX(-' + (slide * 100) + '%)'">
              <div class="carousel-slide gradient-1">
                <h3>Welcome</h3>
                <p>Beam Reactivity makes UI easy</p>
              </div>
              <div class="carousel-slide gradient-2">
                <h3>Simple Syntax</h3>
                <p>No JSON required for common cases</p>
              </div>
              <div class="carousel-slide gradient-3">
                <h3>Powerful</h3>
                <p>Full expressions and ternaries supported</p>
              </div>
              <div class="carousel-slide gradient-4">
                <h3>Get Started</h3>
                <p>Just add beam-state and go!</p>
              </div>
            </div>
          </div>
          <div class="carousel-nav">
            <button
              beam-click="slide = (slide - 1 + total) % total"
              class="carousel-btn"
            >←</button>
            <div class="carousel-dots">
              <button beam-click="slide = 0" beam-class="active: slide === 0"></button>
              <button beam-click="slide = 1" beam-class="active: slide === 1"></button>
              <button beam-click="slide = 2" beam-class="active: slide === 2"></button>
              <button beam-click="slide = 3" beam-class="active: slide === 3"></button>
            </div>
            <button
              beam-click="slide = (slide + 1) % total"
              class="carousel-btn"
            >→</button>
          </div>
        </div>

        <pre class="code-preview">{`<!-- Animated carousel with beam-class -->
<div beam-state="slide: 0; total: 4">
  <div class="track" beam-attr-style="'transform: translateX(-' + (slide * 100) + '%)'">
    <!-- slides -->
  </div>
  <button beam-click="slide = 0" beam-class="active: slide === 0"></button>
</div>`}</pre>

        <h3>JSON Still Works!</h3>
        <p class="text-muted">For arrays and nested objects, JSON syntax is still available.</p>

        <pre class="code-preview">{`<!-- JSON for complex structures -->
<div beam-state='{"items": [1, 2, 3], "nested": {"a": 1, "b": 2}}'>
  ...
</div>

<!-- JSON beam-class also supports multiple classes -->
<div beam-class="{ 'text-green italic': !hasError, bold: important }">
</div>`}</pre>
      </div>

      {/* Counter */}
      <div class="demo-section">
        <h2>1. Counter</h2>
        <p class="text-muted">Basic state with increment/decrement and disabled states.</p>
        <div beam-state='{"count": 0}' class="demo-box">
          <div class="counter">
            <button beam-click="count--" beam-attr-disabled="count <= 0" class="btn-counter">-</button>
            <span class="counter-value" beam-text="count"></span>
            <button beam-click="count++" beam-attr-disabled="count >= 10" class="btn-counter">+</button>
          </div>
          <p class="hint">Min: 0, Max: 10</p>
        </div>
        <pre class="code-preview">{`<div beam-state='{"count": 0}'>
  <button beam-click="count--" beam-attr-disabled="count <= 0">-</button>
  <span beam-text="count"></span>
  <button beam-click="count++" beam-attr-disabled="count >= 10">+</button>
</div>`}</pre>
      </div>

      {/* Toggle / Accordion */}
      <div class="demo-section">
        <h2>2. Accordion</h2>
        <p class="text-muted">Simple show/hide with state toggle.</p>
        <div beam-state='{"open": false}' class="accordion">
          <button beam-click="open = !open" class="accordion-header">
            <span beam-show="!open">&#9654;</span>
            <span beam-show="open">&#9660;</span>
            Click to expand
          </button>
          <div beam-show="open" class="accordion-body">
            <p>This content is controlled by reactive state.</p>
            <p>The accordion remembers its open/closed state.</p>
            <ul>
              <li>No server requests</li>
              <li>Instant response</li>
              <li>Fine-grained updates</li>
            </ul>
          </div>
        </div>
        <pre class="code-preview">{`<div beam-state='{"open": false}'>
  <button beam-click="open = !open">
    <span beam-show="!open">▶</span>
    <span beam-show="open">▼</span>
    Click to expand
  </button>
  <div beam-show="open">Content here...</div>
</div>`}</pre>
      </div>

      {/* Tabs */}
      <div class="demo-section">
        <h2>3. Tabs</h2>
        <p class="text-muted">Tab navigation with active state styling.</p>
        <div beam-state='{"tab": 0}' class="tabs-container">
          <div class="tabs-nav">
            <button beam-click="tab = 0" beam-class="active: tab === 0">Overview</button>
            <button beam-click="tab = 1" beam-class="active: tab === 1">Features</button>
            <button beam-click="tab = 2" beam-class="active: tab === 2">Pricing</button>
            <button beam-click="tab = 3" beam-class="active: tab === 3">FAQ</button>
          </div>
          <div class="tabs-content">
            <div beam-show="tab === 0" class="tab-panel">
              <h3>Overview</h3>
              <p>Beam Reactivity provides fine-grained, declarative reactivity for your UI components.</p>
            </div>
            <div beam-show="tab === 1" class="tab-panel">
              <h3>Features</h3>
              <ul>
                <li>Signal-based reactivity</li>
                <li>Automatic dependency tracking</li>
                <li>Batched updates via microtasks</li>
                <li>Deep reactive proxies</li>
                <li>Zero dependencies</li>
              </ul>
            </div>
            <div beam-show="tab === 2" class="tab-panel">
              <h3>Pricing</h3>
              <p><strong>Free and open source!</strong></p>
              <p>MIT License - use it anywhere.</p>
            </div>
            <div beam-show="tab === 3" class="tab-panel">
              <h3>FAQ</h3>
              <dl>
                <dt>Do I need a build step?</dt>
                <dd>No! Just include the script and use HTML attributes.</dd>
                <dt>Does it work with other frameworks?</dt>
                <dd>Yes, it's framework-agnostic.</dd>
              </dl>
            </div>
          </div>
        </div>
        <pre class="code-preview">{`<div beam-state="tab: 0">
  <button beam-click="tab = 0" beam-class="active: tab === 0">Tab 1</button>
  <button beam-click="tab = 1" beam-class="active: tab === 1">Tab 2</button>

  <div beam-show="tab === 0">Content 1</div>
  <div beam-show="tab === 1">Content 2</div>
</div>`}</pre>
      </div>

      {/* Carousel */}
      <div class="demo-section">
        <h2>4. Carousel / Slider</h2>
        <p class="text-muted">Navigate through slides with prev/next buttons.</p>
        <div beam-state='{"slide": 0, "total": 5}' class="carousel">
          <div class="carousel-display">
            <div beam-show="slide === 0" class="slide slide-1">Slide 1: Welcome!</div>
            <div beam-show="slide === 1" class="slide slide-2">Slide 2: Features</div>
            <div beam-show="slide === 2" class="slide slide-3">Slide 3: Demo</div>
            <div beam-show="slide === 3" class="slide slide-4">Slide 4: Docs</div>
            <div beam-show="slide === 4" class="slide slide-5">Slide 5: Get Started</div>
          </div>
          <div class="carousel-controls">
            <button beam-click="slide = (slide - 1 + total) % total" class="btn-nav">&#8592; Prev</button>
            <span class="carousel-indicator">
              <span beam-text="slide + 1"></span> / <span beam-text="total"></span>
            </span>
            <button beam-click="slide = (slide + 1) % total" class="btn-nav">Next &#8594;</button>
          </div>
          <div class="carousel-dots">
            <button beam-click="slide = 0" beam-class="active: slide === 0"></button>
            <button beam-click="slide = 1" beam-class="active: slide === 1"></button>
            <button beam-click="slide = 2" beam-class="active: slide === 2"></button>
            <button beam-click="slide = 3" beam-class="active: slide === 3"></button>
            <button beam-click="slide = 4" beam-class="active: slide === 4"></button>
          </div>
        </div>
        <pre class="code-preview">{`<div beam-state='{"slide": 0, "total": 5}'>
  <button beam-click="slide = (slide - 1 + total) % total">Prev</button>
  <span beam-text="slide + 1"></span> / <span beam-text="total"></span>
  <button beam-click="slide = (slide + 1) % total">Next</button>
</div>`}</pre>
      </div>

      {/* Dropdown */}
      <div class="demo-section">
        <h2>5. Dropdown Menu</h2>
        <p class="text-muted">Toggle dropdown visibility with click.</p>
        <div beam-state='{"open": false}' class="dropdown-container">
          <button beam-click="open = !open" class="dropdown-trigger">
            Select Option <span beam-show="!open">&#9660;</span><span beam-show="open">&#9650;</span>
          </button>
          <div beam-show="open" class="dropdown-menu">
            <a href="#" beam-click="open = false">Profile</a>
            <a href="#" beam-click="open = false">Settings</a>
            <a href="#" beam-click="open = false">Notifications</a>
            <hr />
            <a href="#" beam-click="open = false">Logout</a>
          </div>
        </div>
        <pre class="code-preview">{`<div beam-state='{"open": false}'>
  <button beam-click="open = !open">Menu ▼</button>
  <div beam-show="open" class="dropdown">
    <a href="#" beam-click="open = false">Option 1</a>
    <a href="#" beam-click="open = false">Option 2</a>
  </div>
</div>`}</pre>
      </div>

      {/* Modal */}
      <div class="demo-section">
        <h2>6. Modal Dialog</h2>
        <p class="text-muted">Open/close modal with state.</p>
        <div beam-state='{"showModal": false}'>
          <button beam-click="showModal = true" class="btn-primary">Open Modal</button>
          <div beam-show="showModal" class="modal-backdrop" beam-click="showModal = false">
            <div class="modal-content" onclick="event.stopPropagation()">
              <div class="modal-header">
                <h3>Modal Title</h3>
                <button beam-click="showModal = false" class="modal-close">&times;</button>
              </div>
              <div class="modal-body">
                <p>This is a modal dialog built with reactive state.</p>
                <p>Click the backdrop or the X button to close.</p>
              </div>
              <div class="modal-footer">
                <button beam-click="showModal = false" class="btn-secondary">Cancel</button>
                <button beam-click="showModal = false" class="btn-primary">Confirm</button>
              </div>
            </div>
          </div>
        </div>
        <pre class="code-preview">{`<div beam-state='{"showModal": false}'>
  <button beam-click="showModal = true">Open Modal</button>
  <div beam-show="showModal" class="backdrop" beam-click="showModal = false">
    <div class="modal" onclick="event.stopPropagation()">
      <button beam-click="showModal = false">Close</button>
    </div>
  </div>
</div>`}</pre>
      </div>

      {/* Named State / Cross-Component */}
      <div class="demo-section">
        <h2>7. Named State (Cross-Component)</h2>
        <p class="text-muted">Share state across different parts of the page using <code>beam-id</code> and <code>beam-state-ref</code>.</p>

        <div class="cross-component-demo">
          {/* Cart State Owner */}
          <div beam-state='{"items": 0, "total": 0}' beam-id="shopping-cart" class="cart-widget">
            <h4>Shopping Cart</h4>
            <p>Items: <strong beam-text="items"></strong></p>
            <p>Total: $<strong beam-text="total.toFixed(2)"></strong></p>
            <button beam-click="items = 0; total = 0" beam-attr-disabled="items === 0" class="btn-small">Clear Cart</button>
          </div>

          {/* Products referencing cart state */}
          <div class="products-grid">
            <div class="product-card">
              <h4>Widget</h4>
              <p class="price">$9.99</p>
              <button beam-state-ref="shopping-cart" beam-click="items++; total += 9.99" class="btn-add">Add to Cart</button>
            </div>
            <div class="product-card">
              <h4>Gadget</h4>
              <p class="price">$19.99</p>
              <button beam-state-ref="shopping-cart" beam-click="items++; total += 19.99" class="btn-add">Add to Cart</button>
            </div>
            <div class="product-card">
              <h4>Gizmo</h4>
              <p class="price">$29.99</p>
              <button beam-state-ref="shopping-cart" beam-click="items++; total += 29.99" class="btn-add">Add to Cart</button>
            </div>
          </div>
        </div>
        <pre class="code-preview">{`<!-- Define named state -->
<div beam-state='{"items": 0}' beam-id="cart">
  Cart: <span beam-text="items"></span>
</div>

<!-- Reference from anywhere -->
<button beam-state-ref="cart" beam-click="items++">
  Add to Cart
</button>`}</pre>
      </div>

      {/* Multiple Independent States */}
      <div class="demo-section">
        <h2>8. Multiple Independent States</h2>
        <p class="text-muted">Each <code>beam-state</code> creates an isolated scope.</p>
        <div class="multi-state-demo">
          <div beam-state='{"count": 0}' class="state-box">
            <h4>Counter A</h4>
            <button beam-click="count--">-</button>
            <span beam-text="count"></span>
            <button beam-click="count++">+</button>
          </div>
          <div beam-state='{"count": 0}' class="state-box">
            <h4>Counter B</h4>
            <button beam-click="count--">-</button>
            <span beam-text="count"></span>
            <button beam-click="count++">+</button>
          </div>
          <div beam-state='{"count": 0}' class="state-box">
            <h4>Counter C</h4>
            <button beam-click="count--">-</button>
            <span beam-text="count"></span>
            <button beam-click="count++">+</button>
          </div>
        </div>
        <p class="hint">Each counter is independent - they don't affect each other.</p>
      </div>

      {/* Text Input Binding */}
      <div class="demo-section">
        <h2>9. Two-Way Binding (beam-model)</h2>
        <p class="text-muted">Bind inputs directly to state with <code>beam-model</code>.</p>
        <div beam-state='{"firstName": "John", "lastName": "Doe"}' class="demo-box">
          <div class="form-row">
            <label>First Name:</label>
            <input type="text" beam-model="firstName" />
          </div>
          <div class="form-row">
            <label>Last Name:</label>
            <input type="text" beam-model="lastName" />
          </div>
          <p class="result">
            Hello, <strong beam-text="firstName + ' ' + lastName"></strong>!
          </p>
        </div>
        <pre class="code-preview">{`<div beam-state='{"firstName": "John", "lastName": "Doe"}'>
  <input type="text" beam-model="firstName" />
  <input type="text" beam-model="lastName" />
  <p>Hello, <span beam-text="firstName + ' ' + lastName"></span>!</p>
</div>`}</pre>
      </div>

      {/* Standalone State Reference */}
      <div class="demo-section">
        <h2>10. Standalone State Display</h2>
        <p class="text-muted">Display state values anywhere on the page using <code>beam-state-ref</code> with <code>beam-text</code>, <code>beam-show</code>, or <code>beam-class</code>.</p>

        <div class="standalone-demo">
          {/* State owner */}
          <div beam-state='{"score": 0, "highScore": 100}' beam-id="game" class="game-controls">
            <h4>Game Controller</h4>
            <div class="score-buttons">
              <button beam-click="score += 10" class="btn-score">+10</button>
              <button beam-click="score += 50" class="btn-score">+50</button>
              <button beam-click="score = 0" class="btn-reset">Reset</button>
            </div>
            <p>Current: <strong beam-text="score"></strong></p>
          </div>

          {/* Standalone display elements - NOT inside the beam-state scope */}
          <div class="standalone-displays">
            <div class="display-card">
              <h5>Score Display</h5>
              <div class="big-score" beam-state-ref="game" beam-text="score"></div>
            </div>

            <div class="display-card">
              <h5>Progress</h5>
              <div class="progress-text" beam-state-ref="game" beam-text="Math.round((score / highScore) * 100) + '%'"></div>
            </div>

            <div class="display-card">
              <h5>Status</h5>
              <span beam-state-ref="game" beam-show="score >= highScore" class="badge badge-success">Winner!</span>
              <span beam-state-ref="game" beam-show="score < highScore" class="badge badge-info">Keep going...</span>
            </div>

            <div class="display-card">
              <h5>Class Binding</h5>
              <div beam-state-ref="game" beam-class="level-low: score < 30; level-mid: score >= 30 && score < 70; level-high: score >= 70" class="level-indicator">
                Level
              </div>
            </div>
          </div>
        </div>

        <pre class="code-preview">{`<!-- Define state somewhere -->
<div beam-state="score: 0; highScore: 100" beam-id="game">
  <button beam-click="score += 10">+10</button>
</div>

<!-- Display state anywhere (outside beam-state scope) -->
<div beam-state-ref="game" beam-text="score"></div>
<div beam-state-ref="game" beam-show="score >= 100">Winner!</div>
<div beam-state-ref="game" beam-class="active: score > 50">Level</div>

<!-- Multiple classes with simplified syntax -->
<div beam-state-ref="game" beam-class="level-low: score < 30; level-high: score >= 70">Level</div>`}</pre>
      </div>

      {/* State Persistence After Updates */}
      <div class="demo-section">
        <h2>11. State Persistence After Updates</h2>
        <p class="text-muted">Named states (with <code>beam-id</code>) persist when the DOM is updated by <code>beam-action</code>.</p>

        <div class="update-demo">
          {/* State with beam-id - will persist across updates */}
          <div id="update-target" beam-state='{"count": 0, "message": "Initial"}' beam-id="persist-demo" class="update-box">
            <h4>Persistent State</h4>
            <div class="counter-inline">
              <button beam-click="count--" class="btn-small-counter">-</button>
              <span class="count-display" beam-text="count"></span>
              <button beam-click="count++" class="btn-small-counter">+</button>
            </div>
            <p class="update-message">Message: <span beam-text="message"></span></p>
            <p class="update-hint">Increment the counter, then click "Update Container" - state persists!</p>
          </div>

          {/* Button that triggers update */}
          <div class="update-actions">
            <button beam-action="updateReactiveDemo" beam-target="#update-target" class="btn-update">
              Update Container (server update)
            </button>
            <p class="text-muted">This replaces the container HTML but preserves the reactive state.</p>
          </div>
        </div>

        <pre class="code-preview">{`<!-- Named state persists across updates -->
<div id="target" beam-state='{"count": 0}' beam-id="my-state">
  <span beam-text="count"></span>
  <button beam-click="count++">+</button>
</div>

<!-- When this action updates #target, the count value is preserved -->
<button beam-action="updateContent" beam-target="#target">
  Update Content
</button>`}</pre>
      </div>

      {/* Pure HTML Usage */}
      <div class="demo-section">
        <h2>12. Pure HTML Usage</h2>
        <p class="text-muted">No build tools required - just include the script!</p>
        <pre class="code-preview">{`<!DOCTYPE html>
<html>
<head>
  <script type="module" src="https://unpkg.com/@benqoder/beam/dist/reactivity.js"></script>
</head>
<body>
  <div beam-state='{"count": 0}'>
    <button beam-click="count++">Clicks: <span beam-text="count"></span></button>
  </div>
</body>
</html>`}</pre>
      </div>

      <style>{`
        .demo-section {
          margin: 2rem 0;
          padding: 1.5rem;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
        }
        .demo-section h2 {
          margin-top: 0;
          font-size: 1.2rem;
          color: #333;
        }
        .demo-box {
          background: #f9fafb;
          padding: 1.5rem;
          border-radius: 6px;
          margin: 1rem 0;
        }
        .text-muted {
          color: #6b7280;
          font-size: 0.9rem;
        }
        .hint {
          color: #9ca3af;
          font-size: 0.8rem;
          margin-top: 0.5rem;
        }
        .code-preview {
          background: #1f2937;
          color: #e5e7eb;
          padding: 1rem;
          border-radius: 6px;
          font-size: 0.85rem;
          overflow-x: auto;
          margin-top: 1rem;
        }

        /* Counter */
        .counter {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }
        .btn-counter {
          width: 48px;
          height: 48px;
          font-size: 1.5rem;
          border: none;
          border-radius: 50%;
          background: #3b82f6;
          color: white;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-counter:hover:not(:disabled) {
          background: #2563eb;
          transform: scale(1.05);
        }
        .btn-counter:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }
        .counter-value {
          font-size: 3rem;
          font-weight: 700;
          min-width: 80px;
          text-align: center;
        }

        /* Accordion */
        .accordion {
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          overflow: hidden;
        }
        .accordion-header {
          width: 100%;
          padding: 1rem;
          background: #f3f4f6;
          border: none;
          text-align: left;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .accordion-header:hover {
          background: #e5e7eb;
        }
        .accordion-body {
          padding: 1rem;
          background: white;
          border-top: 1px solid #e5e5e5;
        }

        /* Tabs */
        .tabs-container {
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          overflow: hidden;
        }
        .tabs-nav {
          display: flex;
          background: #f3f4f6;
          border-bottom: 1px solid #e5e5e5;
        }
        .tabs-nav button {
          flex: 1;
          padding: 0.75rem 1rem;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 0.9rem;
          color: #6b7280;
          border-bottom: 2px solid transparent;
          transition: all 0.15s;
        }
        .tabs-nav button:hover {
          color: #374151;
          background: #e5e7eb;
        }
        .tabs-nav button.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
          background: white;
        }
        .tabs-content {
          padding: 1.5rem;
          background: white;
        }
        .tab-panel h3 {
          margin-top: 0;
        }

        /* Carousel */
        .carousel {
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          overflow: hidden;
        }
        .carousel-display {
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .slide {
          width: 100%;
          padding: 3rem;
          text-align: center;
          font-size: 1.5rem;
          font-weight: 600;
        }
        .slide-1 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .slide-2 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }
        .slide-3 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; }
        .slide-4 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; }
        .slide-5 { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; }
        .carousel-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: #f3f4f6;
        }
        .btn-nav {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-nav:hover {
          background: #2563eb;
        }
        .carousel-indicator {
          font-weight: 500;
        }
        .carousel-dots {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #f3f4f6;
          border-top: 1px solid #e5e5e5;
        }
        .carousel-dots button {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: none;
          background: #d1d5db;
          cursor: pointer;
          padding: 0;
        }
        .carousel-dots button.active {
          background: #3b82f6;
        }

        /* Dropdown */
        .dropdown-container {
          position: relative;
          display: inline-block;
        }
        .dropdown-trigger {
          padding: 0.75rem 1rem;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
        }
        .dropdown-trigger:hover {
          background: #e5e7eb;
        }
        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 4px;
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          min-width: 180px;
          z-index: 100;
        }
        .dropdown-menu a {
          display: block;
          padding: 0.6rem 1rem;
          color: #333;
          text-decoration: none;
        }
        .dropdown-menu a:hover {
          background: #f3f4f6;
        }
        .dropdown-menu hr {
          margin: 0.25rem 0;
          border: none;
          border-top: 1px solid #e5e5e5;
        }

        /* Modal */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e5e5e5;
        }
        .modal-header h3 {
          margin: 0;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
        }
        .modal-body {
          padding: 1.5rem;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid #e5e5e5;
        }
        .btn-primary {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-primary:hover {
          background: #2563eb;
        }
        .btn-secondary {
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-secondary:hover {
          background: #e5e7eb;
        }

        /* Cross-Component */
        .cross-component-demo {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 1.5rem;
        }
        .cart-widget {
          background: #3b82f6;
          color: white;
          padding: 1rem;
          border-radius: 8px;
          height: fit-content;
        }
        .cart-widget h4 {
          margin: 0 0 0.75rem;
        }
        .cart-widget p {
          margin: 0.25rem 0;
        }
        .btn-small {
          margin-top: 0.75rem;
          padding: 0.4rem 0.75rem;
          font-size: 0.8rem;
          background: white;
          color: #3b82f6;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-small:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .products-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        .product-card {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          padding: 1rem;
          text-align: center;
        }
        .product-card h4 {
          margin: 0 0 0.5rem;
        }
        .price {
          font-size: 1.25rem;
          font-weight: 600;
          color: #059669;
          margin: 0.5rem 0;
        }
        .btn-add {
          width: 100%;
          padding: 0.5rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-add:hover {
          background: #059669;
        }

        /* Multi-State */
        .multi-state-demo {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        .state-box {
          background: #f3f4f6;
          padding: 1rem;
          border-radius: 6px;
          text-align: center;
        }
        .state-box h4 {
          margin: 0 0 0.75rem;
        }
        .state-box button {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 4px;
          background: #3b82f6;
          color: white;
          cursor: pointer;
          margin: 0 0.5rem;
        }
        .state-box span {
          font-size: 1.25rem;
          font-weight: 600;
        }

        /* Form */
        .form-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }
        .form-row label {
          width: 100px;
          font-weight: 500;
        }
        .form-row input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
        }
        .result {
          margin-top: 1rem;
          padding: 1rem;
          background: #dbeafe;
          border-radius: 6px;
          text-align: center;
          font-size: 1.1rem;
        }

        /* Standalone Demo */
        .standalone-demo {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 1.5rem;
        }
        .game-controls {
          background: #7c3aed;
          color: white;
          padding: 1rem;
          border-radius: 8px;
        }
        .game-controls h4 {
          margin: 0 0 0.75rem;
        }
        .score-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .btn-score {
          padding: 0.4rem 0.75rem;
          background: white;
          color: #7c3aed;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
        }
        .btn-reset {
          padding: 0.4rem 0.75rem;
          background: rgba(255,255,255,0.2);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .standalone-displays {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        .display-card {
          background: #f3f4f6;
          padding: 1rem;
          border-radius: 6px;
          text-align: center;
        }
        .display-card h5 {
          margin: 0 0 0.5rem;
          color: #6b7280;
          font-size: 0.8rem;
          text-transform: uppercase;
        }
        .big-score {
          font-size: 2.5rem;
          font-weight: 700;
          color: #7c3aed;
        }
        .progress-text {
          font-size: 1.5rem;
          font-weight: 600;
          color: #059669;
        }
        .badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
        }
        .badge-success {
          background: #10b981;
          color: white;
        }
        .badge-info {
          background: #3b82f6;
          color: white;
        }
        .level-indicator {
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-weight: 600;
          transition: all 0.3s;
        }
        .level-low {
          background: #fef3c7;
          color: #92400e;
        }
        .level-mid {
          background: #dbeafe;
          color: #1e40af;
        }
        .level-high {
          background: #d1fae5;
          color: #065f46;
        }

        /* Update Demo */
        .update-demo {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .update-box {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 2px solid #0ea5e9;
          padding: 1.5rem;
          border-radius: 8px;
        }
        .update-box h4 {
          margin: 0 0 1rem;
          color: #0369a1;
        }
        .counter-inline {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .btn-small-counter {
          width: 36px;
          height: 36px;
          font-size: 1.25rem;
          background: #0ea5e9;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }
        .btn-small-counter:hover {
          background: #0284c7;
        }
        .count-display {
          font-size: 1.5rem;
          font-weight: 700;
          min-width: 40px;
          text-align: center;
        }
        .update-message {
          margin: 0.5rem 0;
          color: #0369a1;
        }
        .update-hint {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0;
        }
        .update-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .btn-update {
          padding: 0.75rem 1.5rem;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }
        .btn-update:hover {
          background: #7c3aed;
        }

        /* NEW Simplified Syntax Section */
        .highlight-new {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 2px solid #f59e0b;
        }
        .highlight-new h2 {
          color: #92400e;
        }
        .highlight-new h3 {
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          color: #78350f;
          font-size: 1rem;
        }
        .syntax-examples {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin: 1rem 0;
        }
        .syntax-box {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          padding: 1rem;
          margin: 1rem 0;
        }
        .syntax-box.compact {
          margin: 0;
        }
        .syntax-box h4 {
          margin: 0 0 0.75rem;
          font-size: 0.9rem;
          color: #6b7280;
        }
        .btn-toggle {
          padding: 0.6rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.95rem;
        }
        .btn-toggle:hover {
          background: #2563eb;
        }
        .menu-content {
          margin-top: 0.75rem;
          padding: 0.5rem;
          background: #f3f4f6;
          border-radius: 6px;
        }
        .menu-content a {
          display: block;
          padding: 0.5rem 0.75rem;
          color: #374151;
          text-decoration: none;
          border-radius: 4px;
        }
        .menu-content a:hover {
          background: #e5e7eb;
        }
        .btn-click {
          padding: 0.75rem 1.25rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          margin-right: 0.5rem;
        }
        .btn-click:hover {
          background: #059669;
        }
        .btn-reset-small {
          padding: 0.4rem 0.75rem;
          background: #f3f4f6;
          color: #6b7280;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
        }
        .btn-reset-small:hover {
          background: #e5e7eb;
        }
        .mini-tabs {
          display: flex;
          gap: 0.25rem;
          margin-bottom: 0.75rem;
        }
        .mini-tabs button {
          flex: 1;
          padding: 0.5rem;
          border: none;
          background: #f3f4f6;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.15s;
        }
        .mini-tabs button:hover {
          background: #e5e7eb;
        }
        .mini-tabs button.active {
          background: #3b82f6;
          color: white;
        }
        .tab-indicator {
          text-align: center;
          font-size: 0.9rem;
          color: #6b7280;
          margin-bottom: 0.75rem;
        }
        .nav-buttons {
          display: flex;
          justify-content: space-between;
        }
        .nav-buttons button {
          padding: 0.4rem 0.75rem;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .nav-buttons button:hover {
          background: #4f46e5;
        }
        .form-inline {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .form-inline label {
          width: 70px;
          font-size: 0.9rem;
          color: #6b7280;
        }
        .form-inline input {
          flex: 1;
          padding: 0.4rem 0.6rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
        }
        .greeting-output {
          margin: 0.75rem 0 0;
          padding: 0.75rem;
          background: #dbeafe;
          border-radius: 6px;
          text-align: center;
          font-size: 1.1rem;
          font-weight: 500;
        }
        .cross-ref-demo {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin: 1rem 0;
        }
        .count-badge {
          display: inline-block;
          min-width: 2rem;
          padding: 0.25rem 0.5rem;
          background: #3b82f6;
          color: white;
          border-radius: 20px;
          text-align: center;
          font-weight: 600;
          margin-left: 0.5rem;
        }
        .remote-value {
          font-size: 2rem;
          font-weight: 700;
          color: #7c3aed;
          text-align: center;
          margin-bottom: 0.5rem;
        }

        /* Status Indicator Demo */
        .status-buttons {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .status-buttons button {
          padding: 0.4rem 0.75rem;
          border: 1px solid #d1d5db;
          background: #f9fafb;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
        }
        .status-buttons button:hover {
          background: #e5e7eb;
        }
        .status-badge {
          display: inline-block;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.8rem;
          transition: all 0.3s ease;
        }
        .status-idle {
          background: #e5e7eb;
          color: #6b7280;
        }
        .status-loading {
          background: #dbeafe;
          color: #2563eb;
          animation: pulse 1s infinite;
        }
        .status-success {
          background: #d1fae5;
          color: #059669;
        }
        .status-error {
          background: #fee2e2;
          color: #dc2626;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        /* Multi-Class Demo */
        .multi-class-demo {
          padding: 1.5rem;
          border-radius: 8px;
          text-align: center;
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1rem;
          transition: all 0.3s ease;
        }
        .bg-green {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }
        .bg-gray {
          background: #e5e7eb;
        }
        .text-white {
          color: white;
        }
        .text-dark {
          color: #374151;
        }
        .shadow-lg {
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4);
        }

        /* Animated Carousel */
        .animated-carousel {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          overflow: hidden;
          margin: 1rem 0;
        }
        .carousel-viewport {
          overflow: hidden;
        }
        .carousel-track {
          display: flex;
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .carousel-slide {
          min-width: 100%;
          padding: 3rem 2rem;
          text-align: center;
          color: white;
        }
        .carousel-slide h3 {
          margin: 0 0 0.5rem;
          font-size: 1.75rem;
        }
        .carousel-slide p {
          margin: 0;
          opacity: 0.9;
        }
        .gradient-1 {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .gradient-2 {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        .gradient-3 {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        .gradient-4 {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        }
        .carousel-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border-top: 1px solid #e5e5e5;
        }
        .carousel-btn {
          width: 40px;
          height: 40px;
          border: none;
          background: #3b82f6;
          color: white;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .carousel-btn:hover {
          background: #2563eb;
          transform: scale(1.1);
        }
        .carousel-dots {
          display: flex;
          gap: 0.5rem;
        }
        .carousel-dots button {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: none;
          background: #d1d5db;
          cursor: pointer;
          padding: 0;
          transition: all 0.2s;
        }
        .carousel-dots button:hover {
          background: #9ca3af;
        }
        .carousel-dots button.active {
          background: #3b82f6;
          transform: scale(1.2);
        }

        @media (max-width: 768px) {
          .cross-component-demo {
            grid-template-columns: 1fr;
          }
          .products-grid {
            grid-template-columns: 1fr;
          }
          .multi-state-demo {
            grid-template-columns: 1fr;
          }
          .standalone-demo {
            grid-template-columns: 1fr;
          }
          .standalone-displays {
            grid-template-columns: 1fr;
          }
          .syntax-examples {
            grid-template-columns: 1fr;
          }
          .cross-ref-demo {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Layout>
  )
})
