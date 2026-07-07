import { useState } from 'react'
import { useBeamAction, useBeamState } from '@benqoder/beam/react'

type Props = {
  initial?: number
  serverMessage?: string
}

// Pure React island. Local state lives in React; the server can confirm the
// count at any time by responding with ctx.island('reactCounter', {...}),
// and `shared` is the same reactive state the beam-state div on the page uses.
export default function ReactCounter({ initial = 0, serverMessage }: Props) {
  const [count, setCount] = useState(initial)
  const { call: sync, loading } = useBeamAction('syncCounter')
  const shared = useBeamState('reactShared', { clicks: 0 })

  const bump = (delta: number) => {
    setCount((n) => n + delta)
    shared.clicks++
  }

  return (
    <div className="react-card">
      <div className="react-card-head">
        <strong>ReactCounter</strong>
        <span className="react-chip">react island</span>
      </div>

      <div className="react-counter-row">
        <button className="btn-secondary" onClick={() => bump(-1)}>−</button>
        <span className="react-counter-value">{count}</span>
        <button className="btn-secondary" onClick={() => bump(1)}>+</button>
        <button
          className="btn-primary"
          disabled={loading}
          onClick={() => { void sync({ value: count }) }}
        >
          {loading ? 'Syncing…' : 'Sync to server'}
        </button>
      </div>

      <p className="react-muted">
        {serverMessage ?? 'Not synced yet — count lives in React state.'}
      </p>
    </div>
  )
}
