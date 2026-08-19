import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { defaultGeneratorConfig } from './domain/config'
import { serializeConfigFile } from './domain/config-file'
import { renderScript } from './domain/script'
import { generatorWorkspaceStorageKey } from './domain/storage'

const createObjectUrl = vi.fn(() => 'blob:generated-script')
const revokeObjectUrl = vi.fn()
const anchorClick = vi.fn()

function createTextFile(source: string, name: string): File {
  const file = new File([source], name, { type: 'text/javascript' })
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(source) })
  return file
}

function openPreview() {
  fireEvent.click(screen.getByRole('button', { name: '打开脚本预览' }))
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    createObjectUrl.mockClear()
    revokeObjectUrl.mockClear()
    anchorClick.mockClear()
    Object.assign(URL, { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(anchorClick)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('links back to the source repository and star page', () => {
    render(<App />)

    const repositoryUrl = 'https://github.com/Adsryen/clash-override'
    expect(screen.getByRole('link', { name: '查看 GitHub 仓库' })).toHaveAttribute('href', repositoryUrl)
    expect(screen.getByRole('link', { name: '给项目点 Star' })).toHaveAttribute('href', repositoryUrl)
    expect(screen.getByRole('link', { name: '欢迎提交 PR，一起改进这个项目' })).toHaveAttribute(
      'href',
      `${repositoryUrl}/pulls`,
    )
  })

  it('uses accurate labels for source rule counts and origins', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('启用分流项')).toBeVisible()
    expect(screen.queryByText('启用规则')).not.toBeInTheDocument()
    expect(screen.getByText('规则总数')).toBeVisible()
    expect(screen.queryByText('自定义规则')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^规则$/ }))
    expect(screen.getAllByText('内置规则').length).toBeGreaterThan(0)
    await user.type(screen.getByRole('textbox', { name: '规则名称' }), 'localSites')
    await user.click(screen.getByRole('button', { name: '添加规则' }))
    expect(screen.getByText('自定义规则')).toBeVisible()
  })

  it('updates the generated preview when a service switch changes', async () => {
    const user = userEvent.setup()
    render(<App />)
    openPreview()

    await user.click(screen.getByRole('button', { name: '站点分流' }))
    await user.click(screen.getByRole('checkbox', { name: 'YouTube' }))

    expect(screen.getByTestId('script-preview')).toHaveTextContent('"youtube":false')
  })

  it('imports a generator script and rejects unrelated JavaScript', async () => {
    render(<App />)
    openPreview()
    const input = screen.getByLabelText('导入生成器脚本')
    const importedConfig = {
      ...defaultGeneratorConfig,
      ruleOptions: { ...defaultGeneratorConfig.ruleOptions, youtube: false },
    }

    fireEvent.change(input, { target: { files: [createTextFile(renderScript(importedConfig), 'global_script.js')] } })
    await waitFor(() => expect(screen.getByTestId('script-preview')).toHaveTextContent('"youtube":false'))

    fireEvent.change(input, { target: { files: [createTextFile('const enable = true', 'manual.js')] } })
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('not created by this generator'))
  })

  it('imports a configuration file and restores the selected options', async () => {
    render(<App />)
    openPreview()
    const input = screen.getByLabelText('导入配置')
    const config = {
      ...defaultGeneratorConfig,
      ruleOptions: { ...defaultGeneratorConfig.ruleOptions, youtube: false },
    }

    fireEvent.change(input, { target: { files: [createTextFile(serializeConfigFile(config), 'config.json')] } })
    await waitFor(() => expect(screen.getByTestId('script-preview')).toHaveTextContent('"youtube":false'))
  })

  it('adds and removes a user rule from the generated configuration', async () => {
    const user = userEvent.setup()
    render(<App />)
    openPreview()

    await user.click(screen.getByRole('button', { name: /^规则$/ }))
    await user.type(screen.getByRole('textbox', { name: '规则名称' }), 'gamingSites')
    await user.click(screen.getByRole('button', { name: '添加规则' }))
    await user.type(screen.getByRole('textbox', { name: '域名后缀 gamingSites' }), 'example.com')

    expect(screen.getByTestId('script-preview')).toHaveTextContent('"gamingSites"')
    expect(screen.getByTestId('script-preview')).toHaveTextContent('example.com')

    await user.click(screen.getByRole('button', { name: '删除规则 gamingSites' }))
    expect(screen.getByTestId('script-preview')).not.toHaveTextContent('"gamingSites"')
  })

  it('manages built-in rules and rule sets from source configuration', async () => {
    const user = userEvent.setup()
    render(<App />)
    openPreview()

    expect(screen.queryByRole('button', { name: '脚本内容' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^规则$/ }))

    expect(screen.getByRole('textbox', { name: '规则目标 direct' })).toHaveValue('DIRECT')
    await user.click(screen.getByRole('button', { name: /^规则集$/ }))
    expect(screen.getByRole('textbox', { name: '规则集地址 applications' })).toHaveValue(
      'https://fastly.jsdelivr.net/gh/DustinWin/ruleset_geodata@clash-ruleset/applications.list',
    )

    await user.click(screen.getByRole('button', { name: /^规则$/ }))

    await user.clear(screen.getByRole('textbox', { name: '规则目标 direct' }))
    await user.type(screen.getByRole('textbox', { name: '规则目标 direct' }), '自定义直连')
    expect(screen.getByTestId('script-preview')).toHaveTextContent('"target":"自定义直连"')

    await user.click(screen.getByRole('button', { name: '禁用内置规则 downloadApps' }))
    expect(screen.getByRole('button', { name: '恢复内置规则 downloadApps' })).toBeVisible()
    expect(screen.getByTestId('script-preview')).toHaveTextContent('"removedBuiltInRules":["downloadApps"]')

    await user.click(screen.getByRole('button', { name: '恢复内置规则 downloadApps' }))
    expect(screen.getByRole('button', { name: '禁用内置规则 downloadApps' })).toBeVisible()
  })

  it('adds a rule set and exposes it for rule references', async () => {
    const user = userEvent.setup()
    render(<App />)
    openPreview()

    await user.click(screen.getByRole('button', { name: /^规则集$/ }))
    await user.type(screen.getByRole('textbox', { name: '规则集名称' }), 'gaming')
    await user.click(screen.getByRole('button', { name: '添加规则集' }))
    await user.clear(screen.getByRole('textbox', { name: '规则集地址 gaming' }))
    await user.type(screen.getByRole('textbox', { name: '规则集地址 gaming' }), 'https://example.com/gaming.list')
    expect(screen.getByRole('textbox', { name: '规则集地址 gaming' })).toHaveValue('https://example.com/gaming.list')
    await user.click(screen.getByRole('button', { name: /^规则$/ }))
    await user.type(screen.getByRole('textbox', { name: '规则名称' }), 'gamingSites')
    await user.click(screen.getByRole('button', { name: '添加规则' }))
    await user.type(screen.getByRole('textbox', { name: '规则集 gamingSites' }), 'gaming')

    expect(screen.getByText('可用规则集：applications、gaming')).toBeVisible()
    expect(screen.getByTestId('script-preview')).toHaveTextContent('https://example.com/gaming.list')
    expect(screen.getByTestId('script-preview')).toHaveTextContent('"ruleSets":["gaming"]')
  })

  it('separates rule and rule-set workspaces in the desktop navigation', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.queryByRole('button', { name: '规则管理' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^规则$/ }))
    expect(screen.getByRole('heading', { name: '规则', level: 2 })).toBeVisible()
    expect(screen.getByRole('textbox', { name: '规则名称' })).toBeVisible()
    expect(screen.getAllByRole('option', { name: '直连' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('option', { name: '其他节点' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('textbox', { name: '规则集名称' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^规则集$/ }))
    expect(screen.getByRole('heading', { name: '规则集', level: 2 })).toBeVisible()
    expect(screen.getByRole('textbox', { name: '规则集名称' })).toBeVisible()
    expect(screen.getByText('行为决定规则集按域名或 IP 等方式解析；格式要与远端文件一致；更新周期单位为秒。')).toBeVisible()
    expect(screen.queryByRole('textbox', { name: '规则名称' })).not.toBeInTheDocument()
  })

  it('explains each workspace and the relationship between rules and rule sets', async () => {
    const user = userEvent.setup()
    render(<App />)

    const navigation = within(screen.getByRole('navigation', { name: '配置分组' }))
    expect(navigation.getByText('查看当前开关、规则数量和脚本大小')).toBeVisible()
    expect(navigation.getByText('控制脚本开关、自动测速和 DNS 覆写')).toBeVisible()
    expect(navigation.getByText('按服务开关生成对应的代理策略组')).toBeVisible()
    expect(navigation.getByText('选择地区站点，并决定如何识别订阅节点')).toBeVisible()
    expect(navigation.getByText('设置域名、关键词、进程等匹配条件，以及命中后的目标策略')).toBeVisible()
    expect(navigation.getByText('配置外部规则列表的地址和更新方式，再在规则中引用')).toBeVisible()
    expect(navigation.getByText('保存当前配置，之后可以快速加载或删除')).toBeVisible()

    await user.click(screen.getByRole('button', { name: /^规则$/ }))
    expect(screen.getByText('规则 = 匹配条件 + 目标策略。匹配到域名、关键词或进程后，流量会交给目标策略组。')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /^规则集$/ }))
    expect(screen.getByText('规则集 = 可定时更新的外部匹配清单。它不决定目标策略，需要在规则的“规则集”字段中引用才会生效。')).toBeVisible()
  })

  it('groups region controls with region preferences and shows section counts in navigation', async () => {
    const user = userEvent.setup()
    render(<App />)

    const navigation = within(screen.getByRole('navigation', { name: '配置分组' }))
    expect(navigation.getByRole('button', { name: '站点分流' })).toHaveTextContent('11')
    expect(navigation.getByRole('button', { name: '地区偏好' })).toHaveTextContent('4')

    await user.click(screen.getByRole('button', { name: '运行方式' }))
    expect(screen.queryByRole('checkbox', { name: '自动识别地区节点' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: '过滤高倍率节点' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '地区偏好' }))
    expect(screen.getByText('节点来自订阅；这里决定哪些地区网站生成专用策略组，以及如何识别和筛选地区节点。')).toBeVisible()
    expect(screen.getByText('地区网站分流目前提供日本、香港、美国、俄罗斯 4 项开关。节点识别表由脚本内置规则维护，下面只展示当前可识别的订阅节点地区，不编辑识别词或倍率上限。')).toBeVisible()
    await user.click(screen.getByText('查看可识别的订阅节点地区（20 项）'))
    expect(screen.getByText('HK香港')).toBeVisible()
    expect(screen.getByText('AR阿根廷')).toBeVisible()
    expect(screen.getByRole('checkbox', { name: '自动识别地区节点' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: '过滤高倍率节点' })).toBeChecked()

    openPreview()
    await user.click(screen.getByRole('checkbox', { name: '自动识别地区节点' }))
    expect(screen.getByTestId('script-preview')).toHaveTextContent('"autoDetect":false')
  })

  it('preserves legacy content overrides while hiding their editor', () => {
    const draft = {
      ...defaultGeneratorConfig,
      contentOverrides: {
        rules: { add: ['DOMAIN-SUFFIX,legacy.example,DIRECT'], remove: [] },
        ruleProviders: { add: {}, remove: [] },
        proxyGroups: { add: [], remove: [] },
      },
    }
    localStorage.setItem(generatorWorkspaceStorageKey, JSON.stringify({ version: 1, draft, recentScript: null, presets: [] }))
    render(<App />)
    openPreview()

    expect(screen.getByTestId('script-preview')).toHaveTextContent('legacy.example')
    expect(screen.queryByRole('button', { name: '脚本内容' })).not.toBeInTheDocument()
    expect(screen.queryByText('内容变更')).not.toBeInTheDocument()
  })

  it('saves and reloads a named preset', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '站点分流' }))
    await user.click(screen.getByRole('checkbox', { name: 'YouTube' }))
    await user.click(screen.getByRole('button', { name: '本地预设' }))
    await user.type(screen.getByLabelText('预设名称'), 'No YouTube')
    await user.click(screen.getByRole('button', { name: '保存预设' }))
    await user.click(screen.getByRole('button', { name: '站点分流' }))
    await user.click(screen.getByRole('checkbox', { name: 'YouTube' }))
    await user.click(screen.getByRole('button', { name: '本地预设' }))
    await user.selectOptions(screen.getByLabelText('已保存预设'), 'No YouTube')
    await user.click(screen.getByRole('button', { name: '加载预设' }))
    await user.click(screen.getByRole('button', { name: '站点分流' }))

    expect(screen.getByRole('checkbox', { name: 'YouTube' })).not.toBeChecked()
  })

  it('copies, downloads, and compresses the current generated script', async () => {
    const user = userEvent.setup()
    const clipboardWriteText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    render(<App />)
    openPreview()

    await user.click(screen.getByRole('button', { name: '复制预览脚本' }))
    await user.click(screen.getByRole('button', { name: '下载预览脚本' }))
    await user.click(screen.getByRole('button', { name: '下载预览压缩版' }))

    await waitFor(() => expect(anchorClick).toHaveBeenCalledTimes(2))
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining('@clash-override-generator:'))
    expect(screen.getByTestId('compression-summary')).toHaveTextContent('压缩版')
  })

  it('opens and closes the script preview drawer', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '打开脚本预览' }))
    expect(screen.getByTestId('script-preview')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '关闭预览' }))
    expect(screen.queryByTestId('script-preview')).not.toBeInTheDocument()
  })

  it('starts with the script preview closed', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.queryByTestId('script-preview')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '打开脚本预览' }))
    expect(screen.getByTestId('script-preview')).toBeVisible()
  })

  it('closes the preview from the close preview button', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '打开脚本预览' }))
    await user.click(screen.getByRole('button', { name: '关闭预览' }))

    expect(screen.queryByTestId('script-preview')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打开脚本预览' })).toBeVisible()
  })

  it('uses the rules view from the mobile configuration selector', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(screen.getByRole('combobox', { name: '切换配置分组' }), 'rules')
    expect(screen.getByRole('heading', { name: '规则', level: 3 })).toBeVisible()
  })
})
