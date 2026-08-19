import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/clash-override/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('loads the workbench and manages a built-in source rule', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Clash Override' })).toBeVisible()
  await expect(page.getByRole('button', { name: '脚本内容' })).toHaveCount(0)
  await page.getByRole('button', { name: '规则', exact: true }).click()
  await page.getByRole('button', { name: '打开脚本预览' }).click()

  const directTarget = page.getByRole('textbox', { name: '规则目标 direct' })
  await expect(directTarget).toHaveValue('DIRECT')
  await directTarget.fill('自定义直连')
  await expect(page.getByTestId('script-preview')).toContainText('"target":"自定义直连"')

  await page.getByRole('button', { name: '禁用内置规则 downloadApps' }).click()
  await expect(page.getByRole('button', { name: '恢复内置规则 downloadApps' })).toBeVisible()
  await page.screenshot({ path: '../.github/screenshots/generator-desktop.png', fullPage: true })
})

test('adds a source rule set and links it from a rule', async ({ page }) => {
  await page.getByRole('button', { name: '规则集', exact: true }).click()
  await page.getByRole('button', { name: '打开脚本预览' }).click()
  await page.getByRole('textbox', { name: '规则集名称' }).fill('gaming')
  await page.getByRole('button', { name: '添加规则集' }).click()
  await page.getByRole('textbox', { name: '规则集地址 gaming' }).fill('https://example.com/gaming.list')
  await page.getByRole('button', { name: '规则', exact: true }).click()
  await page.getByRole('textbox', { name: '规则名称' }).fill('gamingSites')
  await page.getByRole('button', { name: '添加规则', exact: true }).click()
  await page.getByRole('textbox', { name: '规则集 gamingSites' }).fill('gaming')

  await expect(page.getByTestId('script-preview')).toContainText('https://example.com/gaming.list')
  await expect(page.getByTestId('script-preview')).toContainText('"ruleSets":["gaming"]')
})

test('keeps source rule changes after a reload and downloads a script', async ({ page }) => {
  await page.getByRole('button', { name: '规则', exact: true }).click()
  await page.getByRole('textbox', { name: '规则名称' }).fill('localSites')
  await page.getByRole('button', { name: '添加规则', exact: true }).click()
  await page.getByRole('textbox', { name: '域名后缀 localSites' }).fill('example.com')
  await page.reload()
  await page.getByRole('button', { name: '规则', exact: true }).click()
  await page.getByRole('button', { name: '打开脚本预览' }).click()
  await expect(page.getByRole('textbox', { name: '域名后缀 localSites' })).toHaveValue('example.com')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载预览脚本' }).click()
  expect((await downloadPromise).suggestedFilename()).toBe('global_script.js')
})

test('imports and exports configuration files', async ({ page }) => {
  await page.getByRole('button', { name: '站点分流' }).click()
  const appleToggle = page.getByRole('checkbox', { name: 'Apple' })
  await appleToggle.uncheck()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '文件操作' }).click()
  await page.getByRole('menuitem', { name: '导出配置' }).click()
  const download = await downloadPromise
  const configPath = await download.path()

  await appleToggle.check()
  await page.getByLabel('导入配置').setInputFiles(configPath ?? '')
  await expect(appleToggle).not.toBeChecked()
})

test('keeps the preview fixed and uses a themed scrollbar', async ({ page }) => {
  await page.getByRole('button', { name: '打开脚本预览' }).click()
  const metrics = await page.getByTestId('script-preview').evaluate((element) => {
    const styles = getComputedStyle(element)
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollbarColor: styles.scrollbarColor,
      scrollbarWidth: styles.scrollbarWidth,
    }
  })

  expect(metrics.clientHeight).toBeLessThanOrEqual(724)
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight)
  expect(metrics.scrollbarColor).not.toBe('auto')
  expect(metrics.scrollbarWidth).toBe('thin')
})

test('keeps the source rule management view usable on mobile without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.getByRole('combobox', { name: '切换配置分组' }).selectOption('rules')
  await expect(page.getByRole('heading', { name: '规则', level: 3 })).toBeVisible()
  await page.getByRole('button', { name: '打开脚本预览' }).click()
  await expect(page.getByTestId('script-preview')).toBeVisible()

  const metrics = await page.evaluate(() => ({ viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }))
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewport)
  await page.screenshot({ path: '../.github/screenshots/generator-mobile.png', fullPage: true })
})
