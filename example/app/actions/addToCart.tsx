import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext } from '@benqoder/beam'
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
