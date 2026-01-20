import type { Child } from 'hono/jsx'

type Props = {
  title: string
  children: Child
}

/**
 * Reusable modal wrapper component.
 * Provides consistent header with title and close button.
 */
export function ModalFrame({ title, children }: Props) {
  return (
    <>
      <header class="modal-header">
        <h2>{title}</h2>
        <button type="button" beam-close aria-label="Close" class="modal-close">
          &times;
        </button>
      </header>
      <div class="modal-body">
        {children}
      </div>
    </>
  )
}
