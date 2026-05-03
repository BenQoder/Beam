import type { Child } from 'hono/jsx'
import { CartBadge } from './CartBadge'

type Props = {
  title?: string
  children: Child
  cartCount?: number
  authToken?: string
}

export function Layout({ title = 'My App', children, cartCount = 0, authToken }: Props) {
  const enableDevRefresh = import.meta.env.VITE_BEAM_DEV_REFRESH === '1'

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        {authToken && <meta name="beam-token" content={authToken} />}
        <link rel="stylesheet" href="/static/styles.css" />
      </head>
      <body>
        <div id="app-shell" beam-boost>
          <header class="site-header">
            <nav>
              <a href="/" class="logo">My App</a>
              <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/products">Products</a></li>
                <li><a href="/about">About</a></li>
              </ul>
              <div id="cart-badge">
                <CartBadge count={cartCount} />
              </div>
            </nav>
          </header>

          <main id="app">
            {children}
          </main>

          <footer class="site-footer">
            <p>&copy; 2024 My App</p>
          </footer>
        </div>

        <script type="module" src="/static/client.js"></script>
        {enableDevRefresh && <script type="module" src="/static/dev-refresh.js"></script>}
      </body>
    </html>
  )
}
