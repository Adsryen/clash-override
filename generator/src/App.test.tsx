import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  Object.defineProperty(file, 'text', {
    value: () => Promise.resolve(source),
  })
  return file
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    createObjectUrl.mockClear()
    revokeObjectUrl.mockClear()
    anchorClick.mockClear()
    Object.assign(URL, {
      createObjectURL: createObjectUrl,
      revokeObjectURL: revokeObjectUrl,
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(anchorClick)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('links back to the source repository and star page', () => {
    render(<App />)

    const repositoryUrl = 'https://github.com/Adsryen/clash-override'
    expect(screen.getByRole('link', { name: '查看 GitHub 仓库' })).toHaveAttribute(
      'href',
      repositoryUrl,
    )
    expect(screen.getByRole('link', { name: '给项目点 Star' })).toHaveAttribute(
      'href',
      repositoryUrl,
    )
  })

  it('updates the generated preview when a service switch changes', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '站点分流' }))
    const youtube = screen.getByRole('checkbox', { name: 'YouTube' })
    expect(youtube).toBeChecked()

    await user.click(youtube)

    expect(youtube).not.toBeChecked()
    expect(screen.getByTestId('script-preview')).toHaveTextContent('"youtube":false')
  })

  it('restores the saved draft after remounting', async () => {
    const user = userEvent.setup()
    const firstRender = render(<App />)

    await user.click(screen.getByRole('button', { name: '站点分流' }))
    await user.click(screen.getByRole('checkbox', { name: 'YouTube' }))
    firstRender.unmount()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '站点分流' }))
    expect(screen.getByRole('checkbox', { name: 'YouTube' })).not.toBeChecked()
  })

  it('imports a generator script and rejects unrelated JavaScript', async () => {
    const importedConfig = {
      ...defaultGeneratorConfig,
      ruleOptions: { ...defaultGeneratorConfig.ruleOptions, youtube: false },
    }
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '站点分流' }))
    const importInput = screen.getByLabelText('导入生成器脚本')
    fireEvent.change(importInput, {
      target: {
        files: [
          createTextFile(renderScript(importedConfig), 'global_script.js'),
        ],
      },
    })

    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'YouTube' })).not.toBeChecked(),
    )

    fireEvent.change(importInput, {
      target: {
        files: [createTextFile('const enable = true', 'manual.js')],
      },
    })

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('not created by this generator'),
    )
  })

  it('imports a configuration file and restores the selected options', async () => {
    const importedConfig = {
      ...defaultGeneratorConfig,
      ruleOptions: { ...defaultGeneratorConfig.ruleOptions, youtube: false },
    }
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '站点分流' }))
    fireEvent.change(screen.getByLabelText('导入配置'), {
      target: {
        files: [createTextFile(serializeConfigFile(importedConfig), 'config.json')],
      },
    })

    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'YouTube' })).not.toBeChecked(),
    )
    expect(screen.getByRole('status')).toHaveTextContent('已导入配置 config.json')
  })

  it('restores the default configuration after confirmation', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)

    await user.click(screen.getByRole('button', { name: '站点分流' }))
    await user.click(screen.getByRole('checkbox', { name: 'YouTube' }))
    await user.click(screen.getByRole('button', { name: '恢复默认' }))

    expect(screen.getByRole('checkbox', { name: 'YouTube' })).toBeChecked()
    expect(window.confirm).toHaveBeenCalledOnce()
  })

  it('exports the current configuration as a JSON file', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '文件操作' }))
    await user.click(screen.getByRole('menuitem', { name: '导出配置' }))

    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob))
    expect(anchorClick).toHaveBeenCalledOnce()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:generated-script')
  })

  it('groups file operations behind an accessible menu', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.queryByRole('button', { name: '导出配置' })).not.toBeInTheDocument()
    const fileMenu = screen.getByRole('button', { name: '文件操作' })
    expect(fileMenu).toHaveAttribute('aria-expanded', 'false')

    await user.click(fileMenu)
    expect(fileMenu).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menuitem', { name: '导入配置' })).toBeVisible()
    expect(screen.getByRole('menuitem', { name: '导入脚本' })).toBeVisible()
    expect(screen.getByRole('menuitem', { name: '导出配置' })).toBeVisible()
  })

  it('adds and removes a custom rule from the generated configuration', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '自定义规则' }))

    await user.type(screen.getByRole('textbox', { name: '规则名称' }), 'gamingSites')
    await user.click(screen.getByRole('button', { name: '添加规则' }))
    await user.clear(screen.getByRole('textbox', { name: '规则目标 gamingSites' }))
    await user.type(screen.getByRole('textbox', { name: '规则目标 gamingSites' }), 'DIRECT')
    await user.type(
      screen.getByRole('textbox', { name: '域名后缀 gamingSites' }),
      'example.com',
    )

    expect(screen.getByTestId('script-preview')).toHaveTextContent('"gamingSites"')
    expect(screen.getByTestId('script-preview')).toHaveTextContent('example.com')

    await user.click(screen.getByRole('button', { name: '删除规则 gamingSites' }))

    expect(screen.getByTestId('script-preview')).not.toHaveTextContent('"gamingSites"')
  })

  it('selects a built-in strategy group for a custom rule', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '自定义规则' }))

    await user.type(screen.getByRole('textbox', { name: '规则名称' }), 'russiaSites')
    await user.click(screen.getByRole('button', { name: '添加规则' }))
    await user.selectOptions(
      screen.getByRole('combobox', { name: '常用策略组 russiaSites' }),
      '俄罗斯网站',
    )

    expect(screen.getByRole('textbox', { name: '规则目标 russiaSites' })).toHaveValue('俄罗斯网站')
    expect(screen.getByTestId('script-preview')).toHaveTextContent('"target":"俄罗斯网站"')
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

  it('copies and downloads the current generated script', async () => {
    const user = userEvent.setup()
    const clipboardWriteText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)
    render(<App />)

    await user.click(screen.getByRole('button', { name: '复制预览脚本' }))
    await user.click(screen.getByRole('button', { name: '下载预览脚本' }))

    expect(clipboardWriteText).toHaveBeenCalledWith(
      expect.stringContaining('@clash-override-generator:'),
    )
    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob))
    expect(anchorClick).toHaveBeenCalledOnce()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:generated-script')
  })

  it('switches configuration groups without changing the draft', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '站点分流' }))
    const youtube = screen.getByRole('checkbox', { name: 'YouTube' })
    await user.click(youtube)

    await user.click(screen.getByRole('button', { name: '运行方式' }))
    expect(screen.getByRole('checkbox', { name: '启用覆写' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: '站点分流' }))

    expect(screen.getByRole('checkbox', { name: 'YouTube' })).not.toBeChecked()
  })

  it('opens and closes the script preview drawer', async () => {
    const user = userEvent.setup()
    render(<App />)

    const openButton = screen.getByRole('button', { name: '收起脚本预览' })
    expect(openButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('script-preview')).toBeVisible()

    await user.click(openButton)
    expect(screen.getByRole('button', { name: '打开脚本预览' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.queryByTestId('script-preview')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '打开脚本预览' }))
    expect(screen.getByRole('button', { name: '收起脚本预览' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('hides the content change summary when no overrides exist', () => {
    render(<App />)

    expect(screen.queryByRole('heading', { name: '内容变更' })).not.toBeInTheDocument()
    expect(screen.queryByText('未修改内置脚本内容')).not.toBeInTheDocument()
    expect(screen.queryByText('新增 1 项')).not.toBeInTheDocument()
    expect(screen.queryByText('移除 1 项')).not.toBeInTheDocument()
  })

  it('summarizes added and removed script content by category in the preview', async () => {
    const draft = {
      ...defaultGeneratorConfig,
      contentOverrides: {
        rules: {
          add: ['DOMAIN-SUFFIX,added.example,DIRECT'],
          remove: ['GEOSITE,removed,REJECT'],
        },
        ruleProviders: {
          add: {
            'added-provider': {
              type: 'http' as const,
              behavior: 'domain' as const,
              format: 'text' as const,
              interval: 86400,
              url: 'https://example.com/added.list',
              path: './ruleset/added.list',
            },
          },
          remove: ['removed-provider'],
        },
        proxyGroups: {
          add: [{ name: '新增策略组', type: 'select' as const, proxies: ['DIRECT'] }],
          remove: ['移除策略组'],
        },
      },
    }
    localStorage.setItem(generatorWorkspaceStorageKey, JSON.stringify({
      version: 1,
      draft,
      recentScript: null,
      presets: [],
    }))
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('规则')).toBeVisible()
    expect(screen.getByText('规则提供者')).toBeVisible()
    expect(screen.getByText('策略组')).toBeVisible()
    expect(screen.getAllByText('新增 1 项')).toHaveLength(3)
    expect(screen.getAllByText('移除 1 项')).toHaveLength(3)

    await user.click(screen.getAllByText('查看明细')[0])
    expect(screen.getByText('DOMAIN-SUFFIX,added.example,DIRECT')).toBeVisible()
    expect(screen.getByText('GEOSITE,removed,REJECT')).toBeVisible()

    await user.click(screen.getAllByText('查看明细')[1])
    expect(screen.getByText('added-provider')).toBeVisible()
    expect(screen.getByText('removed-provider')).toBeVisible()

    await user.click(screen.getAllByText('查看明细')[2])
    expect(screen.getByText('新增策略组')).toBeVisible()
    expect(screen.getByText('移除策略组')).toBeVisible()
  })

  it('searches and removes generated script content', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '脚本内容' }))
    const search = screen.getByRole('searchbox', { name: '搜索脚本内容' })
    await user.type(search, '谷歌服务')

    expect(screen.getByText(/^匹配 \d+ 项$/)).toBeVisible()
    await user.click(screen.getAllByText('查看完整内容')[0])
    expect(screen.getAllByText('GEOSITE,google,谷歌服务')[0]).toBeVisible()
    expect(screen.queryByText('GEOSITE,apple-cn,苹果服务')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '删除规则 GEOSITE,google,谷歌服务' }))

    expect(screen.queryByRole('button', { name: '删除规则 GEOSITE,google,谷歌服务' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('已删除脚本规则')
  })

  it('separates content browsing from adding and can clear the search', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '脚本内容' }))
    expect(screen.getByRole('button', { name: '添加内容' })).toBeVisible()
    expect(screen.getByRole('searchbox', { name: '搜索脚本内容' })).toBeVisible()
    expect(screen.queryByRole('textbox', { name: '新增规则' })).not.toBeInTheDocument()

    const search = screen.getByRole('searchbox', { name: '搜索脚本内容' })
    await user.type(search, '谷歌服务')
    await user.click(screen.getByRole('button', { name: '清除搜索' }))
    expect(search).toHaveValue('')

    await user.click(screen.getByRole('button', { name: '添加内容' }))
    expect(screen.getByRole('button', { name: '浏览内容' })).toBeVisible()
    expect(screen.getByRole('textbox', { name: '新增规则' })).toBeVisible()
    await user.type(screen.getByRole('textbox', { name: '新增规则' }), 'DOMAIN-SUFFIX,mode.example,DIRECT')
    expect(screen.getByTestId('script-preview')).toHaveTextContent('DOMAIN-SUFFIX,mode.example,DIRECT')
  })

  it('previews content edits immediately while saving only after submission', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '脚本内容' }))
    await user.click(screen.getByRole('button', { name: '添加内容' }))

    const workspaceBeforeEdit = localStorage.getItem(generatorWorkspaceStorageKey)
    await user.type(screen.getByRole('textbox', { name: '新增规则' }), 'DOMAIN-SUFFIX,live.example,DIRECT')
    expect(screen.getByTestId('script-preview')).toHaveTextContent('DOMAIN-SUFFIX,live.example,DIRECT')
    expect(localStorage.getItem(generatorWorkspaceStorageKey)).toBe(workspaceBeforeEdit)

    await user.click(screen.getByRole('button', { name: '规则提供者' }))
    await user.click(screen.getByRole('button', { name: '填入规则提供者模板' }))
    const providerInput = screen.getByRole('textbox', { name: '新增规则提供者 JSON' })
    expect(providerInput).toHaveDisplayValue(/example-provider/)
    expect(screen.getByTestId('script-preview')).toHaveTextContent('example-provider')

    await user.click(screen.getByRole('button', { name: '添加规则提供者' }))
    expect(screen.getByTestId('script-preview')).toHaveTextContent('example-provider')

    await user.click(screen.getByRole('button', { name: '策略组' }))
    await user.click(screen.getByRole('button', { name: '填入策略组模板' }))
    expect(screen.getByRole('textbox', { name: '新增策略组 JSON' })).toHaveDisplayValue(/示例策略组/)
    expect(screen.getByTestId('script-preview')).toHaveTextContent('示例策略组')
  })

  it('labels temporary content edits as preview-only', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('已保存')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '脚本内容' }))
    await user.click(screen.getByRole('button', { name: '添加内容' }))
    await user.type(screen.getByRole('textbox', { name: '新增规则' }), 'DOMAIN-SUFFIX,pending.example,DIRECT')

    expect(screen.getByText('预览中有未提交编辑')).toBeVisible()
    expect(screen.queryByText('已保存')).not.toBeInTheDocument()
  })

  it('clears compressed statistics when the preview script changes', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '下载预览压缩版' }))
    await waitFor(() => expect(screen.getByTestId('compression-summary')).toHaveTextContent('压缩版'))

    await user.click(screen.getByRole('button', { name: '脚本内容' }))
    await user.click(screen.getByRole('button', { name: '添加内容' }))
    await user.type(screen.getByRole('textbox', { name: '新增规则' }), 'DOMAIN-SUFFIX,changed.example,DIRECT')

    expect(screen.getByTestId('compression-summary')).not.toHaveTextContent('压缩版')
    expect(screen.getByTestId('compression-summary')).not.toHaveTextContent('减少')
  })

  it('undoes a deleted generated content entry', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '脚本内容' }))
    const deleteButton = screen.getByRole('button', { name: '删除规则 GEOSITE,google,谷歌服务' })
    await user.click(deleteButton)
    expect(screen.queryByRole('button', { name: '删除规则 GEOSITE,google,谷歌服务' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '撤销删除' }))
    expect(screen.getByRole('button', { name: '删除规则 GEOSITE,google,谷歌服务' })).toBeVisible()
  })

  it('keeps invalid live JSON out of the preview and draft', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '脚本内容' }))
    await user.click(screen.getByRole('button', { name: '添加内容' }))
    await user.click(screen.getByRole('button', { name: '规则提供者' }))
    const workspaceBeforeEdit = localStorage.getItem(generatorWorkspaceStorageKey)
    fireEvent.change(screen.getByRole('textbox', { name: '新增规则提供者 JSON' }), {
      target: { value: '{"broken":' },
    })

    expect(screen.getByTestId('script-preview')).not.toHaveTextContent('broken')
    expect(localStorage.getItem(generatorWorkspaceStorageKey)).toBe(workspaceBeforeEdit)
  })

  it('shows provider validation beside the invalid JSON input', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '脚本内容' }))
    await user.click(screen.getByRole('button', { name: '添加内容' }))
    await user.click(screen.getByRole('button', { name: '规则提供者' }))
    const providerInput = screen.getByRole('textbox', { name: '新增规则提供者 JSON' })
    fireEvent.change(providerInput, { target: { value: '{' } })
    await user.click(screen.getByRole('button', { name: '添加规则提供者' }))

    expect(providerInput).toHaveAttribute('aria-invalid', 'true')
    expect(providerInput).toHaveAttribute('aria-describedby', 'content-add-error-ruleProvider')
    expect(screen.getAllByText('规则提供者 JSON 结构无效')).toHaveLength(2)
    expect(screen.getByRole('alert')).toHaveTextContent('规则提供者 JSON 结构无效')
  })

  it('uses a discoverable mobile configuration selector and keeps script commands in preview', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.queryByRole('button', { name: '复制脚本' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '复制预览脚本' })).toBeInTheDocument()

    const sectionSelect = screen.getByRole('combobox', { name: '切换配置分组' })
    await user.selectOptions(sectionSelect, 'content')
    expect(screen.getAllByRole('heading', { name: '脚本内容' })[0]).toBeVisible()
  })

  it('adds a rule, provider, and proxy group with validation and persists them', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '脚本内容' }))
    await user.click(screen.getByRole('button', { name: '添加内容' }))
    await user.type(screen.getByRole('textbox', { name: '新增规则' }), 'DOMAIN-SUFFIX,custom.example,DIRECT')
    await user.click(screen.getByRole('button', { name: '添加脚本规则' }))
    expect(screen.getByTestId('script-preview')).toHaveTextContent('DOMAIN-SUFFIX,custom.example,DIRECT')

    await user.click(screen.getByRole('button', { name: '规则提供者' }))
    fireEvent.change(screen.getByRole('textbox', { name: '新增规则提供者 JSON' }), {
      target: { value: '{"custom":{"type":"http","behavior":"domain","format":"text","interval":86400,"url":"https://example.com/rules.list","path":"./ruleset/custom.list"}}' },
    })
    await user.click(screen.getByRole('button', { name: '添加规则提供者' }))
    expect(screen.getByTestId('script-preview')).toHaveTextContent('custom.list')

    await user.click(screen.getByRole('button', { name: '策略组' }))
    fireEvent.change(screen.getByRole('textbox', { name: '新增策略组 JSON' }), {
      target: { value: '{"name":"自定义策略","type":"select","proxies":["DIRECT"]}' },
    })
    await user.click(screen.getByRole('button', { name: '添加策略组' }))
    expect(screen.getByTestId('script-preview')).toHaveTextContent('自定义策略')

    const firstRender = screen.getByRole('button', { name: '脚本内容' })
    expect(firstRender).toBeVisible()
    cleanup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '脚本内容' }))
    expect(screen.getByText('DOMAIN-SUFFIX · custom.example')).toBeVisible()
    expect(screen.getByRole('button', { name: '删除策略组 自定义策略' })).toBeVisible()
  })

  it('downloads a compressed generated script', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '下载预览压缩版' }))

    await waitFor(() => expect(anchorClick).toHaveBeenCalledOnce())
    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob))
    expect(screen.getByRole('status')).toHaveTextContent('压缩脚本已下载')
    expect(screen.getByTestId('compression-summary')).toHaveTextContent('普通版')
    expect(screen.getByTestId('compression-summary')).toHaveTextContent('压缩版')
    expect(screen.getByTestId('compression-summary')).toHaveTextContent('减少')
  })
})
