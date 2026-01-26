import { createRoute } from 'honox/factory'
import { Layout } from '../../components/Layout'
import type { Env } from '../../types'

type Product = {
  id: string
  name: string
  price: number
  description?: string
}

export default createRoute(async (c) => {
  const env = c.env as Env
  const id = c.req.param('id')
  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?')
    .bind(id)
    .first<Product>()

  if (!product) {
    return c.html(
      <Layout title="Not Found">
        <h1>Product Not Found</h1>
        <a href="/products">Back to Products</a>
      </Layout>,
      404
    )
  }

  return c.html(
    <Layout title={product.name}>
      <article class="product-detail">
        <h1>{product.name}</h1>
        <p class="price">${product.price}</p>
        <p>{product.description}</p>

        <div class="actions">
          <button
            beam-action="addToCartModal"
            beam-params={JSON.stringify({ productId: product.id, productName: product.name })}
            class="btn-primary"
          >
            Add to Cart
          </button>
          <button
            beam-action="editProductModal"
            beam-params={JSON.stringify({ id: product.id })}
          >
            Edit
          </button>
        </div>
      </article>
    </Layout>
  )
})
