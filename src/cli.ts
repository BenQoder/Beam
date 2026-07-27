#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

type BuildTarget = 'server' | 'client'
type InitOptions = {
  cwd?: string
  force?: boolean
  dryRun?: boolean
  template?: string
}
type InitResult = {
  changed: string[]
  skipped: string[]
  notes: string[]
}
type CreateOptions = InitOptions & {
  name: string
}

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_TEMPLATE = 'minimal'

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
  return args.includes('--dev') || process.env.BEAM_BUILD_DEV === '1'
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

// Served by Workers static assets (_headers support): disables asset caching
// in dev so rebuilds are never masked by miniflare's emulated cache or the
// browser's HTTP cache. Removed by production builds.
export const DEV_HEADERS_CONTENT = `/*
  Cache-Control: no-store
`

export function writeDevHeaders(outDir = 'dist'): void {
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, '_headers'), DEV_HEADERS_CONTENT)
}

export function cleanDevArtifacts(outDir = 'dist'): void {
  rmSync(join(outDir, '__beam_dev.json'), { force: true })
  rmSync(join(outDir, 'static', 'dev-refresh.js'), { force: true })
  rmSync(join(outDir, '_headers'), { force: true })
}

/** Best-effort check that wrangler config rebuilds via beam on file changes */
export function hasBeamBuildHook(cwd = process.cwd()): boolean {
  for (const file of ['wrangler.json', 'wrangler.jsonc', 'wrangler.toml']) {
    const path = join(cwd, file)
    if (existsSync(path) && readFileSync(path, 'utf8').includes('beam build')) {
      return true
    }
  }
  return false
}

function readJsonFile<T>(file: string): T | null {
  if (!existsSync(file)) return null
  return JSON.parse(readFileSync(file, 'utf8')) as T
}

function currentBeamVersion(): string {
  const pkg = readJsonFile<{ version?: string }>(join(PACKAGE_ROOT, 'package.json'))
  return pkg?.version ?? '0.0.0'
}

function templateDir(template = DEFAULT_TEMPLATE): string {
  return join(PACKAGE_ROOT, 'templates', template)
}

function listTemplateFiles(root: string, dir = root): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const source = join(dir, entry)
    const stat = statSync(source)
    if (stat.isDirectory()) {
      files.push(...listTemplateFiles(root, source))
    } else {
      files.push(relative(root, source))
    }
  }
  return files.sort()
}

function isValidPackageName(name: string): boolean {
  return /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name)
}

function patchPackageJsonText(input: string, packageName?: string): string {
  const pkg = JSON.parse(input) as {
    name?: string
    scripts?: Record<string, string>
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    overrides?: Record<string, string>
  }
  if (packageName) pkg.name = packageName

  pkg.scripts = {
    ...pkg.scripts,
    dev: 'beam dev --port 8791',
    build: 'beam build',
    deploy: 'wrangler deploy',
  }

  const version = currentBeamVersion()
  pkg.dependencies = {
    ...pkg.dependencies,
    '@benqoder/beam': pkg.dependencies?.['@benqoder/beam'] ?? `^${version}`,
    capnweb: pkg.dependencies?.capnweb ?? '^0.10.0',
    hono: pkg.dependencies?.hono ?? '^4.6.0',
    honox: pkg.dependencies?.honox ?? '^0.1.60',
  }
  pkg.devDependencies = {
    ...pkg.devDependencies,
    '@cloudflare/workers-types': pkg.devDependencies?.['@cloudflare/workers-types'] ?? '^4.20260124.0',
    '@hono/vite-build': pkg.devDependencies?.['@hono/vite-build'] ?? '^1.0.0',
    '@hono/vite-dev-server': pkg.devDependencies?.['@hono/vite-dev-server'] ?? '^0.26.1',
    typescript: pkg.devDependencies?.typescript ?? '^5.0.0',
    vite: pkg.devDependencies?.vite ?? '^6.4.3',
    wrangler: pkg.devDependencies?.wrangler ?? '^4.114.0',
  }
  pkg.overrides = {
    ...pkg.overrides,
    '@hono/node-server': pkg.overrides?.['@hono/node-server'] ?? '^2.0.5',
    'brace-expansion': pkg.overrides?.['brace-expansion'] ?? '^5.0.8',
    minimatch: pkg.overrides?.minimatch ?? '^10.2.5',
    postcss: pkg.overrides?.postcss ?? '^8.5.23',
    ws: pkg.overrides?.ws ?? '^8.21.0',
  }

  return `${JSON.stringify(pkg, null, 2)}\n`
}

export function patchPackageJson(file: string, packageName?: string): boolean {
  const current = existsSync(file) ? readFileSync(file, 'utf8') : '{}\n'
  const next = patchPackageJsonText(current, packageName)
  if (current === next) return false
  writeFileSync(file, next)
  return true
}

