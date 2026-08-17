export const ruleOptionKeys = [
  'apple',
  'microsoft',
  'github',
  'google',
  'openai',
  'spotify',
  'youtube',
  'bahamut',
  'netflix',
  'tiktok',
  'disney',
  'pixiv',
  'hbo',
  'biliintl',
  'tvb',
  'hulu',
  'primevideo',
  'telegram',
  'line',
  'whatsapp',
  'games',
  'japan',
  'hongkong',
  'unitedstates',
  'russia',
  'tracker',
  'ads',
] as const

export type RuleOptionKey = (typeof ruleOptionKeys)[number]

export interface CustomRule {
  target: string
  domainSuffix: string[]
  domainKeyword: string[]
  domain: string[]
  processName: string[]
  ruleSets: string[]
}

export type CustomRules = Record<string, CustomRule>

export interface RuleProviderConfig {
  type: 'http'
  behavior: 'classical' | 'domain' | 'ipcidr'
  format: 'mrs' | 'text' | 'yaml'
  interval: number
  url: string
  path: string
}

export interface ProxyGroupConfig {
  name: string
  type: 'select' | 'url-test'
  proxies: string[]
  interval?: number
  timeout?: number
  url?: string
  lazy?: boolean
  'max-failed-times'?: number
  hidden?: boolean
  tolerance?: number
  icon?: string
}

export interface ScriptContentOverrides {
  rules: { remove: string[]; add: string[] }
  ruleProviders: { remove: string[]; add: Record<string, RuleProviderConfig> }
  proxyGroups: { remove: string[]; add: ProxyGroupConfig[] }
}

export const defaultScriptContentOverrides: ScriptContentOverrides = {
  rules: { remove: [], add: [] },
  ruleProviders: { remove: [], add: {} },
  proxyGroups: { remove: [], add: [] },
}

export interface GeneratorConfig {
  enable: boolean
  enableUrltest: boolean
  enableDnsOverride: boolean
  ruleOptions: Record<RuleOptionKey, boolean>
  customRules?: CustomRules
  contentOverrides?: ScriptContentOverrides
  regionOptions: {
    autoDetect: boolean
    excludeHighPercentage: boolean
  }
}

export const defaultGeneratorConfig: GeneratorConfig = {
  enable: true,
  enableUrltest: false,
  enableDnsOverride: false,
  customRules: {},
  contentOverrides: defaultScriptContentOverrides,
  ruleOptions: {
    apple: true,
    microsoft: true,
    github: true,
    google: true,
    openai: true,
    spotify: true,
    youtube: true,
    bahamut: false,
    netflix: false,
    tiktok: false,
    disney: false,
    pixiv: true,
    hbo: false,
    biliintl: false,
    tvb: false,
    hulu: false,
    primevideo: false,
    telegram: false,
    line: false,
    whatsapp: false,
    games: true,
    japan: true,
    hongkong: true,
    unitedstates: true,
    russia: true,
    tracker: true,
    ads: true,
  },
  regionOptions: {
    autoDetect: true,
    excludeHighPercentage: true,
  },
}

const baseConfigurationKeys = [
  'enable',
  'enableUrltest',
  'enableDnsOverride',
  'ruleOptions',
  'regionOptions',
] as const

const reservedCustomRuleNames = new Set([
  'direct',
  'defaultProxy',
  'downloadApps',
  'japanSites',
  'hkSites',
  'usSites',
])

const customRuleNamePattern = /^[A-Za-z][A-Za-z0-9-]*$/
const customRuleFields = [
  'target',
  'domainSuffix',
  'domainKeyword',
  'domain',
  'processName',
  'ruleSets',
] as const

const regionOptionKeys = ['autoDetect', 'excludeHighPercentage'] as const
const ruleProviderKeys = ['type', 'behavior', 'format', 'interval', 'url', 'path'] as const
const proxyGroupRequiredKeys = ['name', 'type', 'proxies'] as const
const proxyGroupAllowedKeys = [
  ...proxyGroupRequiredKeys,
  'interval',
  'timeout',
  'url',
  'lazy',
  'max-failed-times',
  'hidden',
  'tolerance',
  'icon',
] as const

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

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string' && item.trim().length > 0)
  )
}

function hasOnlyKnownKeys(value: Record<string, unknown>, allowedKeys: readonly string[]) {
  return Object.keys(value).every((key) => allowedKeys.includes(key))
}

export function isRuleProviderConfig(value: unknown): value is RuleProviderConfig {
  return (
    isRecord(value) &&
    hasExactKeys(value, ruleProviderKeys) &&
    value.type === 'http' &&
    (value.behavior === 'classical' || value.behavior === 'domain' || value.behavior === 'ipcidr') &&
    (value.format === 'mrs' || value.format === 'text' || value.format === 'yaml') &&
    typeof value.interval === 'number' &&
    Number.isFinite(value.interval) &&
    value.interval > 0 &&
    typeof value.url === 'string' &&
    value.url.trim().length > 0 &&
    typeof value.path === 'string' &&
    value.path.trim().length > 0
  )
}

