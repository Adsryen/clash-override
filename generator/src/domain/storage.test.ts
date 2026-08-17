import { beforeEach, describe, expect, it } from 'vitest'
import { defaultGeneratorConfig } from './config'
import {
  deletePreset,
  generatorWorkspaceStorageKey,
  loadWorkspace,
  savePreset,
  saveWorkspace,
} from './storage'

describe('generator workspace storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns a default workspace when there is no saved state', () => {
    expect(loadWorkspace()).toEqual({
      version: 1,
      draft: defaultGeneratorConfig,
      recentScript: null,
      presets: [],
    })
  })

  it('restores a saved draft and recent generated script', () => {
    const draft = {
      ...defaultGeneratorConfig,
      enableDnsOverride: true,
    }

    saveWorkspace({
      version: 1,
      draft,
      recentScript: 'const main = () => ({})',
      presets: [],
    })

    expect(loadWorkspace()).toEqual({
      version: 1,
      draft,
      recentScript: 'const main = () => ({})',
      presets: [],
    })
  })

  it('keeps other presets when saving and deleting a named preset', () => {
    const first = savePreset('Default', defaultGeneratorConfig)
    const second = savePreset('DNS enabled', {
      ...defaultGeneratorConfig,
      enableDnsOverride: true,
    })

    expect(second.presets).toHaveLength(2)
    expect(second.presets.map((preset) => preset.name)).toEqual([
      'Default',
      'DNS enabled',
    ])

    const updated = deletePreset(second.presets[0].id)

    expect(updated.presets).toHaveLength(1)
    expect(updated.presets[0].id).toBe(second.presets[1].id)
    expect(loadWorkspace()).toEqual(updated)
    expect(first.presets).toHaveLength(1)
  })

  it('falls back to defaults for damaged local data', () => {
    localStorage.setItem(generatorWorkspaceStorageKey, '{not json')

    expect(loadWorkspace()).toEqual({
      version: 1,
      draft: defaultGeneratorConfig,
      recentScript: null,
      presets: [],
    })
  })

  it('loads a legacy workspace without content overrides', () => {
    const { contentOverrides: _contentOverrides, ...legacyConfig } = defaultGeneratorConfig
    localStorage.setItem(generatorWorkspaceStorageKey, JSON.stringify({
      version: 1,
      draft: legacyConfig,
      recentScript: null,
      presets: [],
    }))

    expect(loadWorkspace().draft).toEqual(legacyConfig)
  })
})
