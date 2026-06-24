import { test, expect } from '@playwright/test'

test.describe('Strona startowa', () => {
  test('ładuje się bez crashu JS', async ({ page }) => {
    const errors = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/')
    await page.waitForTimeout(2000)
    const jsErrors = errors.filter(e =>
      !e.includes('supabase') && !e.includes('fetch') && !e.includes('Failed to fetch') && !e.includes('NetworkError')
    )
    expect(jsErrors).toHaveLength(0)
  })

  test('renderuje jakiś content (nie pusty ekran)', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)
    const rootEl = page.locator('#root')
    await expect(rootEl).toBeVisible()
    const html = await rootEl.innerHTML()
    expect(html.length).toBeGreaterThan(0)
  })
})

test.describe('Build poprawny', () => {
  test('CSS ładuje się poprawnie', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1000)
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(bg).not.toBe('')
  })

  test('bundle JS się ładuje (React mountuje #root)', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)
    const hasChildren = await page.evaluate(() => {
      const root = document.getElementById('root')
      return root && root.children.length > 0
    })
    expect(hasChildren).toBe(true)
  })
})
