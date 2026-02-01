import type { Context } from 'hono'

export default function IslandsDemo(c: Context) {
  return c.html(
    <div class="max-w-4xl mx-auto p-8">
      <h1 class="text-3xl font-bold mb-8">Beam Islands Demo</h1>

      <div class="space-y-8">
        {/* Counter Island Demo */}
        <section class="bg-gray-50 p-6 rounded-lg">
          <h2 class="text-xl font-semibold mb-4">Counter Island</h2>
          <p class="text-gray-600 mb-4">
            A simple counter that demonstrates client-side state management with islands.
          </p>
          
          <div class="space-y-4">
            {/* Basic counter */}
            <div>
              <p class="text-sm text-gray-500 mb-2">Basic counter (default props):</p>
              <div 
                beam-island="Counter"
                data-initial="0"
                data-step="1"
                data-label="Count"
              ></div>
            </div>

            {/* Counter with custom props */}
            <div>
              <p class="text-sm text-gray-500 mb-2">Counter with step=5:</p>
              <div 
                beam-island="Counter"
                data-initial="10"
                data-step="5"
                data-label="Custom"
              ></div>
            </div>
          </div>
        </section>

        {/* Quantity Selector Island Demo */}
        <section class="bg-gray-50 p-6 rounded-lg">
          <h2 class="text-xl font-semibold mb-4">Quantity Selector Island</h2>
          <p class="text-gray-600 mb-4">
            A quantity selector with min/max constraints, typical for e-commerce.
          </p>

          <div class="space-y-4">
            {/* Basic quantity selector */}
            <div>
              <p class="text-sm text-gray-500 mb-2">Basic quantity selector (1-99):</p>
              <div 
                beam-island="QuantitySelector"
                data-min="1"
                data-max="99"
                data-initial="1"
              ></div>
            </div>

            {/* Limited quantity selector */}
            <div>
              <p class="text-sm text-gray-500 mb-2">Limited stock (max 5):</p>
              <div 
                beam-island="QuantitySelector"
                data-min="1"
                data-max="5"
                data-initial="1"
                data-product-id="123"
              ></div>
            </div>
          </div>
        </section>

        {/* Integration with Beam Actions */}
        <section class="bg-gray-50 p-6 rounded-lg">
          <h2 class="text-xl font-semibold mb-4">Islands + Beam Actions</h2>
          <p class="text-gray-600 mb-4">
            This demonstrates how islands can work alongside Beam actions.
          </p>

          <form class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Select Quantity:
              </label>
              <div 
                beam-island="QuantitySelector"
                data-min="1"
                data-max="10"
                data-initial="1"
                data-product-id="demo-product"
              ></div>
            </div>

            <button
              beam-action="addToCart"
              beam-data-product-id="demo-product"
              beam-include="quantity"
              type="button"
              class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
            >
              Add to Cart (uses island's quantity)
            </button>
          </form>

          <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <p class="text-sm text-blue-800">
              <strong>Note:</strong> The quantity selector island manages its state client-side,
              while the "Add to Cart" button triggers a server-side Beam action that receives
              the quantity value.
            </p>
          </div>
        </section>

        {/* Technical Details */}
        <section class="bg-gray-50 p-6 rounded-lg">
          <h2 class="text-xl font-semibold mb-4">How It Works</h2>
          <div class="space-y-3 text-sm text-gray-700">
            <p>
              <strong>1. Registration:</strong> Island components are defined with <code class="bg-gray-200 px-1">defineIsland(name, component)</code>
              and auto-registered when imported.
            </p>
            <p>
              <strong>2. HTML Attributes:</strong> Islands are mounted via <code class="bg-gray-200 px-1">beam-island="Name"</code>
              with props passed as <code class="bg-gray-200 px-1">data-*</code> attributes.
            </p>
            <p>
              <strong>3. Hydration:</strong> Islands are automatically hydrated on page load and after any
              Beam action that injects new content (modals, drawers, etc.).
            </p>
            <p>
              <strong>4. Security:</strong> Only primitive values (string, number, boolean) can be passed as props.
              No complex objects or JSON blobs in the DOM.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
