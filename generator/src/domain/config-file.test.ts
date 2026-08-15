import { describe, expect, it } from 'vitest'
import { defaultGeneratorConfig } from './config'
import { parseConfigFile, serializeConfigFile } from './config-file'

describe('config file', () => {
  it('round-trips a generator configuration as readable JSON', () => {
    const config = {
      ...defaultGeneratorConfig,
      ruleOptions: { ...defaultGeneratorConfig.ruleOptions, youtube: false },
    }

    const source = serializeConfigFile(config)

    expect(JSON.parse(source)).toEqual({ version: 1, config })
    expect(parseConfigFile(source)).toEqual(config)
  })

  it('rejects malformed, unsupported, and unknown configuration documents', () => {
    expect(() => parseConfigFile('{')).toThrow('invalid configuration file')
    expect(() => parseConfigFile(JSON.stringify({ version: 2, config: defaultGeneratorConfig }))).toThrow(
      'unsupported configuration file version',
    )
    expect(() =>
      parseConfigFile(
        JSON.stringify({ version: 1, config: defaultGeneratorConfig, extra: true }),
      ),
    ).toThrow('invalid configuration file')
  })
})
