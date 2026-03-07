import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page loads with form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h2')).toHaveText('Log In');
    await expect(page.locator('input[placeholder="Username"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText('Log In');
  });

  test('register page loads with form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h2')).toHaveText('Create Account');
    await expect(page.locator('input[placeholder="Username (3+ characters)"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Password (4+ characters)"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText('Register');
  });

  test('login page has link to register', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.locator('a[href="/register"]');
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveText('Register');
  });

  test('register page has link to login', async ({ page }) => {
    await page.goto('/register');
    const loginLink = page.locator('a[href="/login"]');
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveText('Log In');
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[placeholder="Username"]').fill('nonexistentuser');
    await page.locator('input[placeholder="Password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.auth-error')).toBeVisible({ timeout: 10_000 });
  });

  test('unauthenticated user is redirected to login', async ({ page }) => {
    // Attempting to visit a protected page without a token should redirect to /login
    await page.goto('/puzzles');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user is redirected from settings', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/);
  });
});
