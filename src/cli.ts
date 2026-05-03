#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

type BuildTarget = 'server' | 'client'

export function resolveBuildTargets(args: string[]): BuildTarget[] {
  if (args.includes('--server-only')) return ['server']
  if (args.includes('--client-only')) return ['client']
  return ['server', 'client']
}

export function buildCommands(args: string[]): string[][] {
  const viteArgs = args.filter((arg) => arg !== '--dev')
  return resolveBuildTargets(viteArgs).map((target) => (
    target === 'server' ? ['vite', 'build'] : ['vite', 'build', '--mode', 'client']
  ))
}

export function isDevBuild(args: string[]): boolean {
  return args.includes('--dev')
}

function collectAssetFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const file = join(dir, entry)
    const stat = statSync(file)
    if (stat.isDirectory()) {
      files.push(...collectAssetFiles(file))
    } else {
      files.push(file)
    }
  }
  return files.sort()
}

export function computeAssetSignature(outDir = 'dist'): string {
  const hash = createHash('sha256')
  for (const file of [
    ...collectAssetFiles(join(outDir, 'static')),
    ...collectAssetFiles(join(outDir, 'assets')),
  ]) {
    hash.update(file)
    hash.update(readFileSync(file))
  }
  return hash.digest('hex')
}

export function writeDevManifest(outDir = 'dist', now = Date.now()): { version: string; assets: string } {
  mkdirSync(outDir, { recursive: true })
  const version = String(now)
  const assets = computeAssetSignature(outDir)
  const manifest = { version, assets }
  writeFileSync(join(outDir, '__beam_dev.json'), `${JSON.stringify(manifest)}\n`)
  return manifest
}

export function cleanDevArtifacts(outDir = 'dist'): void {
  rmSync(join(outDir, '__beam_dev.json'), { force: true })
  rmSync(join(outDir, 'static', 'dev-refresh.js'), { force: true })
}

function printHelp() {
  console.log(`Beam CLI

Usage:
  beam build [--dev] [--server-only | --client-only]

Commands:
  build    Build the Worker bundle and client assets with Vite.
           --dev writes dist/__beam_dev.json for development refresh.

Wrangler:
  Add a build command to wrangler.toml or wrangler.jsonc so "wrangler dev"
  automatically builds before starting and rebuilds while watching app files.

  [build]
  command = "npx --no-install beam build --dev"
  watch_dir = "app"
`)
}

function runBuild(args: string[]) {
  const dev = isDevBuild(args)
  for (const command of buildCommands(args)) {
    const result = spawnSync(command[0], command.slice(1), {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        ...(dev ? { BEAM_BUILD_DEV: '1', VITE_BEAM_DEV_REFRESH: '1' } : {}),
      },
    })

    if (result.status !== 0) {
      process.exit(result.status ?? 1)
    }
  }

  if (dev) {
    writeDevManifest()
  } else {
    cleanDevArtifacts()
  }
}

function main() {
  const [command, ...args] = process.argv.slice(2)

  if (!command || command === '--help' || command === '-h') {
    printHelp()
    return
  }

  if (command === 'build') {
    runBuild(args)
    return
  }

  console.error(`Unknown Beam command: ${command}`)
  printHelp()
  process.exit(1)
}

if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) {
  main()
}
