import { describe, expect, it } from 'vitest'
import { defaultGeneratorConfig, isGeneratorConfig } from './config'

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
})
