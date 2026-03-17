# ChromeDev

`ChromeDev` 是一个本地命令行工具，用来把 `chrome-devtools-mcp` 作为后台中间件运行，并通过 `--autoConnect` 连接你当前正在使用的 Chrome。

启动后，本地 MCP 地址固定为：

```text
http://127.0.0.1:8787/mcp
```

## 快速开始

整个流程只有两步：

1. 在 Chrome 中开启远程调试
2. 启动 `chromedev` 服务

### 1. 在 Chrome 中开启远程调试

在 Chrome（版本 `>= 144`）中，执行以下操作来设置远程调试：

前往 `chrome://inspect/#remote-debugging` 以启用远程调试。

建议操作：

1. 打开 Chrome。
2. 在地址栏输入 `chrome://inspect/#remote-debugging`。
3. 开启远程调试相关选项。
4. 保持这个 Chrome 实例继续运行。

第一次连接时，Chrome 可能会弹出授权确认框。默认会等待 30 秒。

### 2. 安装并启动服务

进入项目目录：

```bash
cd /Volumes/MacMiniDisk/project/chromeDev
```

安装依赖：

```bash
npm install
```

如果你想把 `chromedev` 作为全局命令使用：

```bash
npm link
```

后台启动：

```bash
chromedev run
```

如果你还没有执行 `npm link`，也可以直接：

```bash
node ./bin/chromedev.mjs run
```

成功后会看到：

```text
chromedev started in background (pid 12345)
endpoint: http://127.0.0.1:8787/mcp
```

这表示服务已经在后台运行，其他 AI 或程序现在可以访问 `http://127.0.0.1:8787/mcp`。

## 常用命令

后台启动：

```bash
chromedev run
```

前台调试：

```bash
chromedev run --foreground
```

查看状态：

```bash
chromedev status
```

停止服务：

```bash
chromedev stop
```

查看日志路径：

```bash
chromedev logs
```

如果没有 `npm link`，把 `chromedev` 换成：

```bash
node ./bin/chromedev.mjs
```

## 如何验证服务正常

看状态：

```bash
chromedev status
```

看端点是否存在：

```bash
curl -i http://127.0.0.1:8787/mcp
```

如果返回 `400 Bad Request` 且内容类似 `No sessionId`，这是正常的，说明 MCP 端点已经存在。

## 命令行访问网页示例

列出当前页面：

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

## 在 OpenClaw 中安装 skill

项目里已经包含了一份 skill：

```text
skills/chromedev
```

安装方法很简单：

1. 把项目目录中的 `skills/chromedev` 目录拷贝到你 OpenClaw 工作目录的 `skills` 文件夹下。
2. 如果你不清楚这个文件夹在哪里，可以先直接问 OpenClaw，它会告诉你当前 agent 工作目录在哪里。
3. 拷贝进去以后，运行：

```bash
openclaw gateway restart
```

完成后就可以在 OpenClaw 里调用这个 skill。

## 在 OpenClaw 中使用

在聊天框中可以直接这样输入：

```text
/chromedev 调用这个 skills 访问当前打开的纽约时报标签文章，并摘要
```

或者：

```text
调用 chromedev 这个 skills，访问纽约时报，并且摘要新闻
```

这个 skill 会通过本地 `ChromeDev` MCP 服务访问你当前打开的 Chrome，并读取网页内容。

## 日志与运行文件

默认文件位置：

- `./.run/chromedev.pid`
- `./.run/chromedev.out.log`
- `./.run/chromedev.err.log`

直接查看日志：

```bash
tail -f /Volumes/MacMiniDisk/project/chromeDev/.run/chromedev.out.log
tail -f /Volumes/MacMiniDisk/project/chromeDev/.run/chromedev.err.log
```

## 默认配置

默认参数：

```bash
CHROME_AUTO_CONNECT=1
CHROME_CHANNEL=stable
MCP_HOST=127.0.0.1
MCP_PORT=8787
MCP_CONNECTION_TIMEOUT=30000
MCP_REQUEST_TIMEOUT=30000
```

如果你要改端口：

```bash
MCP_PORT=8788 chromedev run
```

## 常见问题

### 1. `EADDRINUSE: address already in use 127.0.0.1:8787`

说明 `8787` 已经被已有实例占用了。

处理方式：

```bash
chromedev status
chromedev stop
```

或者换端口：

```bash
MCP_PORT=8788 chromedev run
```

### 2. Chrome 没有响应

检查这几项：

1. Chrome 是否已经打开
2. 是否已访问 `chrome://inspect/#remote-debugging`
3. 远程调试是否已经启用
4. Chrome 是否弹出了授权确认框但还没有点

### 3. 第一次连接会卡几秒

通常是正常的，可能是：

- Chrome 正在等待授权确认
- `autoConnect` 正在连接浏览器
- 页面本身还在加载

## 安全说明

- 服务只应监听本地地址 `127.0.0.1`
- 不要把 `http://127.0.0.1:8787/mcp` 暴露到公网
- 不要让不可信程序访问这个端点
- 这个中间件拥有你当前 Chrome 会话的高权限访问能力
