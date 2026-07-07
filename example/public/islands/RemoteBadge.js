// A "dynamic island" module: NOT in app/islands/, NOT in the build-time
// registry, NOT bundled by Vite. Served as a plain static file — the way a
// platform would serve a per-tenant compiled artifact from R2.
//
// Bare imports below are resolved by the page's import map
// (beamIslandImportMap()) to the single shared React instance Beam manages.
import { useState, createElement as h } from 'react'
import { useBeamAction } from '@benqoder/beam/react'

export default function RemoteBadge({ label = 'Remote island' }) {
  const [count, setCount] = useState(0)
  const { call: sync, loading, json } = useBeamAction('syncCounter')

  const serverMessage = json
    ? `ctx.json reply: confirmed ${json.confirmed} at ${json.receivedAt}`
    : 'This component was loaded from /islands/RemoteBadge.js at runtime.'

  return h(
    'div',
    { className: 'react-card' },
    h(
      'div',
      { className: 'react-card-head' },
      h('strong', null, label),
      h('span', { className: 'react-chip' }, 'runtime module')
    ),
    h(
      'div',
      { className: 'react-counter-row' },
      h(
        'button',
        { className: 'btn-secondary', onClick: () => setCount(count + 1) },
        `Local state: ${count}`
      ),
      h(
        'button',
        {
          className: 'btn-primary',
          disabled: loading,
          onClick: () => {
            void sync({ value: count })
          },
        },
        loading ? 'Calling…' : 'Call beam action'
      )
    ),
    h('p', { className: 'react-muted' }, serverMessage)
  )
}
