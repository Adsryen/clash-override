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
