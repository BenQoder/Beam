import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext } from '@benqoder/beam'
import type { Env } from '../types'
import { CartItems } from '../components/CartItems'

function render(node: HtmlEscapedString | Promise<HtmlEscapedString>): Promise<string> {
  return Promise.resolve(node).then((n) => n.toString())
}

type CartItem = { productId: string; qty: number }

export async function removeFromCart(
  ctx: BeamContext<Env>,
  { itemId }: Record<string, unknown>
): Promise<string> {
  // Use automatic session from ctx.session
  const cart = (await ctx.session.get<CartItem[]>('cart')) || []
  const updated = cart.filter((item) => item.productId !== itemId)
  await ctx.session.set('cart', updated)

  return render(<CartItems items={updated} />)
}
