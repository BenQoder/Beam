import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext, ActionResponse } from '@benqoder/beam'
import type { Env } from '../types'
import { ProductList } from '../components/ProductList'

function render(node: HtmlEscapedString | Promise<HtmlEscapedString>): Promise<string> {
  return Promise.resolve(node).then(n => n.toString())
}

export async function updateProduct(ctx: BeamContext<Env>, { id, name, price }: Record<string, unknown>): Promise<string> {
  await ctx.env.DB.prepare('UPDATE products SET name = ?, price = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(name, price, id)
    .run()

  const products = await ctx.env.DB.prepare('SELECT * FROM products ORDER BY created_at DESC').all()
  return render(<ProductList products={products.results as Array<{ id: string; name: string; price: number }>} />)
}

// Modal for editing a product
export async function editProductModal(ctx: BeamContext<Env>, { id }: Record<string, unknown>): Promise<ActionResponse> {
  // Fetch the product to pre-fill the form
  const product = await ctx.env.DB.prepare('SELECT * FROM products WHERE id = ?')
    .bind(id)
    .first() as { id: string; name: string; price: number } | null

  if (!product) {
    return ctx.script('window.beam.showToast("Product not found", "error")')
  }

  return ctx.modal(render(
    <div>
      <header class="modal-header">
        <h2>Edit Product</h2>
        <button type="button" beam-close aria-label="Close" class="modal-close">
          &times;
        </button>
      </header>
      <form beam-action="updateProduct" beam-target="#product-list" beam-close>
        <input type="hidden" name="id" value={product.id} />
        <div class="modal-body">
          <div class="form-group">
            <label for="name">Product Name</label>
            <input type="text" id="name" name="name" value={product.name} required autofocus />
          </div>
          <div class="form-group">
            <label for="price">Price</label>
            <input type="number" id="price" name="price" step="0.01" min="0" value={String(product.price)} required />
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" beam-close>Cancel</button>
          <button type="submit" class="btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  ))
}
