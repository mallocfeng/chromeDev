---
name: chromedev
description: Use this skill when you need to access or control a live Chrome browser through the local Chrome DevTools MCP middleware at http://127.0.0.1:8787/mcp, especially for opening pages, extracting rendered content, interacting with DOM elements, taking snapshots, or collecting data from websites.
---

# chromedev

Use this skill when the user wants browser-backed data from real web pages through the local `chrome-devtools-mcp` middleware running at `http://127.0.0.1:8787/mcp`.

This skill is for cases where rendered browser state matters: JavaScript-heavy sites, login state in the user's Chrome, interaction flows, screenshots, DOM snapshots, or page data that should come from the live browser instead of plain HTTP fetches.
The primary behavior is simple: if the user gives a URL, open it and return the page content. If the page is a list page, return the list content in order.

## Preconditions

- Check whether `chromedev` is installed once at the start of the session. If it is missing, install it with `npm install -g @mallocfeng/chromedev`, then continue. Do not repeat this check for every page task unless a command call fails.
- The local middleware must already be running on `127.0.0.1:8787`.
- The middleware usually runs via the user's `chromeDev` project and uses Chrome `--autoConnect`.
- On first connection, Chrome may show a remote-debugging authorization prompt. Wait up to 30 seconds for the user to approve it.

Quick endpoint check:

```bash
curl -i http://127.0.0.1:8787/mcp
```

A response like `400 Bad Request` with `No sessionId` means the endpoint exists and is healthy.

## Workflow

1. Confirm `chromedev` exists once per session. If not, install it with `npm install -g @mallocfeng/chromedev`.
2. Confirm the middleware is reachable.
3. Connect to `http://127.0.0.1:8787/mcp`.
4. Use MCP browser tools to open or select a page.
5. Prefer `take_snapshot` or `evaluate_script` for structured extraction.
6. Use `wait_for` only when the page is still loading and you know a stable piece of text or UI state to wait for.
7. Return the extracted data, not raw protocol noise.

## How To Interpret Requests

When the user gives a URL, treat it as a request to read the page and return its content:

1. Open the target URL with `new_page`.
2. Immediately call `list_pages` and select the page whose URL matches the target URL, or whose title clearly matches the target site.
3. If multiple tabs match, choose the most recently opened matching tab.
4. Only use `wait_for` if the page is still visibly loading and you know a stable text or selector to wait on.
5. Use `take_snapshot` or `evaluate_script` to read the selected page.
6. Return the page content faithfully and concisely. Do not add a summary unless the user explicitly asks for one.

Examples:

- "访问 163.com" means open `https://www.163.com/` and return the visible page content.
- "给我这个网页内容" means read the current page and return the content as-is.
- "访问纽约时报并读取文章" means open the NYTimes page or the specified article and return the article/page content.
- "读取这个 list 页面" means return the visible list items in order, including titles, text, and links when available.
- "读取 list" means extract the list structure, not a summary of the topic.

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

- [`scripts/http_mcp_call.mjs`](scripts/http_mcp_call.mjs)

It connects to the local HTTP MCP endpoint and calls one tool.
Use the copy that lives inside `skills/chromedev` so the skill always runs the version bundled with the current workspace.
If `list_pages` reports that the selected page has been closed, the script creates a blank page and retries once so the tab list can be returned.

If `@modelcontextprotocol/sdk` is missing in the current workspace, install it in that workspace first:

```bash
npm install @modelcontextprotocol/sdk
```

## Common commands

Check whether `chromedev` is installed:

```bash
command -v chromedev || npm install -g @mallocfeng/chromedev
```

Start the service:

```bash
chromedev run
```

List current pages:

```bash
node skills/chromedev/scripts/http_mcp_call.mjs list_pages
```

Open `163.com`:

```bash
node skills/chromedev/scripts/http_mcp_call.mjs new_page '{"url":"https://www.163.com/","timeout":30000}'
```

Select the matching page before reading:

```bash
node skills/chromedev/scripts/http_mcp_call.mjs list_pages
```

Then choose the tab whose URL matches `https://www.163.com/` before calling `take_snapshot` or `evaluate_script`.

Read the current 163.com page:

```bash
node skills/chromedev/scripts/http_mcp_call.mjs take_snapshot
```

Get the current page snapshot:

```bash
node skills/chromedev/scripts/http_mcp_call.mjs take_snapshot
```

Extract page title and URL:

```bash
node skills/chromedev/scripts/http_mcp_call.mjs evaluate_script '{"function":"() => ({ title: document.title, url: location.href })"}'
```

Wait for specific text:

```bash
node skills/chromedev/scripts/http_mcp_call.mjs wait_for '{"text":["网易","163"],"timeout":30000}'
```

If `list_pages` returns `The selected page has been closed`, just run it again. The bundled script will open `about:blank` and retry automatically.

## Extraction guidance

- Use `take_snapshot` for readable page content and page structure.
- Use `evaluate_script` for precise fields, arrays, links, prices, tables, or JSON-shaped output.
- Use `wait_for` only if the page is still loading and you know a reliable text or selector to wait on.
- Use `list_network_requests` and `get_network_request` only when DOM extraction is insufficient.
- For list pages, preserve order and return the item text or link target for each visible entry.
- For article pages, return the article text and visible metadata, not a recap unless asked.

## Example patterns

For article text:

```bash
node skills/chromedev/scripts/http_mcp_call.mjs evaluate_script '{"function":"() => ({ title: document.title, text: document.body.innerText.slice(0, 4000) })"}'
```

For links on the page:

```bash
node skills/chromedev/scripts/http_mcp_call.mjs evaluate_script '{"function":"() => Array.from(document.querySelectorAll(\"a\")).slice(0,50).map(a => ({ text: (a.innerText || a.textContent || \"\").trim(), href: a.href })).filter(x => x.href)"}'
```

## Operational notes

- Keep the browser state intact unless the user asked for navigation or interaction.
- If a tool call hangs near connection start, assume Chrome may be waiting for the authorization dialog.
- Prefer returning concise extracted data over full raw snapshots unless the user asked for raw output.
- Do not expose the local MCP endpoint outside `127.0.0.1`.
- Prefer the bundled `skills/chromedev/scripts/http_mcp_call.mjs` over ad hoc absolute paths so the current workspace copy is always used.
- If `chromedev` is missing, install it once, then continue the reading flow without rechecking on every task.
- For URL-reading tasks, return the page content faithfully and concisely. Do not summarize unless explicitly requested.
- For list pages, return the list items faithfully and in order.
- Never assume the currently selected tab is the one you just opened. Always re-check `list_pages` and target the matching URL or title before reading.
- Prefer `take_snapshot` for the first pass and `evaluate_script` only when the user wants exact fields or raw text.
- Treat `wait_for` as optional. Use it only if a page is visibly still loading and you know a reliable text or selector to wait on.
