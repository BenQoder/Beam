import type { BeamContext } from '@benqoder/beam'
import type { Env } from '../types'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// ============ SKELETON → CONTENT ============
// Classic pattern: show skeleton immediately, then replace with real content

export async function* loadProfile(ctx: BeamContext<Env>, { id }: Record<string, unknown>) {
  // Yield skeleton immediately - user sees feedback right away
  yield ctx.render(
    <div id="profile-result" class="profile-card skeleton">
      <div class="skeleton-avatar" />
      <div class="skeleton-lines">
        <div class="skeleton-line w-48" />
        <div class="skeleton-line w-32" />
        <div class="skeleton-line w-64" />
      </div>
    </div>
  )

  // Simulate slow API call
  await delay(1800)

  const userId = Number(id) || 1
  const names = ['Alice Johnson', 'Bob Smith', 'Carol Williams']
  const roles = ['Senior Engineer', 'Product Manager', 'Designer']
  const bios = [
    'Building great products one commit at a time.',
    'Turning user pain into product features.',
    'Making pixels do what they are told.',
  ]
  const idx = (userId - 1) % 3

  yield ctx.render(
    <div id="profile-result" class="profile-card">
      <div class="profile-avatar">{names[idx][0]}</div>
      <div class="profile-info">
        <h3 class="profile-name">{names[idx]}</h3>
        <p class="profile-role">{roles[idx]}</p>
        <p class="profile-bio">{bios[idx]}</p>
      </div>
    </div>
  )
}

// ============ MULTI-STEP PROGRESS ============
// Yield progress updates as each step completes

export async function* runPipeline(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  const steps = [
    { label: 'Validating inputs', ms: 600 },
    { label: 'Fetching data', ms: 1000 },
    { label: 'Processing results', ms: 800 },
    { label: 'Saving to database', ms: 700 },
  ]

  const completed: string[] = []

  for (const step of steps) {
    // Show in-progress state for current step
    yield ctx.render(
      <div id="pipeline-result" class="pipeline">
        {completed.map(s => (
          <div class="pipeline-step done">✅ {s}</div>
        ))}
        <div class="pipeline-step running">⏳ {step.label}…</div>
        {steps.slice(completed.length + 1).map(s => (
          <div class="pipeline-step pending">◯ {s.label}</div>
        ))}
      </div>
    )

    await delay(step.ms)
    completed.push(step.label)
  }

  // Final state
  yield ctx.render(
    <div id="pipeline-result" class="pipeline">
      {completed.map(s => (
        <div class="pipeline-step done">✅ {s}</div>
      ))}
      <div class="pipeline-complete">🎉 Pipeline complete!</div>
    </div>
  )
}

// ============ STREAMING TEXT (AI-like) ============
// Accumulate text and re-render on each chunk, cursor blinks while streaming

const STORY_WORDS = (
  'Beam is a server-driven UI framework that lets you build interactive ' +
  'web apps without writing client-side JavaScript. Actions run on the ' +
  'server and stream HTML back to the browser in real time.'
).split(' ')

export async function* streamText(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  let text = ''

  for (const word of STORY_WORDS) {
    text += (text ? ' ' : '') + word
    await delay(120)
    yield ctx.render(
      <p id="stream-text-output" class="stream-output">{text}<span class="cursor">▌</span></p>
    )
  }

  // Final yield removes the cursor
  yield ctx.render(
    <p id="stream-text-output" class="stream-output">{text}</p>
  )
}

// ============ STREAMING STATE ============
// Yield named state updates without replacing DOM

export async function* streamStateProgress(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  yield ctx.state('streamingStatus', { phase: 'starting', progress: 0 })
  await delay(300)

  yield ctx.state('streamingStatus', { phase: 'loading data', progress: 35 })
  await delay(300)

  yield ctx.state('streamingStatus', { phase: 'processing', progress: 70 })
  await delay(300)

  yield ctx.state('streamingStatus', { phase: 'done', progress: 100 })
}

// ============ DASHBOARD REFRESH ============
// Load multiple widgets one at a time

// ============ STREAMING MODAL ============
// Show skeleton in modal, then stream in real content

export async function* openProfileModal(ctx: BeamContext<Env>, { id }: Record<string, unknown>) {
  // Yield skeleton immediately — modal opens right away
  yield ctx.modal(
    <div style="padding: 8px;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
        <div style="width:64px;height:64px;border-radius:50%;background:#e2e8f0;flex-shrink:0;" />
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
          <div style="height:18px;border-radius:4px;background:#e2e8f0;width:55%;" />
          <div style="height:14px;border-radius:4px;background:#e2e8f0;width:38%;" />
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div style="height:12px;border-radius:4px;background:#e2e8f0;width:90%;" />
        <div style="height:12px;border-radius:4px;background:#e2e8f0;width:75%;" />
        <div style="height:12px;border-radius:4px;background:#e2e8f0;width:82%;" />
      </div>
    </div>,
    { size: 'md' }
  )

  await delay(1600)

  const userId = Number(id) || 1
  const names = ['Alice Johnson', 'Bob Smith', 'Carol Williams']
  const roles = ['Senior Engineer', 'Product Manager', 'Designer']
  const bios = [
    'Alice has been at the company for 5 years, leading platform reliability. She is passionate about distributed systems, observability, and mentoring junior engineers. Outside of work she volunteers at coding bootcamps.',
    'Bob connects user research with engineering roadmaps to ship features that move the needle. He has a background in behavioural economics and a deep love for spreadsheets.',
    'Carol sweats the details so users don\'t have to. With a background in fine art and a decade in product design, she believes great design should be invisible.',
  ]
  const idx = (userId - 1) % 3

  yield ctx.modal(
    <div style="padding: 8px;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
        <div style="width:64px;height:64px;border-radius:50%;background:#6366f1;color:white;display:flex;align-items:center;justify-content:center;font-size:1.75rem;font-weight:bold;flex-shrink:0;">
          {names[idx][0]}
        </div>
        <div>
          <h3 style="margin:0 0 4px;font-size:1.1rem;">{names[idx]}</h3>
          <p style="margin:0;color:#6366f1;font-size:0.875rem;">{roles[idx]}</p>
        </div>
      </div>
      <p style="margin:0;color:#475569;line-height:1.65;font-size:0.9rem;">{bios[idx]}</p>
    </div>,
    { size: 'md' }
  )
}

