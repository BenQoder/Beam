import { createClient } from 'honox/client'
import '@benqoder/beam/client'

// Import all island components to register them
// The forEach ensures modules are actually loaded and not tree-shaken
const islandModules = import.meta.glob('/app/islands/*.tsx', { eager: true })
Object.values(islandModules).forEach(() => {})

createClient()
