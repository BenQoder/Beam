import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { beamPlugin } from '../src/vite'

let root: string

function runPlugin(options: Parameters<typeof beamPlugin>[0]): void {
  const plugin = beamPlugin(options) as unknown as {
    configResolved: (config: unknown) => void
    buildStart: (this: unknown) => void
  }
  plugin.configResolved({ root, command: 'build', build: { ssr: false } })
  plugin.buildStart.call({ emitFile: () => '' })
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'beam-action-types-'))
  fs.mkdirSync(path.join(root, 'app/actions/admin'), { recursive: true })
  fs.writeFileSync(path.join(root, 'app/actions/cart.tsx'), 'export function addToCart() {}\n')
  fs.writeFileSync(path.join(root, 'app/actions/auth.ts'), 'export function login() {}\n')
  fs.writeFileSync(path.join(root, 'app/actions/admin/users.tsx'), 'export function ban() {}\n')
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

describe('typed-action registry codegen', () => {
  it('generates beam-actions.d.ts next to the actions dir by default', () => {
    runPlugin({ actions: '/app/actions/*.tsx' })

    const out = path.join(root, 'app/beam-actions.d.ts')
    expect(fs.existsSync(out)).toBe(true)
    const content = fs.readFileSync(out, 'utf8')
    expect(content).toContain("declare module '@benqoder/beam'")
    expect(content).toContain('interface BeamRegisteredActionModules')
    expect(content).toContain("'app/actions/cart.tsx': typeof import('./actions/cart')")
    // flat glob: nested files and non-matching extensions excluded
    expect(content).not.toContain('admin/users')
    expect(content).not.toContain('auth')
  })

  it('recursive globs include nested action files', () => {
    runPlugin({ actions: '/app/actions/**/*.tsx' })

    const content = fs.readFileSync(path.join(root, 'app/beam-actions.d.ts'), 'utf8')
    expect(content).toContain("'app/actions/admin/users.tsx': typeof import('./actions/admin/users')")
    expect(content).toContain("'app/actions/cart.tsx'")
  })

  it('respects a custom output path', () => {
    runPlugin({ actions: '/app/actions/*.tsx', actionTypes: '/types/beam.d.ts' })

    const out = path.join(root, 'types/beam.d.ts')
    expect(fs.existsSync(out)).toBe(true)
    // relative import from /types/ up into /app/actions/
    expect(fs.readFileSync(out, 'utf8')).toContain("typeof import('../app/actions/cart')")
  })

  it('can be disabled', () => {
    runPlugin({ actions: '/app/actions/*.tsx', actionTypes: false })
    expect(fs.existsSync(path.join(root, 'app/beam-actions.d.ts'))).toBe(false)
  })

  it('is idempotent — unchanged content is not rewritten', () => {
    runPlugin({ actions: '/app/actions/*.tsx' })
    const out = path.join(root, 'app/beam-actions.d.ts')
    const firstMtime = fs.statSync(out).mtimeMs
    runPlugin({ actions: '/app/actions/*.tsx' })
    expect(fs.statSync(out).mtimeMs).toBe(firstMtime)
  })
})
