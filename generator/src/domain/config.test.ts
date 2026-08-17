import { describe, expect, it } from 'vitest'
import {
  defaultGeneratorConfig,
  isGeneratorConfig,
  isProxyGroupConfig,
  isRuleProviderConfig,
} from './config'

const customRule = {
  gamingSites: {
    target: 'DIRECT',
    domainSuffix: ['example.com'],
    domainKeyword: ['game'],
    domain: ['exact.example.com'],
    processName: ['game.exe'],
    ruleSets: ['applications'],
  },
}

describe('generator configuration custom rules', () => {
  it('accepts legacy configurations without custom rules', () => {
    const { customRules: _customRules, ...legacyConfig } = defaultGeneratorConfig

    expect(isGeneratorConfig(legacyConfig)).toBe(true)
  })

  it('accepts a complete custom rule map', () => {
    expect(isGeneratorConfig({ ...defaultGeneratorConfig, customRules: customRule })).toBe(true)
  })

  it('rejects reserved names and incomplete custom rule fields', () => {
    expect(
      isGeneratorConfig({
        ...defaultGeneratorConfig,
        customRules: { direct: customRule.gamingSites },
      }),
    ).toBe(false)
    expect(
      isGeneratorConfig({
        ...defaultGeneratorConfig,
        customRules: {
          gamingSites: { ...customRule.gamingSites, target: '' },
        },
      }),
    ).toBe(false)
  })

  it('accepts validated content overrides and legacy configurations without them', () => {
    const { contentOverrides: _contentOverrides, ...legacyConfig } = defaultGeneratorConfig
    const contentOverrides = {
      rules: { remove: ['GEOSITE,google,谷歌服务'], add: ['DOMAIN-SUFFIX,example.com,DIRECT'] },
      ruleProviders: {
        remove: ['ai'],
        add: {
          example: {
            type: 'http',
            behavior: 'domain',
            format: 'text',
            interval: 86400,
            url: 'https://example.com/rules.list',
            path: './ruleset/example.list',
          },
        },
      },
      proxyGroups: {
        remove: ['YouTube'],
        add: [{ name: '示例策略', type: 'select', proxies: ['默认节点', 'DIRECT'] }],
      },
    }

    expect(isGeneratorConfig(legacyConfig)).toBe(true)
    expect(isGeneratorConfig({ ...defaultGeneratorConfig, contentOverrides })).toBe(true)
  })

  it('rejects content additions with unknown or invalid fields', () => {
    expect(isRuleProviderConfig({ type: 'http', behavior: 'domain' })).toBe(false)
    expect(isRuleProviderConfig({
      type: 'http', behavior: 'domain', format: 'text', interval: 86400,
      url: 'https://example.com/rules.list', path: './ruleset/example.list', execute: 'bad',
    })).toBe(false)
    expect(isProxyGroupConfig({ name: '', type: 'select', proxies: [] })).toBe(false)
    expect(isProxyGroupConfig({ name: '示例策略', type: 'script', proxies: [] })).toBe(false)
  })
})
