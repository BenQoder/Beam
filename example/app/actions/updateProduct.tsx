import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext } from '@benqoder/beam'
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
