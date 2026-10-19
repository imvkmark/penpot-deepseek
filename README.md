# DeepSeek Design Copilot for Penpot

通过 DeepSeek Chat Completions API 根据文字描述生成 Penpot 画板和图层。插件不需要构建步骤，可直接用静态 HTTP 服务加载。

## 本地加载

在此目录启动静态服务器，例如：

```sh
python3 -m http.server 4400
```

在 Penpot 打开插件管理器（`Ctrl+Alt+P`），输入：

```text
http://localhost:4400/manifest.json
```

## 使用

1. 在 DeepSeek 开放平台创建 API Key。
2. 打开插件，填写 Key、画板宽度和界面描述。
3. 选择模型并点击“生成 Penpot 设计”。

Key 保存在插件 iframe 对应的浏览器 `localStorage` 中。请求由插件界面直接发往 `https://api.deepseek.com/chat/completions`，不要在共享设备上保存个人 Key。

## 支持的节点

`FRAME`、`RECTANGLE`、`TEXT`、`SVG`。支持纯色填充、描边、阴影、圆角和部分文本样式。生成树限制为 150 个节点、最多 12 层嵌套。

## 参考

- [Penpot: Create a Plugin](https://help.penpot.app/plugins/create-a-plugin/)
- [DeepSeek: Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/)
