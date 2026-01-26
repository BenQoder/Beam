import { createRoute } from 'honox/factory'
import { Layout } from '../../components/Layout'
import { ProductList } from '../../components/ProductList'
import { Pagination } from '../../components/Pagination'
import type { Env } from '../../types'
import type { BeamContext } from '@benqoder/beam'

type Product = { id: string; name: string; price: number }
type CartItem = { productId: string; qty: number }

const ITEMS_PER_PAGE = 5

export default createRoute(async (c) => {
  const env = c.env as Env
  const page = Number(c.req.query('page') || 1)
  const offset = (page - 1) * ITEMS_PER_PAGE

  // Get cart count from beam session
  const beam = c.get('beam') as BeamContext<Env>
  const cart = (await beam.session.get<CartItem[]>('cart')) || []
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)

  let products: Product[] = []
  let totalPages = 1

  if (env.DB) {
    try {
      const countResult = await env.DB.prepare('SELECT COUNT(*) as total FROM products').first<{ total: number }>()
      const total = countResult?.total ?? 0
      totalPages = Math.ceil(total / ITEMS_PER_PAGE)

      const result = await env.DB.prepare('SELECT * FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?')
        .bind(ITEMS_PER_PAGE, offset)
        .all()
      products = result.results as Product[]
    } catch (e) {
      console.error('DB error:', e)
    }
  }

  return c.html(
    <Layout title="Products" cartCount={cartCount}>
      <div class="page-header">
        <h1>Products</h1>
        <button beam-action="createProductModal" class="btn-primary">
          + Add Product
        </button>
      </div>

      <div id="product-list">
        <ProductList products={products} />
        <Pagination currentPage={page} totalPages={totalPages} />
      </div>
    </Layout>
  )
})
