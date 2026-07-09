import type { BeamContext } from '@benqoder/beam'
import type { Env } from '../types'

// One action per swap preset: returns a fresh card so clicking re-triggers the
// target's beam-swap-transition. A per-preset counter makes each swap visibly
// different so the animation is obvious on repeat clicks.
const swapCounts: Record<string, number> = {}

function swapCard(ctx: BeamContext<Env>, preset: string) {
  swapCounts[preset] = (swapCounts[preset] ?? 0) + 1
  return ctx.render(
    <div class="swap-card">
      <strong>{preset}</strong>
      <span class="swap-n">swap #{swapCounts[preset]}</span>
    </div>
  )
}

export function swapFade(ctx: BeamContext<Env>, _data: Record<string, unknown>) {
  return swapCard(ctx, 'fade')
}
export function swapScale(ctx: BeamContext<Env>, _data: Record<string, unknown>) {
  return swapCard(ctx, 'scale')
}
export function swapZoom(ctx: BeamContext<Env>, _data: Record<string, unknown>) {
  return swapCard(ctx, 'zoom')
}
export function swapPop(ctx: BeamContext<Env>, _data: Record<string, unknown>) {
  return swapCard(ctx, 'pop')
}
export function swapBlur(ctx: BeamContext<Env>, _data: Record<string, unknown>) {
  return swapCard(ctx, 'blur')
}
export function swapSlide(ctx: BeamContext<Env>, _data: Record<string, unknown>) {
  return swapCard(ctx, 'slide')
}
export function swapSlideUp(ctx: BeamContext<Env>, _data: Record<string, unknown>) {
  return swapCard(ctx, 'slide-up')
}
export function swapSlideDown(ctx: BeamContext<Env>, _data: Record<string, unknown>) {
  return swapCard(ctx, 'slide-down')
}
export function swapSlideLeft(ctx: BeamContext<Env>, _data: Record<string, unknown>) {
  return swapCard(ctx, 'slide-left')
}
export function swapSlideRight(ctx: BeamContext<Env>, _data: Record<string, unknown>) {
  return swapCard(ctx, 'slide-right')
}
export function swapFlipX(ctx: BeamContext<Env>, _data: Record<string, unknown>) {
  return swapCard(ctx, 'flip-x')
}
export function swapFlipY(ctx: BeamContext<Env>, _data: Record<string, unknown>) {
  return swapCard(ctx, 'flip-y')
}

// Enter classes: each item animates in as it's inserted.
export function loadTiles(ctx: BeamContext<Env>) {
  const tiles = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta']
  return ctx.render(
    <>
      {tiles.map((label) => (
        <div class="tile" beam-enter="tile-enter" beam-enter-start="tile-from">
          {label}
        </div>
      ))}
    </>,
    { target: '#tile-grid' }
  )
}

// Leave classes: any content triggers the target's beam-swap="delete".
export function removeBanner() {
  return ' '
}

// Append a row (enter animation on the new row only, existing rows untouched).
let rowCounter = 0
export function addRow(ctx: BeamContext<Env>) {
  rowCounter++
  return ctx.render(
    <div class="feed-row" beam-enter="row-enter" beam-enter-start="row-from">
      New row #{rowCounter} · {new Date().toLocaleTimeString()}
    </div>,
    { target: '#feed', swap: 'prepend' }
  )
}
