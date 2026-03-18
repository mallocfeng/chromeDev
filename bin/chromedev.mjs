#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import net from 'node:net'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = dirname(__dirname)
const appHome = process.env.CHROMEDEV_HOME || join(homedir(), '.chromedev')
const runDir = join(appHome, 'run')
const pidFile = join(runDir, 'chromedev.pid')
const metaFile = join(runDir, 'chromedev.json')
const outLog = join(runDir, 'chromedev.out.log')
const errLog = join(runDir, 'chromedev.err.log')
const daemonScript = join(projectRoot, 'server', 'chrome-mcp-daemon.mjs')

const argv = process.argv.slice(2)
const command = argv[0] || 'help'

main().catch((error) => {
  console.error(error.message || String(error))
  process.exit(1)
})

async function main() {
  switch (command) {
    case 'run':
    case 'start':
      await runCommand(argv.slice(1))
      return
    case 'stop':
      await stopCommand()
      return
    case 'status':
      await statusCommand()
      return
    case 'logs':
      logsCommand()
      return
    case 'help':
    case '--help':
    case '-h':
      printHelp()
      return
    default:
      throw new Error(`Unknown command: ${command}`)
  }
}

async function runCommand(args) {
  const foreground = args.includes('--foreground') || args.includes('-f')
  const meta = readMeta()
  const pid = readPid()
  const port = Number(process.env.MCP_PORT || meta?.port || '8787')

  if (pid && isProcessRunning(pid)) {
    console.log(`chromedev is already running (pid ${pid})`)
    console.log(`endpoint: http://127.0.0.1:${port}/mcp`)
    return
  }

  ensureRunDir()
  cleanupState()

  if (await isPortListening(port)) {
    throw new Error(`port ${port} is already in use; stop the existing service or set MCP_PORT`)
  }

  if (foreground) {
    console.log('starting chromedev in foreground')
    process.stdout.write(`endpoint: http://127.0.0.1:${port}/mcp\n`)
    const child = spawn(process.execPath, [daemonScript], {
      cwd: projectRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        CHROMEDEV_HOME: appHome,
      },
    })
    child.on('exit', (code) => {
      process.exit(code ?? 0)
    })
    return
  }

  const stdoutFd = openSync(outLog, 'a')
  const stderrFd = openSync(errLog, 'a')
  const child = spawn(process.execPath, [daemonScript], {
    cwd: projectRoot,
    detached: true,
    stdio: ['ignore', stdoutFd, stderrFd],
    env: {
      ...process.env,
      CHROMEDEV_HOME: appHome,
    },
  })

  child.unref()

  writeFileSync(pidFile, `${child.pid}\n`)
  writeMeta(port)

  console.log(`chromedev started in background (pid ${child.pid})`)
  console.log(`endpoint: http://127.0.0.1:${port}/mcp`)
  console.log(`stdout: ${outLog}`)
  console.log(`stderr: ${errLog}`)
}

async function stopCommand() {
  const pid = readPid()

  if (!pid) {
    console.log('chromedev is not running')
    cleanupState()
    return
  }

  if (!isProcessRunning(pid)) {
    console.log(`stale pid file found for pid ${pid}; cleaning up`)
    cleanupState()
    return
  }

  process.kill(pid, 'SIGTERM')

  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    if (!isProcessRunning(pid)) {
      cleanupState()
      console.log(`chromedev stopped (pid ${pid})`)
      return
    }
    await sleep(200)
  }

  process.kill(pid, 'SIGKILL')
  cleanupState()
  console.log(`chromedev force-stopped (pid ${pid})`)
}

async function statusCommand() {
  const meta = readMeta()
  const pid = readPid()
  const port = Number(process.env.MCP_PORT || meta?.port || '8787')
  const endpoint = `http://127.0.0.1:${port}/mcp`

  if (pid && isProcessRunning(pid)) {
    console.log(`status: running`)
    console.log(`pid: ${pid}`)
    console.log(`endpoint: ${endpoint}`)
    console.log(`stdout: ${outLog}`)
    console.log(`stderr: ${errLog}`)
    return
  }

  if (await isPortListening(port)) {
    console.log('status: port in use by another process')
    console.log(`endpoint: ${endpoint}`)
    return
  }

  console.log('status: stopped')
  console.log(`endpoint: ${endpoint}`)
}

function logsCommand() {
  console.log(`stdout: ${outLog}`)
  console.log(`stderr: ${errLog}`)
}

function ensureRunDir() {
  mkdirSync(runDir, { recursive: true })
}

function cleanupState() {
  rmSync(pidFile, { force: true })
  rmSync(metaFile, { force: true })
}

function readPid() {
  try {
    return Number(readFileSync(pidFile, 'utf8').trim())
  } catch {
    return null
  }
}

function writeMeta(port) {
  const payload = {
    port,
    updatedAt: new Date().toISOString(),
  }
  writeFileSync(metaFile, JSON.stringify(payload, null, 2))
}

function readMeta() {
  try {
    return JSON.parse(readFileSync(metaFile, 'utf8'))
  } catch {
    return null
  }
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function isPortListening(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => {
      resolve(false)
    })
  })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function printHelp() {
  console.log('chromedev <command>')
  console.log('')
  console.log('Commands:')
  console.log('  run, start        Start the Chrome MCP daemon in background')
  console.log('  run --foreground  Start in foreground')
  console.log('  stop              Stop the background daemon')
  console.log('  status            Show daemon status')
  console.log('  logs              Print log file locations')
}
