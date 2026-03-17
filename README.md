# ChromeDev

`ChromeDev` 是一个本地命令行工具，用来把 `chrome-devtools-mcp` 包成一个常驻中间件。

它的默认工作方式是：

- 连接你当前正在运行的 Chrome 本体
- 使用 `chrome-devtools-mcp --autoConnect`
- 在本地暴露一个固定 MCP 地址：`http://127.0.0.1:8787/mcp`

这样你只需要让一个后台进程去连接 Chrome，其他 AI 或程序统一访问这个本地端点，不需要每个客户端都自己去发起连接。

## 工作原理

默认模式下，`ChromeDev` 不会启动一个独立 Chrome，而是连接你正在使用的 Chrome。

连接模型如下：

1. 你手动打开 Chrome。
2. 你在 Chrome 中启用远程调试。
3. 你运行 `chromedev run`。
4. `ChromeDev` 在后台启动中间件，并尝试 `autoConnect` 到 Chrome。
5. Chrome 第一次可能会弹出授权确认框。
6. 授权成功后，其他程序统一访问 `http://127.0.0.1:8787/mcp`。

注意：

- 这不是绕过 Chrome 授权。
- 如果 Chrome 重启，或者中间件断开后重新连接，Chrome 仍然可能再次要求授权。

## 前置条件

- macOS
- Node.js 18+
- Google Chrome 版本 `>= 144`

## 第一步：在 Chrome 中启用远程调试

在 Chrome（版本 `>= 144`）中，执行以下操作来设置远程调试：

前往 `chrome://inspect/#remote-debugging` 以启用远程调试。

建议步骤：

1. 打开 Chrome。
2. 在地址栏输入 `chrome://inspect/#remote-debugging`。
3. 进入该页面后，开启远程调试相关选项。
4. 保持这个 Chrome 实例处于运行状态。

如果这是你第一次这样连接 Chrome，本地中间件第一次访问时，Chrome 可能会弹出授权确认框。默认会给你 30 秒时间确认。

## 安装

进入项目目录：

```bash
cd /Volumes/MacMiniDisk/project/chromeDev
```

安装依赖：

```bash
npm install
```

如果你想把它注册成全局命令，再执行：

```bash
npm link
```

执行完 `npm link` 之后，你就可以在任意目录直接使用 `chromedev` 命令。

## 启动

后台启动：

```bash
chromedev run
```

如果你还没有执行 `npm link`，也可以在项目目录里直接运行：

```bash
node ./bin/chromedev.mjs run
```

启动成功后，你会看到类似输出：

```text
chromedev started in background (pid 12345)
endpoint: http://127.0.0.1:8787/mcp
stdout: /Volumes/MacMiniDisk/project/chromeDev/.run/chromedev.out.log
stderr: /Volumes/MacMiniDisk/project/chromeDev/.run/chromedev.err.log
```

这表示：

- 中间件已经在后台运行
- MCP 地址是 `http://127.0.0.1:8787/mcp`
- 日志在 `.run/` 目录里

## 停止

```bash
chromedev stop
```

或者：

```bash
node ./bin/chromedev.mjs stop
```

## 查看状态

```bash
chromedev status
```

如果服务正在运行，你会看到当前 PID、端点和日志路径。

## 查看日志

```bash
chromedev logs
```

默认文件位置：

- `./.run/chromedev.pid`
- `./.run/chromedev.out.log`
- `./.run/chromedev.err.log`

如果你想直接看内容：

```bash
tail -f /Volumes/MacMiniDisk/project/chromeDev/.run/chromedev.out.log
tail -f /Volumes/MacMiniDisk/project/chromeDev/.run/chromedev.err.log
```

## 前台调试模式

如果你想直接在终端里看实时输出，可以用前台模式：

```bash
chromedev run --foreground
```

或者：

```bash
node ./bin/chromedev.mjs run --foreground
```

## 如何验证服务是否正常

先确认端口在监听：

```bash
chromedev status
```

或者：

```bash
lsof -nP -iTCP:8787 -sTCP:LISTEN
```

再确认 MCP 端点存在：

```bash
curl -i http://127.0.0.1:8787/mcp
```

如果返回 `400 Bad Request` 且内容类似 `No sessionId`，这是正常的，说明 HTTP MCP 端点已经存在。

## 命令行访问网页示例

项目里附带了一个简单的 MCP 调用脚本，可以直接验证网页访问。

先列出当前页面：

```bash
node /Volumes/MacMiniDisk/project/chromeDev/skills/chromedev/scripts/http_mcp_call.mjs list_pages
```

打开 `163.com`：

```bash
node /Volumes/MacMiniDisk/project/chromeDev/skills/chromedev/scripts/http_mcp_call.mjs new_page '{"url":"https://www.163.com/","timeout":30000}'
```

读取当前页面快照：

```bash
node /Volumes/MacMiniDisk/project/chromeDev/skills/chromedev/scripts/http_mcp_call.mjs take_snapshot
```

## 提供给其他 AI / MCP 客户端的地址

如果你的客户端支持 HTTP MCP 或 Streamable HTTP，直接配置这个地址：

```text
http://127.0.0.1:8787/mcp
```

## 环境变量

默认参数：

```bash
CHROME_AUTO_CONNECT=1
CHROME_CHANNEL=stable
MCP_HOST=127.0.0.1
MCP_PORT=8787
MCP_CONNECTION_TIMEOUT=30000
MCP_REQUEST_TIMEOUT=30000
```

说明：

- `CHROME_AUTO_CONNECT=1`：默认连接当前运行中的 Chrome
- `MCP_PORT=8787`：本地 MCP 服务端口
- `MCP_CONNECTION_TIMEOUT=30000`：首次连接等待 30 秒
- `MCP_REQUEST_TIMEOUT=30000`：单次请求等待 30 秒

如果你需要改端口：

```bash
MCP_PORT=8788 chromedev run
```

## 兼容模式：独立 Chrome

这个项目也保留了一个兜底模式：不连本体，而是自己启动一个独立 Chrome 调试实例。

只有在你明确需要时再用：

```bash
CHROME_AUTO_CONNECT=0 \
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
CHROME_DEBUG_PORT=9222 \
CHROME_USER_DATA_DIR="/absolute/path/to/profile" \
node ./server/chrome-mcp-daemon.mjs
```

默认不推荐这个模式。

## 常见问题

### 1. `EADDRINUSE: address already in use 127.0.0.1:8787`

说明 `8787` 已经被一个已有实例占用了。

处理方式：

```bash
chromedev status
chromedev stop
```

或者换一个端口：

```bash
MCP_PORT=8788 chromedev run
```

### 2. Chrome 没有反应

优先检查：

1. Chrome 是否已经打开
2. Chrome 是否已访问 `chrome://inspect/#remote-debugging`
3. 远程调试是否已经启用
4. Chrome 是否弹出了授权确认框但还没有点

### 3. 第一次请求卡住几秒

这通常是正常的。常见原因是：

- Chrome 正在等待授权确认
- `autoConnect` 正在连接浏览器
- 页面本身还在加载

### 4. warning: `--localstorage-file` was provided without a valid path

目前这条 warning 不是已知致命错误。真正需要关注的是：

- 端口是否监听成功
- 是否能访问 `http://127.0.0.1:8787/mcp`
- 是否能列出页面或打开网页

## 安全说明

- 只监听本地地址 `127.0.0.1`
- 不要把这个端口暴露到公网
- 不要让不可信程序访问 `http://127.0.0.1:8787/mcp`
- 这个中间件拥有你当前 Chrome 会话的高权限访问能力
