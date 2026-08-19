import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import {
  cloneGeneratorConfig,
  builtInCustomRules,
  builtInRuleSets,
  defaultGeneratorConfig,
  type CustomRule,
  type CustomRules,
  type CustomRuleSets,
  type GeneratorConfig,
  type RuleSetConfig,
  type RuleOptionKey,
} from './domain/config'
import { parseConfigFile, serializeConfigFile } from './domain/config-file'
import { minifyGeneratedScript } from './domain/minify'
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

type WorkbenchSection = 'overview' | 'runtime' | 'sites' | 'regions' | 'rules' | 'ruleSets' | 'presets'

interface WorkbenchSectionDefinition {
  id: WorkbenchSection
  label: string
  description: string
}

const workbenchSections: WorkbenchSectionDefinition[] = [
  { id: 'overview', label: '概览', description: '查看当前开关、规则数量和脚本大小' },
  { id: 'runtime', label: '运行方式', description: '控制脚本开关、自动测速和 DNS 覆写' },
  { id: 'sites', label: '站点分流', description: '按服务开关生成对应的代理策略组' },
  { id: 'regions', label: '地区偏好', description: '选择地区站点，并决定如何识别订阅节点' },
  { id: 'rules', label: '规则', description: '设置域名、关键词、进程等匹配条件，以及命中后的目标策略' },
  { id: 'ruleSets', label: '规则集', description: '配置外部规则列表的地址和更新方式，再在规则中引用' },
  { id: 'presets', label: '本地预设', description: '保存当前配置，之后可以快速加载或删除' },
]

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

const siteRuleOptionKeys = ruleOptionGroups
  .filter((group) => group.title !== '地区网站')
  .flatMap((group) => group.options.map((option) => option.key))

const regionRuleOptionKeys = ruleOptionGroups
  .find((group) => group.title === '地区网站')?.options.map((option) => option.key) ?? []

// Display-only mirror of regionOptions.regions in global_script.js.
const supportedNodeRegions = [
  'HK香港', 'US美国', 'JP日本', 'KR韩国', 'SG新加坡', 'CN中国大陆', 'TW台湾省',
  'GB英国', 'DE德国', 'MY马来西亚', 'TK土耳其', 'CA加拿大', 'FR法国', 'GR希腊',
  'LT立陶宛', 'MK北马其顿', 'NL荷兰', 'PL波兰', 'SE瑞典', 'AR阿根廷',
] as const

function cloneDefaultConfig(): GeneratorConfig {
  return cloneGeneratorConfig(defaultGeneratorConfig)
}

const customRuleListFields = [
  ['domainSuffix', '域名后缀'],
  ['domainKeyword', '域名关键词'],
  ['domain', '精确域名'],
  ['processName', '进程名'],
  ['ruleSets', '规则集'],
] as const

const customRuleTargetOptions = [
  'DIRECT',
  'REJECT',
  '直连',
  '默认节点',
  '下载软件',
  '国内网站',
  '其他外网',
  '其他节点',
  '日本网站',
  '香港网站',
  '美国网站',
  '俄罗斯网站',
  '游戏专用',
  '跟踪分析',
  '广告过滤',
  '苹果服务',
  '微软服务',
  'Github',
  '谷歌服务',
  '国外AI',
  'YouTube',
  '巴哈姆特',
  'Disney+',
  'NETFLIX',
  'Tiktok',
  'Spotify',
  'Pixiv',
  'HBO',
  'TVB',
  'Prime Video',
  'Hulu',
  'Telegram',
  'WhatsApp',
  'Line',
  '哔哩哔哩东南亚',
] as const

const customTargetValue = '__custom__'

const builtInRuleNames = new Set(Object.keys(builtInCustomRules))
const builtInRuleSetNames = new Set(Object.keys(builtInRuleSets))

function createCustomRule(): CustomRule {
  return {
    target: 'DIRECT',
    domainSuffix: [],
    domainKeyword: [],
    domain: [],
    processName: [],
    ruleSets: [],
  }
}

function createRuleSet(): RuleSetConfig {
  return {
    behavior: 'classical',
    format: 'text',
    interval: 86400,
    url: 'https://example.com/rules.list',
    path: './ruleset/example.list',
  }
}

function activeRules(draft: GeneratorConfig): CustomRules {
  const removed = new Set(draft.removedBuiltInRules ?? [])
  return Object.fromEntries(
    Object.entries({ ...builtInCustomRules, ...(draft.customRules ?? {}) })
      .filter(([name]) => !removed.has(name)),
  )
}

function activeRuleSets(draft: GeneratorConfig): CustomRuleSets {
  const removed = new Set(draft.removedBuiltInRuleSets ?? [])
  return Object.fromEntries(
    Object.entries({ ...builtInRuleSets, ...(draft.customRuleSets ?? {}) })
      .filter(([name]) => !removed.has(name)),
  )
}

