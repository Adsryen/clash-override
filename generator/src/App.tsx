import { useMemo, useState, type ChangeEvent } from 'react'
import {
  defaultGeneratorConfig,
  type GeneratorConfig,
  type RuleOptionKey,
} from './domain/config'
import { parseGeneratedScript, renderScript } from './domain/script'
import {
  deletePreset,
  loadWorkspace,
  savePreset,
  saveWorkspace,
  type GeneratorWorkspace,
} from './domain/storage'

interface RuleOptionDefinition {
  key: RuleOptionKey
  label: string
}

interface RuleOptionGroup {
  title: string
  options: RuleOptionDefinition[]
}

const ruleOptionGroups: RuleOptionGroup[] = [
  {
    title: '基础服务',
    options: [
      { key: 'apple', label: 'Apple' },
      { key: 'microsoft', label: 'Microsoft' },
      { key: 'github', label: 'GitHub' },
      { key: 'google', label: 'Google' },
      { key: 'openai', label: 'OpenAI' },
      { key: 'spotify', label: 'Spotify' },
      { key: 'youtube', label: 'YouTube' },
    ],
  },
  {
    title: '流媒体',
    options: [
      { key: 'bahamut', label: '巴哈姆特' },
      { key: 'netflix', label: 'Netflix' },
      { key: 'tiktok', label: 'TikTok' },
      { key: 'disney', label: 'Disney+' },
      { key: 'pixiv', label: 'Pixiv' },
      { key: 'hbo', label: 'HBO' },
      { key: 'biliintl', label: '哔哩哔哩国际' },
      { key: 'tvb', label: 'TVB' },
      { key: 'hulu', label: 'Hulu' },
      { key: 'primevideo', label: 'Prime Video' },
    ],
  },
  {
    title: '通信与游戏',
    options: [
      { key: 'telegram', label: 'Telegram' },
      { key: 'line', label: 'LINE' },
      { key: 'whatsapp', label: 'WhatsApp' },
      { key: 'games', label: '游戏' },
    ],
  },
  {
    title: '地区网站',
    options: [
      { key: 'japan', label: '日本网站' },
      { key: 'hongkong', label: '香港网站' },
      { key: 'unitedstates', label: '美国网站' },
      { key: 'russia', label: '俄罗斯网站' },
    ],
  },
  {
    title: '网络维护',
    options: [
      { key: 'tracker', label: '分析与跟踪' },
      { key: 'ads', label: '广告拦截' },
    ],
  },
]

function cloneDefaultConfig(): GeneratorConfig {
  return {
    ...defaultGeneratorConfig,
    ruleOptions: { ...defaultGeneratorConfig.ruleOptions },
    regionOptions: { ...defaultGeneratorConfig.regionOptions },
  }
}

