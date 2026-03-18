# ChromeDev

`ChromeDev` 是一个本地命令行工具，用来把 `chrome-devtools-mcp` 作为后台中间件运行，并通过 `--autoConnect` 连接你当前正在使用的 Chrome。

启动后，本地 MCP 地址固定为：

```text
http://127.0.0.1:8787/mcp
```

## 快速开始

整个流程只有两步：

1. 在 Chrome 中开启远程调试
2. 用 npm 安装并启动 `chromedev`

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

安装：

```bash
npm install -g @mallocfeng/chromedev
```

启动：

```bash
chromedev run
```

成功后会看到类似输出：

```text
chromedev started in background (pid 12345)
endpoint: http://127.0.0.1:8787/mcp
```

这表示服务已经在后台运行，其他 AI 或程序现在可以访问 `http://127.0.0.1:8787/mcp`。

## 常用命令

启动：

```bash
chromedev run
```

前台调试：

```bash
chromedev run --foreground
```

停止：

```bash
chromedev stop
```

查看状态：

```bash
chromedev status
```

查看日志路径：

```bash
chromedev logs
```

## 如何验证服务正常

查看状态：

```bash
chromedev status
```

检查端点：

```bash
curl -i http://127.0.0.1:8787/mcp
```

如果返回 `400 Bad Request` 且内容类似 `No sessionId`，这是正常的，说明 MCP 端点已经存在。

## 在 OpenClaw 中安装 skill

这个仓库包含一份 skill：

```text
skills/chromedev
```

安装方法：

1. 从 GitHub 下载项目源码：

```bash
git clone https://github.com/mallocfeng/chromeDev.git
```

2. 把其中的 `skills/chromedev` 目录拷贝到 OpenClaw 当前 agent 工作目录下的 `skills` 文件夹。
3. 如果你不知道 OpenClaw 的工作目录在哪里，直接先问 OpenClaw。
4. 拷贝完成后执行：

```bash
openclaw gateway restart
```

目录结构应该像这样：

```text
<openclaw-agent-workdir>/
  skills/
    chromedev/
      SKILL.md
      agents/openai.yaml
      scripts/http_mcp_call.mjs
```

## 在 OpenClaw 中使用

可以直接这样输入：

```text
/chromedev 调用这个 skills 访问当前打开的纽约时报标签文章，并摘要
```

或者：

```text
调用 chromedev 这个 skills，访问纽约时报，并且摘要新闻
```

注意：

- skill 只负责告诉 AI 怎么调用本地 ChromeDev 服务
- 真正提供浏览器访问能力的，是你本机运行中的 `chromedev run`
- 使用 skill 前，先确认本地服务已经启动

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

## 日志位置

默认文件位置：

- `~/.chromedev/run/chromedev.pid`
- `~/.chromedev/run/chromedev.out.log`
- `~/.chromedev/run/chromedev.err.log`

查看日志：

```bash
tail -f ~/.chromedev/run/chromedev.out.log
tail -f ~/.chromedev/run/chromedev.err.log
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

## 安全说明

- 服务只应监听本地地址 `127.0.0.1`
- 不要把 `http://127.0.0.1:8787/mcp` 暴露到公网
- 不要让不可信程序访问这个端点
- 这个中间件拥有你当前 Chrome 会话的高权限访问能力
