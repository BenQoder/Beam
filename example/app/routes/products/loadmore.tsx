import { createRoute } from 'honox/factory'
import { Layout } from '../../components/Layout'
import { ProductCard } from '../../components/ProductCard'
import type { Env } from '../../types'

type Product = { id: string; name: string; price: number }

const ITEMS_PER_PAGE = 10

export default createRoute(async (c) => {
  const env = c.env as Env

  let products: Product[] = []
  let hasMore = false

  if (env.DB) {
    try {
      const countResult = await env.DB.prepare('SELECT COUNT(*) as total FROM products').first<{ total: number }>()
      const total = countResult?.total ?? 0
      hasMore = total > ITEMS_PER_PAGE

      const result = await env.DB.prepare('SELECT * FROM products ORDER BY created_at DESC LIMIT ?')
        .bind(ITEMS_PER_PAGE)
        .all()
      products = result.results as Product[]
    } catch (e) {
      console.error('DB error:', e)
    }
  }

  return c.html(
    <Layout title="Products - Load More">
      <div class="page-header">
        <h1>Products</h1>
        <span class="badge">Load More</span>
      </div>

      <div id="product-list" class="product-grid">
        {products.map((product) => (
          <ProductCard product={product} />
        ))}
        {hasMore && (
          <button
            class="load-more-btn"
            beam-load-more
            beam-action="loadMoreProducts"
            beam-params={JSON.stringify({ page: 2 })}
            beam-target="#product-list"
          >
            Load More
          </button>
        )}
      </div>
    </Layout>
  )
})
