---
name: chromedev
description: Use this skill when you need to access or control a live Chrome browser through the local Chrome DevTools MCP middleware at http://127.0.0.1:8787/mcp, especially for opening pages, extracting rendered content, interacting with DOM elements, taking snapshots, or collecting data from websites.
---

# chromedev

Use this skill when the user wants browser-backed data from real web pages through the local `chrome-devtools-mcp` middleware running at `http://127.0.0.1:8787/mcp`.

This skill is for cases where rendered browser state matters: JavaScript-heavy sites, login state in the user's Chrome, interaction flows, screenshots, DOM snapshots, or page data that should come from the live browser instead of plain HTTP fetches.

## Preconditions

- The local middleware must already be running on `127.0.0.1:8787`.
- The middleware usually runs via the user's `chromeDev` project and uses Chrome `--autoConnect`.
- On first connection, Chrome may show a remote-debugging authorization prompt. Wait up to 30 seconds for the user to approve it.

Quick endpoint check:

```bash
curl -i http://127.0.0.1:8787/mcp
```

A response like `400 Bad Request` with `No sessionId` means the endpoint exists and is healthy.

## Workflow

1. Confirm the middleware is reachable.
2. Connect to `http://127.0.0.1:8787/mcp`.
3. Use MCP browser tools to open or select a page.
4. Prefer `take_snapshot` or `evaluate_script` for structured extraction.
5. Use `wait_for` when content depends on async rendering.
6. Return the extracted data, not raw protocol noise.

## Preferred tool order

- `list_pages`: inspect current browser pages before changing state.
- `new_page`: open a URL when the user wants navigation.
- `select_page`: switch to the relevant tab before reading or interacting.
- `take_snapshot`: get accessible text/structure from the current page.
- `evaluate_script`: extract structured values from the live DOM.
- `wait_for`: wait for a known string when the page is still rendering.
- `take_screenshot`: use only when the visual result matters.

## Command-line client

This skill includes a reusable script:

- [`scripts/http_mcp_call.mjs`](/Volumes/MacMiniDisk/project/chromeDev/skills/chromedev/scripts/http_mcp_call.mjs)

It connects to the local HTTP MCP endpoint and calls one tool.

If `@modelcontextprotocol/sdk` is missing in the current workspace, install it in that workspace first:

```bash
npm install @modelcontextprotocol/sdk
```

## Common commands

List current pages:

```bash
node /Volumes/MacMiniDisk/project/chromeDev/skills/chromedev/scripts/http_mcp_call.mjs list_pages
```

Open `163.com`:

```bash
node /Volumes/MacMiniDisk/project/chromeDev/skills/chromedev/scripts/http_mcp_call.mjs new_page '{"url":"https://www.163.com/","timeout":30000}'
```

Get the current page snapshot:

```bash
node /Volumes/MacMiniDisk/project/chromeDev/skills/chromedev/scripts/http_mcp_call.mjs take_snapshot
```

Extract page title and URL:

```bash
node /Volumes/MacMiniDisk/project/chromeDev/skills/chromedev/scripts/http_mcp_call.mjs evaluate_script '{"function":"() => ({ title: document.title, url: location.href })"}'
```

Wait for specific text:

```bash
node /Volumes/MacMiniDisk/project/chromeDev/skills/chromedev/scripts/http_mcp_call.mjs wait_for '{"text":["网易","163"],"timeout":30000}'
```

## Extraction guidance

- Use `take_snapshot` for readable page summaries, navigation labels, and visible content.
- Use `evaluate_script` for precise fields, arrays, links, prices, tables, or JSON-shaped output.
- Use `wait_for` before reading if the site is client-rendered or slow.
- Use `list_network_requests` and `get_network_request` only when DOM extraction is insufficient.

## Example patterns

For article text:

```bash
node /Volumes/MacMiniDisk/project/chromeDev/skills/chromedev/scripts/http_mcp_call.mjs evaluate_script '{"function":"() => ({ title: document.title, text: document.body.innerText.slice(0, 4000) })"}'
```

For links on the page:

```bash
node /Volumes/MacMiniDisk/project/chromeDev/skills/chromedev/scripts/http_mcp_call.mjs evaluate_script '{"function":"() => Array.from(document.querySelectorAll(\"a\")).slice(0,50).map(a => ({ text: (a.innerText || a.textContent || \"\").trim(), href: a.href })).filter(x => x.href)"}'
```

## Operational notes

- Keep the browser state intact unless the user asked for navigation or interaction.
- If a tool call hangs near connection start, assume Chrome may be waiting for the authorization dialog.
- Prefer returning concise extracted data over full raw snapshots unless the user asked for raw output.
- Do not expose the local MCP endpoint outside `127.0.0.1`.