export function isProxyGroupConfig(value: unknown): value is ProxyGroupConfig {
  if (
    !isRecord(value) ||
    !proxyGroupRequiredKeys.every((key) => key in value) ||
    !hasOnlyKnownKeys(value, proxyGroupAllowedKeys) ||
    typeof value.name !== 'string' ||
    value.name.trim().length === 0 ||
    (value.type !== 'select' && value.type !== 'url-test') ||
    !isStringArray(value.proxies)
  ) {
    return false
  }

  return (
    (value.interval === undefined || (typeof value.interval === 'number' && Number.isFinite(value.interval) && value.interval > 0)) &&
    (value.timeout === undefined || (typeof value.timeout === 'number' && Number.isFinite(value.timeout) && value.timeout > 0)) &&
    (value.url === undefined || (typeof value.url === 'string' && value.url.trim().length > 0)) &&
    (value.lazy === undefined || typeof value.lazy === 'boolean') &&
    (value['max-failed-times'] === undefined || (typeof value['max-failed-times'] === 'number' && Number.isFinite(value['max-failed-times']) && value['max-failed-times'] >= 0)) &&
    (value.hidden === undefined || typeof value.hidden === 'boolean') &&
    (value.tolerance === undefined || (typeof value.tolerance === 'number' && Number.isFinite(value.tolerance) && value.tolerance >= 0)) &&
    (value.icon === undefined || (typeof value.icon === 'string' && value.icon.trim().length > 0))
  )
}

export function isScriptContentOverrides(value: unknown): value is ScriptContentOverrides {
  if (!isRecord(value) || !hasExactKeys(value, ['rules', 'ruleProviders', 'proxyGroups'])) {
    return false
  }

  const { rules, ruleProviders, proxyGroups } = value
  return (
    isRecord(rules) &&
    hasExactKeys(rules, ['remove', 'add']) &&
    isStringArray(rules.remove) &&
    isStringArray(rules.add) &&
    isRecord(ruleProviders) &&
    hasExactKeys(ruleProviders, ['remove', 'add']) &&
    isStringArray(ruleProviders.remove) &&
    isRecord(ruleProviders.add) &&
    Object.entries(ruleProviders.add).every(
      ([name, provider]) => name.trim().length > 0 && isRuleProviderConfig(provider),
    ) &&
    isRecord(proxyGroups) &&
    hasExactKeys(proxyGroups, ['remove', 'add']) &&
    isStringArray(proxyGroups.remove) &&
    Array.isArray(proxyGroups.add) &&
    proxyGroups.add.every(isProxyGroupConfig)
  )
}

function isCustomRule(value: unknown): value is CustomRule {
  return (
    isRecord(value) &&
    hasExactKeys(value, customRuleFields) &&
    typeof value.target === 'string' &&
    value.target.trim().length > 0 &&
    customRuleFields.slice(1).every((field) => isStringArray(value[field]))
  )
}

function isCustomRules(value: unknown): value is CustomRules {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([name, rule]) =>
        customRuleNamePattern.test(name) &&
        !reservedCustomRuleNames.has(name) &&
        isCustomRule(rule),
    )
  )
}

export function isGeneratorConfig(value: unknown): value is GeneratorConfig {
  if (!isRecord(value)) {
    return false
  }

  const configurationKeys = [
    ...baseConfigurationKeys,
    ...(value.customRules === undefined ? [] : ['customRules']),
    ...(value.contentOverrides === undefined ? [] : ['contentOverrides']),
  ]

  if (!hasExactKeys(value, configurationKeys)) {
    return false
  }

  const ruleOptions = value.ruleOptions
  const regionOptions = value.regionOptions

  if (
    typeof value.enable !== 'boolean' ||
    typeof value.enableUrltest !== 'boolean' ||
    typeof value.enableDnsOverride !== 'boolean' ||
    !isRecord(ruleOptions) ||
    !isRecord(regionOptions) ||
    !hasExactKeys(ruleOptions, ruleOptionKeys) ||
    !hasExactKeys(regionOptions, regionOptionKeys)
  ) {
    return false
  }

  if (value.customRules !== undefined && !isCustomRules(value.customRules)) {
    return false
  }

  if (value.contentOverrides !== undefined && !isScriptContentOverrides(value.contentOverrides)) {
    return false
  }

  return (
    ruleOptionKeys.every((key) => typeof ruleOptions[key] === 'boolean') &&
    regionOptionKeys.every((key) => typeof regionOptions[key] === 'boolean')
  )
}

export function cloneGeneratorConfig(config: GeneratorConfig): GeneratorConfig {
  const contentOverrides = config.contentOverrides ?? defaultScriptContentOverrides
  return {
    ...config,
    ruleOptions: { ...config.ruleOptions },
    regionOptions: { ...config.regionOptions },
    customRules: Object.fromEntries(
      Object.entries(config.customRules ?? {}).map(([name, rule]) => [name, {
        ...rule,
        domainSuffix: [...rule.domainSuffix],
        domainKeyword: [...rule.domainKeyword],
        domain: [...rule.domain],
        processName: [...rule.processName],
        ruleSets: [...rule.ruleSets],
      }]),
    ),
    contentOverrides: {
      rules: {
        remove: [...contentOverrides.rules.remove],
        add: [...contentOverrides.rules.add],
      },
      ruleProviders: {
        remove: [...contentOverrides.ruleProviders.remove],
        add: Object.fromEntries(
          Object.entries(contentOverrides.ruleProviders.add).map(([name, provider]) => [name, { ...provider }]),
        ),
      },
      proxyGroups: {
        remove: [...contentOverrides.proxyGroups.remove],
        add: contentOverrides.proxyGroups.add.map((group) => ({ ...group, proxies: [...group.proxies] })),
      },
    },
  }
}
