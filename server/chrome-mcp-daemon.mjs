import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = dirname(__dirname)

const HOST = process.env.MCP_HOST || '127.0.0.1'
const MCP_PORT = Number(process.env.MCP_PORT || '8787')
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || '9222')
const PROFILE_DIR = process.env.CHROME_USER_DATA_DIR || join(projectRoot, '.chrome-profile')
const HEADLESS = ['1', 'true', 'yes'].includes(String(process.env.CHROME_HEADLESS || '').toLowerCase())
const AUTO_CONNECT = !['0', 'false', 'no'].includes(String(process.env.CHROME_AUTO_CONNECT || '1').toLowerCase())
const MCP_CONNECTION_TIMEOUT = Number(process.env.MCP_CONNECTION_TIMEOUT || '30000')
const MCP_REQUEST_TIMEOUT = Number(process.env.MCP_REQUEST_TIMEOUT || '30000')
const CHROME_PATH = process.env.CHROME_PATH || detectChromePath()

if (!AUTO_CONNECT && !CHROME_PATH) {
  console.error('Chrome executable not found. Set CHROME_PATH and retry.')
  process.exit(1)
}

if (!AUTO_CONNECT) {
  mkdirSync(PROFILE_DIR, { recursive: true })
}

let chromeProcess
let proxyProcess

main().catch((error) => {
  console.error('[daemon] fatal error:', error)
  shutdown(1)
})

async function main() {
  const args = [
    '--host',
    HOST,
    '--port',
    String(MCP_PORT),
    '--server',
    'stream',
    '--connectionTimeout',
    String(MCP_CONNECTION_TIMEOUT),
    '--requestTimeout',
    String(MCP_REQUEST_TIMEOUT),
    '--',
    localBin('chrome-devtools-mcp'),
    '--no-usage-statistics',
  ]

  if (AUTO_CONNECT) {
    console.log('[daemon] using Chrome autoConnect mode against the running browser...')
    console.log(`[daemon] exposing MCP on http://${HOST}:${MCP_PORT}/mcp`)
    args.push('--autoConnect')
    if (process.env.CHROME_CHANNEL) {
      args.push('--channel', process.env.CHROME_CHANNEL)
    }
  } else {
    console.log('[daemon] launching Chrome with persistent remote debugging...')
    chromeProcess = spawn(CHROME_PATH, chromeArgs(), {
      stdio: 'inherit',
    })
    chromeProcess.once('exit', (code, signal) => {
      console.error(`[daemon] Chrome exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})`)
      shutdown(code ?? 1)
    })

    await waitForChrome(`http://127.0.0.1:${DEBUG_PORT}/json/version`, 30_000)

    console.log(`[daemon] Chrome debugger ready on http://127.0.0.1:${DEBUG_PORT}`)
    console.log(`[daemon] exposing MCP on http://${HOST}:${MCP_PORT}/mcp`)
    args.push('--browserUrl', `http://127.0.0.1:${DEBUG_PORT}`)
  }

  proxyProcess = spawn(localBin('mcp-proxy'), args, {
    stdio: 'inherit',
  })

  proxyProcess.once('exit', (code, signal) => {
    console.error(`[daemon] mcp-proxy exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})`)
    shutdown(code ?? 1)
  })

  process.on('SIGINT', () => shutdown(0))
  process.on('SIGTERM', () => shutdown(0))
}

function chromeArgs() {
  const args = [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-sync',
  ]

  if (HEADLESS) {
    args.push('--headless=new')
  }

  return args
}

async function waitForChrome(url, timeoutMs) {
  const start = Date.now()
  let lastError

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await sleep(500)
  }

  throw new Error(`Chrome debugger did not become ready within ${timeoutMs}ms: ${String(lastError)}`)
}

function detectChromePath() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]

  return candidates.find((candidate) => existsSync(candidate))
}

function localBin(name) {
  const suffix = process.platform === 'win32' ? '.cmd' : ''
  return join(projectRoot, 'node_modules', '.bin', `${name}${suffix}`)
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function shutdown(code) {
  if (proxyProcess && !proxyProcess.killed) {
    proxyProcess.kill('SIGTERM')
  }
  if (chromeProcess && !chromeProcess.killed) {
    chromeProcess.kill('SIGTERM')
  }
  process.exit(code)
}
