import type { Child } from 'hono/jsx'

type Props = {
  title?: string
  children: Child
  authToken?: string
}

export function Layout({ title = 'Beam App', children, authToken }: Props) {
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
            <a href="/" class="logo">Beam App</a>
            <nav>
              <a href="/">Home</a>
              <a href="/demo">Demo</a>
            </nav>
          </header>
          <main>{children}</main>
        </div>
        <script type="module" src="/static/client.js"></script>
        {enableDevRefresh && <script type="module" src="/static/dev-refresh.js"></script>}
      </body>
    </html>
  )
}
