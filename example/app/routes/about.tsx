import { createRoute } from 'honox/factory'
import { Layout } from '../components/Layout'

export default createRoute((c) => {
  const authToken = c.get('beamAuthToken')
  return c.html(
    <Layout title="About" authToken={authToken}>
      <h1>About Us</h1>
      <p>This is a demo application built with HonoX and Cap'n Web.</p>
    </Layout>
  )
})
