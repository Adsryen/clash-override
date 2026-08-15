import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/clash-override/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('loads the production build and edits a custom rule', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Clash Override' })).toBeVisible()

  await page.getByRole('textbox', { name: '规则名称' }).fill('russiaSites')
  await page.getByRole('button', { name: '添加规则' }).click()
  await page
    .getByRole('combobox', { name: '常用策略组 russiaSites' })
    .selectOption('俄罗斯网站')

  await expect(page.getByRole('textbox', { name: '规则目标 russiaSites' })).toHaveValue(
    '俄罗斯网站',
  )
  await expect(page.getByTestId('script-preview')).toContainText('"target":"俄罗斯网站"')
})

test('restores the rule after a reload and downloads one script file', async ({ page }) => {
  await page.getByRole('textbox', { name: '规则名称' }).fill('localSites')
  await page.getByRole('button', { name: '添加规则' }).click()
  await page.getByRole('textbox', { name: '域名后缀 localSites' }).fill('example.com')

  await page.reload()

  await expect(page.getByRole('textbox', { name: '域名后缀 localSites' })).toHaveValue(
    'example.com',
  )
  await expect(page.getByTestId('script-preview')).toContainText('example.com')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载脚本' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('global_script.js')
})

test('imports a generated script and restores its custom rule', async ({ page }) => {
  await page.getByRole('textbox', { name: '规则名称' }).fill('importedSites')
  await page.getByRole('button', { name: '添加规则' }).click()
  await page.getByRole('textbox', { name: '域名后缀 importedSites' }).fill('example.org')

  const generatedScript = await page.getByTestId('script-preview').textContent()
  expect(generatedScript).not.toBeNull()

  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByText('暂未添加自定义规则。')).toBeVisible()

  await page.getByLabel('导入生成器脚本').setInputFiles({
    name: 'global_script.js',
    mimeType: 'text/javascript',
    buffer: Buffer.from(generatedScript ?? ''),
  })

  await expect(page.getByRole('status')).toHaveText('已导入 global_script.js')
  await expect(page.getByRole('textbox', { name: '域名后缀 importedSites' })).toHaveValue(
    'example.org',
  )
})

test('exports and imports a configuration file', async ({ page }) => {
  const appleToggle = page.getByRole('checkbox', { name: 'Apple' })
  await appleToggle.uncheck()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出配置' }).click()
  const download = await downloadPromise
  const configPath = await download.path()

  expect(download.suggestedFilename()).toBe('clash-override-config.json')
  expect(configPath).not.toBeNull()

  await appleToggle.check()
  await expect(appleToggle).toBeChecked()

  await page.getByLabel('导入配置').setInputFiles(configPath ?? '')

  await expect(page.getByRole('status')).toHaveText(/^已导入配置 /)
  await expect(appleToggle).not.toBeChecked()
})

test('downloads a compressed script that can be imported again', async ({ page }) => {
  const youtubeToggle = page.getByRole('checkbox', { name: 'YouTube' })
  await youtubeToggle.uncheck()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载压缩版' }).click()
  const download = await downloadPromise
  const minifiedScriptPath = await download.path()

  expect(download.suggestedFilename()).toBe('global_script.min.js')
  expect(minifiedScriptPath).not.toBeNull()

  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(youtubeToggle).toBeChecked()

  await page.getByLabel('导入生成器脚本').setInputFiles(minifiedScriptPath ?? '')

  await expect(page.getByRole('status')).toHaveText(/^已导入 /)
  await expect(youtubeToggle).not.toBeChecked()
})
