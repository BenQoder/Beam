import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  DEV_HEADERS_CONTENT,
  writeDevHeaders,
  cleanDevArtifacts,
  hasBeamBuildHook,
} from '../src/cli'

let dir: string

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'beam-cli-dev-'))
})

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('dev cache headers', () => {
  it('writes a no-store _headers file for dev builds', () => {
    writeDevHeaders(dir)
    const content = fs.readFileSync(path.join(dir, '_headers'), 'utf8')
    expect(content).toBe(DEV_HEADERS_CONTENT)
    expect(content).toContain('Cache-Control: no-store')
  })

  it('production cleanup removes _headers with the other dev artifacts', () => {
    writeDevHeaders(dir)
    fs.writeFileSync(path.join(dir, '__beam_dev.json'), '{}')
    cleanDevArtifacts(dir)
    expect(fs.existsSync(path.join(dir, '_headers'))).toBe(false)
    expect(fs.existsSync(path.join(dir, '__beam_dev.json'))).toBe(false)
  })
})

describe('hasBeamBuildHook', () => {
  it('detects the hook in wrangler.json and wrangler.jsonc', () => {
    fs.writeFileSync(
      path.join(dir, 'wrangler.json'),
      JSON.stringify({ build: { command: 'npx --no-install beam build --dev' } })
    )
    expect(hasBeamBuildHook(dir)).toBe(true)

    fs.renameSync(path.join(dir, 'wrangler.json'), path.join(dir, 'wrangler.jsonc'))
    expect(hasBeamBuildHook(dir)).toBe(true)
  })

  it('returns false without a hook', () => {
    fs.writeFileSync(path.join(dir, 'wrangler.json'), JSON.stringify({ name: 'app' }))
    expect(hasBeamBuildHook(dir)).toBe(false)
    fs.rmSync(path.join(dir, 'wrangler.json'))
    expect(hasBeamBuildHook(dir)).toBe(false)
  })
})
