import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext } from '@benqoder/beam'
import type { Env } from '../types'
import { ProductList } from '../components/ProductList'
import { Pagination } from '../components/Pagination'

function render(node: HtmlEscapedString | Promise<HtmlEscapedString>): Promise<string> {
  return Promise.resolve(node).then(n => n.toString())
}

export async function getProducts(ctx: BeamContext<Env>, { page = 1, limit = 5 }: Record<string, unknown>): Promise<string> {
  const pageNum = Number(page)
  const limitNum = Number(limit)
  const offset = (pageNum - 1) * limitNum

  const countResult = await ctx.env.DB.prepare('SELECT COUNT(*) as total FROM products').first<{ total: number }>()
  const total = countResult?.total ?? 0
  const totalPages = Math.ceil(total / limitNum)

  const products = await ctx.env.DB.prepare('SELECT * FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .bind(limitNum, offset)
    .all()

  return render(
    <div id="product-list">
      <ProductList products={products.results as Array<{ id: string; name: string; price: number }>} />
      <Pagination currentPage={pageNum} totalPages={totalPages} />
    </div>
  )
}
