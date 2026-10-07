import { expect, test } from '@playwright/test';

test('default locale is served without a prefix', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Puja Sanskar');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ne');
});

test('secondary locale is served under its prefix', async ({ page }) => {
  await page.goto('/en');

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('link[rel="alternate"][hreflang="ne"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/en$/);
});

test('unknown routes render the localized not-found page', async ({ page }) => {
  const response = await page.goto('/en/this-route-does-not-exist');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();

  await page.getByRole('link', { name: 'Go home' }).click();
  await expect(page).toHaveURL('/en');
});

test('default locale not-found page is translated', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'पृष्ठ फेला परेन' })).toBeVisible();
});

test('robots and sitemap are served', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  const sitemap = await request.get('/sitemap.xml');

  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain('Sitemap:');
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain('hreflang="en"');
});
