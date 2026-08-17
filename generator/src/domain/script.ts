import scriptTemplate from '../../../global_script.js?raw'
import {
  defaultGeneratorConfig,
  isGeneratorConfig,
  isProxyGroupConfig,
  isRuleProviderConfig,
  type ProxyGroupConfig,
  type RuleProviderConfig,
  type GeneratorConfig,
} from './config'

export {
  defaultGeneratorConfig,
  type GeneratorConfig,
  type ProxyGroupConfig,
  type RuleProviderConfig,
} from './config'

const generatorVersion = 1
const markerPrefix = '/* @clash-override-generator:'
const generatorBlockPattern =
  /\/\* @clash-override-generator:[^\r\n]* \*\/\r?\nconst generatorConfig = [^\r\n]+/
const metadataPattern = /\/\* @clash-override-generator:([^\r\n]+) \*\//

export interface GeneratedContent {
  rules: string[]
  ruleProviders: Record<string, RuleProviderConfig>
  proxyGroups: ProxyGroupConfig[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

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

export function inspectGeneratedContent(config: GeneratorConfig): GeneratedContent {
  const script = renderScript(config)
  const generatedMain: unknown = new Function(`${script}\nreturn main`)()
  if (typeof generatedMain !== 'function') {
    throw new Error('generated script is missing its entry point')
  }

  const output: unknown = generatedMain({
    proxies: [{ name: 'Generator Preview' }],
    'proxy-groups': [],
    rules: [],
  })
  if (!isRecord(output)) {
    throw new Error('generated script returned an invalid configuration')
  }

  const rules = output.rules
  const ruleProviders = output['rule-providers'] ?? {}
  const proxyGroups = output['proxy-groups'] ?? []
  if (
    !Array.isArray(rules) ||
    !rules.every((rule) => typeof rule === 'string') ||
    !isRecord(ruleProviders) ||
    !Object.values(ruleProviders).every(isRuleProviderConfig) ||
    !Array.isArray(proxyGroups) ||
    !proxyGroups.every(isProxyGroupConfig)
  ) {
    throw new Error('generated script returned invalid content')
  }

  const validatedProviders: Record<string, RuleProviderConfig> = {}
  for (const [name, provider] of Object.entries(ruleProviders)) {
    if (!isRuleProviderConfig(provider)) {
      throw new Error('generated script returned invalid content')
    }
    validatedProviders[name] = provider
  }

  return {
    rules,
    ruleProviders: validatedProviders,
    proxyGroups,
  }
}
