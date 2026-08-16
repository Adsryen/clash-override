import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { defaultGeneratorConfig } from './domain/config'
import { serializeConfigFile } from './domain/config-file'
import { renderScript } from './domain/script'

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
    await user.click(screen.getByRole('button', { name: '打开脚本预览' }))
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

    await user.click(screen.getByRole('button', { name: '导出配置' }))

    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob))
    expect(anchorClick).toHaveBeenCalledOnce()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:generated-script')
  })

  it('adds and removes a custom rule from the generated configuration', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '自定义规则' }))
    await user.click(screen.getByRole('button', { name: '打开脚本预览' }))

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
    await user.click(screen.getByRole('button', { name: '打开脚本预览' }))

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

    await user.click(screen.getByRole('button', { name: '复制脚本' }))
    await user.click(screen.getByRole('button', { name: '下载脚本' }))

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

    const openButton = screen.getByRole('button', { name: '打开脚本预览' })
    expect(openButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('script-preview')).not.toBeInTheDocument()

    await user.click(openButton)
    expect(screen.getByRole('button', { name: '收起脚本预览' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByTestId('script-preview')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '收起脚本预览' }))
    expect(screen.getByRole('button', { name: '打开脚本预览' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('downloads a compressed generated script', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '打开脚本预览' }))
    await user.click(screen.getByRole('button', { name: '下载压缩版' }))

    await waitFor(() => expect(anchorClick).toHaveBeenCalledOnce())
    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob))
    expect(screen.getByRole('status')).toHaveTextContent('压缩脚本已下载')
    expect(screen.getByTestId('compression-summary')).toHaveTextContent('普通版')
    expect(screen.getByTestId('compression-summary')).toHaveTextContent('压缩版')
    expect(screen.getByTestId('compression-summary')).toHaveTextContent('减少')
  })
})
