# 疫苗记录（儿童接种参考）

离线可用的单页 Web 应用，用于查阅与记录中国儿童免疫规划相关接种信息（仅供参考，请以当地接种门诊与医嘱为准）。

## 使用

- **本地**：用浏览器直接打开 `index.html`，或通过本地 HTTP 服务访问（避免部分浏览器对 `file://` 的限制）。
- **在线**：部署后访问 [https://hi-vic-vic.github.io/yimiaojilu/](https://hi-vic-vic.github.io/yimiaojilu/)

## 开发与构建

| 文件 | 说明 |
|------|------|
| `schedule.js` | 接种数据与逻辑 |
| `template.html` | 页面模板 |
| `build.js` | 构建脚本，将模板与逻辑合成为 `index.html` |
| `index.html` | 构建产物（自包含，可单独分发） |

重新生成页面：

```bash
node build.js
```

## 测试

```bash
node test.js
```

浏览器端到端测试（需本机 Chrome 与 `npm install` 后运行 `node e2e.js`）见仓库内 `e2e.js`。

## 免责声明

本工具仅作信息参考，不构成医疗建议。接种种类、时间与费用以当地疾控与接种单位规定为准；如有疑问请咨询专业医务人员。
