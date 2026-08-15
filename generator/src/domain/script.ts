import scriptTemplate from '../../../global_script.js?raw'
import {
  defaultGeneratorConfig,
  isGeneratorConfig,
  type GeneratorConfig,
} from './config'

export { defaultGeneratorConfig, type GeneratorConfig } from './config'

const generatorVersion = 1
const markerPrefix = '/* @clash-override-generator:'
const generatorBlockPattern =
  /\/\* @clash-override-generator:[^\r\n]* \*\/\r?\nconst generatorConfig = [^\r\n]+/
const metadataPattern = /\/\* @clash-override-generator:([^\r\n]+) \*\//

export function renderScript(config: GeneratorConfig): string {
  if (!isGeneratorConfig(config)) {
    throw new Error('invalid generator configuration')
  }

  const metadata = JSON.stringify({ version: generatorVersion, config })
  const generatorBlock = `${markerPrefix}${metadata} */\nconst generatorConfig = ${JSON.stringify(config)}`

  if (!generatorBlockPattern.test(scriptTemplate)) {
    throw new Error('script template is missing its generator configuration block')
  }

  return scriptTemplate.replace(generatorBlockPattern, generatorBlock)
}

export function parseGeneratedScript(source: string): GeneratorConfig {
  const match = metadataPattern.exec(source)
  if (!match) {
    throw new Error('not created by this generator')
  }

  let metadata: unknown
  try {
    metadata = JSON.parse(match[1])
  } catch {
    throw new Error('invalid generator configuration')
  }

  if (
    typeof metadata !== 'object' ||
    metadata === null ||
    Array.isArray(metadata) ||
    !('version' in metadata) ||
    !('config' in metadata)
  ) {
    throw new Error('invalid generator configuration')
  }

  if (metadata.version !== generatorVersion) {
    throw new Error('unsupported generator version')
  }

  if (!isGeneratorConfig(metadata.config)) {
    throw new Error('invalid generator configuration')
  }

  return metadata.config
}
