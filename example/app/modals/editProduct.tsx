import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext } from '@benqoder/beam'
import type { Env } from '../types'
import { ModalFrame } from '../components/ModalFrame'

function render(node: HtmlEscapedString | Promise<HtmlEscapedString>): Promise<string> {
  return Promise.resolve(node).then(n => n.toString())
}

export async function editProduct(ctx: BeamContext<Env>, { id }: Record<string, unknown>): Promise<string> {
  const product = await ctx.env.DB.prepare('SELECT * FROM products WHERE id = ?')
    .bind(id)
    .first<{ id: string; name: string; price: number; description?: string }>()

  if (!product) {
    return render(
      <ModalFrame title="Error">
        <p>Product not found.</p>
        <div class="modal-actions">
          <button type="button" beam-close>Close</button>
        </div>
      </ModalFrame>
    )
  }

  return render(
    <ModalFrame title="Edit Product">
      <form
        
        beam-action="updateProduct"
        beam-target="#product-list"
        beam-close
        beam-reset
      >
        <input type="hidden" name="id" value={id as string} />
        <div class="form-group">
          <label for="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={product.name}
            required
            autofocus
          />
        </div>
        <div class="form-group">
          <label for="price">Price</label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            value={String(product.price)}
            required
          />
        </div>
        <div class="modal-actions">
          <button type="button" beam-close>Cancel</button>
          <button type="submit" class="btn-primary">Save Changes</button>
        </div>
      </form>
    </ModalFrame>
  )
}
