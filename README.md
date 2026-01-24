# Clash Verge Rev / Mihomo Party 全局扩展脚本

一个功能强大的 Clash Verge Rev 全局扩展脚本（懒人配置），同时支持 Mihomo Party 覆写脚本。

## 下载地址

- **GitHub 仓库**：[https://github.com/Adsryen/clash-override](https://github.com/Adsryen/clash-override)
- **直接下载**：[https://raw.githubusercontent.com/Adsryen/clash-override/main/global_script.js](https://raw.githubusercontent.com/Adsryen/clash-override/main/global_script.js)
- **在线查看**：[查看源码](https://github.com/Adsryen/clash-override/blob/main/global_script.js)

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

## 🚀 快速开始

### 方式一：直接下载使用

1. 下载脚本文件：
   ```bash
   # 使用 curl
   curl -O https://github.com/Adsryen/clash-override/raw/main/global_script.js
   
   # 或使用 wget
   wget https://github.com/Adsryen/clash-override/raw/main/global_script.js
   ```

2. 或者直接访问 [下载链接](https://github.com/Adsryen/clash-override/raw/main/global_script.js) 保存文件

### 方式二：在 Clash Verge Rev 中使用

1. 打开 Clash Verge Rev
2. 进入 **设置** → **配置** → **全局扩展脚本**
3. 将 `global_script.js` 的内容粘贴进去
4. 保存并重启 Clash Verge Rev

**推荐方式**：
- 点击 **导入** 按钮，选择下载的 `global_script.js` 文件
- 或者复制 [在线地址](https://github.com/Adsryen/clash-override/raw/main/global_script.js) 直接导入

### 方式三：在 Mihomo Party 中使用

1. 打开 Mihomo Party
2. 进入 **覆写** → **脚本覆写**
3. 将 `global_script.js` 的内容粘贴进去
4. 确保脚本开头的 `enable` 设置为 `true`
5. 保存并应用配置

**推荐方式**：
- 使用 **导入脚本** 功能，选择下载的文件
- 或者填入在线地址自动获取

## ⚙️ 配置说明

### 基础开关

```javascript
// 脚本总开关（Mihomo Party 请保持为 true）
const enable = true

// URL-Test 自动选择开关
const enableUrltest = true  // true=自动选择，false=手动选择

// DNS 覆写开关
const enableDnsOverride = false
```

### 分流规则配置

在 `ruleOptions` 中启用或禁用需要的规则：

```javascript
const ruleOptions = {
    apple: true,        // 苹果服务
    microsoft: true,    // 微软服务
    github: true,       // Github
    google: true,       // Google
    openai: true,       // 国外 AI
    spotify: true,      // Spotify
    youtube: true,      // YouTube
    netflix: false,     // Netflix（按需启用）
    telegram: false,    // Telegram（按需启用）
    games: true,        // 游戏
    ads: true,          // 广告过滤
    // ... 更多选项
}
```

### 地区配置

```javascript
const regionOptions = {
    excludeHighPercentage: true,  // 排除高倍率节点
    autoDetect: true,             // 自动识别国家
    regions: [
        {
            name: 'HK香港',
            regex: /港|香港|HONG KONG|hk|HK/i,
            ratioLimit: 5,  // 倍率限制
            icon: '...'     // 图标 URL
        },
        // ... 更多地区
    ]
}
```

### 自定义规则

在 `customRules` 中添加自定义分流规则：

```javascript
const customRules = {
    // 直连规则
    direct: {
        target: 'DIRECT',
        domainSuffix: ['example.com'],      // 域名后缀
        domainKeyword: ['keyword'],         // 域名关键词
        domain: ['exact.domain.com'],       // 精确域名
        processName: ['app.exe'],           // 进程名称
        ruleSets: []                        // 规则集
    },
    
    // 代理规则
    defaultProxy: {
        target: '默认节点',
        domainSuffix: ['proxy.com'],
        // ...
    }
}
```

### DNS 配置

```javascript
// 默认 DNS（用于解析 DNS 服务器，必须为 IP）
const defaultDNS = ["tls://1.12.12.12", "tls://223.5.5.5"]

// 国内 DNS
const chinaDNS = ['223.6.6.6', '119.29.29.29', '223.5.5.5']

// 国外 DNS
const foreignDNS = ['https://120.53.53.53/dns-query', 'https://223.5.5.5/dns-query']
```

## 📝 使用技巧

### 1. 最小可用原则
只启用你需要的分流规则，禁用不需要的规则可以提高效率：
```javascript
const ruleOptions = {
    apple: true,     // 需要
    netflix: false,  // 不需要就禁用
}
```

### 2. 倍率过滤
如果你的机场有高倍率节点，建议启用倍率过滤：
```javascript
const regionOptions = {
    excludeHighPercentage: true,  // 启用过滤
    regions: [
        {
            name: 'HK香港',
            ratioLimit: 5,  // 只使用 5 倍率以下的节点
        }
    ]
}
```

### 3. 自动选择 vs 手动选择
- **自动选择**（URL-Test）：自动选择延迟最低的节点，适合追求速度
- **手动选择**（Select）：手动选择节点，适合需要固定节点的场景

```javascript
const enableUrltest = true  // true=自动，false=手动
```

### 4. 添加自定义规则
需要特定网站走特定节点？在 `customRules` 中添加：

```javascript
const customRules = {
    // 示例：让某个网站走日本节点
    japanSites: {
        target: '日本网站',
        domainSuffix: ['example.jp'],
        domainKeyword: ['japan'],
    }
}
```

## 🔍 故障排查

### 脚本不生效
1. 检查 `enable` 是否设置为 `true`
2. 确认配置文件中有可用的代理节点
3. 查看 Clash 日志是否有错误信息

### 节点分组不正确
1. 检查节点名称是否符合正则表达式
2. 调整 `regionOptions.regions` 中的 `regex` 配置
3. 启用 `autoDetect` 自动识别功能

### DNS 解析问题
1. 检查 `enableDnsOverride` 是否启用
2. 确认 DNS 服务器地址正确
3. 查看 `nameserver-policy` 分流配置

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- 基于 [YaNet](https://github.com/dahaha-365/YaNet/) 项目二次开发
- 图标来自 [Qure](https://github.com/Koolson/Qure)
- 规则集来自 [MetaCubeX](https://github.com/MetaCubeX/meta-rules-dat)

## 📮 反馈与贡献

如果你有任何问题或建议，欢迎提交 Issue 或 Pull Request！

---

**注意**：本脚本仅供学习交流使用，请遵守当地法律法规。