function isRuleSetBehavior(value: string): value is RuleSetConfig['behavior'] {
  return value === 'classical' || value === 'domain' || value === 'ipcidr'
}

function isRuleSetFormat(value: string): value is RuleSetConfig['format'] {
  return value === 'mrs' || value === 'text' || value === 'yaml'
}

function parseLineList(value: string): string[] {
  return value.split('\n').map((item) => item.trim()).filter(Boolean)
}

function formatLineList(value: string[]): string {
  return value.join('\n')
}

function downloadTextFile(source: string, filename: string, contentType: string) {
  const url = URL.createObjectURL(new Blob([source], { type: contentType }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function calculateReduction(originalBytes: number, compressedBytes: number): number {
  if (originalBytes <= 0) return 0
  return Math.max(0, ((originalBytes - compressedBytes) / originalBytes) * 100)
}

function App() {
  const [workspace, setWorkspace] = useState<GeneratorWorkspace>(() => loadWorkspace())
  const [presetName, setPresetName] = useState('')
  const [customRuleName, setCustomRuleName] = useState('')
  const [customRuleSetName, setCustomRuleSetName] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isMinifying, setIsMinifying] = useState(false)
  const [activeSection, setActiveSection] = useState<WorkbenchSection>('overview')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false)
  const [minifiedStats, setMinifiedStats] = useState<{
    size: number
    reduction: number
  } | null>(null)
  const script = useMemo(() => renderScript(workspace.draft), [workspace.draft])
  const scriptSize = useMemo(() => new Blob([script]).size, [script])
  const enabledRuleCount = useMemo(
    () => Object.values(workspace.draft.ruleOptions).filter(Boolean).length,
    [workspace.draft.ruleOptions],
  )
  const enabledSiteCount = useMemo(
    () => siteRuleOptionKeys.filter((key) => workspace.draft.ruleOptions[key]).length,
    [workspace.draft.ruleOptions],
  )
  const enabledRegionCount = useMemo(
    () => regionRuleOptionKeys.filter((key) => workspace.draft.ruleOptions[key]).length,
    [workspace.draft.ruleOptions],
  )
  const sourceRuleCount = Object.keys(activeRules(workspace.draft)).length
  const ruleSetCount = Object.keys(activeRuleSets(workspace.draft)).length
  const sectionBadges: Partial<Record<WorkbenchSection, string>> = {
    sites: String(enabledSiteCount),
    regions: String(enabledRegionCount),
    rules: sourceRuleCount > 0 ? String(sourceRuleCount) : undefined,
    ruleSets: ruleSetCount > 0 ? String(ruleSetCount) : undefined,
    presets: workspace.presets.length > 0 ? String(workspace.presets.length) : undefined,
  }
  const activeSectionDefinition = workbenchSections.find(({ id }) => id === activeSection)

  useEffect(() => {
    setMinifiedStats(null)
  }, [script])

  const updateDraft = (draft: GeneratorConfig) => {
    const updatedWorkspace = { ...workspace, draft, recentScript: renderScript(draft) }
    saveWorkspace(updatedWorkspace)
    setWorkspace(updatedWorkspace)
    setError(null)
    setMinifiedStats(null)
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

  const updateCustomRule = (name: string, changes: Partial<CustomRule>) => {
    const currentRule = activeRules(workspace.draft)[name]
    if (!currentRule) return

    updateDraft({
      ...workspace.draft,
      customRules: {
        ...(workspace.draft.customRules ?? {}),
        [name]: { ...currentRule, ...changes },
      },
    })
  }

  const handleAddCustomRule = () => {
    const normalizedName = customRuleName.trim()
    if (!/^[A-Za-z][A-Za-z0-9-]*$/.test(normalizedName)) {
      setError('规则名称必须以英文字母开头，只能包含英文字母、数字和连字符')
      return
    }
    if (activeRules(workspace.draft)[normalizedName] || builtInRuleNames.has(normalizedName)) {
      setError('规则名称已存在，请更换名称')
      return
    }

    updateDraft({
      ...workspace.draft,
      customRules: {
        ...(workspace.draft.customRules ?? {}),
        [normalizedName]: createCustomRule(),
      },
    })
    setCustomRuleName('')
    setNotice(`已添加规则 ${normalizedName}`)
  }

  const handleDeleteCustomRule = (name: string) => {
    const customRules = { ...(workspace.draft.customRules ?? {}) }
    delete customRules[name]
    updateDraft({ ...workspace.draft, customRules })
    setNotice(`已删除规则 ${name}`)
  }

  const handleDisableBuiltInRule = (name: string) => {
    const removedBuiltInRules = workspace.draft.removedBuiltInRules ?? []
    if (removedBuiltInRules.includes(name)) return
    updateDraft({ ...workspace.draft, removedBuiltInRules: [...removedBuiltInRules, name] })
    setNotice(`已禁用内置规则 ${name}`)
  }

  const handleRestoreBuiltInRule = (name: string) => {
    updateDraft({
      ...workspace.draft,
      removedBuiltInRules: (workspace.draft.removedBuiltInRules ?? []).filter((item) => item !== name),
    })
    setNotice(`已恢复内置规则 ${name}`)
  }

  const updateRuleSet = (name: string, changes: Partial<RuleSetConfig>) => {
    const currentRuleSet = activeRuleSets(workspace.draft)[name]
    if (!currentRuleSet) return
    updateDraft({
      ...workspace.draft,
      customRuleSets: {
        ...(workspace.draft.customRuleSets ?? {}),
        [name]: { ...currentRuleSet, ...changes },
      },
    })
  }

  const handleAddRuleSet = () => {
    const normalizedName = customRuleSetName.trim()
    if (!/^[A-Za-z][A-Za-z0-9-]*$/.test(normalizedName)) {
      setError('规则集名称必须以英文字母开头，只能包含英文字母、数字和连字符')
      return
    }
    if (activeRuleSets(workspace.draft)[normalizedName] || builtInRuleSetNames.has(normalizedName)) {
      setError('规则集名称已存在，请更换名称')
      return
    }
    updateDraft({
      ...workspace.draft,
      customRuleSets: { ...(workspace.draft.customRuleSets ?? {}), [normalizedName]: createRuleSet() },
    })
    setCustomRuleSetName('')
    setNotice(`已添加规则集 ${normalizedName}`)
  }

  const handleDeleteRuleSet = (name: string) => {
    if (builtInRuleSetNames.has(name)) {
      const removedBuiltInRuleSets = workspace.draft.removedBuiltInRuleSets ?? []
      if (removedBuiltInRuleSets.includes(name)) return
      updateDraft({ ...workspace.draft, removedBuiltInRuleSets: [...removedBuiltInRuleSets, name] })
      setNotice(`已禁用内置规则集 ${name}`)
      return
    }
    const customRuleSets = { ...(workspace.draft.customRuleSets ?? {}) }
    delete customRuleSets[name]
    updateDraft({ ...workspace.draft, customRuleSets })
    setNotice(`已删除规则集 ${name}`)
  }

  const handleRestoreBuiltInRuleSet = (name: string) => {
    updateDraft({
      ...workspace.draft,
      removedBuiltInRuleSets: (workspace.draft.removedBuiltInRuleSets ?? []).filter((item) => item !== name),
    })
    setNotice(`已恢复内置规则集 ${name}`)
  }

  const handleConfigImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      updateDraft(parseConfigFile(await file.text()))
      setNotice(`已导入配置 ${file.name}`)
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : '无法导入配置')
    }
  }

  const handleReset = () => {
    if (!window.confirm('确定恢复默认配置吗？当前配置将被覆盖。')) return

    updateDraft(cloneDefaultConfig())
    setNotice('已恢复默认配置')
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
    downloadTextFile(script, 'global_script.js', 'text/javascript')
    setNotice('脚本已下载')
  }

  const handleDownloadMinified = async () => {
    setIsMinifying(true)

    try {
      const minifiedScript = await minifyGeneratedScript(script)
      const minifiedSize = new Blob([minifiedScript]).size
      setMinifiedStats({
        size: minifiedSize,
        reduction: calculateReduction(scriptSize, minifiedSize),
      })
      downloadTextFile(
        minifiedScript,
        'global_script.min.js',
        'text/javascript',
      )
      setError(null)
      setNotice('压缩脚本已下载')
    } catch (minifyError) {
      setError(minifyError instanceof Error ? minifyError.message : '无法压缩脚本')
    } finally {
      setIsMinifying(false)
    }
  }

  const handleConfigExport = () => {
    downloadTextFile(
      serializeConfigFile(workspace.draft),
      'clash-override-config.json',
      'application/json',
    )
    setNotice('配置已导出')
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <OverviewSection
            draft={workspace.draft}
            scriptSize={scriptSize}
            enabledRuleCount={enabledRuleCount}
            customRuleCount={sourceRuleCount}
            onOpenPreview={() => setIsPreviewOpen(true)}
          />
        )
      case 'runtime':
        return (
          <RuntimeSection
            draft={workspace.draft}
            onChange={updateDraft}
          />
        )
      case 'sites':
        return (
          <SitesSection
            draft={workspace.draft}
            onChange={updateRuleOption}
          />
        )
      case 'regions':
        return (
          <RegionsSection
            draft={workspace.draft}
            onRuleOptionChange={updateRuleOption}
            onDraftChange={updateDraft}
          />
        )
      case 'rules':
      case 'ruleSets':
        return (
          <CustomRulesSection
            mode={activeSection}
            draft={workspace.draft}
            customRuleName={customRuleName}
            onCustomRuleNameChange={setCustomRuleName}
            onAdd={handleAddCustomRule}
            onChange={updateCustomRule}
            onDelete={handleDeleteCustomRule}
            onDisableBuiltInRule={handleDisableBuiltInRule}
            onRestoreBuiltInRule={handleRestoreBuiltInRule}
            customRuleSetName={customRuleSetName}
            onCustomRuleSetNameChange={setCustomRuleSetName}
            onAddRuleSet={handleAddRuleSet}
            onRuleSetChange={updateRuleSet}
            onDeleteRuleSet={handleDeleteRuleSet}
            onRestoreBuiltInRuleSet={handleRestoreBuiltInRuleSet}
          />
        )
      case 'presets':
        return (
          <PresetSection
            presets={workspace.presets}
            presetName={presetName}
            selectedPresetId={selectedPresetId}
            onPresetNameChange={setPresetName}
            onSelectedPresetChange={setSelectedPresetId}
            onSave={handleSavePreset}
            onLoad={handleLoadPreset}
            onDelete={handleDeletePreset}
          />
        )
    }
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
            <a
              href="https://github.com/Adsryen/clash-override/pulls"
              target="_blank"
              rel="noreferrer"
            >
              欢迎提交 PR，一起改进这个项目
            </a>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="button secondary" type="button" onClick={handleReset}>
            恢复默认
          </button>
          <div className="file-actions">
            <button
              className="button secondary"
              type="button"
              aria-expanded={isFileMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsFileMenuOpen((open) => !open)}
            >
              文件操作
            </button>
            {isFileMenuOpen && (
              <div className="file-menu" role="menu" aria-label="文件操作菜单">
                <button className="file-menu-item" role="menuitem" type="button" onClick={() => document.getElementById('config-import')?.click()}>
                  导入配置
                </button>
                <button className="file-menu-item" role="menuitem" type="button" onClick={() => document.getElementById('script-import')?.click()}>
                  导入脚本
                </button>
                <button className="file-menu-item" role="menuitem" type="button" onClick={() => { handleConfigExport(); setIsFileMenuOpen(false) }}>
                  导出配置
                </button>
              </div>
            )}
          </div>
          <input
            id="config-import"
            className="file-input-hidden"
            aria-label="导入配置"
            type="file"
            accept=".json,application/json"
            onChange={(event) => { setIsFileMenuOpen(false); void handleConfigImport(event) }}
          />
          <input
            id="script-import"
            className="file-input-hidden"
            aria-label="导入生成器脚本"
            type="file"
            accept=".js,text/javascript"
            onChange={(event) => { setIsFileMenuOpen(false); void handleImport(event) }}
          />
          <button
            className="button primary preview-toggle"
            type="button"
            aria-expanded={isPreviewOpen}
            aria-controls="script-preview-drawer"
            onClick={() => setIsPreviewOpen((open) => !open)}
          >
            {isPreviewOpen ? '收起脚本预览' : '打开脚本预览'}
          </button>
          <div className="topbar-script-summary" data-testid="compression-summary" aria-label="脚本大小">
            <span>普通版 {formatBytes(scriptSize)}</span>
            {minifiedStats && <><span>压缩版 {formatBytes(minifiedStats.size)}</span><span>减少 {minifiedStats.reduction.toFixed(1)}%</span></>}
          </div>
        </div>
      </header>

      {(error || notice) && (
        <div className={error ? 'status-message error' : 'status-message'} role={error ? 'alert' : 'status'}>
          {error ?? notice}
        </div>
      )}

      <div className={`workbench ${isPreviewOpen ? 'preview-open' : ''}`}>
        <WorkbenchSidebar activeSection={activeSection} badges={sectionBadges} onChange={setActiveSection} />
        <section className="settings-panel" aria-label="脚本配置">
          <div className="section-header">
            <div>
              <p className="eyebrow">CONFIGURATION</p>
              <h2>{activeSectionDefinition?.label}</h2>
              <p>{activeSectionDefinition?.description}</p>
            </div>
            <span className="draft-status">已保存</span>
          </div>
          {renderSection()}
        </section>
        {isPreviewOpen && (
          <PreviewDrawer
            script={script}
            scriptSize={scriptSize}
            minifiedStats={minifiedStats}
            previewStatus="已生成"
            onClose={() => setIsPreviewOpen(false)}
            onCopy={handleCopy}
            onDownload={handleDownload}
            onDownloadMinified={handleDownloadMinified}
            isMinifying={isMinifying}
          />
        )}
      </div>
    </main>
  )
}

