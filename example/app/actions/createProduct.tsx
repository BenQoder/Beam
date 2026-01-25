import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext } from '@benqoder/beam'
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
