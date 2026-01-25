import { createRoute } from 'honox/factory'
import { Layout } from '../components/Layout'

export default createRoute((c) => {
  return c.html(
    <Layout title="About">
      <h1>About Us</h1>
      <p>This is a demo application built with HonoX, Cap'n Web, and idiomorph.</p>
    </Layout>
  )
})
