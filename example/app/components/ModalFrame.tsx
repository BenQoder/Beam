import type { Child } from 'hono/jsx'

type Props = {
  title: string
  children: Child
}

export function ModalFrame({ title, children }: Props) {
  return (
    <>
      <header class="modal-header">
        <h2>{title}</h2>
        <button type="button" beam-close aria-label="Close" class="modal-close">
          ×
        </button>
      </header>
      <div class="modal-body">
        {children}
      </div>
    </>
  )
}
