import { expect, test } from '@playwright/test';

test.describe('auth smoke', () => {
  test('shows the login page', async ({ page }) => {
    await page.goto('/auth/login');

    await expect(page.getByRole('heading', { name: 'Scrim Analyzer' })).toBeVisible();
    await expect(page.getByText('ご利用にはGoogleアカウントが必要です')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Googleでログイン' })).toBeVisible();
  });

  test('redirects protected routes to login', async ({ page }) => {
    await page.goto('/team');

    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.getByRole('button', { name: 'Googleでログイン' })).toBeVisible();
  });
});
