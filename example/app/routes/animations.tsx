import { createRoute } from 'honox/factory'
import { Layout } from '../components/Layout'

const SWAP_PRESETS = [
  { action: 'swapFade', name: 'fade' },
  { action: 'swapScale', name: 'scale' },
  { action: 'swapZoom', name: 'zoom' },
  { action: 'swapPop', name: 'pop' },
  { action: 'swapBlur', name: 'blur' },
  { action: 'swapSlide', name: 'slide' },
  { action: 'swapSlideUp', name: 'slide-up' },
  { action: 'swapSlideDown', name: 'slide-down' },
  { action: 'swapSlideLeft', name: 'slide-left' },
  { action: 'swapSlideRight', name: 'slide-right' },
  { action: 'swapFlipX', name: 'flip-x' },
  { action: 'swapFlipY', name: 'flip-y' },
]

export default createRoute(async (c) => {
  const authToken = c.get('beamAuthToken')

  return c.html(
    <Layout title="Animations" authToken={authToken}>
      <style>{`
        .anim-page { max-width: 900px; }
        .anim-page h2 { margin-top: 40px; }
        .anim-note { color: #64748b; font-size: 0.9rem; margin: 4px 0 16px; }

        .preset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
        .preset-cell { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; }
        .preset-label { font-family: ui-monospace, monospace; font-size: 0.8rem; color: #6366f1; margin-bottom: 8px; }
        .swap-slot { min-height: 70px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
        .swap-card { display: flex; flex-direction: column; gap: 4px; padding: 12px 16px; background: #eef2ff; border-radius: 8px; width: 100%; }
        .swap-card strong { color: #4338ca; }
        .swap-n { font-size: 0.75rem; color: #64748b; }
        .preset-btn { width: 100%; padding: 6px; border: 1px solid #cbd5e1; background: white; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
        .preset-btn:hover { background: #f8fafc; }

        .tile-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; min-height: 60px; }
        .tile { padding: 20px; background: #6366f1; color: white; border-radius: 8px; text-align: center; font-weight: 500; }
        .tile-enter { transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .tile-from { opacity: 0; transform: translateY(16px) scale(0.85); }

        .feed { display: flex; flex-direction: column; gap: 8px; min-height: 40px; }
        .feed-row { padding: 10px 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; color: #166534; }
        .row-enter { transition: opacity 0.35s ease, transform 0.35s ease; }
        .row-from { opacity: 0; transform: translateX(-20px); }

        .banner { padding: 16px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
        .banner-leave { transition: opacity 0.4s ease, transform 0.4s ease; }
        .banner-gone { opacity: 0; transform: translateX(40px) scale(0.95); }

        .card-row { display: flex; gap: 16px; flex-wrap: wrap; }
        .morph-card { width: 140px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; text-decoration: none; color: inherit; }
        .morph-thumb { height: 90px; background: linear-gradient(135deg, #818cf8, #6366f1); }
        .morph-title { padding: 8px; font-size: 0.85rem; }
      `}</style>

      <div class="anim-page">
        <h1>Animations</h1>
        <p class="anim-note">
          Layered and dependency-free. Every example is a real server-driven Beam update —
          click and watch. All respect <code>prefers-reduced-motion</code>.
        </p>

        <h2>Swap presets</h2>
        <p class="anim-note">
          <code>beam-swap-transition</code> on the target animates each swap. Click any preset —
          the counter proves it's a fresh server round-trip every time. These slots use
          <code>--beam-swap-duration: 450ms</code> (the default is a snappier 220ms) so the
          motion is easy to see.
        </p>
        <div class="preset-grid">
          {SWAP_PRESETS.map((preset) => (
            <div class="preset-cell">
              <div class="preset-label">{preset.name}</div>
              <div
                id={`slot-${preset.name}`}
                class="swap-slot"
                beam-swap-transition={preset.name}
                style="--beam-swap-duration: 450ms"
              >
                <div class="swap-card">
                  <strong>{preset.name}</strong>
                  <span class="swap-n">click below</span>
                </div>
              </div>
              <button
                class="preset-btn"
                beam-action={preset.action}
                beam-target={`#slot-${preset.name}`}
               
              >
                Swap
              </button>
            </div>
          ))}
        </div>

        <h2>View transition</h2>
        <p class="anim-note">
          <code>beam-transition="view"</code> runs the swap inside the browser's native
          View Transitions API — a real cross-fade, no library. (Falls back to an instant
          swap where unsupported.)
        </p>
        <div id="vt-slot" class="swap-slot" beam-transition="view" beam-swap-transition="fade">
          <div class="swap-card">
            <strong>view transition</strong>
            <span class="swap-n">click below</span>
          </div>
        </div>
        <button class="btn-primary" beam-action="swapZoom" beam-target="#vt-slot">
          Swap with view transition
        </button>

        <h2>Shared-element morph</h2>
        <p class="anim-note">
          Same <code>beam-transition-name</code> on both pages → the thumbnail flies into the
          detail view during a Beam visit. Click a card (this page is <code>beam-boost</code>ed).
        </p>
        <div class="card-row">
          <a href="/animations/1" beam-visit beam-target="#app" class="morph-card">
            <div class="morph-thumb" beam-transition-name="hero-1"></div>
            <div class="morph-title">Product One</div>
          </a>
          <a href="/animations/2" beam-visit beam-target="#app" class="morph-card">
            <div class="morph-thumb" beam-transition-name="hero-2" style="background: linear-gradient(135deg, #f472b6, #db2777)"></div>
            <div class="morph-title">Product Two</div>
          </a>
        </div>

        <h2>Enter classes + stagger</h2>
        <p class="anim-note">
          <code>beam-enter</code>/<code>beam-enter-start</code> on each item, with
          <code>beam-enter-stagger="90"</code> on the grid → items cascade in.
        </p>
        <div id="tile-grid" class="tile-grid" beam-enter-stagger="90"></div>
        <p>
          <button class="btn-primary" beam-action="loadTiles">Load tiles (staggered enter)</button>
        </p>

        <h2>Leave classes</h2>
        <p class="anim-note">
          <code>beam-leave</code>/<code>beam-leave-end</code> run before removal — the element
          animates out, then <code>beam-swap="delete"</code> removes it.
        </p>
        <div id="dismiss-banner" class="banner" beam-leave="banner-leave" beam-leave-end="banner-gone">
          <span>Dismiss me to see the leave animation.</span>
          <button class="btn-secondary" beam-action="removeBanner" beam-target="#dismiss-banner" beam-swap="delete">
            Dismiss
          </button>
        </div>

        <h2>Append with enter (live feed)</h2>
        <p class="anim-note">
          New rows <code>prepend</code> into the feed and only the new row animates —
          existing rows stay put.
        </p>
        <p>
          <button class="btn-primary" beam-action="addRow" beam-target="#feed" beam-swap="prepend">
            Add row
          </button>
        </p>
        <div id="feed" class="feed"></div>
      </div>
    </Layout>
  )
})
