# sub-store 自托管脚本

供 sub-store(182.150.44.54 等实例)的 Script Operator 使用,替代第三方/镜像源链接,避免直连 GitHub 不稳定。

在 sub-store 中引用方式:

    https://raw.githubusercontent.com/Adsryen/clash-override/main/substore/<文件名>#<参数>

## 文件来源(2026-08-28 拉取)

| 文件 | 来源 |
|---|---|
| http_meta_speed.js | [xream/scripts](https://github.com/xream/scripts/blob/main/surge/modules/sub-store-scripts/check/http_meta_speed.js) 节点测速娱乐版 |
| http_meta_availability.js | [xream/scripts](https://github.com/xream/scripts/blob/main/surge/modules/sub-store-scripts/check/http_meta_availability.js) 节点测活 |
| rename.js | [Keywos/rule](https://github.com/Keywos/rule/blob/main/rename.js) 节点改名(原文件更新于 2024-04-05,仓库最后提交 2025-02-18) |

## 用法参数(摘要)

- http_meta_speed.js: `#concurrency=1&http_meta_host=127.0.0.1&http_meta_port=9876&http_meta_protocol=http&http_meta_proxy_timeout=3000&http_meta_start_delay=3000&keep_incompatible=true&show_speed=true&size=10&timeout=2500`
- http_meta_availability.js: `#concurrency=10&http_meta_host=127.0.0.1&http_meta_port=9876&http_meta_protocol=http&http_meta_proxy_timeout=10000&http_meta_start_delay=3000&keep_incompatible=true&retries=1&retry_delay=1000&show_latency=true&status=200&timeout=1000&url=http%3A%2F%2Fwww.apple.com%2Flibrary%2Ftest%2Fsuccess.html`
- rename.js: 见文件头注释,常用 `#in=zh&out=cn`,完整参数列表在文件顶部
