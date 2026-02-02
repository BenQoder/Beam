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

      {/* beam-include */}
      <div class="demo-section">
        <h2>2b. Include Inputs (beam-include)</h2>
        <p class="text-muted">Collect input values by beam-id, id, or name and include in action params.</p>
        <div class="form-group">
          <label>Name (beam-id)</label>
          <input beam-id="userName" type="text" value="Ben" />
        </div>
        <div class="form-group">
          <label>Email (id)</label>
          <input id="userEmail" type="email" value="ben@example.com" />
        </div>
        <div class="form-group">
          <label>Age (name, number input)</label>
          <input name="userAge" type="number" value="30" />
        </div>
        <div class="form-group">
          <label>
            <input beam-id="subscribe" type="checkbox" checked /> Subscribe to newsletter
          </label>
        </div>
        <div id="include-result" class="demo-box">
          Click a button to see the included params...
        </div>
        <div class="demo-actions">
          <button
            beam-action="testInclude"
            beam-include="userName,userEmail,userAge,subscribe"
            beam-data-source="form"
            beam-target="#include-result"
          >
            Include All
          </button>
          <button
            beam-action="testInclude"
            beam-include="userName"
            beam-data-action="single"
            beam-target="#include-result"
          >
            Include Name Only
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
        <p class="text-muted">Two ways: beam-modal (explicit, supports placeholder) or beam-action (action returns modal).</p>
        <div class="demo-actions">
          {/* beam-modal attribute - explicitly opens result in modal, supports placeholder */}
          <button beam-modal="demoModal" beam-placeholder="<div style='padding: 2rem; text-align: center;'>Loading modal...</div>">
            beam-modal (with placeholder)
          </button>
          <button beam-modal="demoModalLarge" beam-size="large">
            beam-modal (large)
          </button>
          {/* beam-action returning modal - action decides to return modal */}
          <button beam-action="demoModal">beam-action (returns modal)</button>
          <button beam-action="simpleModal">Simple String Modal</button>
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
          <button beam-action="replaceList" beam-swap="replace" beam-target="#swap-list">
            Replace
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
        <h2>10. Drawers</h2>
        <p class="text-muted">Two ways: beam-drawer (explicit, supports placeholder) or beam-action (action returns drawer).</p>
        <div class="demo-actions">
          {/* beam-drawer attribute - explicitly opens result in drawer */}
          <button beam-drawer="demoDrawer" beam-placeholder="<div style='padding: 2rem;'>Loading drawer...</div>">
            beam-drawer (with placeholder)
          </button>
          <button beam-drawer="demoDrawerLeft" beam-position="left" beam-size="large">
            beam-drawer (left, large)
          </button>
          {/* beam-action returning drawer */}
          <button beam-action="demoDrawer">beam-action (returns drawer)</button>
          <button beam-action="demoDrawerLeft">beam-action (left drawer)</button>
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

        /* ============ REACTIVE STATE STYLES ============ */

        .dropdown {
          background: white;
          min-width: 150px;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e5e5;
          padding: 0.25rem 0;
        }
        .dropdown a {
          display: block;
          padding: 0.6rem 1rem;
          color: #333;
          text-decoration: none;
          transition: background 0.15s;
        }
        .dropdown a:hover { background: #f5f5f5; }

        .reactive-demo {
          background: #f9fafb;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          padding: 1rem;
          margin: 0.5rem 0;
        }

        /* Accordion */
        .accordion-trigger {
          width: 100%;
          text-align: left;
          padding: 0.75rem 1rem;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }
        .accordion-trigger:hover {
          background: #e5e7eb;
        }
        .accordion-content {
          padding: 1rem;
          background: white;
          border: 1px solid #d1d5db;
          border-top: none;
          border-radius: 0 0 4px 4px;
        }

        /* Tabs */
        .tabs-nav {
          display: flex;
          gap: 0;
          border-bottom: 2px solid #e5e5e5;
        }
        .tabs-nav button {
          padding: 0.75rem 1.25rem;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          cursor: pointer;
          font-size: 0.95rem;
          color: #6b7280;
          transition: all 0.15s;
        }
        .tabs-nav button:hover {
          color: #374151;
          background: #f9fafb;
        }
        .tabs-nav button.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
          font-weight: 500;
        }
        .tabs-content {
          padding: 1rem 0;
        }
        .tab-panel {
          background: white;
          padding: 1rem;
          border: 1px solid #e5e5e5;
          border-radius: 4px;
        }

        /* Carousel */
        .carousel-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .carousel-btn {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .carousel-btn:hover {
          background: #2563eb;
        }
        .carousel-counter {
          font-weight: 500;
        }
        .carousel-slide {
          min-height: 100px;
        }
        .slide {
          background: white;
          padding: 2rem;
          text-align: center;
          font-size: 1.25rem;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
        }

        /* Counter */
        .counter-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
          justify-content: center;
        }
        .counter-btn {
          width: 40px;
          height: 40px;
          font-size: 1.25rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
        }
        .counter-btn:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }
        .counter-btn:not(:disabled):hover {
          background: #2563eb;
        }
        .counter-value {
          font-size: 2rem;
          font-weight: 700;
          min-width: 3rem;
          text-align: center;
        }

        /* Reactive Dropdown */
        .dropdown-btn {
          padding: 0.75rem 1rem;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          cursor: pointer;
        }
        .dropdown-btn:hover {
          background: #e5e7eb;
        }
        .reactive-demo .dropdown {
          position: absolute;
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          margin-top: 4px;
          z-index: 10;
        }
        .reactive-demo .dropdown a {
          display: block;
          padding: 0.6rem 1rem;
          color: #333;
          text-decoration: none;
        }
        .reactive-demo .dropdown a:hover {
          background: #f5f5f5;
        }

        /* Named State Demo */
        .named-state-demo {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .cart-display {
          background: #3b82f6;
          color: white;
          padding: 1rem;
          border-radius: 6px;
          font-size: 1.1rem;
          font-weight: 500;
        }
        .product-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .product-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 4px;
        }
        .product-item button {
          padding: 0.4rem 0.75rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .product-item button:hover {
          background: #059669;
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

        /* Multi-render array API */
        .multi-render-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin: 1rem 0;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin: 1rem 0;
        }
        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 8px;
          text-align: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }
        .stat-label {
          font-size: 0.875rem;
          opacity: 0.9;
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

      {/* Multi-Render Array API */}
      <div class="demo-section">
        <h2>22. Multi-Render Array API (ctx.render with arrays)</h2>
        <p class="text-muted">Render multiple components to different targets in a single action response.</p>

        <h4>Example 1: Explicit Targets (comma-separated)</h4>
        <div class="multi-render-grid">
          <div id="multi-stats" class="demo-box">Stats</div>
          <div id="multi-notifications" class="demo-box">Notifications</div>
          <div id="multi-last-updated" class="demo-box">Last Updated</div>
        </div>
        <button beam-action="multiRenderExplicit">
          Update All (explicit targets)
        </button>
        <p class="text-muted" style="margin-top: 0.5rem;">
          <code>ctx.render([html1, html2, html3], {'{'} target: '#a, #b, #c' {'}'})</code>
        </p>

        <h4 style="margin-top: 1.5rem;">Example 2: Auto-detect by ID (no targets needed)</h4>
        <div class="multi-render-grid">
          <div id="auto-panel-a" class="demo-box">Panel A</div>
          <div id="auto-panel-b" class="demo-box">Panel B</div>
          <div id="auto-panel-c" class="demo-box">Panel C</div>
        </div>
        <button beam-action="multiRenderAutoId">
          Update All (auto-detect IDs)
        </button>
        <p class="text-muted" style="margin-top: 0.5rem;">
          <code>ctx.render([&lt;div id="panel-a"&gt;...&lt;/div&gt;, ...])</code> - targets found by ID
        </p>

        <h4 style="margin-top: 1.5rem;">Example 3: Mixed (some explicit, some by ID)</h4>
        <div class="multi-render-grid">
          <div id="mixed-header" class="demo-box">Header (explicit)</div>
          <div id="mixed-content" class="demo-box">Content (by ID)</div>
          <div class="demo-box">Ignored (no target/ID)</div>
        </div>
        <button beam-action="multiRenderMixed">
          Update Mixed
        </button>
        <p class="text-muted" style="margin-top: 0.5rem;">
          First item → explicit target, second → by ID, third → skipped (no match)
        </p>

        <h4 style="margin-top: 1.5rem;">Example 4: Real-world Dashboard Refresh</h4>
        <div class="dashboard-grid">
          <div id="dashboard-visits" class="stat-card">
            <div class="stat-value">0</div>
            <div class="stat-label">Total Visits</div>
          </div>
          <div id="dashboard-users" class="stat-card">
            <div class="stat-value">0</div>
            <div class="stat-label">Active Users</div>
          </div>
          <div id="dashboard-revenue" class="stat-card">
            <div class="stat-value">$0</div>
            <div class="stat-label">Revenue</div>
          </div>
        </div>
        <button beam-action="refreshDashboard">
          Refresh Dashboard Stats
        </button>
      </div>

      {/* Example 5: Exclusion */}
      <div class="demo-section">
        <h4 style="margin-top: 1.5rem;">Example 5: Exclusion (!selector)</h4>
        <p class="text-muted">Use <code>!#selector</code> to exclude targets. Frontend has <code>beam-target="#exclude-fallback"</code>.</p>
        <div class="multi-render-grid">
          <div id="exclude-a" class="demo-box">Box A (explicit)</div>
          <div id="exclude-b" class="demo-box">Box B (excluded)</div>
          <div id="exclude-fallback" class="demo-box">Fallback (blocked by !)</div>
        </div>
        <button beam-action="multiRenderExclusion" beam-target="#exclude-fallback">
          Test Exclusion
        </button>
        <p class="text-muted" style="margin-top: 0.5rem;">
          <code>target: '#exclude-a, !#exclude-fallback'</code> — Box A updates, others blocked
        </p>
      </div>

      {/* Example 6: Frontend Fallback */}
      <div class="demo-section">
        <h4 style="margin-top: 1.5rem;">Example 6: Frontend Fallback</h4>
        <p class="text-muted">Server provides partial targets, frontend <code>beam-target</code> fills in the rest.</p>
        <div class="multi-render-grid" style="grid-template-columns: repeat(2, 1fr);">
          <div id="fallback-first" class="demo-box">First (server target)</div>
          <div id="fallback-target" class="demo-box">Second (frontend fallback)</div>
        </div>
        <button beam-action="multiRenderFallback" beam-target="#fallback-target">
          Test Fallback
        </button>
        <p class="text-muted" style="margin-top: 0.5rem;">
          <code>target: '#fallback-first'</code> + <code>beam-target="#fallback-target"</code> — Both update!
        </p>
      </div>

      {/* Example 7: Auto-detect by id, beam-id, beam-item-id */}
      <div class="demo-section">
        <h4 style="margin-top: 1.5rem;">Example 7: Auto-detect (id, beam-id, beam-item-id)</h4>
        <p class="text-muted">
          No explicit targets needed — finds elements by <code>id</code>, <code>beam-id</code>, or <code>beam-item-id</code> on the root element.
          If more than one is present, Beam selects a single target using the priority order below.
        </p>
        <div class="multi-render-grid">
          <div id="auto-by-id" class="demo-box">By id</div>
          <div beam-id="auto-by-beam-id" class="demo-box">By beam-id</div>
          <div beam-item-id="auto-by-item-id" class="demo-box">By beam-item-id</div>
        </div>
        <button beam-action="multiRenderAutoDetect">
          Test Auto-detect
        </button>
        <p class="text-muted" style="margin-top: 0.5rem;">
          Priority: <code>id</code> → <code>beam-id</code> → <code>beam-item-id</code>
        </p>
      </div>

      {/* ============ ASYNC COMPONENT TESTS ============ */}

      {/* Example 8: Async single render */}
      <div class="demo-section">
        <h2>23. Async Components (HonoX Feature)</h2>
        <p class="text-muted">Verify async components work with <code>ctx.render()</code>.</p>

        <h4>Example 8: Async component (single render)</h4>
        <div id="async-single-result" class="demo-box">
          Click to load async user card...
        </div>
        <button beam-action="testAsyncSingle">
          Load Async User
        </button>
        <p class="text-muted" style="margin-top: 0.5rem;">
          <code>ctx.render(&lt;AsyncUserCard userId="42" /&gt;)</code> - component fetches data
        </p>

        <h4 style="margin-top: 1.5rem;">Example 9: Async components (array render)</h4>
        <div class="multi-render-grid" style="grid-template-columns: repeat(2, 1fr);">
          <div id="async-array-1" class="demo-box">User 1 placeholder</div>
          <div id="async-array-2" class="demo-box">User 2 placeholder</div>
        </div>
        <button beam-action="testAsyncArray">
          Load Multiple Async Users
        </button>
        <p class="text-muted" style="margin-top: 0.5rem;">
          <code>ctx.render([&lt;AsyncUserCard /&gt;, &lt;AsyncUserCard /&gt;])</code>
        </p>

        <h4 style="margin-top: 1.5rem;">Example 10: Mixed sync and async (array)</h4>
        <div class="multi-render-grid" style="grid-template-columns: repeat(2, 1fr);">
          <div id="async-mixed-1" class="demo-box">Sync placeholder</div>
          <div id="async-mixed-2" class="demo-box">Async placeholder</div>
        </div>
        <button beam-action="testAsyncMixed">
          Load Mixed Content
        </button>
        <p class="text-muted" style="margin-top: 0.5rem;">
          First item is sync JSX, second is async component — both render correctly
        </p>
      </div>

      {/* ============ ALPINE REPLACEMENT FEATURES ============ */}

      {/* Reactive Toggles */}
      <div class="demo-section">
        <h2>15. Reactive Toggle (beam-state-toggle) - No Server</h2>
        <p class="text-muted">Single UI model: reactive state + bindings.</p>
        <div beam-state='{"open1": false, "open2": false, "open3": false}' class="reactive-demo">
          <div class="demo-actions">
            <button type="button" beam-state-toggle="open1">Toggle Menu</button>
            <button type="button" beam-state-toggle="open2">Toggle Panel</button>
            <button type="button" beam-state-toggle="open3">Toggle Details</button>
          </div>

          <div beam-show="open1" class="toggle-content">
            <p><strong>Menu</strong></p>
            <p>This content is controlled by state.</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
              <li>Item 3</li>
            </ul>
          </div>

          <div beam-show="open2" class="toggle-content">
            <p><strong>Panel</strong></p>
            <p>Also controlled by state — no server round-trip.</p>
          </div>

          <div beam-show="open3" class="details-content">
            <p><strong>Details</strong></p>
            <p>This section expands/collapses via state.</p>
          </div>
        </div>
      </div>

      {/* Reactive Dropdown */}
      <div class="demo-section">
        <h2>16. Reactive Dropdown (beam-state) - No Server</h2>
        <p class="text-muted">A dropdown is just state + conditional rendering.</p>
        <div beam-state='{"open": false}' class="reactive-demo">
          <button type="button" beam-state-toggle="open" class="dropdown-btn">
            Account <span beam-show="!open">▼</span><span beam-show="open">▲</span>
          </button>
          <div beam-show="open" class="dropdown" style="margin-top: 0.5rem;">
            <a href="#profile">Profile</a>
            <a href="#settings">Settings</a>
            <a href="#logout">Logout</a>
          </div>
        </div>
      </div>

      {/* Reactive Collapse */}
      <div class="demo-section">
        <h2>17. Reactive Collapse (beam-state-toggle) - No Server</h2>
        <p class="text-muted">Collapse is a boolean + conditional content.</p>
        <div beam-state='{"open": false}' class="reactive-demo">
          <button type="button" beam-state-toggle="open">
            <span beam-show="!open">Show more details</span>
            <span beam-show="open">Show less details</span>
          </button>
          <div beam-show="open" class="details-content">
            <p><strong>Expanded Content!</strong></p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
          </div>
        </div>
      </div>

      {/* Reactive Class Toggle */}
      <div class="demo-section">
        <h2>18. Reactive Class Toggle (beam-class + beam-state-toggle) - No Server</h2>
        <p class="text-muted">Bind classes to state instead of mutating the DOM.</p>
        <div beam-state='{"highlighted": false}' class="reactive-demo">
          <button type="button" beam-state-toggle="highlighted">Toggle Highlight</button>
          <div beam-class="highlighted: highlighted" class="highlight-box">
            This box gets the "highlighted" class when state is true.
          </div>
        </div>
      </div>

      {/* Reactive State System */}
      <div class="demo-section">
        <h2>18b. Reactive State (beam-state) - No Server</h2>
        <p class="text-muted">Fine-grained reactivity for UI components like tabs, accordions, carousels.</p>

        {/* Accordion */}
        <h4>Accordion</h4>
        <div beam-state='{"open": false}' class="reactive-demo">
          <button beam-click="open = !open" class="accordion-trigger">
            <span beam-show="!open">▶</span>
            <span beam-show="open">▼</span>
            Toggle Accordion
          </button>
          <div beam-show="open" class="accordion-content">
            <p>This content is controlled by reactive state.</p>
            <p>No server round-trip needed!</p>
          </div>
        </div>

        {/* Tabs */}
        <h4 style="margin-top: 1.5rem;">Tabs</h4>
        <div beam-state='{"tab": 0}' class="reactive-demo">
          <div class="tabs-nav">
            <button beam-click="tab = 0" beam-class="{'{ active: tab === 0 }'}">Tab 1</button>
            <button beam-click="tab = 1" beam-class="{'{ active: tab === 1 }'}">Tab 2</button>
            <button beam-click="tab = 2" beam-class="{'{ active: tab === 2 }'}">Tab 3</button>
          </div>
          <div class="tabs-content">
            <div beam-show="tab === 0" class="tab-panel">Content for Tab 1. This is the first panel.</div>
            <div beam-show="tab === 1" class="tab-panel">Content for Tab 2. Different content here!</div>
            <div beam-show="tab === 2" class="tab-panel">Content for Tab 3. The final panel.</div>
          </div>
        </div>

        {/* Carousel/Slider */}
        <h4 style="margin-top: 1.5rem;">Carousel / Slider</h4>
        <div beam-state='{"slide": 0, "total": 5}' class="reactive-demo">
          <div class="carousel-controls">
            <button beam-click="slide = (slide - 1 + total) % total" class="carousel-btn">← Prev</button>
            <span class="carousel-counter">
              Slide <span beam-text="slide + 1"></span> of <span beam-text="total"></span>
            </span>
            <button beam-click="slide = (slide + 1) % total" class="carousel-btn">Next →</button>
          </div>
          <div class="carousel-slide">
            <div beam-show="slide === 0" class="slide">🏠 Slide 1: Welcome!</div>
            <div beam-show="slide === 1" class="slide">📦 Slide 2: Products</div>
            <div beam-show="slide === 2" class="slide">💡 Slide 3: Features</div>
            <div beam-show="slide === 3" class="slide">📞 Slide 4: Contact</div>
            <div beam-show="slide === 4" class="slide">✅ Slide 5: Done!</div>
          </div>
        </div>

        {/* Counter with disabled state */}
        <h4 style="margin-top: 1.5rem;">Counter with Attribute Binding</h4>
        <div beam-state='{"count": 0}' class="reactive-demo">
          <div class="counter-controls">
            <button beam-click="count--" beam-attr-disabled="count === 0" class="counter-btn">-</button>
            <span class="counter-value" beam-text="count"></span>
            <button beam-click="count++" beam-attr-disabled="count >= 10" class="counter-btn">+</button>
          </div>
          <p class="text-muted">- is disabled at 0, + is disabled at 10</p>
        </div>

        {/* Dropdown */}
        <h4 style="margin-top: 1.5rem;">Dropdown (Reactive)</h4>
        <div beam-state='{"open": false}' class="reactive-demo">
          <button beam-click="open = !open" class="dropdown-btn">
            Menu <span beam-show="!open">▼</span><span beam-show="open">▲</span>
          </button>
          <div beam-show="open" beam-class="{'{ dropdown: true }'}">
            <a href="#profile">Profile</a>
            <a href="#settings">Settings</a>
            <a href="#logout">Logout</a>
          </div>
        </div>

        {/* Named State (Cross-Component) */}
        <h4 style="margin-top: 1.5rem;">Named State (Cross-Component)</h4>
        <p class="text-muted">State can be shared across components using <code>beam-id</code> and <code>beam-state-ref</code>.</p>
        <div class="named-state-demo">
          <div beam-state='{"cartCount": 0}' beam-id="demo-cart" class="cart-display">
            🛒 Cart: <span beam-text="cartCount"></span> items
          </div>
          <div class="product-list">
            <div class="product-item">
              <span>Widget</span>
              <button beam-state-ref="demo-cart" beam-click="cartCount++">Add to Cart</button>
            </div>
            <div class="product-item">
              <span>Gadget</span>
              <button beam-state-ref="demo-cart" beam-click="cartCount++">Add to Cart</button>
            </div>
            <div class="product-item">
              <span>Gizmo</span>
              <button beam-state-ref="demo-cart" beam-click="cartCount++">Add to Cart</button>
            </div>
          </div>
          <button beam-state-ref="demo-cart" beam-click="cartCount = 0" style="margin-top: 0.5rem;">Clear Cart</button>
        </div>
      </div>

      {/* Combined Example */}
      <div class="demo-section">
        <h2>19. Combined Example - Navigation Pattern</h2>
        <p class="text-muted">Multiple buttons controlling the same state (mobile menu pattern).</p>
        <div beam-state='{"open": false}' class="reactive-demo">
          <div class="demo-actions">
            <button type="button" beam-state-toggle="open=true">Open Menu</button>
            <button type="button" beam-state-toggle="open">Toggle Menu</button>
          </div>
          <div beam-show="open" class="toggle-content">
            <nav style="display: flex; flex-direction: column; gap: 0.5rem;">
              <a href="#home" style="padding: 0.5rem; color: #333;">Home</a>
              <a href="#products" style="padding: 0.5rem; color: #333;">Products</a>
              <a href="#about" style="padding: 0.5rem; color: #333;">About</a>
              <a href="#contact" style="padding: 0.5rem; color: #333;">Contact</a>
            </nav>
            <button type="button" beam-state-toggle="open=false" style="margin-top: 1rem;">Close Menu</button>
          </div>
        </div>
      </div>
    </Layout>
  )
})
