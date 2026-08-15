# Clash Verge Rev / Mihomo Party 全局扩展脚本

一个功能强大的 Clash Verge Rev 全局扩展脚本（懒人配置），同时支持 Mihomo Party 覆写脚本。
基于 [YaNet](https://github.com/dahaha-365/YaNet/) 二开，并添加了 Mihomo Party 覆写脚本支持。

## 下载地址

- **GitHub 仓库**：[https://github.com/Adsryen/clash-override](https://github.com/Adsryen/clash-override)
- **直接下载**：[https://raw.githubusercontent.com/Adsryen/clash-override/main/global_script.js](https://raw.githubusercontent.com/Adsryen/clash-override/main/global_script.js)
- **压缩版直接下载**：[https://raw.githubusercontent.com/Adsryen/clash-override/main/global_script.min.js](https://raw.githubusercontent.com/Adsryen/clash-override/main/global_script.min.js)
- **在线查看**：[查看源码](https://github.com/Adsryen/clash-override/blob/main/global_script.js)
- **在线生成器**：[无需安装直接使用](https://adsryen.github.io/clash-override/)

## 📋 项目简介

本脚本基于 [YaNet](https://github.com/dahaha-365/YaNet/) 二次开发，提供了自动化的代理节点分组、智能分流规则配置和 DNS 优化等功能，让你的代理配置更加简单高效。

## ✨ 主要特性

### 🌍 智能地区分组
- **自动识别节点地区**：支持 20+ 个国家/地区的自动识别
- **倍率过滤**：自动排除高倍率节点（可配置）
- **正则匹配**：通过节点名称智能分组
- **动态分组**：未匹配节点自动创建对应地区分组

支持的地区包括：
- 🇭🇰 香港、🇺🇸 美国、🇯🇵 日本、🇰🇷 韩国、🇸🇬 新加坡
- 🇨🇳 中国大陆、🇹🇼 台湾、🇬🇧 英国、🇩🇪 德国
- 🇲🇾 马来西亚、🇹🇷 土耳其、🇨🇦 加拿大、🇫🇷 法国
- 🇬🇷 希腊、🇱🇹 立陶宛、🇲🇰 北马其顿、🇳🇱 荷兰
- 🇵🇱 波兰、🇸🇪 瑞典、🇦🇷 阿根廷

### 🎯 灵活的分流规则
- **应用服务分流**：Apple、Microsoft、Google、Github 等
- **流媒体分流**：YouTube、Netflix、Disney+、Spotify 等
- **AI 服务分流**：OpenAI、ChatGPT 等国外 AI 服务
- **社交通讯**：Telegram、WhatsApp、Line 等
- **游戏专用**：游戏流量独立分组
- **广告过滤**：内置广告拦截规则
- **自定义规则**：支持域名、关键词、进程等多种规则类型

### 🔧 高级功能
- **URL-Test 自动选择**：自动选择延迟最低的节点
- **DNS 优化**：国内外 DNS 智能分流
- **域名嗅探**：准确识别请求域名
- **GeoData 模式**：高效的地理位置数据库
- **自动更新**：规则集和地理数据库自动更新

## 📚 使用与配置教程

- [快速开始与客户端接入](docs/guide/README.md#快速开始)
- [在线与本地生成器](docs/guide/README.md#生成器使用)
- [基础开关、规则与 DNS 配置](docs/guide/README.md#配置说明)
- [使用技巧与故障排查](docs/guide/README.md#使用技巧与故障排查)

## 📄 许可证

本项目采用 BSD 3-Clause 许可证，包含基于 YaNet 的二次开发内容 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- 基于 [YaNet](https://github.com/dahaha-365/YaNet/) 项目二次开发
- 图标来自 [Qure](https://github.com/Koolson/Qure)
- 规则集来自 [MetaCubeX](https://github.com/MetaCubeX/meta-rules-dat)

## 📮 反馈与贡献

如果你有任何问题或建议，欢迎提交 Issue 或 Pull Request！

---

**注意**：本脚本仅供学习交流使用，请遵守当地法律法规。
