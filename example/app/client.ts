import { createClient } from 'honox/client'
import '@benqoder/beam/client'
import { registerIslands } from '@benqoder/beam/islands'
import islands from 'virtual:beam/islands'

registerIslands(islands)
createClient()
