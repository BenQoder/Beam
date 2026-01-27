import { createRoute } from 'honox/factory'
import { Layout } from '../components/Layout'

export default createRoute(async (c) => {
  const authToken = c.get('beamAuthToken')

  return c.html(
    <Layout title="Beam Inputs Demo" authToken={authToken}>
      <h1>Beam Inputs &amp; Forms Demo</h1>
      <p class="text-muted">Testing input handling - aiming for Unpoly-like UX with superpowers</p>

      {/* ============ LIVE SEARCH ============ */}
      <div class="demo-section">
        <h2>1. Live Search (beam-action + beam-watch)</h2>
        <p class="text-muted">
          Input with <code>beam-action</code> + <code>beam-watch="input"</code> triggers on every keystroke.
          <br/>
          <strong>Expected:</strong> Results update as you type (debounced).
        </p>
        <div class="input-group">
          <input
            type="text"
            name="q"
            placeholder="Search products..."
            beam-action="searchProducts"
            beam-target="#search-results"
            beam-watch="input"
            beam-debounce="300"
          />
        </div>
        <div id="search-results" class="results-box">
          Type to search...
        </div>
      </div>

      {/* ============ AUTO-SAVE INPUT ============ */}
      <div class="demo-section">
        <h2>2. Auto-Save Input (beam-watch="change")</h2>
        <p class="text-muted">
          Input saves automatically on change (blur). No form needed.
          <br/>
          <strong>Expected:</strong> Value saves when you leave the field.
        </p>
        <div class="input-group">
          <label>Profile Name</label>
          <input
            type="text"
            name="profileName"
            placeholder="Enter your name..."
            beam-action="saveField"
            beam-data-field="profileName"
            beam-target="#autosave-status"
            beam-watch="change"
            beam-keep
          />
        </div>
        <div id="autosave-status" class="status-box">
          Not saved yet
        </div>
      </div>

      {/* ============ INPUT WITH REAL-TIME FEEDBACK ============ */}
      <div class="demo-section">
        <h2>3. Real-time Input Feedback (beam-watch="input")</h2>
        <p class="text-muted">
          Shows character count and validation as you type.
          <br/>
          <strong>Expected:</strong> Feedback updates on every keystroke.
        </p>
        <div class="input-group">
          <label>Bio (max 100 chars)</label>
          <textarea
            name="bio"
            placeholder="Write something about yourself..."
            rows={3}
            beam-action="validateBio"
            beam-target="#bio-feedback"
            beam-watch="input"
            beam-debounce="100"
            beam-keep
          ></textarea>
        </div>
        <div id="bio-feedback" class="feedback-box">
          0/100 characters
        </div>
      </div>

      {/* ============ SELECT DROPDOWN ============ */}
      <div class="demo-section">
        <h2>4. Select Dropdown (beam-watch="change")</h2>
        <p class="text-muted">
          Dropdown triggers action on selection change.
          <br/>
          <strong>Expected:</strong> Content updates when selection changes.
        </p>
        <div class="input-group">
          <label>Select Category</label>
          <select
            name="category"
            beam-action="loadCategory"
            beam-target="#category-content"
            beam-watch="change"
          >
            <option value="">-- Select --</option>
            <option value="electronics">Electronics</option>
            <option value="clothing">Clothing</option>
            <option value="books">Books</option>
          </select>
        </div>
        <div id="category-content" class="results-box">
          Select a category to load content
        </div>
      </div>

      {/* ============ CHECKBOX FILTER ============ */}
      <div class="demo-section">
        <h2>5. Checkbox Filters (beam-watch="change")</h2>
        <p class="text-muted">
          Checkboxes trigger filtering on change.
          <br/>
          <strong>Expected:</strong> Results filter when checkboxes are toggled.
        </p>
        <div class="filter-group">
          <label>
            <input
              type="checkbox"
              name="inStock"
              value="true"
              beam-action="filterProducts"
              beam-target="#filter-results"
              beam-watch="change"
            />
            In Stock Only
          </label>
          <label>
            <input
              type="checkbox"
              name="onSale"
              value="true"
              beam-action="filterProducts"
              beam-target="#filter-results"
              beam-watch="change"
            />
            On Sale
          </label>
          <label>
            <input
              type="checkbox"
              name="freeShipping"
              value="true"
              beam-action="filterProducts"
              beam-target="#filter-results"
              beam-watch="change"
            />
            Free Shipping
          </label>
        </div>
        <div id="filter-results" class="results-box">
          No filters applied
        </div>
      </div>

      {/* ============ RADIO BUTTONS ============ */}
      <div class="demo-section">
        <h2>6. Radio Buttons (beam-watch="change")</h2>
        <p class="text-muted">
          Radio buttons trigger action on selection.
          <br/>
          <strong>Expected:</strong> Price updates when plan is selected.
        </p>
        <div class="radio-group">
          <label>
            <input
              type="radio"
              name="plan"
              value="basic"
              beam-action="selectPlan"
              beam-target="#plan-details"
              beam-watch="change"
            />
            Basic
          </label>
          <label>
            <input
              type="radio"
              name="plan"
              value="pro"
              beam-action="selectPlan"
              beam-target="#plan-details"
              beam-watch="change"
            />
            Pro
          </label>
          <label>
            <input
              type="radio"
              name="plan"
              value="enterprise"
              beam-action="selectPlan"
              beam-target="#plan-details"
              beam-watch="change"
            />
            Enterprise
          </label>
        </div>
        <div id="plan-details" class="results-box">
          Select a plan to see details
        </div>
      </div>

      {/* ============ FORM WITH VALIDATION ============ */}
      <div class="demo-section">
        <h2>7. Form with Real-time Validation</h2>
        <p class="text-muted">
          Form fields validate individually as you type, form submits as a whole.
          <br/>
          <strong>Expected:</strong> Each field shows validation feedback, form submits when valid.
        </p>
        <form beam-action="submitContact" beam-target="#contact-result">
          <div class="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="your@email.com"
              beam-validate="#email-error"
              beam-watch="input"
              beam-debounce="400"
            />
            <div id="email-error" class="field-error"></div>
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input
              type="tel"
              name="phone"
              placeholder="+234..."
              beam-validate="#phone-error"
              beam-watch="input"
              beam-debounce="400"
            />
            <div id="phone-error" class="field-error"></div>
          </div>
          <div class="form-group">
            <label>Message</label>
            <textarea
              name="message"
              placeholder="Your message..."
              rows={3}
              beam-validate="#message-error"
              beam-watch="input"
              beam-debounce="400"
            ></textarea>
            <div id="message-error" class="field-error"></div>
          </div>
          <button type="submit">Send Message</button>
        </form>
        <div id="contact-result" class="results-box">
          Form result will appear here
        </div>
      </div>

      {/* ============ AUTOCOMPLETE / TYPEAHEAD ============ */}
      <div class="demo-section">
        <h2>8. Autocomplete / Typeahead</h2>
        <p class="text-muted">
          Input shows suggestions as you type, click to select.
          <br/>
          <strong>Expected:</strong> Dropdown appears with matching suggestions.
        </p>
        <div class="autocomplete-wrapper">
          <input
            type="text"
            name="city"
            placeholder="Search city..."
            beam-action="searchCities"
            beam-target="#city-suggestions"
            beam-swap="replace"
            beam-watch="input"
            beam-debounce="200"
            beam-keep
            autocomplete="off"
          />
          <div id="city-suggestions" class="suggestions-dropdown"></div>
        </div>
        <div id="selected-city" class="status-box">
          No city selected
        </div>
      </div>

      {/* ============ DEPENDENT FIELDS ============ */}
      <div class="demo-section">
        <h2>9. Dependent Fields (Country → State)</h2>
        <p class="text-muted">
          Second select updates based on first selection.
          <br/>
          <strong>Expected:</strong> States populate when country is selected.
        </p>
        <div class="input-row">
          <div class="input-group">
            <label>Country</label>
            <select
              name="country"
              beam-action="loadStates"
              beam-target="#state-select"
              beam-watch="change"
            >
              <option value="">-- Select Country --</option>
              <option value="ng">Nigeria</option>
              <option value="us">United States</option>
              <option value="uk">United Kingdom</option>
            </select>
          </div>
          <div class="input-group">
            <label>State</label>
            <div id="state-select">
              <select name="state" disabled>
                <option value="">-- Select Country First --</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ============ INLINE EDIT ============ */}
      <div class="demo-section">
        <h2>10. Inline Edit (Click to Edit)</h2>
        <p class="text-muted">
          Click text to edit, saves on blur or Enter.
          <br/>
          <strong>Expected:</strong> Text becomes editable input, saves when done.
        </p>
        <div id="inline-edit-container">
          <span
            class="editable-text"
            beam-action="startInlineEdit"
            beam-data-field="title"
            beam-data-value="Click to edit this title"
            beam-target="#inline-edit-container"
          >
            Click to edit this title
          </span>
        </div>
      </div>

      {/* ============ RANGE SLIDER ============ */}
      <div class="demo-section">
        <h2>11. Range Slider</h2>
        <p class="text-muted">
          Range input updates display as you drag.
          <br/>
          <strong>Expected:</strong> Value and styled display update in real-time.
        </p>
        <div class="range-group">
          <label>Price Range: <span id="price-display">$50</span></label>
          <input
            type="range"
            name="price"
            min="0"
            max="100"
            value="50"
            beam-action="updatePrice"
            beam-target="#price-display"
            beam-watch="input"
            beam-debounce="50"
          />
        </div>
        <div id="price-products" class="results-box">
          Showing products up to $50
        </div>
      </div>

      {/* ============ STYLES ============ */}
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
        .text-muted {
          color: #666;
          font-size: 0.9rem;
        }
        .text-muted code {
          background: #f5f5f5;
          padding: 0.1rem 0.3rem;
          border-radius: 3px;
          font-size: 0.85em;
        }

        .input-group {
          margin: 1rem 0;
        }
        .input-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        .input-group input,
        .input-group textarea,
        .input-group select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 1rem;
        }
        .input-group input:focus,
        .input-group textarea:focus,
        .input-group select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .input-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .results-box {
          padding: 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          margin-top: 1rem;
          min-height: 60px;
        }

        .status-box {
          padding: 0.75rem;
          background: #f1f5f9;
          border-radius: 6px;
          margin-top: 0.5rem;
          font-size: 0.9rem;
          color: #64748b;
        }

        .feedback-box {
          padding: 0.5rem;
          font-size: 0.875rem;
          color: #64748b;
        }
        .feedback-box.error {
          color: #dc2626;
        }
        .feedback-box.success {
          color: #16a34a;
        }

        .filter-group {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .filter-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .radio-group {
          display: flex;
          gap: 1.5rem;
        }
        .radio-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 1rem;
        }
        .field-error {
          font-size: 0.875rem;
          margin-top: 0.25rem;
          min-height: 1.25rem;
        }
        .field-error .error {
          color: #dc2626;
        }
        .field-error .success {
          color: #16a34a;
        }

        .autocomplete-wrapper {
          position: relative;
        }
        .suggestions-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 6px 6px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 100;
          display: none;
        }
        .suggestions-dropdown.active {
          display: block;
        }
        .suggestion-item {
          padding: 0.75rem;
          cursor: pointer;
        }
        .suggestion-item:hover {
          background: #f1f5f9;
        }

        .editable-text {
          padding: 0.5rem;
          border: 1px dashed transparent;
          cursor: pointer;
          display: inline-block;
        }
        .editable-text:hover {
          border-color: #3b82f6;
          background: #f8fafc;
        }
        .inline-input {
          padding: 0.5rem;
          border: 1px solid #3b82f6;
          border-radius: 4px;
          font-size: inherit;
        }

        .range-group {
          margin: 1rem 0;
        }
        .range-group input[type="range"] {
          width: 100%;
          margin-top: 0.5rem;
        }

        button[type="submit"] {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-size: 1rem;
          cursor: pointer;
        }
        button[type="submit"]:hover {
          background: #2563eb;
        }

        /* Search result items */
        .search-item {
          padding: 0.75rem;
          border-bottom: 1px solid #e2e8f0;
        }
        .search-item:last-child {
          border-bottom: none;
        }
        .search-item-title {
          font-weight: 500;
        }
        .search-item-price {
          color: #16a34a;
          font-size: 0.9rem;
        }
      `}</style>
    </Layout>
  )
})
