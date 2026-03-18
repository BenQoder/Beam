import { createRoute } from 'honox/factory'
import { Layout } from '../components/Layout'

export default createRoute(async (c) => {
  const authToken = c.get('beamAuthToken')

  return c.html(
    <Layout title="Streaming Demo" authToken={authToken}>
      <style>{`
        /* Skeleton */
        .skeleton { opacity: 0.6; }
        .skeleton-avatar { width: 56px; height: 56px; border-radius: 50%; background: #e2e8f0; }
        .skeleton-lines { flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .skeleton-line { height: 14px; border-radius: 4px; background: #e2e8f0; }
        .w-48 { width: 48%; }
        .w-32 { width: 32%; }
        .w-64 { width: 64%; }
        .skeleton-value { height: 28px; width: 80px; border-radius: 4px; background: #e2e8f0; margin-top: 4px; }

        /* Profile card */
        .profile-card { display: flex; align-items: center; gap: 16px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; min-height: 90px; }
        .profile-avatar { width: 56px; height: 56px; border-radius: 50%; background: #6366f1; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; flex-shrink: 0; }
        .profile-name { margin: 0 0 2px; font-weight: 600; }
        .profile-role { margin: 0 0 4px; color: #6366f1; font-size: 0.875rem; }
        .profile-bio { margin: 0; color: #64748b; font-size: 0.875rem; }

        /* Pipeline */
        .pipeline { display: flex; flex-direction: column; gap: 8px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; min-height: 100px; }
        .pipeline-step { padding: 6px 10px; border-radius: 6px; font-size: 0.875rem; }
        .pipeline-step.done { background: #dcfce7; color: #166534; }
        .pipeline-step.running { background: #fef9c3; color: #854d0e; font-weight: 500; }
        .pipeline-step.pending { background: #f1f5f9; color: #94a3b8; }
        .pipeline-complete { padding: 8px 10px; border-radius: 6px; background: #dbeafe; color: #1e40af; font-weight: 600; font-size: 0.875rem; }

        /* Streaming text */
        .stream-output { min-height: 60px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; line-height: 1.7; color: #1e293b; margin: 0; }
        .cursor { animation: blink 0.8s step-end infinite; color: #6366f1; }
        @keyframes blink { 50% { opacity: 0; } }

        /* Dashboard */
        #stream-dashboard { display: flex; gap: 12px; flex-wrap: wrap; }
        .stat-card { flex: 1; min-width: 120px; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; transition: background 0.3s; }
        .stat-card.loading { background: #f1f5f9; }
        .stat-card.ready { background: #f0fdf4; border-color: #bbf7d0; }
        .stat-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
        .stat-value { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-top: 4px; }
      `}</style>

      <h1>Streaming Actions</h1>
      <p class="text-muted">
        Action handlers can be async generators. Each <code>yield</code> streams an <code>ActionResponse</code>
        to the client immediately — no waiting for the whole action to finish.
      </p>

      {/* Demo 1: Skeleton → Content */}
      <div class="demo-section">
        <h2>1. Skeleton → Content</h2>
        <p class="text-muted">First yield shows a skeleton instantly. Second yield replaces it with real data.</p>

        <div id="profile-result" class="profile-card" style="color: #94a3b8;">
          Click a button to load a profile…
        </div>

        <div class="demo-actions" style="margin-top: 12px;">
          <button beam-action="loadProfile" beam-data-id="1" beam-target="#profile-result">
            Load Profile 1
          </button>
          <button beam-action="loadProfile" beam-data-id="2" beam-target="#profile-result">
            Load Profile 2
          </button>
          <button beam-action="loadProfile" beam-data-id="3" beam-target="#profile-result">
            Load Profile 3
          </button>
        </div>
      </div>

      {/* Demo 2: Multi-step pipeline */}
      <div class="demo-section">
        <h2>2. Multi-step Pipeline</h2>
        <p class="text-muted">Each step yields progress as it completes, so users see live feedback.</p>

        <div id="pipeline-result" class="pipeline" style="color: #94a3b8; align-items: center; justify-content: center;">
          Click to run the pipeline…
        </div>

        <div class="demo-actions" style="margin-top: 12px;">
          <button beam-action="runPipeline" beam-target="#pipeline-result">
            Run Pipeline
          </button>
        </div>
      </div>

      {/* Demo 3: Streaming text */}
      <div class="demo-section">
        <h2>3. Streaming Text</h2>
        <p class="text-muted">Re-render with accumulated text on each yield — like a typewriter or AI stream.</p>

        <p id="stream-text-output" class="stream-output" style="color: #94a3b8;">
          Click to start streaming…
        </p>

        <div class="demo-actions" style="margin-top: 12px;">
          <button beam-action="streamText" beam-target="#stream-text-output">
            Stream Text
          </button>
        </div>
      </div>

      {/* Demo 4: Dashboard widgets */}
      <div class="demo-section">
        <h2>4. Progressive Dashboard</h2>
        <p class="text-muted">Load each stat card independently — fast ones appear first.</p>

        <div id="stream-dashboard" style="display: flex; gap: 12px; flex-wrap: wrap;">
          <div class="stat-card"><div class="stat-label">Visits</div><div class="stat-value">—</div></div>
          <div class="stat-card"><div class="stat-label">Signups</div><div class="stat-value">—</div></div>
          <div class="stat-card"><div class="stat-label">Revenue</div><div class="stat-value">—</div></div>
        </div>

        <div class="demo-actions" style="margin-top: 12px;">
          <button beam-action="refreshDashboardStream" beam-target="#stream-dashboard">
            Refresh Dashboard
          </button>
        </div>
      </div>

      {/* Demo 5: Streaming State */}
      <div class="demo-section">
        <h2>5. Streaming State Updates</h2>
        <p class="text-muted">
          Yield <code>ctx.state(...)</code> chunks to update an existing named state without swapping any DOM.
        </p>

        <div beam-state="phase: 'idle'; progress: 0" beam-id="streamingStatus" class="pipeline">
          <div class="pipeline-step running">
            Phase: <strong beam-text="phase"></strong>
          </div>
          <div class="pipeline-step done">
            Progress: <strong beam-text="progress + '%'"></strong>
          </div>
          <div beam-state-ref="streamingStatus" class="pipeline-step pending" beam-text="'Mirror: ' + phase + ' (' + progress + '%)'"></div>
        </div>

        <div class="demo-actions" style="margin-top: 12px;">
          <button beam-action="streamStateProgress">
            Stream State Progress
          </button>
        </div>
      </div>

      {/* Demo 6: Streaming Modal */}
      <div class="demo-section">
        <h2>6. Streaming Modal</h2>
        <p class="text-muted">Modal opens instantly with a skeleton, then streams in real content.</p>

        <div class="demo-actions">
          <button beam-modal="openProfileModal" beam-data-id="1">Open Profile 1</button>
          <button beam-modal="openProfileModal" beam-data-id="2">Open Profile 2</button>
          <button beam-modal="openProfileModal" beam-data-id="3">Open Profile 3</button>
        </div>
      </div>

      {/* Demo 7: Streaming Drawer */}
      <div class="demo-section">
        <h2>7. Streaming Drawer</h2>
        <p class="text-muted">Drawer opens immediately with skeletons, then populates activity items one by one.</p>

        <div class="demo-actions">
          <button beam-drawer="openActivityDrawer">Open Activity Feed</button>
        </div>
      </div>
    </Layout>
  )
})
