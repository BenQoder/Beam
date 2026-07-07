import { createRoute } from 'honox/factory'
import { Island } from '@benqoder/beam'
import { Layout } from '../components/Layout'

export default createRoute(async (c) => {
  const authToken = c.get('beamAuthToken')

  return c.html(
    <Layout title="React Islands Demo" authToken={authToken}>
      <style>{`
        .react-card { display: flex; flex-direction: column; gap: 12px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
        .react-card-head { display: flex; align-items: center; gap: 8px; }
        .react-chip { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 999px; }
        .react-dot { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; margin-left: auto; }
        .react-dot-on { background: #22c55e; }
        .react-muted { margin: 0; color: #64748b; font-size: 0.875rem; }
        .react-counter-row { display: flex; align-items: center; gap: 10px; }
        .react-counter-value { min-width: 48px; text-align: center; font-size: 1.5rem; font-weight: 700; }
        .react-ticker-row { display: flex; align-items: baseline; gap: 12px; }
        .react-ticker-price { font-size: 1.75rem; font-weight: 700; }
        .react-sparkline { display: flex; align-items: flex-end; gap: 3px; height: 52px; }
        .react-sparkline-bar { width: 8px; border-radius: 2px 2px 0 0; background: #6366f1; }
        .react-skeleton { height: 140px; display: flex; align-items: center; justify-content: center; color: #94a3b8; background: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 8px; }
        .react-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin: 16px 0; }
        .react-shared { padding: 12px 16px; background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; }
      `}</style>

      <h1>React Islands</h1>
      <p>
        Pure React components mounted into server-rendered pages, riding Beam's
        WebSocket both ways: islands call actions whenever they want, and the
        server pushes props, state, and events into them whenever it wants.
      </p>

      <div class="react-grid">
        {/* Client → server → client roundtrip */}
        <Island name="ReactCounter" id="reactCounter" props={{ initial: 0 }}>
          <div class="react-skeleton">Mounting ReactCounter…</div>
        </Island>

        {/* Server streams props + events into the mounted island */}
        <Island name="StockTicker" id="stockTicker" props={{ symbol: 'BEAM', price: 100 }}>
          <div class="react-skeleton">Mounting StockTicker…</div>
        </Island>

        {/* Dynamic island: component module loaded from a URL at runtime —
            not in app/islands/, not in the build. Bare react imports resolve
            via the import map to the one shared React. */}
        <Island
          name="RemoteBadge"
          id="remoteBadge"
          src="/islands/RemoteBadge.js"
          props={{ label: 'Dynamic island' }}
        >
          <div class="react-skeleton">Loading runtime module…</div>
        </Island>
      </div>

      {/* Island delivered by an action response, inside a modal */}
      <p>
        <button class="btn-secondary" beam-action="openCounterModal">
          Open island in a modal (action response)
        </button>
      </p>

      {/* Attribute-world sharing the same named state the React island mutates */}
      <div class="react-shared" beam-state="clicks: 0" beam-id="reactShared">
        Plain beam-state div (no React): the counter island has been clicked{' '}
        <strong beam-text="clicks"></strong> times.
      </div>

      <h2>Server-spawned islands</h2>
      <p>
        <button class="btn-primary" beam-action="spawnPromo">Spawn island (ctx.island upsert)</button>{' '}
        <button class="btn-secondary" beam-action="dismissPromo">Dismiss (ctx.removeIsland)</button>
      </p>
      <div id="promo-zone" class="react-skeleton">nothing spawned yet</div>

      <h2>Crash resilience</h2>
      <p>
        This island's module (<code>/islands/BrokenBadge.js</code>) throws on render — Beam restores
        the server-rendered fallback and fires <code>beam:island-error</code>.
      </p>
      <Island name="BrokenBadge" id="brokenBadge" src="/islands/BrokenBadge.js">
        <div class="react-card">
          <strong>Static fallback card</strong>
          <p class="react-muted">
            If you can read this, a crashed island restored its server HTML instead of leaving a blank hole.
          </p>
        </div>
      </Island>

      <div style="height: 120vh; display: flex; align-items: center; justify-content: center; color: #94a3b8;">
        ↓ scroll — the island below uses beam-island-load="visible" and only mounts when you reach it
      </div>

      <h2>Lazy island (load="visible")</h2>
      <Island name="ReactCounter" id="lazyCounter" load="visible" props={{ initial: 42 }}>
        <div class="react-skeleton">Not mounted yet — no React root exists for this card until it scrolls into view</div>
      </Island>
    </Layout>
  )
})
