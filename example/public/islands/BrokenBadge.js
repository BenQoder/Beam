// Deliberately broken "tenant artifact" — demonstrates crash resilience:
// the island throws on render, Beam restores the server-rendered placeholder
// and fires a beam:island-error event instead of leaving a blank hole.
export default function BrokenBadge() {
  throw new Error('Simulated broken tenant artifact')
}
