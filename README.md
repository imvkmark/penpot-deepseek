# DeepSeek Design Copilot for Penpot

一个 Penpot 插件：把文字描述发送给 DeepSeek Chat Completions API，再将返回的界面结构转换为 Penpot 画板和图层。项目使用原生 JavaScript 和静态文件，无需安装依赖或构建。

## 功能

- 根据文字描述生成界面画板，可选择模型并设置画板宽度。
- 读取 Penpot 当前选中的图层，将名称、类型、尺寸、文本、填充、描边和子图层结构作为设计上下文。
- 设置并保存 DeepSeek API Key；支持创建、切换和删除多个会话，并保留每个会话的对话上下文。
- 创建 `FRAME`、`RECTANGLE`、`TEXT` 和 `SVG` 图层；支持纯色填充、描边、阴影、圆角、约束，以及部分文本样式。
- 创建前检查模型返回的结构；最多 150 个节点、12 层嵌套。
- 使用 Penpot 插件 API 写入当前 Penpot 文件。插件声明了 `content:write` 权限。

## 项目文件

| 文件 | 用途 |
| --- | --- |
| `manifest.json` | 插件名称、入口文件、图标和权限声明。`version: 2` 表示 `code` 使用相对 manifest 的路径。 |
| `plugin.js` | 在 Penpot 内运行，读取选区、打开插件界面并根据界面消息创建图层。 |
| `index.html` | 插件界面、会话与密钥管理、DeepSeek 请求和结果校验。 |

## 本地加载

1. 在仓库根目录启动静态 HTTP 服务：

   ```sh
   python3 -m http.server 4400
   ```

2. 先确认以下地址可访问：

   - `http://localhost:4400/manifest.json`
   - `http://localhost:4400/plugin.js`
   - `http://localhost:4400/index.html`

3. 在 Penpot 打开插件管理器（`Ctrl+Alt+P`），输入 manifest 地址：

   ```text
   http://localhost:4400/manifest.json
   ```

4. 安装后启动 **DeepSeek Design Copilot**。本地 HTTP 服务需要在使用插件期间保持运行。Penpot 插件管理器也可从菜单或工具栏打开。

本地服务适合开发和测试，不必先部署插件。若自托管的 Penpot 环境无法加载本地插件，请检查浏览器控制台、网络策略和跨域响应头；官方指南的部署章节介绍了跨域配置。

## 使用

1. 在 [DeepSeek 开放平台](https://platform.deepseek.com/)创建 API Key，在插件中填写并点击“保存”。
2. 选择或新建一个会话，选择模型、设置画板宽度，并描述要生成的界面。
3. 如需参考已有设计，先在 Penpot 画布选中图层，再点击“读取当前选区”。选区信息会随下一条描述发送给 DeepSeek。
4. 点击“发送并生成设计”，等待插件请求模型并在当前文件中创建画板。可在同一会话继续提出修改要求，或切换到其他会话。

描述时可以说明界面类型、内容层级、视觉风格、配色和目标尺寸。例如：“生成一个浅色 SaaS 数据分析仪表盘，包含左侧导航、顶部搜索栏、三张统计卡片和折线图，留白充足，强调色为蓝紫色。”

## 数据与密钥

- API Key 保存在插件 iframe 所在浏览器的 `localStorage`（键名 `penpot-deepseek-api-key`）中；清除该站点的浏览器数据会删除它。输入框为密码类型。
- 多会话及对话记录保存在同一浏览器的 `localStorage`（键名 `penpot-deepseek-sessions-v1`）中；每个会话保留最近 40 条消息。切换浏览器或设备不会同步会话。
- 插件界面直接向 `https://api.deepseek.com/chat/completions` 发送请求。设计描述、对话上下文和主动读取的选区内容会随请求发送给 DeepSeek；生成结果再通过 `postMessage` 交给插件代码，由 Penpot API 创建图层。
- 不要在共享设备上保存个人 Key。出现认证错误时检查 Key 和 DeepSeek 账户状态；网络或跨域错误时检查浏览器控制台及网络访问策略。

## 生成内容限制

根节点必须是 `FRAME`。支持的节点类型为 `FRAME`、`RECTANGLE`、`TEXT`、`SVG`，几何坐标使用相对父图层的绝对位置。当前提示词要求模型不要生成 SVG 或 IMAGE 填充；代码侧可转换纯色填充，也包含图片 URL 填充处理。文本支持字号、字距、水平对齐、大小写转换和下划线/删除线；描边和阴影会按插件代码中的映射写入 Penpot。模型输出会限制为 150 个节点和最多 12 层嵌套。选区读取最多包含 20 个顶层图层、200 个节点和 8 层嵌套，并截断较长文本，避免发送过大的上下文。

## 开发提示

插件界面运行在 iframe 中，通过 `window.parent.postMessage` 请求读取选区或发送生成的图层树；`plugin.js` 使用 `penpot.ui.onMessage` 接收消息并调用 Penpot API，随后将读取结果或创建状态发回界面。manifest 声明 `content:read` 和 `content:write` 权限。插件 API 与权限说明请参考官方文档。

## 参考

- [Penpot：Create a Plugin](https://help.penpot.app/plugins/create-a-plugin/)
- [Penpot Plugins API](https://doc.plugins.penpot.app/)
- [DeepSeek：Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/)
