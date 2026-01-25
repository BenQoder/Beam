type Product = {
  id: string
  name: string
  price: number
}

type Props = {
  product: Product
}

export function ProductCard({ product }: Props) {
  return (
    <div class="product-card" beam-item-id={product.id}>
      <a href={`/products/${product.id}`} class="product-link">
        <h3>{product.name}</h3>
        <p class="price">${product.price}</p>
      </a>

      <div class="card-actions">
        <button
          beam-modal="addToCart"
          beam-params={JSON.stringify({ productId: product.id })}
          class="btn-primary btn-sm"
        >
          Add to Cart
        </button>

        <button
          beam-modal="editProduct"
          beam-params={JSON.stringify({ id: product.id })}
          class="btn-sm"
        >
          Edit
        </button>

        <button
          beam-modal="confirmDelete"
          beam-params={JSON.stringify({ id: product.id, name: product.name })}
          class="btn-danger btn-sm"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
