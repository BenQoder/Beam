import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext } from '@benqoder/beam'
import type { Env } from '../types'

function render(node: HtmlEscapedString | Promise<HtmlEscapedString>): Promise<string> {
  return Promise.resolve(node).then(n => n.toString())
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// ============ MOCK DATA ============

const products = [
  { id: 1, name: 'Wireless Headphones', price: 79.99, inStock: true, onSale: false, freeShipping: true },
  { id: 2, name: 'Bluetooth Speaker', price: 49.99, inStock: true, onSale: true, freeShipping: false },
  { id: 3, name: 'USB-C Cable', price: 12.99, inStock: true, onSale: false, freeShipping: true },
  { id: 4, name: 'Laptop Stand', price: 39.99, inStock: false, onSale: true, freeShipping: false },
  { id: 5, name: 'Webcam HD', price: 59.99, inStock: true, onSale: false, freeShipping: true },
  { id: 6, name: 'Mechanical Keyboard', price: 129.99, inStock: true, onSale: true, freeShipping: true },
  { id: 7, name: 'Mouse Pad XL', price: 24.99, inStock: false, onSale: false, freeShipping: true },
  { id: 8, name: 'Monitor Light Bar', price: 44.99, inStock: true, onSale: false, freeShipping: false },
]

const cities = [
  'Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan',
  'London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds',
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
]

const states: Record<string, string[]> = {
  ng: ['Lagos', 'Abuja FCT', 'Rivers', 'Kano', 'Oyo', 'Kaduna', 'Enugu'],
  us: ['California', 'New York', 'Texas', 'Florida', 'Illinois', 'Washington'],
  uk: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
}

const plans: Record<string, { name: string; price: string; features: string[] }> = {
  basic: { name: 'Basic', price: '$9/mo', features: ['5 projects', '1GB storage', 'Email support'] },
  pro: { name: 'Pro', price: '$29/mo', features: ['Unlimited projects', '100GB storage', 'Priority support', 'API access'] },
  enterprise: { name: 'Enterprise', price: '$99/mo', features: ['Unlimited everything', '1TB storage', '24/7 support', 'Custom integrations', 'SLA guarantee'] },
}

const categories: Record<string, { title: string; items: string[] }> = {
  electronics: { title: 'Electronics', items: ['Smartphones', 'Laptops', 'Tablets', 'Wearables'] },
  clothing: { title: 'Clothing', items: ['T-Shirts', 'Jeans', 'Dresses', 'Jackets'] },
  books: { title: 'Books', items: ['Fiction', 'Non-Fiction', 'Science', 'Biography'] },
}

// In-memory state
let savedFields: Record<string, string> = {}
let inlineEditValue = 'Click to edit this title'

// ============ LIVE SEARCH ============

export async function searchProducts(_ctx: BeamContext<Env>, { q }: Record<string, unknown>): Promise<string> {
  const query = String(q || '').toLowerCase().trim()

  if (!query) {
    return render(<div class="results-box">Type to search...</div>)
  }

  await delay(200) // Simulate network delay

  const results = products.filter(p =>
    p.name.toLowerCase().includes(query)
  )

  if (results.length === 0) {
    return render(
      <div class="results-box">
        No products found for "{query}"
      </div>
    )
  }

  return render(
    <div class="results-box">
      <div class="results-header">{results.length} result(s) for "{query}"</div>
      {results.map(p => (
        <div class="search-item" key={p.id}>
          <div class="search-item-title">{p.name}</div>
          <div class="search-item-price">${p.price.toFixed(2)}</div>
        </div>
      ))}
    </div>
  )
}

// ============ AUTO-SAVE FIELD ============

export async function saveField(_ctx: BeamContext<Env>, data: Record<string, unknown>): Promise<string> {
  const field = String(data.field || '')
  const value = String(data[field] || data.value || '')

  await delay(300) // Simulate save

  savedFields[field] = value

  return render(
    <div class="status-box success">
      ✓ Saved "{value}" at {new Date().toLocaleTimeString()}
    </div>
  )
}

// ============ BIO VALIDATION ============

export async function validateBio(_ctx: BeamContext<Env>, { bio }: Record<string, unknown>): Promise<string> {
  const text = String(bio || '')
  const length = text.length
  const max = 100

  if (length === 0) {
    return render(<div class="feedback-box">0/{max} characters</div>)
  }

  if (length > max) {
    return render(
      <div class="feedback-box error">
        {length}/{max} characters - Too long! Remove {length - max} characters.
      </div>
    )
  }

  if (length > max * 0.8) {
    return render(
      <div class="feedback-box warning">
        {length}/{max} characters - Getting close!
      </div>
    )
  }

  return render(
    <div class="feedback-box success">
      {length}/{max} characters
    </div>
  )
}

// ============ CATEGORY LOADING ============

export async function loadCategory(_ctx: BeamContext<Env>, { category }: Record<string, unknown>): Promise<string> {
  const cat = String(category || '')

  if (!cat) {
    return render(<div class="results-box">Select a category to load content</div>)
  }

  await delay(400) // Simulate loading

  const data = categories[cat]
  if (!data) {
    return render(<div class="results-box">Unknown category</div>)
  }

  return render(
    <div class="results-box">
      <h4>{data.title}</h4>
      <ul>
        {data.items.map(item => <li key={item}>{item}</li>)}
      </ul>
    </div>
  )
}

// ============ FILTER PRODUCTS ============

export async function filterProducts(_ctx: BeamContext<Env>, data: Record<string, unknown>): Promise<string> {
  const inStock = data.inStock === 'true' || data.inStock === true
  const onSale = data.onSale === 'true' || data.onSale === true
  const freeShipping = data.freeShipping === 'true' || data.freeShipping === true

  const filters: string[] = []
  if (inStock) filters.push('In Stock')
  if (onSale) filters.push('On Sale')
  if (freeShipping) filters.push('Free Shipping')

  if (filters.length === 0) {
    return render(
      <div class="results-box">
        <div class="results-header">No filters applied</div>
        <div class="results-count">Showing all {products.length} products</div>
      </div>
    )
  }

  await delay(200)

  let results = [...products]
  if (inStock) results = results.filter(p => p.inStock)
  if (onSale) results = results.filter(p => p.onSale)
  if (freeShipping) results = results.filter(p => p.freeShipping)

  return render(
    <div class="results-box">
      <div class="results-header">Filters: {filters.join(', ')}</div>
      <div class="results-count">{results.length} product(s) found</div>
      {results.map(p => (
        <div class="search-item" key={p.id}>
          <span class="search-item-title">{p.name}</span>
          <span class="search-item-price">${p.price.toFixed(2)}</span>
          {p.onSale && <span class="badge sale">Sale</span>}
          {p.freeShipping && <span class="badge shipping">Free Ship</span>}
        </div>
      ))}
    </div>
  )
}

// ============ PLAN SELECTION ============

export async function selectPlan(_ctx: BeamContext<Env>, { plan }: Record<string, unknown>): Promise<string> {
  const planKey = String(plan || '')

  if (!planKey) {
    return render(<div class="results-box">Select a plan to see details</div>)
  }

  const data = plans[planKey]
  if (!data) {
    return render(<div class="results-box">Unknown plan</div>)
  }

  return render(
    <div class="results-box plan-details">
      <h4>{data.name} - {data.price}</h4>
      <ul>
        {data.features.map(f => <li key={f}>✓ {f}</li>)}
      </ul>
    </div>
  )
}

// ============ FORM VALIDATION ============

export async function submitContact(_ctx: BeamContext<Env>, data: Record<string, unknown>): Promise<string> {
  const email = String(data.email || '')
  const phone = String(data.phone || '')
  const message = String(data.message || '')
  const validateField = data._validate as string | undefined

  await delay(200)

  // Field-level validation
  if (validateField === 'email') {
    if (!email) return render(<span class="error">Email is required</span>)
    if (!email.includes('@')) return render(<span class="error">Invalid email format</span>)
    return render(<span class="success">✓ Valid email</span>)
  }

  if (validateField === 'phone') {
    if (!phone) return render(<span class="error">Phone is required</span>)
    if (phone.length < 10) return render(<span class="error">Phone too short</span>)
    return render(<span class="success">✓ Valid phone</span>)
  }

  if (validateField === 'message') {
    if (!message) return render(<span class="error">Message is required</span>)
    if (message.length < 10) return render(<span class="error">Message too short (min 10 chars)</span>)
    return render(<span class="success">✓ Looks good ({message.length} chars)</span>)
  }

  // Full form submission
  const errors: string[] = []
  if (!email || !email.includes('@')) errors.push('Invalid email')
  if (!phone || phone.length < 10) errors.push('Invalid phone')
  if (!message || message.length < 10) errors.push('Message too short')

  if (errors.length > 0) {
    return render(
      <div class="results-box error-box">
        <strong>Please fix these errors:</strong>
        <ul>
          {errors.map(e => <li key={e}>{e}</li>)}
        </ul>
      </div>
    )
  }

  return render(
    <div class="results-box success-box">
      <strong>✓ Message sent!</strong>
      <p>We'll contact you at {email}</p>
    </div>
  )
}

// ============ CITY AUTOCOMPLETE ============

export async function searchCities(_ctx: BeamContext<Env>, { city }: Record<string, unknown>): Promise<string> {
  const query = String(city || '').toLowerCase().trim()

  if (query.length < 2) {
    // Return empty - hide dropdown
    return render(
      <div id="city-suggestions" class="suggestions-dropdown"></div>
    )
  }

  await delay(150)

  const matches = cities.filter(c => c.toLowerCase().includes(query)).slice(0, 5)

  if (matches.length === 0) {
    return render(
      <div id="city-suggestions" class="suggestions-dropdown active">
        <div class="suggestion-item disabled">No cities found</div>
      </div>
    )
  }

  return render(
    <div id="city-suggestions" class="suggestions-dropdown active">
      {matches.map(c => (
        <div
          key={c}
          class="suggestion-item"
          beam-action="selectCity"
          beam-data-city={c}
          beam-target="#selected-city"
        >
          {c}
        </div>
      ))}
    </div>
  )
}

export async function selectCity(_ctx: BeamContext<Env>, { city }: Record<string, unknown>): Promise<string> {
  const selectedCity = String(city || '')

  // Return inner HTML for #selected-city target
  // OOB update clears #city-suggestions by removing 'active' class
  return render(
    <>
      Selected: <strong>{selectedCity}</strong>
      <template beam-touch="#city-suggestions"></template>
    </>
  )
}

// ============ DEPENDENT FIELDS ============

export async function loadStates(_ctx: BeamContext<Env>, { country }: Record<string, unknown>): Promise<string> {
  const countryCode = String(country || '')

  if (!countryCode) {
    return render(
      <select name="state" disabled>
        <option value="">-- Select Country First --</option>
      </select>
    )
  }

  await delay(300)

  const stateList = states[countryCode] || []

  return render(
    <select name="state">
      <option value="">-- Select State --</option>
      {stateList.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  )
}

// ============ INLINE EDIT ============

export async function startInlineEdit(_ctx: BeamContext<Env>, { field, value }: Record<string, unknown>): Promise<string> {
  const currentValue = String(value || inlineEditValue)

  return render(
    <input
      type="text"
      class="inline-input"
      name={String(field)}
      value={currentValue}
      beam-action="saveInlineEdit"
      beam-data-field={String(field)}
      beam-target="#inline-edit-container"
      beam-watch="change"
      beam-keep
      autofocus
    />
  )
}

export async function saveInlineEdit(_ctx: BeamContext<Env>, data: Record<string, unknown>): Promise<string> {
  const field = String(data.field || 'title')
  const value = String(data[field] || data.value || '')

  await delay(200)

  inlineEditValue = value || 'Click to edit this title'

  return render(
    <span
      class="editable-text"
      beam-action="startInlineEdit"
      beam-data-field={field}
      beam-data-value={inlineEditValue}
      beam-target="#inline-edit-container"
    >
      {inlineEditValue}
    </span>
  )
}

// ============ PRICE RANGE ============

export async function updatePrice(_ctx: BeamContext<Env>, { price }: Record<string, unknown>): Promise<string> {
  const priceValue = parseInt(String(price || '50'), 10)

  return render(<span>${priceValue}</span>)
}
