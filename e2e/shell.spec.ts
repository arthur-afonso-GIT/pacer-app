import { expect, test } from '@playwright/test'

test('redirects an unauthenticated visitor to the authentication flow', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/entrar$/)
  await expect(
    page.getByRole('heading', { name: 'Entre no seu ritmo' }),
  ).toBeVisible()
  await expect(page.getByLabel('E-mail')).toBeVisible()
  await expect(page.getByLabel('Senha')).toBeVisible()
})
