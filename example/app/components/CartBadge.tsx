type Props = {
  count: number
}

export function CartBadge({ count }: Props) {
  return (
    <a href="/cart" class="cart-badge">
      🛒
      {count > 0 && <span class="badge">{count}</span>}
    </a>
  )
}