interface WorkbenchSidebarProps {
  activeSection: WorkbenchSection
  badges: Partial<Record<WorkbenchSection, string>>
  onChange: (section: WorkbenchSection) => void
}

function WorkbenchSidebar({ activeSection, badges, onChange }: WorkbenchSidebarProps) {
  return (
    <nav className="workbench-sidebar" aria-label="配置分组">
      <p className="sidebar-label">WORKSPACE</p>
      <label className="mobile-section-picker">
        <span>配置分组</span>
        <select
          aria-label="切换配置分组"
          value={activeSection}
          onChange={(event) => {
            if (isWorkbenchSection(event.target.value)) onChange(event.target.value)
          }}
        >
          {workbenchSections.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}
        </select>
      </label>
      <div className="sidebar-nav">
        {workbenchSections.map((section) => (
          <button
            className={`sidebar-item ${activeSection === section.id ? 'active' : ''}`}
            key={section.id}
            type="button"
            aria-label={section.label}
            aria-current={activeSection === section.id ? 'page' : undefined}
            onClick={() => onChange(section.id)}
          >
              <span className="sidebar-item-label"><span>{section.label}</span>{badges[section.id] && <span className="sidebar-badge">{badges[section.id]}</span>}</span>
            <small>{section.description}</small>
          </button>
        ))}
      </div>
    </nav>
  )
}

