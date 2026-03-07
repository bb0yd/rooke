import { test, expect } from '@playwright/test';

// These tests require an authenticated session. If the app is running without
// a valid auth cookie the middleware will redirect to /login, so the tests
// check for that and skip gracefully.

test.describe('Puzzles page', () => {
  test('puzzles page loads (or redirects to login)', async ({ page }) => {
    await page.goto('/puzzles');

    // If we are redirected to login, the page requires auth -- that is expected.
    if (page.url().includes('/login')) {
      test.skip(true, 'Skipping: authentication required');
      return;
    }

    // If we reach the puzzles page, verify key elements exist.
    await expect(page.locator('h2, [class*="puzzleTitle"]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('puzzles page has a chess board when authenticated', async ({ page }) => {
    await page.goto('/puzzles');

    if (page.url().includes('/login')) {
      test.skip(true, 'Skipping: authentication required');
      return;
    }

    // The ChessBoard component renders a board container
    await expect(page.locator('[class*="board"], [class*="Board"], canvas, svg').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('puzzles page has difficulty filter buttons when authenticated', async ({ page }) => {
    await page.goto('/puzzles');

    if (page.url().includes('/login')) {
      test.skip(true, 'Skipping: authentication required');
      return;
    }

    // Difficulty buttons: All, Easy, Medium, Hard
    await expect(page.getByRole('button', { name: 'All' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Easy' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Medium' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hard' })).toBeVisible();
  });

  test('puzzles page has Puzzle Rush button when authenticated', async ({ page }) => {
    await page.goto('/puzzles');

    if (page.url().includes('/login')) {
      test.skip(true, 'Skipping: authentication required');
      return;
    }

    await expect(page.getByRole('button', { name: /Puzzle Rush/ })).toBeVisible();
  });

  test('puzzles page has Hint and Skip buttons when authenticated', async ({ page }) => {
    await page.goto('/puzzles');

    if (page.url().includes('/login')) {
      test.skip(true, 'Skipping: authentication required');
      return;
    }

    await expect(page.getByRole('button', { name: 'Hint' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible();
  });
});
