// Example Beam Island: Simple Counter
// Demonstrates basic state management in an island

import { defineIsland } from '@benqoder/beam/islands'

interface CounterProps {
  initial?: number
  step?: number
  label?: string
}

export default defineIsland('Counter', (props: CounterProps) => {
  const { initial = 0, step = 1, label = 'Count' } = props

  // Create container
  const container = document.createElement('div')
  container.className = 'inline-flex items-center gap-3 p-4 bg-white border rounded-lg shadow-sm'

  // Create label
  if (label) {
    const labelEl = document.createElement('span')
    labelEl.className = 'text-sm font-medium text-gray-700'
    labelEl.textContent = `${label}:`
    container.appendChild(labelEl)
  }

  // Create minus button
  const minusBtn = document.createElement('button')
  minusBtn.textContent = '-'
  minusBtn.className = 'px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded'
  minusBtn.type = 'button'

  // Create count display
  const countDisplay = document.createElement('span')
  countDisplay.className = 'px-4 py-1 min-w-[3rem] text-center font-semibold text-lg'
  countDisplay.textContent = String(initial)

  // Create plus button
  const plusBtn = document.createElement('button')
  plusBtn.textContent = '+'
  plusBtn.className = 'px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded'
  plusBtn.type = 'button'

  // Track current count
  let count = initial

  // Update display
  const updateCount = (newCount: number) => {
    count = newCount
    countDisplay.textContent = String(count)
  }

  // Add event listeners
  minusBtn.addEventListener('click', () => {
    updateCount(count - step)
  })

  plusBtn.addEventListener('click', () => {
    updateCount(count + step)
  })

  // Assemble the component
  container.appendChild(minusBtn)
  container.appendChild(countDisplay)
  container.appendChild(plusBtn)

  return container
})
