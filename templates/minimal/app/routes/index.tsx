import { createRoute } from 'honox/factory'
import { Layout } from '../components/Layout'

export default createRoute((c) => {
  const authToken = c.get('beamAuthToken')

  return c.html(
    <Layout title="Beam App" authToken={authToken}>
      <section class="hero">
        <p class="eyebrow">HonoX + Cloudflare Workers</p>
        <h1>Build server-driven interfaces with Beam.</h1>
        <p>
          This starter runs through Wrangler, uses Beam actions over WebSocket RPC,
          and includes development-only DOM refresh.
        </p>
        <div class="actions">
          <a class="button primary" href="/demo">Open demo</a>
          <a class="button" href="https://github.com/benqoder/beam">View docs</a>
        </div>
      </section>
    </Layout>
  )
})
