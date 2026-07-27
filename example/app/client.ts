import { createClient } from 'honox/client'
import '@benqoder/beam/client'
import { allowIslandSources, registerIslands } from '@benqoder/beam/islands'

allowIslandSources(['/islands/'])
registerIslands(import.meta.glob('/app/islands/*.tsx'))
createClient()