function isWorkbenchSection(value: string): value is WorkbenchSection {
  return workbenchSections.some((section) => section.id === value)
}

interface OverviewSectionProps {
  draft: GeneratorConfig
  scriptSize: number
  enabledRuleCount: number
  customRuleCount: number
  onOpenPreview: () => void
}

function OverviewSection({
  draft,
  scriptSize,
  enabledRuleCount,
  customRuleCount,
  onOpenPreview,
}: OverviewSectionProps) {
  const runtimeCount = [draft.enable, draft.enableUrltest, draft.enableDnsOverride].filter(Boolean).length
  return (
    <div className="overview-section">
      <section className="summary-grid" aria-label="配置摘要">
        <div className="summary-item"><strong>{enabledRuleCount}</strong><span>启用分流项</span></div>
        <div className="summary-item"><strong>{customRuleCount}</strong><span>规则总数</span></div>
        <div className="summary-item"><strong>{runtimeCount}/3</strong><span>运行开关</span></div>
        <div className="summary-item"><strong>{formatBytes(scriptSize)}</strong><span>脚本大小</span></div>
      </section>
      <section className="settings-section overview-card" aria-labelledby="overview-status-heading">
        <h3 id="overview-status-heading">当前生成状态</h3>
        <p>配置保存在浏览器本地，修改后脚本预览会立即更新。</p>
        <button className="button primary" type="button" onClick={onOpenPreview}>查看生成脚本</button>
      </section>
      <section className="overview-links" aria-label="常用操作">
        <button className="overview-link" type="button" onClick={() => window.scrollTo({ top: 0 })}>从侧栏选择配置分组</button>
        <span>导入、导出和下载操作位于顶部工具栏。</span>
      </section>
    </div>
  )
}

