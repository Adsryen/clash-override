import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import {
  cloneGeneratorConfig,
  defaultGeneratorConfig,
  defaultScriptContentOverrides,
  isProxyGroupConfig,
  isRuleProviderConfig,
  type CustomRule,
  type GeneratorConfig,
  type ProxyGroupConfig,
  type RuleProviderConfig,
  type RuleOptionKey,
} from './domain/config'
import { parseConfigFile, serializeConfigFile } from './domain/config-file'
import { minifyGeneratedScript } from './domain/minify'
import { inspectGeneratedContent, parseGeneratedScript, renderScript, type GeneratedContent } from './domain/script'
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

type WorkbenchSection = 'overview' | 'runtime' | 'sites' | 'regions' | 'custom' | 'content' | 'presets'

interface WorkbenchSectionDefinition {
  id: WorkbenchSection
  label: string
  description: string
}

const workbenchSections: WorkbenchSectionDefinition[] = [
  { id: 'overview', label: '概览', description: '查看配置摘要和生成状态' },
  { id: 'runtime', label: '运行方式', description: '控制覆写、测速和节点筛选' },
  { id: 'sites', label: '站点分流', description: '选择需要覆写的服务和平台' },
  { id: 'regions', label: '地区节点', description: '配置地区站点和节点规则' },
  { id: 'custom', label: '自定义规则', description: '追加自己的域名和进程规则' },
  { id: 'content', label: '脚本内容', description: '查看和编辑当前生成结果' },
  { id: 'presets', label: '本地预设', description: '保存和迁移本地配置' },
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
  '默认节点',
  '下载软件',
  '国内网站',
  '其他外网',
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

const reservedCustomRuleNames = new Set([
  'direct',
  'defaultProxy',
  'downloadApps',
  'japanSites',
  'hkSites',
  'usSites',
])

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

type ContentCategory = 'all' | 'rules' | 'ruleProviders' | 'proxyGroups'

function isContentCategory(value: string): value is ContentCategory {
  return value === 'all' || value === 'rules' || value === 'ruleProviders' || value === 'proxyGroups'
}

interface ContentEntry {
  category: Exclude<ContentCategory, 'all'>
  label: string
  title: string
  summary: string
  value: string
}

const ruleProviderTemplate = JSON.stringify({
  'example-provider': {
    type: 'http',
    behavior: 'domain',
    format: 'text',
    interval: 86400,
    url: 'https://example.com/rules.list',
    path: './ruleset/example-provider.list',
  },
}, null, 2)

const proxyGroupTemplate = JSON.stringify({
  name: '示例策略组',
  type: 'select',
  proxies: ['DIRECT'],
}, null, 2)

function cloneContentOverrides(config: GeneratorConfig) {
  const source = config.contentOverrides ?? defaultScriptContentOverrides
  return {
    rules: { remove: [...source.rules.remove], add: [...source.rules.add] },
    ruleProviders: {
      remove: [...source.ruleProviders.remove],
      add: Object.fromEntries(
        Object.entries(source.ruleProviders.add).map(([name, provider]) => [name, { ...provider }]),
      ),
    },
    proxyGroups: {
      remove: [...source.proxyGroups.remove],
      add: source.proxyGroups.add.map((group) => ({ ...group, proxies: [...group.proxies] })),
    },
  }
}

function contentEntries(content: GeneratedContent): ContentEntry[] {
  return [
    ...content.rules.map((rule) => {
      const [kind, ...parts] = rule.split(',')
      const target = parts.pop() ?? ''
      const match = parts.join(',')
      return {
        category: 'rules' as const,
        label: rule,
        title: match ? `${kind} · ${match}` : kind,
        summary: `目标：${target}`,
        value: rule,
      }
    }),
    ...Object.entries(content.ruleProviders).map(([name, provider]) => ({
      category: 'ruleProviders' as const,
      label: name,
      title: name,
      summary: `${provider.type} · ${provider.behavior}/${provider.format}`,
      value: JSON.stringify(provider),
    })),
    ...content.proxyGroups.map((group) => ({
      category: 'proxyGroups' as const,
      label: group.name,
      title: group.name,
      summary: `${group.type} · ${group.proxies.length} 个代理`,
      value: JSON.stringify(group),
    })),
  ]
}

function App() {
  const [workspace, setWorkspace] = useState<GeneratorWorkspace>(() => loadWorkspace())
  const [presetName, setPresetName] = useState('')
  const [customRuleName, setCustomRuleName] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isMinifying, setIsMinifying] = useState(false)
  const [activeSection, setActiveSection] = useState<WorkbenchSection>('overview')
  const [isPreviewOpen, setIsPreviewOpen] = useState(true)
  const [contentSearch, setContentSearch] = useState('')
  const [contentCategory, setContentCategory] = useState<ContentCategory>('all')
  const [newContentRule, setNewContentRule] = useState('')
  const [newRuleProviderJson, setNewRuleProviderJson] = useState('')
  const [newProxyGroupJson, setNewProxyGroupJson] = useState('')
  const [minifiedStats, setMinifiedStats] = useState<{
    size: number
    reduction: number
  } | null>(null)
  const script = useMemo(() => renderScript(workspace.draft), [workspace.draft])
  const generatedContent = useMemo(() => inspectGeneratedContent(workspace.draft), [workspace.draft])
  const filteredContent = useMemo(() => {
    const query = contentSearch.trim().toLocaleLowerCase()
    return contentEntries(generatedContent).filter((entry) => {
      if (contentCategory !== 'all' && entry.category !== contentCategory) return false
      if (!query) return true
      const categoryLabel = entry.category === 'rules'
        ? '规则'
        : entry.category === 'ruleProviders' ? '规则提供者' : '策略组'
      return `${categoryLabel} ${entry.label} ${entry.value}`.toLocaleLowerCase().includes(query)
    })
  }, [contentCategory, contentSearch, generatedContent])
  const scriptSize = useMemo(() => new Blob([script]).size, [script])
  const enabledRuleCount = useMemo(
    () => Object.values(workspace.draft.ruleOptions).filter(Boolean).length,
    [workspace.draft.ruleOptions],
  )
  const customRuleCount = Object.keys(workspace.draft.customRules ?? {}).length
  const activeSectionDefinition = workbenchSections.find(({ id }) => id === activeSection)

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
    const customRules = workspace.draft.customRules ?? {}
    const currentRule = customRules[name]
    if (!currentRule) return

    updateDraft({
      ...workspace.draft,
      customRules: {
        ...customRules,
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
    if (reservedCustomRuleNames.has(normalizedName)) {
      setError('规则名称与内置规则冲突，请更换名称')
      return
    }
    if (workspace.draft.customRules?.[normalizedName]) {
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

  const updateContentOverrides = (contentOverrides: GeneratorConfig['contentOverrides']) => {
    updateDraft({ ...workspace.draft, contentOverrides })
  }

  const handleDeleteContent = (entry: ContentEntry) => {
    const overrides = cloneContentOverrides(workspace.draft)
    if (entry.category === 'rules') {
      overrides.rules.add = overrides.rules.add.filter((rule) => rule !== entry.value)
      if (!overrides.rules.remove.includes(entry.value)) overrides.rules.remove.push(entry.value)
    } else if (entry.category === 'ruleProviders') {
      delete overrides.ruleProviders.add[entry.label]
      if (!overrides.ruleProviders.remove.includes(entry.label)) overrides.ruleProviders.remove.push(entry.label)
    } else {
      overrides.proxyGroups.add = overrides.proxyGroups.add.filter((group) => group.name !== entry.label)
      if (!overrides.proxyGroups.remove.includes(entry.label)) overrides.proxyGroups.remove.push(entry.label)
    }
    updateContentOverrides(overrides)
    setNotice(`已删除脚本${entry.category === 'rules' ? '规则' : entry.category === 'ruleProviders' ? '提供者' : '策略组'} ${entry.label}`)
  }

  const handleAddContentRule = () => {
    const rule = newContentRule.trim()
    if (!rule) {
      setError('规则内容不能为空')
      return
    }
    const overrides = cloneContentOverrides(workspace.draft)
    if (overrides.rules.add.includes(rule)) {
      setError('规则内容已存在')
      return
    }
    overrides.rules.add.push(rule)
    overrides.rules.remove = overrides.rules.remove.filter((item) => item !== rule)
    updateContentOverrides(overrides)
    setNewContentRule('')
    setNotice(`已添加脚本规则 ${rule}`)
  }

  const handleAddRuleProvider = () => {
    let parsed: unknown
    try {
      parsed = JSON.parse(newRuleProviderJson)
    } catch {
      setError('规则提供者必须是有效 JSON')
      return
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      setError('规则提供者 JSON 必须是名称到配置的对象')
      return
    }
    const entries = Object.entries(parsed)
    if (entries.length === 0) {
      setError('规则提供者 JSON 结构无效')
      return
    }
    const validProviders: Record<string, RuleProviderConfig> = {}
    for (const [name, provider] of entries) {
      if (!isRuleProviderConfig(provider)) {
        setError('规则提供者 JSON 结构无效')
        return
      }
      validProviders[name] = provider
    }
    const overrides = cloneContentOverrides(workspace.draft)
    for (const [name, provider] of Object.entries(validProviders)) {
      overrides.ruleProviders.add[name] = provider
      overrides.ruleProviders.remove = overrides.ruleProviders.remove.filter((item) => item !== name)
    }
    updateContentOverrides(overrides)
    setNewRuleProviderJson('')
    setNotice(`已添加 ${entries.length} 个规则提供者`)
  }

  const handleAddProxyGroup = () => {
    let parsed: unknown
    try {
      parsed = JSON.parse(newProxyGroupJson)
    } catch {
      setError('策略组必须是有效 JSON')
      return
    }
    const parsedGroups: ProxyGroupConfig[] = []
    if (Array.isArray(parsed)) {
      for (const group of parsed) {
        if (!isProxyGroupConfig(group)) {
          setError('策略组 JSON 结构无效')
          return
        }
        parsedGroups.push(group)
      }
    } else if (isProxyGroupConfig(parsed)) {
      parsedGroups.push(parsed)
    } else {
      setError('策略组 JSON 结构无效')
      return
    }
    if (parsedGroups.length === 0) {
      setError('策略组 JSON 结构无效')
      return
    }
    const overrides = cloneContentOverrides(workspace.draft)
    const names = new Set(parsedGroups.map((group) => group.name))
    overrides.proxyGroups.add = overrides.proxyGroups.add.filter((group) => !names.has(group.name))
    overrides.proxyGroups.add.push(...parsedGroups)
    overrides.proxyGroups.remove = overrides.proxyGroups.remove.filter((name) => !names.has(name))
    updateContentOverrides(overrides)
    setNewProxyGroupJson('')
    setNotice(`已添加 ${parsedGroups.length} 个策略组`)
  }

  const handleFillProviderTemplate = () => {
    setNewRuleProviderJson(ruleProviderTemplate)
    setError(null)
    setNotice('已填入规则提供者模板，请按需修改后添加')
  }

  const handleFillProxyGroupTemplate = () => {
    setNewProxyGroupJson(proxyGroupTemplate)
    setError(null)
    setNotice('已填入策略组模板，请按需修改后添加')
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
            customRuleCount={customRuleCount}
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
            onChange={updateRuleOption}
          />
        )
      case 'custom':
        return (
          <CustomRulesSection
            draft={workspace.draft}
            customRuleName={customRuleName}
            onCustomRuleNameChange={setCustomRuleName}
            onAdd={handleAddCustomRule}
            onChange={updateCustomRule}
            onDelete={handleDeleteCustomRule}
          />
        )
      case 'content':
        return (
          <ScriptContentSection
            entries={filteredContent}
            search={contentSearch}
            category={contentCategory}
            newRule={newContentRule}
            providerJson={newRuleProviderJson}
            proxyGroupJson={newProxyGroupJson}
            onSearchChange={setContentSearch}
            onCategoryChange={setContentCategory}
            onRuleChange={setNewContentRule}
            onProviderJsonChange={setNewRuleProviderJson}
            onProxyGroupJsonChange={setNewProxyGroupJson}
            onDelete={handleDeleteContent}
            onAddRule={handleAddContentRule}
            onAddProvider={handleAddRuleProvider}
            onAddProxyGroup={handleAddProxyGroup}
            onFillProviderTemplate={handleFillProviderTemplate}
            onFillProxyGroupTemplate={handleFillProxyGroupTemplate}
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
          </div>
        </div>
        <div className="topbar-actions">
          <button className="button secondary" type="button" onClick={handleReset}>
            恢复默认
          </button>
          <label className="button secondary file-button" htmlFor="config-import">
            导入配置
            <input
              id="config-import"
              aria-label="导入配置"
              type="file"
              accept=".json,application/json"
              onChange={handleConfigImport}
            />
          </label>
          <button className="button secondary" type="button" onClick={handleConfigExport}>
            导出配置
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
        <WorkbenchSidebar activeSection={activeSection} onChange={setActiveSection} />
        <section className="settings-panel" aria-label="脚本配置">
          <div className="section-header">
            <div>
              <p className="eyebrow">CONFIGURATION</p>
              <h2>{activeSectionDefinition?.label}</h2>
              <p>{activeSectionDefinition?.description}</p>
            </div>
            <span className="draft-status">草稿已保存</span>
          </div>
          {renderSection()}
        </section>
        {isPreviewOpen && (
          <PreviewDrawer
            script={script}
            scriptSize={scriptSize}
            minifiedStats={minifiedStats}
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
  onChange: (section: WorkbenchSection) => void
}

function WorkbenchSidebar({ activeSection, onChange }: WorkbenchSidebarProps) {
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
            <span>{section.label}</span>
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
        <div className="summary-item"><strong>{enabledRuleCount}</strong><span>启用规则</span></div>
        <div className="summary-item"><strong>{customRuleCount}</strong><span>自定义规则</span></div>
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
        <Toggle label="地区自动识别" checked={draft.regionOptions.autoDetect} onChange={(enabled) => onChange({ ...draft, regionOptions: { ...draft.regionOptions, autoDetect: enabled } })} />
        <Toggle label="过滤高倍率节点" checked={draft.regionOptions.excludeHighPercentage} onChange={(enabled) => onChange({ ...draft, regionOptions: { ...draft.regionOptions, excludeHighPercentage: enabled } })} />
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

function RegionsSection({ draft, onChange }: SitesSectionProps) {
  return <RuleOptionsSection draft={draft} groups={ruleOptionGroups.filter((group) => group.title === '地区网站')} onChange={onChange} />
}

interface CustomRulesSectionProps {
  draft: GeneratorConfig
  customRuleName: string
  onCustomRuleNameChange: (value: string) => void
  onAdd: () => void
  onChange: (name: string, changes: Partial<CustomRule>) => void
  onDelete: (name: string) => void
}

function CustomRulesSection({ draft, customRuleName, onCustomRuleNameChange, onAdd, onChange, onDelete }: CustomRulesSectionProps) {
  return (
    <section className="settings-section custom-rules" aria-labelledby="custom-rules-heading">
      <div className="section-heading"><div><h3 id="custom-rules-heading">自定义规则</h3><p>每行填写一项，生成脚本时会追加到内置规则。</p></div></div>
      <div className="custom-rule-adder">
        <label><span>规则名称</span><input value={customRuleName} onChange={(event) => onCustomRuleNameChange(event.target.value)} placeholder="例如 gamingSites" /></label>
        <button className="button secondary" type="button" onClick={onAdd}>添加规则</button>
      </div>
      <div className="custom-rule-list">
        {Object.entries(draft.customRules ?? {}).map(([name, rule]) => <CustomRuleEditor key={name} name={name} rule={rule} onChange={(changes) => onChange(name, changes)} onDelete={() => onDelete(name)} />)}
        {Object.keys(draft.customRules ?? {}).length === 0 && <p className="empty-state">暂未添加自定义规则。</p>}
      </div>
    </section>
  )
}

interface ScriptContentSectionProps {
  entries: ContentEntry[]
  search: string
  category: ContentCategory
  newRule: string
  providerJson: string
  proxyGroupJson: string
  onSearchChange: (value: string) => void
  onCategoryChange: (value: ContentCategory) => void
  onRuleChange: (value: string) => void
  onProviderJsonChange: (value: string) => void
  onProxyGroupJsonChange: (value: string) => void
  onDelete: (entry: ContentEntry) => void
  onAddRule: () => void
  onAddProvider: () => void
  onAddProxyGroup: () => void
  onFillProviderTemplate: () => void
  onFillProxyGroupTemplate: () => void
}

function ScriptContentSection({
  entries,
  search,
  category,
  newRule,
  providerJson,
  proxyGroupJson,
  onSearchChange,
  onCategoryChange,
  onRuleChange,
  onProviderJsonChange,
  onProxyGroupJsonChange,
  onDelete,
  onAddRule,
  onAddProvider,
  onAddProxyGroup,
  onFillProviderTemplate,
  onFillProxyGroupTemplate,
}: ScriptContentSectionProps) {
  return (
    <section className="settings-section script-content" aria-labelledby="script-content-heading">
      <div className="section-heading">
        <div>
          <h3 id="script-content-heading">脚本内容</h3>
          <p>目录来自当前生成结果；编辑会同步保存到配置和脚本预览。</p>
        </div>
      </div>
      <div className="content-toolbar">
        <label>
          <span>搜索脚本内容</span>
          <input
            type="search"
            role="searchbox"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <label>
          <span>内容类别</span>
          <select value={category} onChange={(event) => {
            if (isContentCategory(event.target.value)) onCategoryChange(event.target.value)
          }}>
            <option value="all">全部</option>
            <option value="rules">规则</option>
            <option value="ruleProviders">规则提供者</option>
            <option value="proxyGroups">策略组</option>
          </select>
        </label>
        <span className="content-result-count" aria-live="polite">匹配 {entries.length} 项</span>
      </div>
      <div className="content-list" aria-label="脚本内容条目">
        {entries.map((entry, index) => (
          <article className="content-entry" key={`${entry.category}:${entry.label}:${index}`}>
            <div className="content-entry-header">
              <div className="content-entry-title">
                <span className="content-entry-kind">
                  {entry.category === 'rules' ? '规则' : entry.category === 'ruleProviders' ? '规则提供者' : '策略组'}
                </span>
                <strong>{entry.title}</strong>
                <span className="content-entry-summary">{entry.summary}</span>
              </div>
              <button
                className="button danger content-delete"
                type="button"
                aria-label={`删除${entry.category === 'rules' ? '规则' : entry.category === 'ruleProviders' ? '提供者' : '策略组'} ${entry.label}`}
                onClick={() => onDelete(entry)}
              >
                删除
              </button>
            </div>
            <details className="content-entry-details">
              <summary>查看完整内容</summary>
              <pre className="content-entry-value">{entry.value}</pre>
            </details>
          </article>
        ))}
        {entries.length === 0 && <p className="empty-state">没有匹配的脚本内容。</p>}
      </div>
      <div className="content-adders">
        <div className="content-adder">
          <label>
            <span>新增规则</span>
            <input value={newRule} onChange={(event) => onRuleChange(event.target.value)} />
          </label>
          <button className="button secondary" type="button" onClick={onAddRule}>添加脚本规则</button>
        </div>
        <div className="content-adder">
          <label>
            <span>新增规则提供者 JSON</span>
            <textarea value={providerJson} onChange={(event) => onProviderJsonChange(event.target.value)} rows={5} />
          </label>
          <div className="content-adder-actions">
            <button className="button secondary" type="button" onClick={onFillProviderTemplate}>填入规则提供者模板</button>
            <button className="button secondary" type="button" onClick={onAddProvider}>添加规则提供者</button>
          </div>
        </div>
        <div className="content-adder">
          <label>
            <span>新增策略组 JSON</span>
            <textarea value={proxyGroupJson} onChange={(event) => onProxyGroupJsonChange(event.target.value)} rows={5} />
          </label>
          <div className="content-adder-actions">
            <button className="button secondary" type="button" onClick={onFillProxyGroupTemplate}>填入策略组模板</button>
            <button className="button secondary" type="button" onClick={onAddProxyGroup}>添加策略组</button>
          </div>
        </div>
      </div>
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
  onClose: () => void
  onCopy: () => void
  onDownload: () => void
  onDownloadMinified: () => void
  isMinifying: boolean
}

function PreviewDrawer({ script, scriptSize, minifiedStats, onClose, onCopy, onDownload, onDownloadMinified, isMinifying }: PreviewDrawerProps) {
  return (
    <aside className="preview-panel" id="script-preview-drawer" aria-label="脚本预览" aria-modal="false">
      <div className="preview-header">
        <div><p className="eyebrow">OUTPUT</p><h2>global_script.js</h2></div>
        <div className="preview-header-meta"><button className="button secondary preview-close" type="button" aria-label="关闭预览面板" aria-expanded="true" aria-controls="script-preview-drawer" onClick={onClose}>关闭</button><span className="file-status">已生成</span></div>
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
  onChange: (changes: Partial<CustomRule>) => void
  onDelete: () => void
}

function CustomRuleEditor({ name, rule, onChange, onDelete }: CustomRuleEditorProps) {
  const [target, setTarget] = useState(rule.target)

  useEffect(() => {
    setTarget(rule.target)
  }, [rule.target])

  return (
    <article className="custom-rule-card">
      <div className="custom-rule-card-header">
        <h3>{name}</h3>
        <button className="button danger" type="button" onClick={onDelete}>
          删除规则 {name}
        </button>
      </div>
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
    </article>
  )
}

export default App
