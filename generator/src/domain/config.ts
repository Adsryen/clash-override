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

export interface GeneratorConfig {
  enable: boolean
  enableUrltest: boolean
  enableDnsOverride: boolean
  ruleOptions: Record<RuleOptionKey, boolean>
  customRules?: CustomRules
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

  const configurationKeys = value.customRules === undefined
    ? baseConfigurationKeys
    : [...baseConfigurationKeys, 'customRules']

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

  return (
    ruleOptionKeys.every((key) => typeof ruleOptions[key] === 'boolean') &&
    regionOptionKeys.every((key) => typeof regionOptions[key] === 'boolean')
  )
}
