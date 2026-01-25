type CartItem = {
  productId: string
  qty: number
}

type Props = {
  items: CartItem[]
}

export function CartItems({ items }: Props) {
  if (items.length === 0) {
    return (
      <div class="empty-state">
        <p>Your cart is empty.</p>
        <a href="/products" class="btn-primary">Browse Products</a>
      </div>
    )
  }

  return (
    <div class="cart-items">
      {items.map((item) => (
        <div class="cart-item" key={item.productId}>
          <span>Product: {item.productId}</span>
          <span>Qty: {item.qty}</span>
          <button
            
            beam-action="removeFromCart"
            beam-params={JSON.stringify({ itemId: item.productId })}
            beam-target="#cart-items"
            class="btn-danger btn-sm"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  )
}
