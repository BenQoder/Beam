import build from '@hono/vite-build/cloudflare-workers'
import adapter from '@hono/vite-dev-server/cloudflare'
import { beamPlugin } from '@benqoder/beam/vite'
import honox from 'honox/vite'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  const devRefresh = process.env.BEAM_BUILD_DEV === '1'
  const clientInputs = ['./app/client.ts', './app/styles.css', ...(devRefresh ? ['./app/dev-refresh.ts'] : [])]
  const common = {
    plugins: [
      beamPlugin({
        actions: '/app/actions/*.tsx',
        session: true,
      }),
    ],
  }

  if (mode === 'client') {
    return {
      ...common,
      build: {
        rollupOptions: {
          input: clientInputs,
          output: {
            entryFileNames: (chunk) => chunk.name === 'dev-refresh' ? 'static/dev-refresh.js' : 'static/[name].js',
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
