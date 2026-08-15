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

export interface GeneratorConfig {
  enable: boolean
  enableUrltest: boolean
  enableDnsOverride: boolean
  ruleOptions: Record<RuleOptionKey, boolean>
  regionOptions: {
    autoDetect: boolean
    excludeHighPercentage: boolean
  }
}

export const defaultGeneratorConfig: GeneratorConfig = {
  enable: true,
  enableUrltest: false,
  enableDnsOverride: false,
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

const configurationKeys = [
  'enable',
  'enableUrltest',
  'enableDnsOverride',
  'ruleOptions',
  'regionOptions',
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

export function isGeneratorConfig(value: unknown): value is GeneratorConfig {
  if (!isRecord(value) || !hasExactKeys(value, configurationKeys)) {
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

  return (
    ruleOptionKeys.every((key) => typeof ruleOptions[key] === 'boolean') &&
    regionOptionKeys.every((key) => typeof regionOptions[key] === 'boolean')
  )
}
