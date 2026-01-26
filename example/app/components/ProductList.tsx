import { ProductCard } from './ProductCard'

type Product = {
  id: string
  name: string
  price: number
}

type Props = {
  products: Product[]
}

export function ProductList({ products }: Props) {
  if (products.length === 0) {
    return (
      <div class="empty-state">
        <p>No products yet.</p>
        <button beam-action="createProductModal" class="btn-primary">
          Add your first product
        </button>
      </div>
    )
  }

  return (
    <div class="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