// ============ STREAMING DRAWER ============
// Yield loading state into drawer, then populate with steps

export async function* openActivityDrawer(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  // Open drawer with loading skeleton immediately
  yield ctx.drawer(
    <div style="padding: 4px 0;">
      <h3 style="margin: 0 0 16px; font-size: 1rem;">Recent Activity</h3>
      {[1, 2, 3, 4].map(() => (
        <div style="display:flex;gap:12px;margin-bottom:16px;align-items:flex-start;">
          <div style="width:32px;height:32px;border-radius:50%;background:#e2e8f0;flex-shrink:0;margin-top:2px;" />
          <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
            <div style="height:13px;border-radius:4px;background:#e2e8f0;width:70%;" />
            <div style="height:11px;border-radius:4px;background:#e2e8f0;width:40%;" />
          </div>
        </div>
      ))}
    </div>,
    { position: 'right', size: 'small' }
  )

  const events = [
    { icon: '🚀', label: 'Deployed v2.4.1 to production', time: '2 min ago', color: '#dcfce7' },
    { icon: '💬', label: 'Left a comment on PR #312', time: '18 min ago', color: '#dbeafe' },
    { icon: '✅', label: 'Closed issue: Fix login redirect', time: '1 hr ago', color: '#f0fdf4' },
    { icon: '🔀', label: 'Merged branch feature/streaming', time: '3 hr ago', color: '#fef9c3' },
  ]

  for (let i = 0; i < events.length; i++) {
    await delay(400)
    const loaded = events.slice(0, i + 1)

    yield ctx.drawer(
      <div style="padding: 4px 0;">
        <h3 style="margin: 0 0 16px; font-size: 1rem;">Recent Activity</h3>
        {loaded.map(ev => (
          <div style={`display:flex;gap:12px;margin-bottom:16px;align-items:flex-start;padding:10px;border-radius:8px;background:${ev.color};`}>
            <span style="font-size:1.25rem;flex-shrink:0;">{ev.icon}</span>
            <div>
              <div style="font-size:0.875rem;font-weight:500;color:#1e293b;">{ev.label}</div>
              <div style="font-size:0.75rem;color:#64748b;margin-top:2px;">{ev.time}</div>
            </div>
          </div>
        ))}
        {loaded.length < events.length && (
          <div style="display:flex;flex-direction:column;gap:10px;">
            {events.slice(i + 1).map(() => (
              <div style="display:flex;gap:12px;align-items:flex-start;">
                <div style="width:32px;height:32px;border-radius:50%;background:#e2e8f0;flex-shrink:0;" />
                <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
                  <div style="height:13px;border-radius:4px;background:#e2e8f0;width:70%;" />
                  <div style="height:11px;border-radius:4px;background:#e2e8f0;width:40%;" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>,
      { position: 'right', size: 'small' }
    )
  }
}

let visits = 12_843
let signups = 342
let revenue = 48_291

export async function* refreshDashboardStream(ctx: BeamContext<Env>, _params: Record<string, unknown>) {
  // Show loading state for all widgets immediately
  yield ctx.render(
    <div id="stream-dashboard">
      <div class="stat-card loading"><div class="stat-label">Visits</div><div class="stat-value skeleton-value" /></div>
      <div class="stat-card loading"><div class="stat-label">Signups</div><div class="stat-value skeleton-value" /></div>
      <div class="stat-card loading"><div class="stat-label">Revenue</div><div class="stat-value skeleton-value" /></div>
    </div>
  )

  await delay(700)
  visits += Math.floor(Math.random() * 200)
  yield ctx.render(
    <div id="stream-dashboard">
      <div class="stat-card ready"><div class="stat-label">Visits</div><div class="stat-value">{visits.toLocaleString()}</div></div>
      <div class="stat-card loading"><div class="stat-label">Signups</div><div class="stat-value skeleton-value" /></div>
      <div class="stat-card loading"><div class="stat-label">Revenue</div><div class="stat-value skeleton-value" /></div>
    </div>
  )

  await delay(500)
  signups += Math.floor(Math.random() * 20)
  yield ctx.render(
    <div id="stream-dashboard">
      <div class="stat-card ready"><div class="stat-label">Visits</div><div class="stat-value">{visits.toLocaleString()}</div></div>
      <div class="stat-card ready"><div class="stat-label">Signups</div><div class="stat-value">{signups.toLocaleString()}</div></div>
      <div class="stat-card loading"><div class="stat-label">Revenue</div><div class="stat-value skeleton-value" /></div>
    </div>
  )

  await delay(600)
  revenue += Math.floor(Math.random() * 1000)
  yield ctx.render(
    <div id="stream-dashboard">
      <div class="stat-card ready"><div class="stat-label">Visits</div><div class="stat-value">{visits.toLocaleString()}</div></div>
      <div class="stat-card ready"><div class="stat-label">Signups</div><div class="stat-value">{signups.toLocaleString()}</div></div>
      <div class="stat-card ready"><div class="stat-label">Revenue</div><div class="stat-value">${revenue.toLocaleString()}</div></div>
    </div>
  )
}
