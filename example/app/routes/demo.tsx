import { createRoute } from 'honox/factory'
import { Layout } from '../components/Layout'

export default createRoute(async (c) => {
  const authToken = c.get('beamAuthToken')

  return c.html(
    <Layout title="Beam Demo" authToken={authToken}>
      <h1>Beam Demo</h1>
      <p class="text-muted">Testing all Beam features</p>

      {/* Global Loading Indicator */}
      <div class="demo-section">
        <h2>Global Loading</h2>
        <div beam-loading-for="*" class="global-loader">
          ⏳ Loading...
        </div>
      </div>

      {/* Basic Actions */}
      <div class="demo-section">
        <h2>1. Basic Actions</h2>
        <div id="counter-display" class="demo-box">
          Count: <span id="count">0</span>
        </div>
        <div class="demo-actions">
          <button beam-action="increment" beam-target="#counter-display">
            Increment
          </button>
          <button beam-action="decrement" beam-target="#counter-display">
            Decrement
          </button>
        </div>
      </div>

      {/* beam-data-* params */}
      <div class="demo-section">
        <h2>2. Data Attributes (beam-data-*)</h2>
        <div id="greeting-display" class="demo-box">
          Hello, Guest!
        </div>
        <div class="demo-actions">
          <button beam-action="greet" beam-data-name="Alice" beam-data-emoji="👋" beam-target="#greeting-display">
            Greet Alice
          </button>
          <button beam-action="greet" beam-data-name="Bob" beam-data-emoji="🎉" beam-target="#greeting-display">
            Greet Bob
          </button>
        </div>
      </div>

      {/* Per-Action Loading */}
      <div class="demo-section">
        <h2>3. Per-Action Loading Indicators</h2>
        <div id="slow-result" class="demo-box">
          Click a button to test slow actions
        </div>
        <div class="demo-actions">
          <button beam-action="slowAction" beam-data-type="save" beam-target="#slow-result">
            Save (5s)
            <span beam-loading-for="slowAction" beam-loading-data-type="save" class="btn-spinner">⏳</span>
          </button>
          <button beam-action="slowAction" beam-data-type="delete" beam-target="#slow-result">
            Delete (5s)
            <span beam-loading-for="slowAction" beam-loading-data-type="delete" class="btn-spinner">🗑️</span>
          </button>
        </div>
        <div beam-loading-for="slowAction" class="loading-message">
          Processing your request...
        </div>
      </div>

      {/* Per-Item Loading */}
      <div class="demo-section">
        <h2>4. Per-Item Loading (Param Matching)</h2>
        <div id="items-list">
          <div class="item-row">
            <span>Item 1</span>
            <span beam-loading-for="deleteItem" beam-loading-data-id="1" class="item-status">Deleting...</span>
            <button beam-action="deleteItem" beam-data-id="1" beam-target="#items-list">Delete</button>
          </div>
          <div class="item-row">
            <span>Item 2</span>
            <span beam-loading-for="deleteItem" beam-loading-data-id="2" class="item-status">Deleting...</span>
            <button beam-action="deleteItem" beam-data-id="2" beam-target="#items-list">Delete</button>
          </div>
          <div class="item-row">
            <span>Item 3</span>
            <span beam-loading-for="deleteItem" beam-loading-data-id="3" class="item-status">Deleting...</span>
            <button beam-action="deleteItem" beam-data-id="3" beam-target="#items-list">Delete</button>
          </div>
        </div>
      </div>

      {/* Loading with Class Toggle */}
      <div class="demo-section">
        <h2>5. Loading Class Toggle</h2>
        <div
          id="class-toggle-box"
          class="demo-box"
          beam-loading-for="toggleTest"
          beam-loading-class="loading-fade"
        >
          This box fades when loading
        </div>
        <button beam-action="toggleTest" beam-target="#class-toggle-box">
          Test Loading Class (5s)
        </button>
      </div>

      {/* Hide During Loading */}
      <div class="demo-section">
        <h2>6. Hide During Loading</h2>
        <div id="hide-test-result" class="demo-box">
          <span beam-loading-for="hideTest" beam-loading-remove>Content visible when not loading</span>
          <span beam-loading-for="hideTest">Loading content...</span>
        </div>
        <button beam-action="hideTest" beam-target="#hide-test-result">
          Test Hide/Show (5s)
        </button>
      </div>

      {/* Modals */}
      <div class="demo-section">
        <h2>7. Modals</h2>
        <div class="demo-actions">
          <button beam-modal="demoModal">Open Simple Modal</button>
          <button beam-modal="demoFormModal" beam-data-title="Edit Item" beam-data-value="Hello World">
            Open Form Modal
          </button>
        </div>
      </div>

      {/* Swap Modes */}
      <div class="demo-section">
        <h2>8. Swap Modes</h2>
        <div id="swap-list" class="demo-list">
          <div class="list-item">Original Item 1</div>
          <div class="list-item">Original Item 2</div>
        </div>
        <div class="demo-actions">
          <button beam-action="addItem" beam-swap="append" beam-target="#swap-list">
            Append Item
          </button>
          <button beam-action="addItem" beam-swap="prepend" beam-target="#swap-list">
            Prepend Item
          </button>
          <button beam-action="replaceList" beam-swap="morph" beam-target="#swap-list">
            Replace (Morph)
          </button>
        </div>
      </div>

      {/* Out-of-Band Updates */}
      <div class="demo-section">
        <h2>9. Out-of-Band Updates</h2>
        <div class="oob-grid">
          <div id="oob-main" class="demo-box">Main Target</div>
          <div id="oob-sidebar" class="demo-box">Sidebar</div>
          <div id="oob-footer" class="demo-box">Footer</div>
        </div>
        <button beam-action="oobUpdate" beam-target="#oob-main">
          Update All Three (OOB)
        </button>
      </div>

      {/* ============ NEW FEATURES ============ */}

      {/* Drawers */}
      <div class="demo-section">
        <h2>10. Drawers (beam-drawer)</h2>
        <p class="text-muted">Slide-in panels from left or right, in different sizes.</p>
        <div class="demo-actions">
          <button beam-drawer="productDrawer" beam-data-id="42" beam-data-name="Widget Pro">
            Product Drawer (Right)
          </button>
          <button beam-drawer="settingsDrawer" beam-position="left">
            Settings (Left)
          </button>
          <button beam-drawer="productDrawer" beam-data-id="99" beam-data-name="Large Drawer" beam-size="large">
            Large Drawer
          </button>
          <button beam-drawer="productDrawer" beam-data-id="1" beam-data-name="Small Drawer" beam-size="small">
            Small Drawer
          </button>
        </div>
        <div id="settings-result" class="demo-box">Settings result will appear here</div>
      </div>

      {/* Real-time Validation */}
      <div class="demo-section">
        <h2>11. Real-time Validation (beam-validate)</h2>
        <p class="text-muted">Validates fields as you type with debounce.</p>
        <form beam-action="validateForm" beam-target="#validation-result">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Try: taken@example.com"
              beam-validate="#email-validation"
              beam-watch="input"
              beam-debounce="500"
            />
            <div id="email-validation" class="validation-feedback"></div>
          </div>
          <div class="form-group">
            <label for="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Try: admin"
              beam-validate="#username-validation"
              beam-watch="input"
              beam-debounce="300"
            />
            <div id="username-validation" class="validation-feedback"></div>
          </div>
          <button type="submit">Submit</button>
        </form>
        <div id="validation-result" class="demo-box">Form result will appear here</div>
      </div>

      {/* Deferred Loading */}
      <div class="demo-section">
        <h2>12. Deferred Loading (beam-defer)</h2>
        <p class="text-muted">Content loads when scrolled into view (scroll down to see).</p>
        <div class="defer-demo">
          <div
            beam-defer
            beam-action="loadComments"
            class="defer-placeholder"
          >
            <div class="loading-spinner">Loading comments...</div>
          </div>
        </div>
        <div class="defer-demo">
          <div
            beam-defer
            beam-action="loadRecommendations"
            class="defer-placeholder"
          >
            <div class="loading-spinner">Loading recommendations...</div>
          </div>
        </div>
      </div>

      {/* Polling */}
      <div class="demo-section">
        <h2>13. Polling (beam-poll)</h2>
        <p class="text-muted">Auto-refresh content at regular intervals.</p>
        <div class="poll-grid">
          <div class="poll-box">
            <h4>Server Time (2s interval)</h4>
            <div
              beam-poll
              beam-interval="2000"
              beam-action="getServerTime"
              class="poll-content"
            >
              <div class="poll-result">
                <div>Waiting for first poll...</div>
              </div>
            </div>
          </div>
          <div class="poll-box">
            <h4>Stock Price (3s interval)</h4>
            <div
              beam-poll
              beam-interval="3000"
              beam-action="getStockPrice"
              class="poll-content"
            >
              <div class="stock-price">
                <span class="symbol">BEAM</span>
                <span class="price">$150.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hungry Elements */}
      <div class="demo-section">
        <h2>14. Hungry Auto-refresh (beam-hungry)</h2>
        <p class="text-muted">Elements marked with <code>beam-hungry</code> auto-update when any action returns content with matching ID.</p>
        <div class="hungry-demo">
          <div class="cart-header">
            <span>Shopping Cart</span>
            <span id="cart-badge" beam-hungry class="cart-badge">0</span>
          </div>
          <div id="cart-result" class="demo-box">
            Add items below to see the cart badge update automatically.
          </div>
          <div class="demo-actions">
            <button beam-action="addToCartDemo" beam-data-product="Widget" beam-target="#cart-result">
              Add Widget
            </button>
            <button beam-action="addToCartDemo" beam-data-product="Gadget" beam-target="#cart-result">
              Add Gadget
            </button>
            <button beam-action="addToCartDemo" beam-data-product="Gizmo" beam-target="#cart-result">
              Add Gizmo
            </button>
            <button beam-action="clearCartDemo" beam-target="#cart-result">
              Clear Cart
            </button>
          </div>
        </div>
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
          font-size: 1.1rem;
        }
        .demo-box {
          padding: 1rem;
          background: #f5f5f5;
          border-radius: 6px;
          margin: 1rem 0;
        }
        .demo-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .demo-list {
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          margin: 1rem 0;
        }
        .list-item {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #e5e5e5;
        }
        .list-item:last-child {
          border-bottom: none;
        }
        .item-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          border-bottom: 1px solid #e5e5e5;
        }
        .item-row span:first-child {
          flex: 1;
        }
        .item-status {
          color: #f59e0b;
          font-size: 0.875rem;
        }
        .oob-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin: 1rem 0;
        }
        .global-loader {
          position: fixed;
          top: 1rem;
          right: 1rem;
          background: #3b82f6;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 500;
          z-index: 1000;
        }
        .btn-spinner {
          margin-left: 0.5rem;
        }
        .loading-message {
          margin-top: 1rem;
          padding: 0.75rem;
          background: #fef3c7;
          border-radius: 6px;
          color: #92400e;
        }
        .loading-fade {
          opacity: 0.5;
          transition: opacity 0.2s;
        }

        /* ============ NEW FEATURE STYLES ============ */

        /* Drawer styles */
        #drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0);
          z-index: 1000;
          display: none;
          transition: background 0.3s;
        }
        #drawer-backdrop.open {
          display: block;
          background: rgba(0, 0, 0, 0.5);
        }
        #drawer-content {
          position: fixed;
          top: 0;
          bottom: 0;
          width: 400px;
          max-width: 90vw;
          background: white;
          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
          transform: translateX(100%);
          transition: transform 0.3s ease-out;
          display: flex;
          flex-direction: column;
        }
        #drawer-backdrop.open #drawer-content {
          transform: translateX(0);
        }
        #drawer-content[data-position="right"] {
          right: 0;
          transform: translateX(100%);
        }
        #drawer-content[data-position="left"] {
          left: 0;
          transform: translateX(-100%);
        }
        #drawer-backdrop.open #drawer-content[data-position="left"] {
          transform: translateX(0);
        }
        #drawer-content[data-size="small"] { width: 300px; }
        #drawer-content[data-size="medium"] { width: 400px; }
        #drawer-content[data-size="large"] { width: 600px; }
        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e5e5e5;
        }
        .drawer-header h2 { margin: 0; font-size: 1.25rem; }
        .drawer-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          color: #666;
        }
        .drawer-close:hover { color: #000; }
        .drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }
        .drawer-section {
          margin-bottom: 1.5rem;
        }
        .drawer-section h3 { margin-top: 0; }
        .drawer-section h4 { margin: 0 0 0.5rem; color: #666; font-size: 0.9rem; }
        .drawer-info {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.5rem 1rem;
        }
        .drawer-info dt { font-weight: 500; color: #666; }
        .drawer-info dd { margin: 0; }
        .drawer-actions {
          display: flex;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid #e5e5e5;
        }
        body.drawer-open { overflow: hidden; }

        /* Validation styles */
        .validation-feedback {
          min-height: 1.5rem;
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }
        .validation-feedback .error { color: #dc2626; }
        .validation-feedback .success { color: #16a34a; }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.25rem;
          font-weight: 500;
        }
        .form-group input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 1rem;
        }
        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        /* Defer loading styles */
        .defer-demo {
          margin: 1rem 0;
        }
        .defer-placeholder {
          min-height: 100px;
          background: #f9fafb;
          border: 1px dashed #d1d5db;
          border-radius: 6px;
          padding: 1rem;
        }
        .loading-spinner {
          color: #6b7280;
          text-align: center;
          padding: 2rem;
        }
        .comments-loaded, .recommendations-loaded {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .comment {
          padding: 0.75rem;
          border-bottom: 1px solid #e5e5e5;
        }
        .comment:last-child { border-bottom: none; }
        .rec-item {
          padding: 0.5rem 0;
          display: flex;
          justify-content: space-between;
        }

        /* Polling styles */
        .poll-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin: 1rem 0;
        }
        .poll-box {
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          padding: 1rem;
        }
        .poll-box h4 {
          margin: 0 0 0.5rem;
          font-size: 0.9rem;
          color: #666;
        }
        .poll-content {
          min-height: 60px;
        }
        .poll-result {
          font-size: 1.1rem;
        }
        .poll-count {
          font-size: 0.8rem;
          color: #666;
          margin-top: 0.25rem;
        }
        .stock-price {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.2rem;
          padding: 0.5rem;
          border-radius: 4px;
          transition: background 0.2s;
        }
        .stock-price .symbol { font-weight: 600; }
        .stock-price .price { flex: 1; }
        .stock-price .indicator { font-size: 1rem; }
        .stock-up { background: #dcfce7; color: #16a34a; }
        .stock-down { background: #fee2e2; color: #dc2626; }
        .stock-neutral { background: #f3f4f6; color: #6b7280; }

        /* Hungry element styles */
        .hungry-demo {
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          padding: 1rem;
          margin: 1rem 0;
        }
        .cart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 600;
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }
        .cart-badge {
          background: #3b82f6;
          color: white;
          padding: 0.25rem 0.6rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          min-width: 1.5rem;
          text-align: center;
          transition: transform 0.2s, background 0.2s;
        }
        .cart-badge:not(:empty) {
          animation: pulse 0.3s;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        .success-box {
          background: #dcfce7;
          color: #16a34a;
          border: 1px solid #86efac;
        }
        .badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .badge-success { background: #dcfce7; color: #16a34a; }

        /* ============ ALPINE REPLACEMENT STYLES ============ */

        /* Toggle */
        [beam-hidden] { display: none !important; }
        [beam-collapsed] { display: none !important; }

        /* Dropdown */
        [beam-dropdown] { position: relative; display: inline-block; }
        [beam-dropdown-content] {
          position: absolute;
          top: 100%;
          left: 0;
          background: white;
          min-width: 150px;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 100;
          margin-top: 4px;
          border: 1px solid #e5e5e5;
        }
        [beam-dropdown-content] a {
          display: block;
          padding: 0.6rem 1rem;
          color: #333;
          text-decoration: none;
          transition: background 0.15s;
        }
        [beam-dropdown-content] a:first-child { border-radius: 6px 6px 0 0; }
        [beam-dropdown-content] a:last-child { border-radius: 0 0 6px 6px; }
        [beam-dropdown-content] a:hover { background: #f5f5f5; }

        /* Transitions */
        [beam-transition="fade"] {
          transition: opacity 150ms ease-out;
        }
        [beam-transition="fade"][beam-hidden] {
          opacity: 0;
          pointer-events: none;
          display: block !important;
        }
        [beam-transition="slide"] {
          transition: opacity 150ms ease-out, transform 150ms ease-out;
          transform-origin: top;
        }
        [beam-transition="slide"][beam-hidden] {
          opacity: 0;
          transform: translateY(-10px);
          pointer-events: none;
          display: block !important;
        }

        /* Toggle demo content */
        .toggle-content {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 6px;
          padding: 1rem;
          margin-top: 0.5rem;
        }
        .details-content {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 6px;
          padding: 1rem;
          margin-top: 0.5rem;
        }
        .highlight-box {
          padding: 1rem;
          border: 2px solid #e5e5e5;
          border-radius: 6px;
          margin-top: 0.5rem;
          transition: all 0.2s;
        }
        .highlight-box.highlighted {
          background: #fef08a;
          border-color: #eab308;
        }

        /* Server-side targets */
        .server-target-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin: 1rem 0;
        }
        .server-target-grid .demo-box {
          text-align: center;
          font-weight: 500;
        }
      `}</style>

      {/* ============ SCRIPT EXECUTION ============ */}

      {/* Script Execution */}
      <div class="demo-section">
        <h2>20. Script Execution (ctx.script)</h2>
        <p class="text-muted">Actions can return JavaScript to execute on the client, with or without HTML.</p>
        <div id="script-test-result" class="demo-box">
          Click a button to test script execution...
        </div>
        <div class="demo-actions">
          <button beam-action="testScriptOnly">
            Script Only (Toast)
          </button>
          <button beam-action="testHtmlAndScript" beam-target="#script-test-result">
            HTML + Script
          </button>
          <button beam-action="testHtmlOnly" beam-target="#script-test-result">
            HTML Only
          </button>
        </div>
      </div>

      {/* Server-Side Targets */}
      <div class="demo-section">
        <h2>21. Server-Side Targets (response.target)</h2>
        <p class="text-muted">Server can specify where to render HTML - no frontend target needed.</p>
        <div class="server-target-grid">
          <div id="server-target-a" class="demo-box">Target A</div>
          <div id="server-target-b" class="demo-box">Target B</div>
          <div id="server-target-c" class="demo-box">Target C</div>
        </div>
        <div class="demo-actions">
          <button beam-action="serverTargetA">
            Update A (server decides)
          </button>
          <button beam-action="serverTargetB">
            Update B (server decides)
          </button>
          <button beam-action="serverTargetAll">
            Update All (server decides)
          </button>
          <button beam-action="serverTargetAppend">
            Append to A (server swap)
          </button>
        </div>
        <p class="text-muted" style="margin-top: 1rem;">
          <strong>Note:</strong> These buttons have no <code>beam-target</code> attribute - the server response specifies where to render.
        </p>
      </div>

      {/* ============ ALPINE REPLACEMENT FEATURES ============ */}

      {/* Toggle */}
      <div class="demo-section">
        <h2>15. Toggle (beam-toggle) - No Server</h2>
        <p class="text-muted">Client-side visibility toggle without server round-trip.</p>
        <div class="demo-actions">
          <button beam-toggle="#toggle-content-1">Toggle Menu</button>
          <button beam-toggle="#toggle-content-2">Toggle with Fade</button>
          <button beam-toggle="#toggle-content-3">Toggle with Slide</button>
        </div>
        <div id="toggle-content-1" beam-hidden class="toggle-content">
          <p><strong>Basic Toggle!</strong></p>
          <p>This content toggles instantly without any animation.</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
          </ul>
        </div>
        <div id="toggle-content-2" beam-hidden beam-transition="fade" class="toggle-content">
          <p><strong>Fade Transition!</strong></p>
          <p>This content fades in and out smoothly.</p>
        </div>
        <div id="toggle-content-3" beam-hidden beam-transition="slide" class="toggle-content">
          <p><strong>Slide Transition!</strong></p>
          <p>This content slides down from the top.</p>
        </div>
      </div>

      {/* Dropdown */}
      <div class="demo-section">
        <h2>16. Dropdown (beam-dropdown) - No Server</h2>
        <p class="text-muted">Dropdowns with automatic outside-click and Escape key closing.</p>
        <div class="demo-actions">
          <div beam-dropdown>
            <button beam-dropdown-trigger>Account Menu</button>
            <div beam-dropdown-content beam-hidden>
              <a href="#profile">Profile</a>
              <a href="#settings">Settings</a>
              <a href="#billing">Billing</a>
              <a href="#logout">Logout</a>
            </div>
          </div>
          <div beam-dropdown>
            <button beam-dropdown-trigger>Actions</button>
            <div beam-dropdown-content beam-hidden>
              <a href="#edit">Edit</a>
              <a href="#duplicate">Duplicate</a>
              <a href="#delete">Delete</a>
            </div>
          </div>
          <div beam-dropdown>
            <button beam-dropdown-trigger>Help</button>
            <div beam-dropdown-content beam-hidden>
              <a href="#docs">Documentation</a>
              <a href="#support">Support</a>
              <a href="#feedback">Send Feedback</a>
            </div>
          </div>
        </div>
        <p class="text-muted" style="margin-top: 1rem;">
          <strong>Tip:</strong> Click outside or press Escape to close. Only one dropdown is open at a time.
        </p>
      </div>

      {/* Collapse */}
      <div class="demo-section">
        <h2>17. Collapse (beam-collapse) - No Server</h2>
        <p class="text-muted">Expand/collapse with automatic button text swap.</p>
        <button beam-collapse="#collapse-content" beam-collapse-text="Show less details">Show more details</button>
        <div id="collapse-content" beam-collapsed class="details-content">
          <p><strong>Expanded Content!</strong></p>
          <p>Notice how the button text changed from "Show more details" to "Show less details".</p>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        </div>
      </div>

      {/* Class Toggle */}
      <div class="demo-section">
        <h2>18. Class Toggle (beam-class-toggle) - No Server</h2>
        <p class="text-muted">Toggle CSS classes on target elements.</p>
        <button beam-class-toggle="highlighted" beam-class-target="#highlight-target">Toggle Highlight</button>
        <div id="highlight-target" class="highlight-box">
          This box will get the "highlighted" class toggled when you click the button.
        </div>
      </div>

      {/* Combined Example */}
      <div class="demo-section">
        <h2>19. Combined Example - Navigation Pattern</h2>
        <p class="text-muted">Multiple toggles controlling the same target (mobile menu pattern).</p>
        <div class="demo-actions">
          <button beam-toggle="#mobile-menu">Open Menu</button>
          <button beam-toggle="#mobile-menu">Toggle Menu</button>
        </div>
        <div id="mobile-menu" beam-hidden beam-transition="slide" class="toggle-content">
          <nav style="display: flex; flex-direction: column; gap: 0.5rem;">
            <a href="#home" style="padding: 0.5rem; color: #333;">Home</a>
            <a href="#products" style="padding: 0.5rem; color: #333;">Products</a>
            <a href="#about" style="padding: 0.5rem; color: #333;">About</a>
            <a href="#contact" style="padding: 0.5rem; color: #333;">Contact</a>
          </nav>
          <button beam-toggle="#mobile-menu" style="margin-top: 1rem;">Close Menu</button>
        </div>
      </div>
    </Layout>
  )
})
