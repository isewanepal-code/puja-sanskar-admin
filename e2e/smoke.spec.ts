import { expect, test } from '@playwright/test';

test('home page renders with default metadata', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Puja Sanskar');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ne');
});

test('unknown routes render the not-found page', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();

  await page.getByRole('link', { name: 'Go home' }).click();
  await expect(page).toHaveURL('/');
});

test('robots and sitemap are served', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  const sitemap = await request.get('/sitemap.xml');

  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain('Sitemap:');
  expect(sitemap.ok()).toBe(true);
  expect(sitemap.headers()['content-type']).toContain('xml');
});
