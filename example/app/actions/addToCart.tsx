import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext, ActionResponse } from '@benqoder/beam'
import type { Env } from '../types'
import { CartBadge } from '../components/CartBadge'

function render(node: HtmlEscapedString | Promise<HtmlEscapedString>): Promise<string> {
  return Promise.resolve(node).then((n) => n.toString())
}

type CartItem = { productId: string; qty: number }

export async function addToCart(
  ctx: BeamContext<Env>,
  { productId, qty = 1 }: Record<string, unknown>
): Promise<string> {
  // Use automatic session from ctx.session
  const cart = (await ctx.session.get<CartItem[]>('cart')) || []

  const existing = cart.find((item) => item.productId === productId)
  if (existing) {
    existing.qty += Number(qty)
  } else {
    cart.push({ productId: productId as string, qty: Number(qty) })
  }

  await ctx.session.set('cart', cart)

  const count = cart.reduce((sum, item) => sum + item.qty, 0)
  return render(<CartBadge count={count} />)
}

// Modal for adding to cart with quantity selection
export async function addToCartModal(ctx: BeamContext<Env>, { productId, productName }: Record<string, unknown>): Promise<ActionResponse> {
  return ctx.modal(render(
    <div>
      <header class="modal-header">
        <h2>Add to Cart</h2>
        <button type="button" beam-close aria-label="Close" class="modal-close">
          &times;
        </button>
      </header>
      <form beam-action="addToCart" beam-target="#cart-badge" beam-close>
        <input type="hidden" name="productId" value={productId as string} />
        <div class="modal-body">
          <p>Add <strong>{productName as string || `Product #${productId}`}</strong> to your cart?</p>
          <div class="form-group">
            <label for="qty">Quantity</label>
            <input type="number" id="qty" name="qty" value="1" min="1" max="99" />
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" beam-close>Cancel</button>
          <button type="submit" class="btn-primary">Add to Cart</button>
        </div>
      </form>
    </div>
  ), { size: 'small' })
}
