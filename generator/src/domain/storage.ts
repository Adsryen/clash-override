import {
  defaultGeneratorConfig,
  isGeneratorConfig,
  type GeneratorConfig,
} from './config'

const workspaceVersion = 1
export const generatorWorkspaceStorageKey = 'clash-override-generator.workspace'

export interface GeneratorPreset {
  id: string
  name: string
  config: GeneratorConfig
}

export interface GeneratorWorkspace {
  version: typeof workspaceVersion
  draft: GeneratorConfig
  recentScript: string | null
  presets: GeneratorPreset[]
}

function createDefaultConfig(): GeneratorConfig {
  return {
    ...defaultGeneratorConfig,
    ruleOptions: { ...defaultGeneratorConfig.ruleOptions },
    regionOptions: { ...defaultGeneratorConfig.regionOptions },
  }
}

function createDefaultWorkspace(): GeneratorWorkspace {
  return {
    version: workspaceVersion,
    draft: createDefaultConfig(),
    recentScript: null,
    presets: [],
  }
}

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

function isGeneratorPreset(value: unknown): value is GeneratorPreset {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['id', 'name', 'config']) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    isGeneratorConfig(value.config)
  )
}

function isGeneratorWorkspace(value: unknown): value is GeneratorWorkspace {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['version', 'draft', 'recentScript', 'presets']) &&
    value.version === workspaceVersion &&
    isGeneratorConfig(value.draft) &&
    (typeof value.recentScript === 'string' || value.recentScript === null) &&
    Array.isArray(value.presets) &&
    value.presets.every(isGeneratorPreset)
  )
}

export function loadWorkspace(): GeneratorWorkspace {
  const serializedWorkspace = localStorage.getItem(generatorWorkspaceStorageKey)
  if (!serializedWorkspace) {
    return createDefaultWorkspace()
  }

  try {
    const workspace: unknown = JSON.parse(serializedWorkspace)
    return isGeneratorWorkspace(workspace) ? workspace : createDefaultWorkspace()
  } catch {
    return createDefaultWorkspace()
  }
}

export function saveWorkspace(workspace: GeneratorWorkspace): void {
  if (!isGeneratorWorkspace(workspace)) {
    throw new Error('invalid generator workspace')
  }

  localStorage.setItem(generatorWorkspaceStorageKey, JSON.stringify(workspace))
}

function createPresetId(): string {
  return `preset-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function savePreset(name: string, config: GeneratorConfig): GeneratorWorkspace {
  const normalizedName = name.trim()
  if (!normalizedName) {
    throw new Error('preset name is required')
  }
  if (!isGeneratorConfig(config)) {
    throw new Error('invalid generator configuration')
  }

  const workspace = loadWorkspace()
  const existingPreset = workspace.presets.find(
    (preset) => preset.name === normalizedName,
  )
  const presets = existingPreset
    ? workspace.presets.map((preset) =>
        preset.id === existingPreset.id ? { ...preset, config } : preset,
      )
    : [...workspace.presets, { id: createPresetId(), name: normalizedName, config }]
  const updatedWorkspace = { ...workspace, presets }

  saveWorkspace(updatedWorkspace)
  return updatedWorkspace
}

export function deletePreset(id: string): GeneratorWorkspace {
  const workspace = loadWorkspace()
  const updatedWorkspace = {
    ...workspace,
    presets: workspace.presets.filter((preset) => preset.id !== id),
  }

  saveWorkspace(updatedWorkspace)
  return updatedWorkspace
}
