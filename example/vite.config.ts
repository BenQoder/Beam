import build from '@hono/vite-build/cloudflare-workers'
import adapter from '@hono/vite-dev-server/cloudflare'
import honox from 'honox/vite'
import { defineConfig } from 'vite'
import { beamPlugin } from '@benqoder/beam/vite'

export default defineConfig(({ mode }) => {
  const common = {
    resolve: {
      alias: {
        'idiomorph': 'idiomorph/dist/idiomorph.esm.js',
      },
    },
    plugins: [
      beamPlugin({
        actions: '/app/actions/*.tsx',
        islands: '/app/islands/*.tsx',
        auth: '/app/auth.ts',
        session: { storage: '/app/session-storage.ts' }, // Uses KV for persistence
      }),
    ],
  }

  if (mode === 'client') {
    return {
      ...common,
      build: {
        rollupOptions: {
          input: ['./app/client.ts', './app/styles.css'],
          output: {
            entryFileNames: 'static/[name].js',
            assetFileNames: 'static/[name].[ext]',
          },
        },
        outDir: './dist',
        emptyOutDir: false,
      },
    }
  }

  return {
    ...common,
    plugins: [
      ...common.plugins,
      honox({ devServer: { adapter } }),
      build(),
    ],
  }
})
