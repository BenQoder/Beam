import { createClient } from 'honox/client'
import '@benqoder/beam/client'

// Import all island components to register them
import.meta.glob('/app/islands/*.tsx', { eager: true })

createClient()
