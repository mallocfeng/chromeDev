# ChromeDev

`ChromeDev` 是一个本地命令行工具，用来把 `chrome-devtools-mcp` 作为后台中间件运行，并通过 `--autoConnect` 连接你当前正在使用的 Chrome。

启动后，本地 MCP 地址固定为：

```text
http://127.0.0.1:8787/mcp
```

## 快速开始

整个流程只有两步：

1. 在 Chrome 中开启远程调试
2. 安装并启动 `chromedev` 服务

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

推荐直接用 npm 全局安装：

```bash
npm install -g @mallocfeng/chromedev
```

安装完成后，后台启动：

```bash
chromedev run
```

如果你是在项目源码目录里本地运行，也可以用：

```bash
node ./bin/chromedev.mjs run
```

成功后会看到：

```text
chromedev started in background (pid 12345)
endpoint: http://127.0.0.1:8787/mcp
```

这表示服务已经在后台运行，其他 AI 或程序现在可以访问 `http://127.0.0.1:8787/mcp`。

## npm 安装

推荐安装方式：

```bash
npm install -g @mallocfeng/chromedev
```

安装完成后可直接使用：

```bash
chromedev run
chromedev status
chromedev stop
```

如果你不想全局安装，也可以临时执行：

```bash
npx @mallocfeng/chromedev run
```

如果用户把这个 GitHub 仓库地址直接发给 AI，AI 应该按下面的步骤理解和执行：

1. 先安装命令行工具：

```bash
npm install -g @mallocfeng/chromedev
```

2. 然后启动服务：

```bash
chromedev run
```

3. 如果还需要安装 OpenClaw skill，再从 GitHub 下载项目源码，并把 `skills/chromedev` 拷贝到 OpenClaw 的 `skills` 目录。

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

如果你是在源码目录里本地运行，把 `chromedev` 换成：

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

这个项目里已经包含了一份 skill：

```text
skills/chromedev
```

如果你是通过 GitHub 下载项目源码：

1. 打开仓库：`https://github.com/mallocfeng/chromeDev`
2. 下载项目源码，或者直接 clone：

```bash
git clone https://github.com/mallocfeng/chromeDev.git
```

3. 你需要用到的 skill 目录就是：

```text
chromeDev/skills/chromedev
```

如果用户把 GitHub 地址直接发给 AI，AI 可以按这套指令执行：

```bash
git clone https://github.com/mallocfeng/chromeDev.git
```

然后取出：

```text
chromeDev/skills/chromedev
```

再把它复制到 OpenClaw 的 `skills` 目录下。

安装到 OpenClaw 的方法很简单：

1. 把项目目录中的 `skills/chromedev` 目录拷贝到你 OpenClaw 工作目录的 `skills` 文件夹下。
2. 如果你不清楚这个文件夹在哪里，可以先直接问 OpenClaw，它会告诉你当前 agent 工作目录在哪里。
3. 拷贝进去以后，运行：

```bash
openclaw gateway restart
```

完成后就可以在 OpenClaw 里调用这个 skill。

给 AI 的可执行描述可以直接写成这样：

```text
从 https://github.com/mallocfeng/chromeDev 下载项目，把其中的 skills/chromedev 目录拷贝到当前 OpenClaw agent 工作目录下的 skills 文件夹，然后执行 openclaw gateway restart。
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

在聊天框中可以直接这样输入：

```text
/chromedev 调用这个 skills 访问当前打开的纽约时报标签文章，并摘要
```

或者：

```text
调用 chromedev 这个 skills，访问纽约时报，并且摘要新闻
```

这个 skill 会通过本地 `ChromeDev` MCP 服务访问你当前打开的 Chrome，并读取网页内容。

注意：

- OpenClaw 里的 skill 只负责“告诉 AI 怎么调用本地 ChromeDev 服务”
- 真正提供浏览器访问能力的，还是你本机运行中的 `chromedev run`
- 所以使用 skill 前，先确认本地 `chromedev` 服务已经启动

## 日志与运行文件

默认文件位置：

- `~/.chromedev/run/chromedev.pid`
- `~/.chromedev/run/chromedev.out.log`
- `~/.chromedev/run/chromedev.err.log`

直接查看日志：

```bash
tail -f ~/.chromedev/run/chromedev.out.log
tail -f ~/.chromedev/run/chromedev.err.log
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
