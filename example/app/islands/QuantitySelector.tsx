// Example Beam Island: Quantity Selector
// This demonstrates client-side interactivity with Beam Islands

import { defineIsland } from '@benqoder/beam/islands'

interface QuantitySelectorProps {
  min?: number
  max?: number
  initial?: number
  productId?: string
}

export default defineIsland('QuantitySelector', (props: QuantitySelectorProps) => {
  const { min = 1, max = 99, initial = 1, productId = '' } = props

  // Create container element
  const container = document.createElement('div')
  container.className = 'flex items-center gap-2'

  // Create minus button
  const minusBtn = document.createElement('button')
  minusBtn.textContent = '-'
  minusBtn.className = 'px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded'
  minusBtn.type = 'button'

  // Create quantity display
  const qtyDisplay = document.createElement('span')
  qtyDisplay.className = 'px-4 py-1 min-w-[3rem] text-center'
  qtyDisplay.textContent = String(initial)

  // Create plus button
  const plusBtn = document.createElement('button')
  plusBtn.textContent = '+'
  plusBtn.className = 'px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded'
  plusBtn.type = 'button'

  // Create hidden input to hold the actual value
  const hiddenInput = document.createElement('input')
  hiddenInput.type = 'hidden'
  hiddenInput.name = 'quantity'
  hiddenInput.value = String(initial)

  // Track current quantity
  let currentQty = initial

  // Update display and hidden input
  const updateQuantity = (newQty: number) => {
    currentQty = Math.max(min, Math.min(max, newQty))
    qtyDisplay.textContent = String(currentQty)
    hiddenInput.value = String(currentQty)
  }

  // Add event listeners
  minusBtn.addEventListener('click', () => {
    updateQuantity(currentQty - 1)
  })

  plusBtn.addEventListener('click', () => {
    updateQuantity(currentQty + 1)
  })

  // Assemble the component
  container.appendChild(minusBtn)
  container.appendChild(qtyDisplay)
  container.appendChild(plusBtn)
  container.appendChild(hiddenInput)

  // If productId is provided, add it as a data attribute for Beam actions
  if (productId) {
    container.setAttribute('data-product-id', productId)
  }

  return container
})
