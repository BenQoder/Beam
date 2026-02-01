import { createClient } from 'honox/client'
import '@benqoder/beam/client'

// Import all island components to register them
// Note: We need to access the modules to prevent tree-shaking
const islandModules = import.meta.glob('/app/islands/*.tsx', { eager: true })

// Touch each module to ensure they're not tree-shaken
Object.values(islandModules)

createClient()
