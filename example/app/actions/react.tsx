import { Island } from '@benqoder/beam'
import type { BeamContext } from '@benqoder/beam'
import type { Env } from '../types'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// ============ REACT ISLAND ACTIONS ============
// Client → server: React islands call these via useBeamAction.
// Server → client: respond (or stream) island props updates and events.

// Confirm a count coming from the ReactCounter island and push fresh props
// back into the mounted component (its local React state is preserved).
// Also returns a ctx.json payload — private data resolved at the call site,
// on top of the island push (one response can carry both).
export function syncCounter(ctx: BeamContext<Env>, { value }: Record<string, unknown>) {
  const serverValue = Number(value) || 0
  return {
    ...ctx.island('reactCounter', {
      initial: serverValue,
      serverMessage: `Server confirmed count ${serverValue}`,
    }),
    ...ctx.json({ confirmed: serverValue, receivedAt: new Date().toISOString() }),
  }
}

// An action response that RENDERS an island: the modal HTML contains an
// <Island> marker and the React component mounts inside the open modal.
export function openCounterModal(ctx: BeamContext<Env>) {
  return ctx.modal(
    <div>
      <h2>Island in a modal</h2>
      <p>This ReactCounter arrived in a ctx.modal() action response.</p>
      <Island name="ReactCounter" id="modalCounter" props={{ initial: 100 }}>
        <div class="react-skeleton">Mounting…</div>
      </Island>
      <button beam-close>Close</button>
    </div>,
    { size: 'medium' }
  )
}

// Server-spawned island: creates a ReactCounter in #promo-zone without
// sending any HTML — pure ctx.island() upsert over the WebSocket.
export function spawnPromo(ctx: BeamContext<Env>) {
  return ctx.island(
    'promoRail',
    { initial: 500, serverMessage: 'Spawned by the server — no HTML was sent' },
    { component: 'ReactCounter', target: '#promo-zone', swap: 'replace' }
  )
}

export function dismissPromo(ctx: BeamContext<Env>) {
  return ctx.removeIsland('promoRail')
}

// Stream live data into the StockTicker island: one ctx.island() per tick,
// then a ctx.event() the island listens for with useBeamEvent.
export async function* streamTicker(ctx: BeamContext<Env>, _data: Record<string, unknown>) {
  const total = 15
  let price = 100

  for (let tick = 1; tick <= total; tick++) {
    price = Math.round((price + (Math.random() - 0.45) * 4) * 100) / 100
    yield ctx.island('stockTicker', { symbol: 'BEAM', price, tick, total })
    await delay(350)
  }

  yield ctx.event('ticker:done', { message: `Stream finished at $${price.toFixed(2)}` })
}
