import type { Child } from 'hono/jsx'

type Props = {
  title: string
  children: Child
}

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
