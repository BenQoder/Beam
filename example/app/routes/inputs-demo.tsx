import { createRoute } from 'honox/factory'
import { Layout } from '../components/Layout'

export default createRoute(async (c) => {
  const authToken = c.get('beamAuthToken')

  return c.html(
    <Layout title="Beam Inputs Demo" authToken={authToken}>
      <h1>Beam Inputs &amp; Forms Demo</h1>
      <p class="text-muted">Testing input handling - aiming for great UX (focus/caret/keep) with server-driven updates</p>

      {/* ============ LIVE SEARCH ============ */}
      <div class="demo-section">
        <h2>1. Live Search (beam-action + beam-watch)</h2>
        <p class="text-muted">
          Input with <code>beam-action</code> + <code>beam-watch="input"</code> triggers on every keystroke.
          <br />
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
          <br />
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
          <br />
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
          <br />
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
          <br />
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
          <br />
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
          <br />
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
          <br />
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
          <br />
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
          <br />
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
        <h2>11. Range Slider (beam-throttle)</h2>
        <p class="text-muted">
          Range input updates display as you drag using <code>beam-throttle</code> instead of debounce.
          <br />
          <strong>Expected:</strong> Value updates at regular intervals while dragging (not delayed).
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
            beam-throttle="100"
          />
        </div>
        <div id="price-products" class="results-box">
          Showing products up to $50
        </div>
      </div>

      {/* ============ CONDITIONAL TRIGGER ============ */}
      <div class="demo-section">
        <h2>12. Conditional Trigger (beam-watch-if)</h2>
        <p class="text-muted">
          Search only triggers when input is at least 3 characters.
          <br />
          <strong>Expected:</strong> No request until you type 3+ characters.
        </p>
        <div class="input-group">
          <input
            type="text"
            name="q"
            placeholder="Type 3+ chars to search..."
            beam-action="searchProducts"
            beam-target="#conditional-results"
            beam-watch="input"
            beam-watch-if="value.length >= 3"
            beam-debounce="300"
          />
        </div>
        <div id="conditional-results" class="results-box">
          Type at least 3 characters to search...
        </div>
      </div>

      {/* ============ LOADING CLASS ============ */}
      <div class="demo-section">
        <h2>13. Loading Class (beam-loading-class)</h2>
        <p class="text-muted">
          Input gets a custom class while request is in progress.
          <br />
          <strong>Expected:</strong> Input border turns blue and pulses while loading.
        </p>
        <div class="input-group">
          <input
            type="text"
            name="q"
            placeholder="Search (watch the border)..."
            beam-action="searchProducts"
            beam-target="#loading-class-results"
            beam-watch="input"
            beam-debounce="300"
            beam-loading-class="input-loading"
          />
        </div>
        <div id="loading-class-results" class="results-box">
          Type to search...
        </div>
      </div>

      {/* ============ DIRTY FORM TRACKING ============ */}
      <div class="demo-section">
        <h2>14. Dirty Form Tracking (beam-dirty-track)</h2>
        <p class="text-muted">
          Form tracks changes and shows dirty indicator.
          <br />
          <strong>Expected:</strong> Asterisk appears after you modify any field. Revert button restores original values.
        </p>
        <form id="dirty-form" beam-dirty-track>
          <div class="form-header">
            <h4>
              User Profile
              <span beam-dirty-indicator="#dirty-form" class="dirty-indicator">*</span>
            </h4>
            <div class="form-actions">
              <button type="button" beam-revert="#dirty-form" beam-show-if-dirty="#dirty-form" class="btn-secondary">
                Revert Changes
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>Username</label>
            <input type="text" name="username" value="johndoe" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" value="john@example.com" />
          </div>
          <div class="form-group">
            <label>Bio</label>
            <textarea name="bio" rows={2}>Software developer</textarea>
          </div>
          <button type="submit">Save (Demo Only)</button>
        </form>
      </div>

      {/* ============ UNSAVED CHANGES WARNING ============ */}
      <div class="demo-section">
        <h2>15. Unsaved Changes Warning (beam-warn-unsaved)</h2>
        <p class="text-muted">
          Form warns before navigating away if there are unsaved changes.
          <br />
          <strong>Expected:</strong> Modify a field, then try to close/refresh the page. Browser should warn you.
        </p>
        <form beam-dirty-track beam-warn-unsaved>
          <div class="form-group">
            <label>Important Data</label>
            <input type="text" name="important" placeholder="Type something, then try to close the tab..." />
          </div>
        </form>
      </div>

      {/* ============ CONDITIONAL FIELDS ============ */}
      <div class="demo-section">
        <h2>16. Conditional Fields (beam-enable-if, beam-visible-if)</h2>
        <p class="text-muted">
          Fields enable/disable or show/hide based on other field values.
          <br />
          <strong>Expected:</strong> Check "Subscribe" to enable email input. Select "Other" to show custom input.
        </p>
        <div class="form-group">
          <label>
            <input type="checkbox" id="subscribe-check" name="subscribe" />
            Subscribe to newsletter
          </label>
        </div>
        <div class="form-group">
          <label>Email (enabled when subscribed)</label>
          <input
            type="email"
            name="newsletter-email"
            placeholder="Enter your email..."
            beam-enable-if="#subscribe-check:checked"
            disabled
          />
        </div>

        <hr style="margin: 1.5rem 0" />

        <div class="form-group">
          <label>How did you hear about us?</label>
          <select name="source" id="source-select">
            <option value="">-- Select --</option>
            <option value="google">Google Search</option>
            <option value="friend">Friend Referral</option>
            <option value="social">Social Media</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="form-group" beam-visible-if="#source-select[value='other']">
          <label>Please specify</label>
          <input type="text" name="source-other" placeholder="Tell us more..." />
        </div>
      </div>

      {/* ============ REQUIRED-IF ============ */}
      <div class="demo-section">
        <h2>17. Required-If (beam-required-if)</h2>
        <p class="text-muted">
          Field becomes required based on another field's state.
          <br />
          <strong>Expected:</strong> Check "Business account" to make company name required (shows red border on submit).
        </p>
        <form onsubmit="event.preventDefault(); alert('Form submitted!')">
          <div class="form-group">
            <label>
              <input type="checkbox" id="business-check" name="is-business" />
              This is a business account
            </label>
          </div>
          <div class="form-group">
            <label>Company Name</label>
            <input
              type="text"
              name="company"
              placeholder="Required for business accounts..."
              beam-required-if="#business-check:checked"
            />
          </div>
          <button type="submit">Submit</button>
        </form>
      </div>

      {/* ============ BEAM-INCLUDE ============ */}
      <div class="demo-section">
        <h2>18. Include Inputs (beam-include)</h2>
        <p class="text-muted">
          Collect values from inputs by <code>beam-id</code>, <code>id</code>, or <code>name</code> and include in action params.
          <br />
          <strong>Expected:</strong> Button collects input values and sends them to the action. Types are auto-converted.
        </p>
        <div class="input-row">
          <div class="input-group">
            <label>Name (beam-id)</label>
            <input beam-id="inc-name" type="text" value="Alice" />
          </div>
          <div class="input-group">
            <label>Email (id)</label>
            <input id="inc-email" type="email" value="alice@example.com" />
          </div>
        </div>
        <div class="input-row">
          <div class="input-group">
            <label>Age (name, number)</label>
            <input name="inc-age" type="number" value="28" />
          </div>
          <div class="input-group">
            <label>Score (range)</label>
            <input beam-id="inc-score" type="range" min="0" max="100" value="75" />
          </div>
        </div>
        <div class="filter-group" style="margin: 1rem 0;">
          <label>
            <input beam-id="inc-newsletter" type="checkbox" checked />
            Newsletter (checkbox)
          </label>
          <label>
            <input beam-id="inc-premium" type="checkbox" />
            Premium (checkbox)
          </label>
        </div>
        <div id="include-result" class="results-box">
          Click a button to see collected params...
        </div>
        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
          <button
            beam-action="testInclude"
            beam-include="inc-name,inc-email,inc-age,inc-score,inc-newsletter,inc-premium"
            beam-data-action="all"
            beam-target="#include-result"
          >
            Include All
          </button>
          <button
            beam-action="testInclude"
            beam-include="inc-name,inc-email"
            beam-data-action="partial"
            beam-target="#include-result"
          >
            Include Name + Email Only
          </button>
          <button
            beam-action="testInclude"
            beam-include="inc-score"
            beam-data-min="0"
            beam-data-max="100"
            beam-target="#include-result"
          >
            Include Score (with data-*)
          </button>
        </div>
      </div>

      {/* ============ BEAM-KEEP TEST ============ */}
      <div class="demo-section">
        <h2>19. Beam-Keep Test (beam-keep)</h2>
        <p class="text-muted">
          Tests that <code>beam-keep</code> prevents an element from being replaced during updates.
          <br />
          <strong>Expected:</strong> Only the element WITHOUT beam-keep should update. The beam-keep element stays unchanged.
        </p>
        <div
          id="keep-test-container"
          beam-poll
          beam-interval="2000"
          beam-action="testBeamKeep"
        >
          <div class="keep-test-grid">
            <div class="keep-test-box">
              <strong>With beam-keep (should NOT update):</strong>
              <div id="keep-child" beam-keep class="keep-value">Initial value - should never change</div>
            </div>
            <div class="keep-test-box">
              <strong>Without beam-keep (SHOULD update):</strong>
              <div id="no-keep-child" class="keep-value">Initial value - will change on poll</div>
            </div>
          </div>
        </div>
        <p class="text-muted" style="margin-top: 1rem;">
          Polling every 2 seconds. Watch the values above.
        </p>
      </div>

      {/* ============ BEAM-KEEP REMOVAL TEST ============ */}
      <div class="demo-section">
        <h2>20. Beam-Keep Removal Test (Form Swap)</h2>
        <p class="text-muted">
          Tests that <code>beam-keep</code> elements are <strong>removed</strong> when they don't exist in the new DOM.
          <br />
          <code>beam-keep</code> preserves values during <em>updates</em>, but allows <em>removal</em> when the element is gone.
          <br />
          <strong>Expected:</strong> Type in the input, click "Submit" → form swaps to success message, input is GONE (not preserved).
        </p>
        <div id="keep-removal-container">
          <div class="keep-removal-form">
            <div class="form-group">
              <label>Email (has beam-keep)</label>
              <input
                type="email"
                name="keep-email"
                placeholder="Type something here..."
                beam-keep
                class="keep-removal-input"
              />
            </div>
            <button
              type="button"
              beam-action="testBeamKeepRemoval"
              beam-include="keep-email"
              beam-target="#keep-removal-container"
            >
              Submit (Swaps to Different Form)
            </button>
          </div>
        </div>
        <p class="text-muted" style="margin-top: 1rem;">
          <strong>Before fix:</strong> Input would persist below the success message (bug).<br />
          <strong>After fix:</strong> Input is properly removed when form swaps.
        </p>
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

        /* Loading class for inputs */
        .input-loading {
          border-color: #3b82f6 !important;
          animation: pulse-border 1s ease-in-out infinite;
        }
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          50% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2); }
        }

        /* Dirty form indicator */
        .dirty-indicator {
          color: #f59e0b;
          font-weight: bold;
          margin-left: 0.25rem;
        }
        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .form-header h4 {
          margin: 0;
        }
        .form-actions {
          display: flex;
          gap: 0.5rem;
        }
        .btn-secondary {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .btn-secondary:hover {
          background: #e2e8f0;
        }

        /* Disabled fields */
        input:disabled,
        select:disabled,
        textarea:disabled {
          background: #f8fafc;
          color: #94a3b8;
          cursor: not-allowed;
        }

        /* Required field indicator */
        input:required {
          border-color: #f59e0b;
        }
        input:required:invalid {
          border-color: #ef4444;
        }

        /* Beam-keep test styles */
        .keep-test-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin: 1rem 0;
        }
        .keep-test-box {
          padding: 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }
        .keep-test-box strong {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }
        .keep-value {
          padding: 0.75rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.875rem;
        }

        /* Beam-keep removal test styles */
        .keep-removal-form {
          padding: 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }
        .keep-removal-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
          margin-bottom: 1rem;
        }
        .keep-removal-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </Layout>
  )
})
