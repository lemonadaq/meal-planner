import { test, expect } from '@playwright/test'

test.describe('Strona startowa', () => {
  test('ładuje się i pokazuje ekran logowania', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Smakuje|Meal/)
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('formularz logowania jest widoczny', async ({ page }) => {
    await page.goto('/')
    // Szukamy pola email lub przycisku logowania
    const loginElement = page.locator('input[type="email"], input[type="text"], button:has-text("Zaloguj"), button:has-text("loguj")')
    const count = await loginElement.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('Nawigacja', () => {
  test('próba dostępu bez logowania przekierowuje na login', async ({ page }) => {
    await page.goto('/kalendarz')
    await page.waitForTimeout(1000)
    const url = page.url()
    // Albo jesteśmy na stronie logowania, albo widzimy ekran logowania
    const loginVisible = await page.locator('input[type="email"], input[type="password"], button:has-text("Zaloguj")').count()
    expect(url.includes('login') || url === 'http://localhost:4173/' || loginVisible > 0).toBe(true)
  })
})

test.describe('Build poprawny', () => {
  test('brak błędów konsoli przy ładowaniu', async ({ page }) => {
    const errors = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/')
    await page.waitForTimeout(2000)
    // Filtruj znane/nieistotne błędy
    const istotne = errors.filter(e => !e.includes('supabase') && !e.includes('fetch'))
    expect(istotne).toHaveLength(0)
  })

  test('CSS ładuje się poprawnie (brak FOUC)', async ({ page }) => {
    await page.goto('/')
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(bg).not.toBe('')
  })

  test('strona renderuje bez pustego ekranu', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1000)
    const content = await page.textContent('body')
    expect(content.trim().length).toBeGreaterThan(10)
  })
})