export function patchWranglerJsonText(input: string, workerName?: string): string {
  const config = input.trim()
    ? JSON.parse(input) as Record<string, unknown>
    : {}

  config.$schema = typeof config.$schema === 'string' ? config.$schema : './node_modules/wrangler/config-schema.json'
  config.name = workerName ?? (typeof config.name === 'string' ? config.name : 'beam-app')
  config.main = './dist/index.js'
  config.compatibility_date = typeof config.compatibility_date === 'string' ? config.compatibility_date : '2024-01-01'
  config.compatibility_flags = Array.isArray(config.compatibility_flags) ? config.compatibility_flags : ['nodejs_compat']
  config.assets = {
    ...((typeof config.assets === 'object' && config.assets) ? config.assets as Record<string, unknown> : {}),
    directory: './dist',
  }
  config.build = {
    ...((typeof config.build === 'object' && config.build) ? config.build as Record<string, unknown> : {}),
    // Production-safe by default. `beam dev` supplies BEAM_BUILD_DEV=1 to
    // Wrangler so watched rebuilds still include the development runtime.
    command: 'npx --no-install beam build',
    watch_dir: 'app',
  }
  const vars = {
    ...((typeof config.vars === 'object' && config.vars) ? config.vars as Record<string, unknown> : {}),
  }
  // Automatically remove the old public scaffold key. Local development now
  // gets a random, gitignored .dev.vars value instead.
  if (vars.SESSION_SECRET === 'dev-secret-change-in-production') {
    delete vars.SESSION_SECRET
  }
  if (Object.keys(vars).length > 0) config.vars = vars
  else delete config.vars

  return `${JSON.stringify(config, null, 2)}\n`
}

function ensureDevSecret(cwd: string, result: InitResult, options: InitOptions): void {
  const file = join(cwd, '.dev.vars')
  if (existsSync(file)) return

  result.changed.push('.dev.vars')
  if (!options.dryRun) {
    mkdirSync(cwd, { recursive: true })
    writeFileSync(file, `SESSION_SECRET=${randomBytes(32).toString('base64url')}\n`, {
      mode: 0o600,
    })
  }
}

function ensureDevVarsIgnored(cwd: string, result: InitResult, options: InitOptions): void {
  const file = join(cwd, '.gitignore')
  const current = existsSync(file) ? readFileSync(file, 'utf8') : ''
  if (current.split(/\r?\n/).some((line) => line.trim() === '.dev.vars')) return

  if (!result.changed.includes('.gitignore')) result.changed.push('.gitignore')
  if (!options.dryRun) {
    const separator = current.length > 0 && !current.endsWith('\n') ? '\n' : ''
    writeFileSync(file, `${current}${separator}.dev.vars\n`)
  }
}

export function patchWranglerJson(file: string, workerName?: string): boolean {
  const current = existsSync(file) ? readFileSync(file, 'utf8') : ''
  const next = patchWranglerJsonText(current, workerName)
  if (current === next) return false
  writeFileSync(file, next)
  return true
}

function copyTemplateFile(sourceRoot: string, targetRoot: string, file: string, result: InitResult, options: InitOptions): void {
  const source = join(sourceRoot, file)
  const target = join(targetRoot, file)
  if (existsSync(target) && !options.force) {
    result.skipped.push(file)
    return
  }
  result.changed.push(file)
  if (options.dryRun) return
  mkdirSync(dirname(target), { recursive: true })
  cpSync(source, target)
}

export function initProject(options: InitOptions = {}): InitResult {
  const cwd = options.cwd ?? process.cwd()
  const sourceRoot = templateDir(options.template)
  const result: InitResult = { changed: [], skipped: [], notes: [] }
  if (!existsSync(sourceRoot)) {
    throw new Error(`Unknown Beam template: ${options.template ?? DEFAULT_TEMPLATE}`)
  }

  const packagePath = join(cwd, 'package.json')
  if (options.dryRun) {
    result.changed.push('package.json')
  } else if (patchPackageJson(packagePath)) {
    result.changed.push('package.json')
  }

  const wranglerPath = join(cwd, 'wrangler.json')
  if (options.dryRun) {
    result.changed.push('wrangler.json')
  } else if (patchWranglerJson(wranglerPath)) {
    result.changed.push('wrangler.json')
  }
  if (existsSync(join(cwd, 'wrangler.toml'))) {
    result.notes.push('wrangler.toml exists; Beam now prefers wrangler.json. Review both configs or migrate TOML manually before relying on Wrangler.')
  }

  for (const file of listTemplateFiles(sourceRoot)) {
    if (file === 'package.json' || file === 'wrangler.json') continue
    copyTemplateFile(sourceRoot, cwd, file, result, options)
  }
  ensureDevSecret(cwd, result, options)
  ensureDevVarsIgnored(cwd, result, options)
  result.notes.push('Before deploying, store SESSION_SECRET with `wrangler secret put SESSION_SECRET`; do not deploy the local .dev.vars value.')

  if (existsSync(join(cwd, 'vite.config.ts')) && !options.force) {
    const vite = readFileSync(join(cwd, 'vite.config.ts'), 'utf8')
    if (!vite.includes('beamPlugin')) {
      result.notes.push('vite.config.ts exists and was not rewritten; add beamPlugin/client build wiring manually or rerun with --force.')
    }
  }
  if (existsSync(join(cwd, 'app', 'server.ts')) && !options.force) {
    const server = readFileSync(join(cwd, 'app', 'server.ts'), 'utf8')
    if (!server.includes('beam.init')) {
      result.notes.push('app/server.ts exists and was not rewritten; add beam.authMiddleware() and beam.init(app) manually or rerun with --force.')
    }
  }

  return result
}

