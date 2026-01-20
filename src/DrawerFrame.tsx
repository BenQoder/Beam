import type { Child } from 'hono/jsx'

type Props = {
  title: string
  children: Child
}

/**
 * Reusable drawer wrapper component.
 * Provides consistent header with title and close button.
 *
 * Note: The position (left/right) and size (small/medium/large) are
 * controlled by the client via beam-position and beam-size attributes
 * on the trigger element.
 */
export function DrawerFrame({ title, children }: Props) {
  return (
    <>
      <header class="drawer-header">
        <h2>{title}</h2>
        <button type="button" beam-close aria-label="Close" class="drawer-close">
          &times;
        </button>
      </header>
      <div class="drawer-body">
        {children}
      </div>
    </>
  )
}
