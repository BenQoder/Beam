import { describe, expect, it } from 'vitest'

import {
  buildCommands,
  cleanDevArtifacts,
  computeAssetSignature,
  createProject,
  initProject,
  patchWranglerJsonText,
  resolveBuildTargets,
  writeDevManifest,
} from '../src/cli'
import { collectActions } from '../src/collect'
import { render } from '../src/render'
import { beamPlugin } from '../src/vite'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('core utilities', () => {
  it('collectActions returns named function exports only', () => {
    const actions = collectActions({
      '/a.ts': {
        save: () => 'ok',
        notAFunction: 123,
        default: () => 'skip',
      },
      '/b.ts': {
        remove: () => 'gone',
      },
    })

    expect(Object.keys(actions).sort()).toEqual(['remove', 'save'])
  })

  it('render resolves sync and async stringables', async () => {
    const sync = await render({ toString: () => 'sync-html' } as any)
    const asyncValue = await render(Promise.resolve({ toString: () => Promise.resolve('async-html') } as any))

    expect(sync).toBe('sync-html')
    expect(asyncValue).toBe('async-html')
  })

  it('beamPlugin resolves and loads the virtual module', () => {
    const plugin = beamPlugin({
      actions: '/app/actions/*.tsx',
      auth: '/app/auth.ts',
      session: { secretEnvKey: 'APP_SECRET', cookieName: 'sid', maxAge: 60, storage: '/app/session.ts' },
    })

    expect(plugin.resolveId?.('virtual:beam')).toBe('\0virtual:beam')

    const code = plugin.load?.('\0virtual:beam')
    expect(typeof code).toBe('string')
    expect(code).toContain("import auth from '/app/auth.ts'")
    expect(code).toContain("import storageFactory from '/app/session.ts'")
    expect(code).toContain("collectActions(import.meta.glob('/app/actions/*.tsx', { eager: true }))")
    expect(code).toContain("secretEnvKey: 'APP_SECRET'")
    expect(code).toContain("cookieName: 'sid'")
  })

  it('Beam CLI resolves build command targets', () => {
    expect(resolveBuildTargets([])).toEqual(['server', 'client'])
    expect(resolveBuildTargets(['--server-only'])).toEqual(['server'])
    expect(resolveBuildTargets(['--client-only'])).toEqual(['client'])
    expect(buildCommands([])).toEqual([
      ['vite', 'build'],
      ['vite', 'build', '--mode', 'client'],
    ])
  })

  it('Beam CLI writes a dev manifest with a stable asset signature', () => {
    const dir = mkdtempSync(join(tmpdir(), 'beam-dev-'))
    try {
      mkdirSync(join(dir, 'static'))
      writeFileSync(join(dir, 'static', 'client.js'), 'console.log("beam")')

      const first = writeDevManifest(dir, 100)
      const second = writeDevManifest(dir, 200)

      expect(first.version).toBe('100')
      expect(second.version).toBe('200')
      expect(first.assets).toBe(second.assets)
      expect(first.assets).toBe(computeAssetSignature(dir))
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('Beam CLI removes dev-only artifacts for production builds', () => {
    const dir = mkdtempSync(join(tmpdir(), 'beam-prod-'))
    try {
      mkdirSync(join(dir, 'static'))
      writeFileSync(join(dir, '__beam_dev.json'), '{}')
      writeFileSync(join(dir, 'static', 'dev-refresh.js'), 'refresh')

      cleanDevArtifacts(dir)

      expect(existsSync(join(dir, '__beam_dev.json'))).toBe(false)
      expect(existsSync(join(dir, 'static', 'dev-refresh.js'))).toBe(false)
      expect(() => computeAssetSignature(dir)).not.toThrow()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('Beam CLI patches Wrangler JSON config', () => {
    const config = patchWranglerJsonText('{"name":"existing","vars":{"API_URL":"http://localhost"}}\n')
    const parsed = JSON.parse(config)

    expect(parsed.name).toBe('existing')
    expect(parsed.main).toBe('./dist/index.js')
    expect(parsed.assets.directory).toBe('./dist')
    expect(parsed.build.command).toBe('npx --no-install beam build --dev')
    expect(parsed.build.watch_dir).toBe('app')
    expect(parsed.vars.API_URL).toBe('http://localhost')
    expect(parsed.vars.SESSION_SECRET).toBe('dev-secret-change-in-production')
  })

  it('Beam CLI creates a minimal app template', () => {
    const dir = mkdtempSync(join(tmpdir(), 'beam-create-'))
    try {
      const result = createProject({ cwd: dir, name: 'my-beam-app' })
      const appDir = join(dir, 'my-beam-app')

      expect(result.changed).toContain('package.json')
      expect(existsSync(join(appDir, 'package.json'))).toBe(true)
      expect(existsSync(join(appDir, 'wrangler.json'))).toBe(true)
      expect(existsSync(join(appDir, 'app', 'client.ts'))).toBe(true)

      const pkg = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8'))
      const wrangler = JSON.parse(readFileSync(join(appDir, 'wrangler.json'), 'utf8'))
      expect(pkg.name).toBe('my-beam-app')
      expect(pkg.scripts.dev).toBe('npx wrangler dev --port 8791')
      expect(wrangler.name).toBe('my-beam-app')
      expect(wrangler.build.command).toBe('npx --no-install beam build --dev')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('Beam CLI init is idempotent and skips existing files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'beam-init-'))
    try {
      mkdirSync(join(dir, 'app'), { recursive: true })
      writeFileSync(join(dir, 'package.json'), '{"name":"existing","type":"module"}\n')
      writeFileSync(join(dir, 'app', 'client.ts'), 'console.log("keep me")\n')

      const first = initProject({ cwd: dir })
      const second = initProject({ cwd: dir })

      expect(first.changed).toContain('package.json')
      expect(first.changed).toContain('wrangler.json')
      expect(first.skipped).toContain('app/client.ts')
      expect(second.skipped).toContain('app/client.ts')
      expect(readFileSync(join(dir, 'app', 'client.ts'), 'utf8')).toBe('console.log("keep me")\n')

      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
      expect(pkg.scripts.dev).toBe('npx wrangler dev --port 8791')
      expect(pkg.dependencies['@benqoder/beam']).toBeTruthy()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
