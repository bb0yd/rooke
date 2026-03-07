import { test, expect } from '@playwright/test';

// These tests verify that main pages load when accessed directly.
// Since the app requires authentication, unauthenticated requests redirect
// to /login. We test the login page's navigation links and verify the
// redirect behavior for protected pages.

test.describe('Navigation', () => {
  test('login page renders the Rooke logo', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('img[alt="Rooke"]')).toBeVisible();
  });

  test('protected pages redirect to login when unauthenticated', async ({ page }) => {
    const protectedRoutes = [
      '/learn',
      '/puzzles',
      '/explore',
      '/multiplayer',
      '/settings',
      '/history',
      '/stats',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, {
        timeout: 10_000,
      });
    }
  });

  test('login page contains navigation link to register', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('a[href="/register"]')).toBeVisible();
  });

  test('register page contains navigation link to login', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });
});