function App() {
  const [workspace, setWorkspace] = useState<GeneratorWorkspace>(() => loadWorkspace())
  const [presetName, setPresetName] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const script = useMemo(() => renderScript(workspace.draft), [workspace.draft])

  const updateDraft = (draft: GeneratorConfig) => {
    const updatedWorkspace = { ...workspace, draft, recentScript: renderScript(draft) }
    saveWorkspace(updatedWorkspace)
    setWorkspace(updatedWorkspace)
    setError(null)
  }

  const updateRuleOption = (key: RuleOptionKey, enabled: boolean) => {
    updateDraft({
      ...workspace.draft,
      ruleOptions: { ...workspace.draft.ruleOptions, [key]: enabled },
    })
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      updateDraft(parseGeneratedScript(await file.text()))
      setNotice(`已导入 ${file.name}`)
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : '无法导入脚本')
    }
  }

  const handleSavePreset = () => {
    try {
      const updatedWorkspace = savePreset(presetName, workspace.draft)
      setWorkspace(updatedWorkspace)
      setSelectedPresetId(
        updatedWorkspace.presets.find((preset) => preset.name === presetName.trim())?.id ?? '',
      )
      setPresetName('')
      setError(null)
      setNotice('预设已保存')
    } catch (presetError) {
      setError(presetError instanceof Error ? presetError.message : '无法保存预设')
    }
  }

  const handleLoadPreset = () => {
    const preset = workspace.presets.find((item) => item.id === selectedPresetId)
    if (!preset) return

    updateDraft(preset.config)
    setNotice(`已加载 ${preset.name}`)
  }

  const handleDeletePreset = () => {
    if (!selectedPresetId) return

    setWorkspace(deletePreset(selectedPresetId))
    setSelectedPresetId('')
    setNotice('预设已删除')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script)
      setNotice('脚本已复制')
    } catch {
      setError('浏览器未授予剪贴板权限')
    }
  }

  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([script], { type: 'text/javascript' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'global_script.js'
    link.click()
    URL.revokeObjectURL(url)
    setNotice('脚本已下载')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">LOCAL WORKBENCH</p>
          <h1>Clash Override</h1>
          <div className="project-attribution" aria-label="项目仓库">
            <span>Adsryen/clash-override</span>
            <a
              href="https://github.com/Adsryen/clash-override"
              target="_blank"
              rel="noreferrer"
            >
              查看 GitHub 仓库
            </a>
            <a
              href="https://github.com/Adsryen/clash-override"
              target="_blank"
              rel="noreferrer"
            >
              给项目点 Star
            </a>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="button secondary" type="button" onClick={() => updateDraft(cloneDefaultConfig())}>
            新建配置
          </button>
          <label className="button secondary file-button" htmlFor="script-import">
            导入脚本
            <input
              id="script-import"
              aria-label="导入生成器脚本"
              type="file"
              accept=".js,text/javascript"
              onChange={handleImport}
            />
          </label>
          <button className="button secondary" type="button" onClick={handleCopy}>
            复制脚本
          </button>
          <button className="button primary" type="button" onClick={handleDownload}>
            下载脚本
          </button>
        </div>
      </header>

      {(error || notice) && (
        <div className={error ? 'status-message error' : 'status-message'} role={error ? 'alert' : 'status'}>
          {error ?? notice}
        </div>
      )}

      <div className="workbench">
        <section className="settings-panel" aria-label="脚本配置">
          <section className="settings-section primary-options" aria-labelledby="general-options">
            <h2 id="general-options">运行方式</h2>
            <div className="option-grid">
              <Toggle
                label="启用覆写"
                checked={workspace.draft.enable}
                onChange={(enabled) => updateDraft({ ...workspace.draft, enable: enabled })}
              />
              <Toggle
                label="自动测速"
                checked={workspace.draft.enableUrltest}
                onChange={(enabled) =>
                  updateDraft({ ...workspace.draft, enableUrltest: enabled })
                }
              />
              <Toggle
                label="DNS 覆写"
                checked={workspace.draft.enableDnsOverride}
                onChange={(enabled) =>
                  updateDraft({ ...workspace.draft, enableDnsOverride: enabled })
                }
              />
              <Toggle
                label="地区自动识别"
                checked={workspace.draft.regionOptions.autoDetect}
                onChange={(enabled) =>
                  updateDraft({
                    ...workspace.draft,
                    regionOptions: { ...workspace.draft.regionOptions, autoDetect: enabled },
                  })
                }
              />
              <Toggle
                label="过滤高倍率节点"
                checked={workspace.draft.regionOptions.excludeHighPercentage}
                onChange={(enabled) =>
                  updateDraft({
                    ...workspace.draft,
                    regionOptions: {
                      ...workspace.draft.regionOptions,
                      excludeHighPercentage: enabled,
                    },
                  })
                }
              />
            </div>
          </section>

          <section className="settings-section presets" aria-labelledby="presets-heading">
            <h2 id="presets-heading">本地预设</h2>
            <div className="preset-editor">
              <label>
                <span>预设名称</span>
                <input
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                />
              </label>
              <button className="button secondary" type="button" onClick={handleSavePreset}>
                保存预设
              </button>
            </div>
            <div className="preset-loader">
              <label>
                <span>已保存预设</span>
                <select
                  value={selectedPresetId}
                  onChange={(event) => setSelectedPresetId(event.target.value)}
                >
                  <option value="">选择预设</option>
                  {workspace.presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button secondary" type="button" onClick={handleLoadPreset}>
                加载预设
              </button>
              <button className="button danger" type="button" onClick={handleDeletePreset}>
                删除预设
              </button>
            </div>
          </section>

          {ruleOptionGroups.map((group) => (
            <fieldset className="settings-section option-group" key={group.title}>
              <legend>{group.title}</legend>
              <div className="option-grid">
                {group.options.map((option) => (
                  <Toggle
                    key={option.key}
                    label={option.label}
                    checked={workspace.draft.ruleOptions[option.key]}
                    onChange={(enabled) => updateRuleOption(option.key, enabled)}
                  />
                ))}
              </div>
            </fieldset>
          ))}
        </section>

        <section className="preview-panel" aria-label="脚本预览">
          <div className="preview-header">
            <div>
              <p className="eyebrow">OUTPUT</p>
              <h2>global_script.js</h2>
            </div>
            <span className="file-status">已生成</span>
          </div>
          <pre className="script-preview" data-testid="script-preview">
            <code>{script}</code>
          </pre>
        </section>
      </div>
    </main>
  )
}

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (enabled: boolean) => void
}

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

export default App
