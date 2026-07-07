import { useState } from 'react'
import { useBeamAction, useBeamConnection, useBeamEvent } from '@benqoder/beam/react'

type Props = {
  symbol?: string
  price?: number
  tick?: number
  total?: number
}

// The server streams props into this mounted island over the WebSocket:
// the streamTicker generator yields ctx.island('stockTicker', {...}) per tick
// and finishes with ctx.event('ticker:done'). React state (price history)
// accumulates locally while the server drives the data.
export default function StockTicker({ symbol = 'BEAM', price = 100, tick = 0, total = 0 }: Props) {
  const { call: start, loading } = useBeamAction('streamTicker')
  const { connected } = useBeamConnection()
  const [history, setHistory] = useState<number[]>([price])
  const [seenTick, setSeenTick] = useState(tick)
  const [doneMessage, setDoneMessage] = useState<string | null>(null)

  // Derive history from server-pushed props (render-phase derived state)
  if (tick !== seenTick) {
    setSeenTick(tick)
    setHistory((h) => [...h.slice(-23), price])
  }

  useBeamEvent<{ message: string }>('ticker:done', ({ message }) => setDoneMessage(message))

  const min = Math.min(...history)
  const max = Math.max(...history)
  const range = max - min || 1

  return (
    <div className="react-card">
      <div className="react-card-head">
        <strong>{symbol}</strong>
        <span className="react-chip">react island</span>
        <span className={connected ? 'react-dot react-dot-on' : 'react-dot'} title={connected ? 'connected' : 'disconnected'} />
      </div>

      <div className="react-ticker-row">
        <span className="react-ticker-price">${price.toFixed(2)}</span>
        <span className="react-muted">
          {loading && total > 0 ? `tick ${tick}/${total}` : doneMessage ?? 'idle'}
        </span>
      </div>

      <div className="react-sparkline">
        {history.map((value, i) => (
          <span
            key={i}
            className="react-sparkline-bar"
            style={{ height: `${8 + ((value - min) / range) * 40}px` }}
          />
        ))}
      </div>

      <button
        className="btn-primary"
        disabled={loading}
        onClick={() => { setDoneMessage(null); void start() }}
      >
        {loading ? 'Streaming from server…' : 'Start server stream'}
      </button>
    </div>
  )
}
