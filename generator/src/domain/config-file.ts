import { isGeneratorConfig, type GeneratorConfig } from './config'

const configFileVersion = 1

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[]) {
  const actualKeys = Object.keys(value)
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key) => expectedKeys.includes(key))
  )
}

export function serializeConfigFile(config: GeneratorConfig): string {
  if (!isGeneratorConfig(config)) {
    throw new Error('invalid generator configuration')
  }

  return `${JSON.stringify({ version: configFileVersion, config }, null, 2)}\n`
}

export function parseConfigFile(source: string): GeneratorConfig {
  let document: unknown
  try {
    document = JSON.parse(source)
  } catch {
    throw new Error('invalid configuration file')
  }

  if (!isRecord(document) || !hasExactKeys(document, ['version', 'config'])) {
    throw new Error('invalid configuration file')
  }

  if (document.version !== configFileVersion) {
    throw new Error('unsupported configuration file version')
  }

  if (!isGeneratorConfig(document.config)) {
    throw new Error('invalid configuration file')
  }

  return document.config
}
