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

    const youtube = screen.getByRole('checkbox', { name: 'YouTube' })
    expect(youtube).toBeChecked()

    await user.click(youtube)

    expect(youtube).not.toBeChecked()
    expect(screen.getByTestId('script-preview')).toHaveTextContent('"youtube":false')
  })

  it('restores the saved draft after remounting', async () => {
    const user = userEvent.setup()
    const firstRender = render(<App />)

    await user.click(screen.getByRole('checkbox', { name: 'YouTube' }))
    firstRender.unmount()
    render(<App />)

    expect(screen.getByRole('checkbox', { name: 'YouTube' })).not.toBeChecked()
  })

  it('imports a generator script and rejects unrelated JavaScript', async () => {
    const importedConfig = {
      ...defaultGeneratorConfig,
      ruleOptions: { ...defaultGeneratorConfig.ruleOptions, youtube: false },
    }
    render(<App />)

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

  it('saves and reloads a named preset', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('checkbox', { name: 'YouTube' }))
    await user.type(screen.getByLabelText('预设名称'), 'No YouTube')
    await user.click(screen.getByRole('button', { name: '保存预设' }))
    await user.click(screen.getByRole('checkbox', { name: 'YouTube' }))
    await user.selectOptions(screen.getByLabelText('已保存预设'), 'No YouTube')
    await user.click(screen.getByRole('button', { name: '加载预设' }))

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
})