export function createProject(options: CreateOptions): InitResult {
  const cwd = options.cwd ?? process.cwd()
  const name = options.name
  if (!isValidPackageName(name)) throw new Error(`Invalid package name: ${name}`)
  const target = join(cwd, name)
  if (existsSync(target) && readdirSync(target).length > 0 && !options.force) {
    throw new Error(`Target directory is not empty: ${target}`)
  }

  const sourceRoot = templateDir(options.template)
  if (!existsSync(sourceRoot)) {
    throw new Error(`Unknown Beam template: ${options.template ?? DEFAULT_TEMPLATE}`)
  }

  const result: InitResult = { changed: [], skipped: [], notes: [] }
  for (const file of listTemplateFiles(sourceRoot)) {
    copyTemplateFile(sourceRoot, target, file, result, options)
  }
  if (!options.dryRun) {
    patchPackageJson(join(target, 'package.json'), basename(name))
    patchWranglerJson(join(target, 'wrangler.json'), basename(name))
  }
  ensureDevSecret(target, result, options)
  ensureDevVarsIgnored(target, result, options)
  result.notes.push('Before deploying, store SESSION_SECRET with `wrangler secret put SESSION_SECRET`; do not deploy the local .dev.vars value.')
  return result
}

function parseOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

function printResult(title: string, result: InitResult): void {
  console.log(title)
  if (result.changed.length) {
    console.log(`Changed:\n${result.changed.map((file) => `  - ${file}`).join('\n')}`)
  }
  if (result.skipped.length) {
    console.log(`Skipped existing files:\n${result.skipped.map((file) => `  - ${file}`).join('\n')}`)
  }
  if (result.notes.length) {
    console.log(`Notes:\n${result.notes.map((note) => `  - ${note}`).join('\n')}`)
  }
}

function printHelp() {
  console.log(`Beam CLI

Usage:
  beam dev [wrangler dev args, e.g. --port 8791]
  beam build [--dev] [--server-only | --client-only]
  beam create <name> [--template minimal] [--force] [--dry-run]
  beam init [--template minimal] [--force] [--dry-run]

Commands:
  dev      Build with dev refresh, then run "wrangler dev" with cache-safe
           asset headers (no-store) so rebuilds are never masked by stale
           caches. Extra args pass through to wrangler dev.
  build    Build the Worker bundle and client assets with Vite.
           --dev writes dist/__beam_dev.json for development refresh.
  create   Create a new HonoX + Beam + Wrangler app.
  init     Add Beam wiring to the current HonoX project without overwriting files
           unless --force is provided.

Wrangler:
  Add a build command to wrangler.json so "wrangler dev"
  automatically builds before starting and rebuilds while watching app files.

  {
    "build": {
      "command": "npx --no-install beam build",
      "watch_dir": "app"
    }
  }
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
    writeDevHeaders()
  } else {
    cleanDevArtifacts()
  }
}

function runDev(args: string[]) {
  // Warm start: build before wrangler boots so the first request never races
  // the build hook, and dist/_headers (no-store) exists from the first byte.
  runBuild(['--dev'])

  if (!hasBeamBuildHook()) {
    console.warn(
      '[beam] No "beam build" hook found in your wrangler config — file changes will not rebuild.\n' +
      '       Add: "build": { "command": "npx --no-install beam build", "watch_dir": "app" }'
    )
  }

  console.log('[beam] Starting wrangler dev (dev assets served with Cache-Control: no-store)…')
  const result = spawnSync('npx', ['--no-install', 'wrangler', 'dev', ...args], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      BEAM_BUILD_DEV: '1',
      VITE_BEAM_DEV_REFRESH: '1',
    },
  })
  process.exit(result.status ?? 0)
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

  if (command === 'dev') {
    runDev(args)
    return
  }

  if (command === 'create') {
    const name = args.find((arg) => !arg.startsWith('-'))
    if (!name) {
      console.error('Missing app name: beam create <name>')
      process.exit(1)
    }
    const result = createProject({
      name,
      template: parseOption(args, '--template') ?? DEFAULT_TEMPLATE,
      force: args.includes('--force'),
      dryRun: args.includes('--dry-run'),
    })
    printResult(`Created Beam app at ${name}`, result)
    console.log(`\nNext:\n  cd ${name}\n  npm install\n  npm run dev`)
    return
  }

  if (command === 'init') {
    const result = initProject({
      template: parseOption(args, '--template') ?? DEFAULT_TEMPLATE,
      force: args.includes('--force'),
      dryRun: args.includes('--dry-run'),
    })
    printResult('Initialized Beam in this project', result)
    console.log('\nNext:\n  npm install\n  npm run dev')
    return
  }

  console.error(`Unknown Beam command: ${command}`)
  printHelp()
  process.exit(1)
}

if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) {
  main()
}
