import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext } from '@benqoder/beam'
import type { Env } from '../types'
import { ProductCard } from '../components/ProductCard'

function render(node: HtmlEscapedString | Promise<HtmlEscapedString>): Promise<string> {
  return Promise.resolve(node).then(n => n.toString())
}

export async function loadMoreProducts(ctx: BeamContext<Env>, { page = 1, limit = 10 }: Record<string, unknown>): Promise<string> {
  const pageNum = Number(page)
  const limitNum = Number(limit)
  const offset = (pageNum - 1) * limitNum

  const countResult = await ctx.env.DB.prepare('SELECT COUNT(*) as total FROM products').first<{ total: number }>()
  const total = countResult?.total ?? 0
  const hasMore = offset + limitNum < total

  const products = await ctx.env.DB.prepare('SELECT * FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .bind(limitNum, offset)
    .all()

  const items = products.results as Array<{ id: string; name: string; price: number }>

  return render(
    <>
      {items.map((product) => (
        <ProductCard product={product} />
      ))}
      {hasMore ? (
        <button
          class="load-more-btn"
          beam-load-more
          beam-action="loadMoreProducts"
          beam-params={JSON.stringify({ page: pageNum + 1 })}
          beam-target="#product-list"
        >
          Load More
        </button>
      ) : (
        <div class="end-of-list">
          <p>You've reached the end!</p>
        </div>
      )}
    </>
  )
}
