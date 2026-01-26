import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext, ActionResponse } from '@benqoder/beam'
import type { Env } from '../types'
import { ProductList } from '../components/ProductList'

function render(node: HtmlEscapedString | Promise<HtmlEscapedString>): Promise<string> {
  return Promise.resolve(node).then(n => n.toString())
}

export async function createProduct(ctx: BeamContext<Env>, { name, price }: Record<string, unknown>): Promise<string> {
  await ctx.env.DB.prepare('INSERT INTO products (name, price) VALUES (?, ?)')
    .bind(name, price)
    .run()

  const products = await ctx.env.DB.prepare('SELECT * FROM products ORDER BY created_at DESC').all()
  return render(<ProductList products={products.results as Array<{ id: string; name: string; price: number }>} />)
}

// Modal for creating a new product
export async function createProductModal(ctx: BeamContext<Env>, _params: Record<string, unknown>): Promise<ActionResponse> {
  return ctx.modal(render(
    <div>
      <header class="modal-header">
        <h2>Create Product</h2>
        <button type="button" beam-close aria-label="Close" class="modal-close">
          &times;
        </button>
      </header>
      <form beam-action="createProduct" beam-target="#product-list" beam-close beam-reset>
        <div class="modal-body">
          <div class="form-group">
            <label for="name">Product Name</label>
            <input type="text" id="name" name="name" required autofocus />
          </div>
          <div class="form-group">
            <label for="price">Price</label>
            <input type="number" id="price" name="price" step="0.01" min="0" required />
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" beam-close>Cancel</button>
          <button type="submit" class="btn-primary">Create</button>
        </div>
      </form>
    </div>
  ))
}
