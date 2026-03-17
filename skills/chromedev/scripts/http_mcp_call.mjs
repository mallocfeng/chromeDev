#!/usr/bin/env node

import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import process from 'node:process'

async function main() {
  const [toolName, rawArgs] = process.argv.slice(2)

  if (!toolName) {
    printUsage()
    process.exit(1)
  }

  let args = {}
  if (rawArgs) {
    try {
      args = JSON.parse(rawArgs)
    } catch (error) {
      console.error(`Invalid JSON args: ${error.message}`)
      process.exit(1)
    }
  }

  let Client
  let StreamableHTTPClientTransport
  try {
    const require = createRequire(import.meta.url)
    const clientModule = require.resolve('@modelcontextprotocol/sdk/client/index.js', {
      paths: [process.cwd()],
    })
    const transportModule = require.resolve('@modelcontextprotocol/sdk/client/streamableHttp.js', {
      paths: [process.cwd()],
    })
    ;({ Client } = await import(pathToFileURL(clientModule).href))
    ;({ StreamableHTTPClientTransport } = await import(pathToFileURL(transportModule).href))
  } catch (error) {
    console.error('Missing dependency: @modelcontextprotocol/sdk')
    console.error('Install it in the current workspace with: npm install @modelcontextprotocol/sdk')
    console.error(String(error))
    process.exit(1)
  }

  const endpoint = process.env.CHROMEDEV_MCP_URL || 'http://127.0.0.1:8787/mcp'
  const client = new Client({ name: 'chromedev-skill-client', version: '1.0.0' }, { capabilities: {} })
  const transport = new StreamableHTTPClientTransport(new URL(endpoint))

  try {
    await client.connect(transport)
    const result = await client.callTool({ name: toolName, arguments: args })
    console.log(JSON.stringify(result, null, 2))
  } finally {
    await transport.close().catch(() => {})
  }
}

function printUsage() {
  console.error('Usage: http_mcp_call.mjs <tool_name> [json_args]')
  console.error("Example: http_mcp_call.mjs new_page '{\"url\":\"https://www.163.com/\",\"timeout\":30000}'")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
