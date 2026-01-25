import type { BeamContext } from '@benqoder/beam'
import type { Env } from '../types'

import { confirmDelete } from './confirmDelete'
import { editProduct } from './editProduct'
import { createProduct } from './createProduct'
import { addToCart } from './addToCart'
import { demoModal, demoFormModal } from './demo'

type ModalHandler = (ctx: BeamContext<Env>, params: Record<string, unknown>) => Promise<string>

export const modals: Record<string, ModalHandler> = {
  confirmDelete,
  editProduct,
  createProduct,
  addToCart,
  demoModal,
  demoFormModal,
}
