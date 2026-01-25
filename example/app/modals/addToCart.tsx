import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext } from '@benqoder/beam'
import type { Env } from '../types'
import { ModalFrame } from '../components/ModalFrame'

function render(node: HtmlEscapedString | Promise<HtmlEscapedString>): Promise<string> {
  return Promise.resolve(node).then(n => n.toString())
}

export async function addToCart(ctx: BeamContext<Env>, { productId }: Record<string, unknown>): Promise<string> {
  const product = await ctx.env.DB.prepare('SELECT * FROM products WHERE id = ?')
    .bind(productId)
    .first<{ id: string; name: string; price: number }>()

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
    <ModalFrame title="Add to Cart">
      <form
        
        beam-action="addToCart"
        beam-target="#cart-badge"
        beam-close
      >
        <input type="hidden" name="productId" value={productId as string} />
        <div class="product-preview">
          <strong>{product.name}</strong>
          <span class="price">${product.price}</span>
        </div>
        <div class="form-group">
          <label for="qty">Quantity</label>
          <input id="qty" name="qty" type="number" min="1" value="1" autofocus />
        </div>
        <div class="modal-actions">
          <button type="button" beam-close>Cancel</button>
          <button type="submit" class="btn-primary">Add to Cart</button>
        </div>
      </form>
    </ModalFrame>
  )
}
