# Clash Override Local Generator

This is a local browser tool for generating a customized `global_script.js`.
It does not use a server, cloud account, upload endpoint, subscription URL, or
remote configuration API.

## Documentation

- [Use the online or local generator](../docs/guide/README.md#生成器使用)
- [Configure script switches, rules, and DNS](../docs/guide/README.md#配置说明)
- [Connect the generated script to Clash Verge Rev or Mihomo Party](../docs/guide/README.md#快速开始)

## Checks

```bash
npm run test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser installation is only required before the first local Playwright
run. The E2E suite uses a production build mounted at `/clash-override/` to
verify the GitHub Pages asset path, rule editing, local persistence, and script
download.
