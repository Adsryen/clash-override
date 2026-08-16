import { describe, expect, it } from 'vitest'
import {
  defaultGeneratorConfig,
  parseGeneratedScript,
  renderScript,
} from './script'
import { minifyGeneratedScript } from './minify'

describe('generated scripts', () => {
  it('round-trips a service option through script metadata', () => {
    const config = {
      ...defaultGeneratorConfig,
      ruleOptions: { ...defaultGeneratorConfig.ruleOptions, youtube: false },
    }

    expect(parseGeneratedScript(renderScript(config))).toEqual(config)
  })

  it('writes the versioned generator marker into the complete script', () => {
    const script = renderScript(defaultGeneratorConfig)

    expect(script).toContain('/* @clash-override-generator:')
    expect(script).toContain('const generatorConfig =')
  })

  it('merges user custom rules into the generated script', () => {
    const config = {
      ...defaultGeneratorConfig,
      customRules: {
        gamingSites: {
          target: 'DIRECT',
          domainSuffix: ['example.com'],
          domainKeyword: [],
          domain: [],
          processName: [],
          ruleSets: [],
        },
      },
    }

    const script = renderScript(config)
    const main = new Function(`${script}\nreturn main`)() as (
      config: Record<string, unknown>,
    ) => Record<string, unknown>
    const result = main({
      proxies: [{ name: 'Hong Kong 01' }],
      'proxy-groups': [],
      rules: [],
    })

    expect(script).toContain('"gamingSites"')
    expect(result.rules).toContain('DOMAIN-SUFFIX,example.com,DIRECT')
  })

  it('rejects scripts that were not created by the generator', () => {
    expect(() => parseGeneratedScript('const enable = true')).toThrow(
      'not created by this generator',
    )
  })

  it('rejects malformed or unsupported generator metadata', () => {
    expect(() =>
      parseGeneratedScript(
        '/* @clash-override-generator:{"version":2,"config":{}} */',
      ),
    ).toThrow('unsupported generator version')

    expect(() =>
      parseGeneratedScript(
        '/* @clash-override-generator:{"version":1,"config":{"enable":"yes"}} */',
      ),
    ).toThrow('invalid generator configuration')
  })

  it('executes the generated override script with a minimal proxy config', () => {
    const main = new Function(`${renderScript(defaultGeneratorConfig)}\nreturn main`)() as (
      config: Record<string, unknown>,
    ) => Record<string, unknown>
    const config = {
      proxies: [{ name: 'Hong Kong 01' }],
      'proxy-groups': [],
      rules: [],
    }

    const result = main(config)

    expect(result.rules).toEqual(expect.any(Array))
    expect(result['proxy-groups']).toEqual(expect.any(Array))
  })

  it('minifies a generated script without losing its editable configuration or entry point', async () => {
    const script = renderScript({
      ...defaultGeneratorConfig,
      ruleOptions: { ...defaultGeneratorConfig.ruleOptions, youtube: false },
    })

    const minifiedScript = await minifyGeneratedScript(script)
    const main = new Function(`${minifiedScript}\nreturn main`)() as (
      config: Record<string, unknown>,
    ) => Record<string, unknown>

    expect(minifiedScript.length).toBeLessThan(script.length)
    expect(parseGeneratedScript(minifiedScript)).toEqual(
      parseGeneratedScript(script),
    )
    expect(
      main({ proxies: [{ name: 'Hong Kong 01' }], 'proxy-groups': [], rules: [] }).rules,
    ).toEqual(expect.any(Array))
  })
})