interface RuntimeSectionProps {
  draft: GeneratorConfig
  onChange: (draft: GeneratorConfig) => void
}

function RuntimeSection({ draft, onChange }: RuntimeSectionProps) {
  return (
    <section className="settings-section primary-options" aria-labelledby="general-options">
      <h3 id="general-options">运行方式</h3>
      <div className="option-grid">
        <Toggle label="启用覆写" checked={draft.enable} onChange={(enabled) => onChange({ ...draft, enable: enabled })} />
        <Toggle label="自动测速" checked={draft.enableUrltest} onChange={(enabled) => onChange({ ...draft, enableUrltest: enabled })} />
        <Toggle label="DNS 覆写" checked={draft.enableDnsOverride} onChange={(enabled) => onChange({ ...draft, enableDnsOverride: enabled })} />
      </div>
    </section>
  )
}

interface RuleOptionsSectionProps {
  draft: GeneratorConfig
  groups: RuleOptionGroup[]
  onChange: (key: RuleOptionKey, enabled: boolean) => void
}

function RuleOptionsSection({ draft, groups, onChange }: RuleOptionsSectionProps) {
  return (
    <div className="rule-options-sections">
      {groups.map((group) => (
        <fieldset className="settings-section option-group" key={group.title}>
          <legend>{group.title}</legend>
          <div className="option-grid">
            {group.options.map((option) => (
              <Toggle key={option.key} label={option.label} checked={draft.ruleOptions[option.key]} onChange={(enabled) => onChange(option.key, enabled)} />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  )
}

interface SitesSectionProps {
  draft: GeneratorConfig
  onChange: (key: RuleOptionKey, enabled: boolean) => void
}

function SitesSection({ draft, onChange }: SitesSectionProps) {
  return <RuleOptionsSection draft={draft} groups={ruleOptionGroups.filter((group) => group.title !== '地区网站')} onChange={onChange} />
}

interface RegionsSectionProps {
  draft: GeneratorConfig
  onRuleOptionChange: (key: RuleOptionKey, enabled: boolean) => void
  onDraftChange: (draft: GeneratorConfig) => void
}

function RegionsSection({ draft, onRuleOptionChange, onDraftChange }: RegionsSectionProps) {
  return (
    <div className="regional-options">
      <p className="regional-options-intro">节点来自订阅；这里决定哪些地区网站生成专用策略组，以及如何识别和筛选地区节点。</p>
      <p className="regional-options-note">地区网站分流目前提供日本、香港、美国、俄罗斯 4 项开关。节点识别表由脚本内置规则维护，下面只展示当前可识别的订阅节点地区，不编辑识别词或倍率上限。</p>
      <details className="regional-detection-list">
        <summary>查看可识别的订阅节点地区（{supportedNodeRegions.length} 项）</summary>
        <ul>
          {supportedNodeRegions.map((region) => <li key={region}>{region}</li>)}
        </ul>
      </details>
      <section className="settings-section regional-detection" aria-labelledby="regional-detection-heading">
        <h3 id="regional-detection-heading">识别与筛选</h3>
        <p>开启自动识别后，脚本会根据节点名称归类地区；高倍率过滤会跳过名称中标注为高倍率的节点。</p>
        <div className="option-grid">
          <Toggle label="自动识别地区节点" checked={draft.regionOptions.autoDetect} onChange={(enabled) => onDraftChange({ ...draft, regionOptions: { ...draft.regionOptions, autoDetect: enabled } })} />
          <Toggle label="过滤高倍率节点" checked={draft.regionOptions.excludeHighPercentage} onChange={(enabled) => onDraftChange({ ...draft, regionOptions: { ...draft.regionOptions, excludeHighPercentage: enabled } })} />
        </div>
      </section>
      <RuleOptionsSection draft={draft} groups={ruleOptionGroups.filter((group) => group.title === '地区网站')} onChange={onRuleOptionChange} />
    </div>
  )
}

interface CustomRulesSectionProps {
  mode: 'rules' | 'ruleSets'
  draft: GeneratorConfig
  customRuleName: string
  onCustomRuleNameChange: (value: string) => void
  onAdd: () => void
  onChange: (name: string, changes: Partial<CustomRule>) => void
  onDelete: (name: string) => void
  onDisableBuiltInRule: (name: string) => void
  onRestoreBuiltInRule: (name: string) => void
  customRuleSetName: string
  onCustomRuleSetNameChange: (value: string) => void
  onAddRuleSet: () => void
  onRuleSetChange: (name: string, changes: Partial<RuleSetConfig>) => void
  onDeleteRuleSet: (name: string) => void
  onRestoreBuiltInRuleSet: (name: string) => void
}

function CustomRulesSection({
  mode,
  draft,
  customRuleName,
  onCustomRuleNameChange,
  onAdd,
  onChange,
  onDelete,
  onDisableBuiltInRule,
  onRestoreBuiltInRule,
  customRuleSetName,
  onCustomRuleSetNameChange,
  onAddRuleSet,
  onRuleSetChange,
  onDeleteRuleSet,
  onRestoreBuiltInRuleSet,
}: CustomRulesSectionProps) {
  const rules = activeRules(draft)
  const ruleSets = activeRuleSets(draft)
  const disabledRules = (draft.removedBuiltInRules ?? []).filter((name) => builtInRuleNames.has(name))
  const disabledRuleSets = (draft.removedBuiltInRuleSets ?? []).filter((name) => builtInRuleSetNames.has(name))

  return (
    <section className="settings-section custom-rules" aria-labelledby="custom-rules-heading">
      <div className="section-heading"><div><h3 id="custom-rules-heading">{mode === 'rules' ? '规则' : '规则集'}</h3><p>变更会立即保存并更新预览。</p><p className="section-explanation">{mode === 'rules' ? '规则 = 匹配条件 + 目标策略。匹配到域名、关键词或进程后，流量会交给目标策略组。' : '规则集 = 可定时更新的外部匹配清单。它不决定目标策略，需要在规则的“规则集”字段中引用才会生效。'}</p></div></div>
      {mode === 'rules' && <section className="rule-management-group" aria-labelledby="rules-heading">
        <div className="rule-management-heading">
          <div><h4 id="rules-heading">规则</h4><p>内置规则可编辑或禁用；新增规则可随时删除。</p></div>
        </div>
      <div className="custom-rule-adder">
        <label><span>规则名称</span><input value={customRuleName} onChange={(event) => onCustomRuleNameChange(event.target.value)} placeholder="例如 gamingSites" /></label>
        <button className="button secondary" type="button" onClick={onAdd}>添加规则</button>
      </div>
      <div className="custom-rule-list">
        {Object.entries(rules).map(([name, rule]) => <CustomRuleEditor key={name} name={name} rule={rule} builtIn={builtInRuleNames.has(name)} onChange={(changes) => onChange(name, changes)} onDelete={() => onDelete(name)} onDisable={() => onDisableBuiltInRule(name)} />)}
        {disabledRules.length > 0 && (
          <div className="disabled-source-list" aria-label="已禁用内置规则">
            {disabledRules.map((name) => <button className="button secondary" type="button" key={name} onClick={() => onRestoreBuiltInRule(name)}>恢复内置规则 {name}</button>)}
          </div>
        )}
      </div>
      <p className="rule-set-hint">可用规则集：{Object.keys(ruleSets).length > 0 ? Object.keys(ruleSets).join('、') : '暂无'}</p>
      </section>}
      {mode === 'ruleSets' && <section className="rule-management-group" aria-labelledby="rule-sets-heading">
        <div className="rule-management-heading">
          <div><h4 id="rule-sets-heading">规则集</h4><p>规则集会生成对应的 `rule-providers`，规则可在“规则集”字段中引用它们。</p><p>行为决定规则集按域名或 IP 等方式解析；格式要与远端文件一致；更新周期单位为秒。</p></div>
        </div>
        <div className="custom-rule-adder">
          <label><span>规则集名称</span><input value={customRuleSetName} onChange={(event) => onCustomRuleSetNameChange(event.target.value)} placeholder="例如 gaming" /></label>
          <button className="button secondary" type="button" onClick={onAddRuleSet}>添加规则集</button>
        </div>
        <div className="custom-rule-list">
          {Object.entries(ruleSets).map(([name, ruleSet]) => <RuleSetEditor key={name} name={name} ruleSet={ruleSet} builtIn={builtInRuleSetNames.has(name)} onChange={(changes) => onRuleSetChange(name, changes)} onDelete={() => onDeleteRuleSet(name)} />)}
          {disabledRuleSets.length > 0 && (
            <div className="disabled-source-list" aria-label="已禁用内置规则集">
              {disabledRuleSets.map((name) => <button className="button secondary" type="button" key={name} onClick={() => onRestoreBuiltInRuleSet(name)}>恢复内置规则集 {name}</button>)}
            </div>
          )}
        </div>
      </section>}
    </section>
  )
}

interface PresetSectionProps {
  presets: GeneratorWorkspace['presets']
  presetName: string
  selectedPresetId: string
  onPresetNameChange: (value: string) => void
  onSelectedPresetChange: (value: string) => void
  onSave: () => void
  onLoad: () => void
  onDelete: () => void
}

function PresetSection({ presets, presetName, selectedPresetId, onPresetNameChange, onSelectedPresetChange, onSave, onLoad, onDelete }: PresetSectionProps) {
  return (
    <section className="settings-section presets" aria-labelledby="presets-heading">
      <h3 id="presets-heading">本地预设</h3>
      <div className="preset-editor"><label><span>预设名称</span><input value={presetName} onChange={(event) => onPresetNameChange(event.target.value)} /></label><button className="button secondary" type="button" onClick={onSave}>保存预设</button></div>
      <div className="preset-loader"><label><span>已保存预设</span><select value={selectedPresetId} onChange={(event) => onSelectedPresetChange(event.target.value)}><option value="">选择预设</option>{presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select></label><button className="button secondary" type="button" onClick={onLoad}>加载预设</button><button className="button danger" type="button" onClick={onDelete}>删除预设</button></div>
    </section>
  )
}

interface PreviewDrawerProps {
  script: string
  scriptSize: number
  minifiedStats: { size: number; reduction: number } | null
  previewStatus: string
  onClose: () => void
  onCopy: () => void
  onDownload: () => void
  onDownloadMinified: () => void
  isMinifying: boolean
}

function PreviewDrawer({ script, scriptSize, minifiedStats, previewStatus, onClose, onCopy, onDownload, onDownloadMinified, isMinifying }: PreviewDrawerProps) {
  return (
    <aside className="preview-panel" id="script-preview-drawer" aria-label="脚本预览" aria-modal="false">
      <div className="preview-header">
        <div><p className="eyebrow">OUTPUT</p><h2>global_script.js</h2></div>
        <div className="preview-header-meta"><button className="button secondary preview-close" type="button" aria-label="关闭预览" aria-expanded="true" aria-controls="script-preview-drawer" onClick={onClose}>关闭预览</button><span className={`file-status ${previewStatus === '预览中' ? 'pending' : ''}`}>{previewStatus}</span></div>
      </div>
      <div className="preview-actions"><button className="button secondary" type="button" onClick={onCopy}>复制预览脚本</button><button className="button secondary" type="button" onClick={onDownload}>下载预览脚本</button><button className="button secondary" type="button" disabled={isMinifying} onClick={onDownloadMinified}>{isMinifying ? '正在压缩...' : '下载预览压缩版'}</button></div>
      <div className="compression-summary" aria-label="脚本大小"><span>普通版 {formatBytes(scriptSize)}</span>{minifiedStats && <><span>压缩版 {formatBytes(minifiedStats.size)}</span><span>减少 {minifiedStats.reduction.toFixed(1)}%</span></>}</div>
      <pre className="script-preview" data-testid="script-preview"><code>{script}</code></pre>
    </aside>
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

interface CustomRuleEditorProps {
  name: string
  rule: CustomRule
  builtIn: boolean
  onChange: (changes: Partial<CustomRule>) => void
  onDelete: () => void
  onDisable: () => void
}

function CustomRuleEditor({ name, rule, builtIn, onChange, onDelete, onDisable }: CustomRuleEditorProps) {
  const [target, setTarget] = useState(rule.target)

  useEffect(() => {
    setTarget(rule.target)
  }, [rule.target])

  return (
    <article className="custom-rule-card">
      <div className="custom-rule-card-header">
        <div><h3>{name}</h3><span className="source-kind">{builtIn ? '内置规则' : '自定义规则'}</span></div>
        {builtIn ? (
          <button className="button danger" type="button" onClick={onDisable}>禁用内置规则 {name}</button>
        ) : (
          <button className="button danger" type="button" onClick={onDelete}>删除规则 {name}</button>
        )}
      </div>
      <details className="rule-editor-details" open={!builtIn || name === 'direct'}>
        <summary>编辑规则 {name}</summary>
        <div className="rule-editor-body">
          <label className="custom-rule-target">
            <span>规则目标 {name}</span>
            <input
              value={target}
              onChange={(event) => {
                const nextTarget = event.target.value
                setTarget(nextTarget)
                if (nextTarget.trim()) {
                  onChange({ target: nextTarget })
                }
              }}
            />
          </label>
          <label className="custom-rule-target-select">
            <span>常用策略组 {name}</span>
            <select
              value={customRuleTargetOptions.some((option) => option === rule.target)
                ? rule.target
                : customTargetValue}
              onChange={(event) => {
                if (event.target.value !== customTargetValue) {
                  onChange({ target: event.target.value })
                }
              }}
            >
              <option value={customTargetValue}>自定义目标</option>
              {customRuleTargetOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="custom-rule-fields">
            {customRuleListFields.map(([field, label]) => (
              <label key={field}>
                <span>{label} {name}</span>
                <textarea
                  value={formatLineList(rule[field])}
                  onChange={(event) => onChange({ [field]: parseLineList(event.target.value) })}
                  rows={3}
                />
              </label>
            ))}
          </div>
        </div>
      </details>
    </article>
  )
}

interface RuleSetEditorProps {
  name: string
  ruleSet: RuleSetConfig
  builtIn: boolean
  onChange: (changes: Partial<RuleSetConfig>) => void
  onDelete: () => void
}

function RuleSetEditor({ name, ruleSet, builtIn, onChange, onDelete }: RuleSetEditorProps) {
  const [url, setUrl] = useState(ruleSet.url)
  const [path, setPath] = useState(ruleSet.path)
  const [interval, setInterval] = useState(String(ruleSet.interval))

  useEffect(() => {
    setUrl(ruleSet.url)
    setPath(ruleSet.path)
    setInterval(String(ruleSet.interval))
  }, [ruleSet.interval, ruleSet.path, ruleSet.url])

  return (
    <article className="custom-rule-card rule-set-card">
      <div className="custom-rule-card-header">
        <div><h3>{name}</h3><span className="source-kind">{builtIn ? '内置规则集' : '自定义规则集'}</span></div>
        <button className="button danger" type="button" onClick={onDelete}>{builtIn ? `禁用内置规则集 ${name}` : `删除规则集 ${name}`}</button>
      </div>
      <div className="rule-set-fields">
        <label><span>规则集行为 {name}</span><select value={ruleSet.behavior} onChange={(event) => { if (isRuleSetBehavior(event.target.value)) onChange({ behavior: event.target.value }) }}><option value="classical">classical</option><option value="domain">domain</option><option value="ipcidr">ipcidr</option></select></label>
        <label><span>规则集格式 {name}</span><select value={ruleSet.format} onChange={(event) => { if (isRuleSetFormat(event.target.value)) onChange({ format: event.target.value }) }}><option value="text">text</option><option value="mrs">mrs</option><option value="yaml">yaml</option></select></label>
        <label><span>更新周期（秒） {name}</span><input type="number" min="1" value={interval} onChange={(event) => { const value = event.target.value; setInterval(value); const next = Number(value); if (Number.isFinite(next) && next > 0) onChange({ interval: next }) }} /></label>
        <label><span>规则集地址 {name}</span><input value={url} onChange={(event) => { const value = event.target.value; setUrl(value); if (value.trim()) onChange({ url: value }) }} /></label>
        <label className="rule-set-path"><span>规则集路径 {name}</span><input value={path} onChange={(event) => { const value = event.target.value; setPath(value); if (value.trim()) onChange({ path: value }) }} /></label>
      </div>
    </article>
  )
}

export default App
