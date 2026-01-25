import type { ActionHandler } from '@benqoder/beam'
import type { Env } from '../types'

import { addToCart } from './addToCart'
import { removeFromCart } from './removeFromCart'
import { createProduct } from './createProduct'
import { updateProduct } from './updateProduct'
import { deleteProduct } from './deleteProduct'
import { like } from './like'
import { getProducts } from './getProducts'
import { loadMoreProducts } from './loadMoreProducts'
import { loadMoreInfinite } from './loadMoreInfinite'
import {
  increment,
  decrement,
  greet,
  slowAction,
  deleteItem,
  toggleTest,
  hideTest,
  addItem,
  replaceList,
  oobUpdate,
  testScriptOnly,
  testHtmlAndScript,
  testHtmlOnly,
  testRedirect,
} from './demo'
import { getCurrentUser } from './auth'

export const actions: Record<string, ActionHandler<Env>> = {
  addToCart,
  removeFromCart,
  createProduct,
  updateProduct,
  deleteProduct,
  like,
  getProducts,
  loadMoreProducts,
  loadMoreInfinite,
  // Demo actions
  increment,
  decrement,
  greet,
  slowAction,
  deleteItem,
  toggleTest,
  hideTest,
  addItem,
  replaceList,
  oobUpdate,
  // Script execution tests
  testScriptOnly,
  testHtmlAndScript,
  testHtmlOnly,
  testRedirect,
  // Auth actions
  getCurrentUser,
}
