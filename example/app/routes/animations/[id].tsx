import { createRoute } from 'honox/factory'
import { Layout } from '../../components/Layout'

// Detail page for the shared-element morph demo. The hero carries the SAME
// beam-transition-name as the card on /animations, so during the Beam visit
// the browser morphs the thumbnail into this large hero.
const HEROES: Record<string, { title: string; gradient: string }> = {
  '1': { title: 'Product One', gradient: 'linear-gradient(135deg, #818cf8, #6366f1)' },
  '2': { title: 'Product Two', gradient: 'linear-gradient(135deg, #f472b6, #db2777)' },
}

export default createRoute(async (c) => {
  const authToken = c.get('beamAuthToken')
  const id = c.req.param('id')
  const hero = HEROES[id] ?? HEROES['1']

  return c.html(
    <Layout title={hero.title} authToken={authToken}>
      <div style="max-width: 700px">
        <p>
          <a href="/animations" beam-visit beam-target="#app" class="btn-link">← Back to animations</a>
        </p>
        <div
          beam-transition-name={`hero-${id}`}
          style={`height: 260px; border-radius: 12px; background: ${hero.gradient}`}
        ></div>
        <h1>{hero.title}</h1>
        <p class="react-muted" style="color:#64748b">
          The thumbnail from the gallery card morphed into this hero via a native view
          transition — same <code>beam-transition-name</code> on both pages. Use the back
          link to morph it in reverse.
        </p>
      </div>
    </Layout>
  )
})
