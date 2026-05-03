import { createRoute } from 'honox/factory'
import { Layout } from '../components/Layout'

export default createRoute((c) => {
  const authToken = c.get('beamAuthToken')

  return c.html(
    <Layout title="Beam Demo" authToken={authToken}>
      <section class="panel">
        <p class="eyebrow">Beam action</p>
        <h1>Counter</h1>
        <p>Clicking these buttons calls server actions and swaps only the target.</p>
        <div class="counter">
          Count: <strong id="count"><span>0</span></strong>
        </div>
        <div class="actions">
          <button class="button primary" beam-action="increment" beam-target="#count">Increment</button>
          <button class="button" beam-action="reset" beam-target="#count">Reset</button>
        </div>
      </section>
    </Layout>
  )
})
