import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const contracts = JSON.parse(readFileSync('tests/page-contracts.json', 'utf8'));
const inventory = JSON.parse(readFileSync('tests/migration-inventory.json', 'utf8'));
const route = (file: string) => `/${file.replace(/^content\/docs\//, '').replace(/\.md$/, '')}/`;

test('all 35 static routes hydrate and all 65 D2 replacements render', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let count = 0;
  for (const file of Object.keys(contracts).filter((f) => f.endsWith('.md'))) {
    const response = await page.goto(route(file));
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    const diagrams = inventory.filter((r: { file: string; action: string }) => `content/docs/${r.file}` === file && r.action === 'D2');
    // Hydration replaces the no-JS board fallback with one active viewer.
    if (file === 'content/docs/async/event-loop.md') {
      await expect(page.locator('.d2-viewer')).toBeVisible();
    }
    await expect(page.locator('.d2-diagram')).toHaveCount(diagrams.length);
    for (const figure of await page.locator('.d2-diagram').all()) {
      await expect(figure.locator('.d2-diagram-light > svg')).toHaveCount(1);
      await expect(figure.locator('.d2-diagram-dark > svg')).toHaveCount(1);
    }
    count += diagrams.length;
  }
  expect(count).toBe(65);
  expect(errors).toEqual([]);
});

test('walkthrough steps, code copy and manual TOC anchors work', async ({ page }) => {
  await page.goto('/interview/event-loop-microtask-macrotask/');
  const viewer = page.locator('.code-walkthrough');
  await viewer.scrollIntoViewIfNeeded();
  await expect(viewer.getByRole('button', { name: 'Bước trước', exact: true })).toBeDisabled();
  await viewer.getByRole('combobox', { name: 'Chọn bước' }).selectOption('1');
  await expect(viewer.locator('.code-walkthrough-note')).toContainText('Promise đã fulfilled');
  await expect(viewer.locator('[data-line="7"]')).toHaveAttribute('data-highlighted', 'true');
  await viewer.getByRole('button', { name: 'Bước sau', exact: true }).click();
  await expect(viewer.locator('.code-walkthrough-note')).toContainText('Callback in B');
  await viewer.getByRole('button', { name: 'Sao chép code', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("console.log('D');");
  for (const href of await page.locator('.prose a[href^="#"]').evaluateAll((links) => links.map((a) => a.getAttribute('href')!))) {
    expect(await page.evaluate((id) => !!document.getElementById(decodeURIComponent(id.slice(1))), href), href).toBe(true);
  }
});

test('diff side copy and timed span disclosures work', async ({ page }) => {
  await page.goto('/async/async-await/');
  const diff = page.locator('.code-diff');
  await diff.getByRole('button', { name: 'Inline', exact: true }).click();
  await expect(diff).toHaveAttribute('data-view', 'inline');
  await diff.getByRole('button', { name: 'Sao chép bản sau', exact: true }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('async function layData()');
  expect(copied).not.toContain('function layData() {\n  return dangNhap()');
  const waterfall = page.locator('.span-waterfall');
  await waterfall.locator('[data-span="concurrent-fast"] .span-waterfall-label').click();
  await expect(waterfall.locator('[data-detail="concurrent-fast"]')).toHaveAttribute('open', '');
  await expect(waterfall.locator('[data-detail="concurrent-fast"]')).toContainText('1 s');
});

test('terminal copy, HTTP error disclosure and D2 step controls work', async ({ page }) => {
  await page.goto('/async/event-loop/');
  const terminal = page.locator('.terminal-session');
  await terminal.getByRole('button', { name: 'Sao chép lệnh bước 1' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^node -e /);
  const exchange = page.locator('.protocol-exchange');
  await exchange.locator('[data-variant="unavailable"] > summary').click();
  await expect(exchange.locator('[data-variant="unavailable"]')).toContainText('503');
  await exchange.getByRole('button', { name: 'Sao chép response — Dịch vụ chưa sẵn sàng' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('503 Service Unavailable\r\nContent-Type: application/json\r\n\r\n{"error":"temporarily_unavailable"}');
  const interactive = page.locator('.d2-interactive');
  await expect(interactive.locator('.d2-viewer')).toBeVisible();
  await expect(interactive.getByRole('group', { name: 'Diagram steps' })).toBeVisible();
  await interactive.getByRole('button', { name: 'Next →', exact: true }).click();
  await expect(interactive.locator('.d2-step-count')).toHaveText('2 / 7');
  await interactive.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await interactive.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  // Verify important labels and a locally embedded catalog icon.
  await expect(page.locator('.d2-diagram-light').filter({ hasText: 'timers' }).locator('image')).toHaveAttribute('href', /^data:image\/svg\+xml;base64,/);
});

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}, narrow screen: diagrams and all learning components remain within page`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
    for (const path of ['/async/async-await/', '/async/event-loop/', '/interview/event-loop-microtask-macrotask/', '/fundamentals/data-types/']) {
      await page.goto(path);
      await expect(page.locator('html')).toHaveClass(new RegExp(theme));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      const figures = page.locator('figure.not-prose');
      for (const figure of await figures.all()) {
        if (!(await figure.isVisible())) continue;
        const box = await figure.boundingBox();
        expect(box!.width).toBeLessThanOrEqual(390);
      }
    }
    await page.screenshot({ path: `test-results/mobile-${theme}.png`, fullPage: true });
  });
}

test('no JavaScript: diagrams, all steps, code, HTTP messages and timing tables remain readable', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/async/event-loop/');
  await expect(page.locator('.d2-diagram-light > svg').first()).toBeVisible();
  await page.locator('.d2-board-fallback > summary').click();
  await expect(page.locator('.d2-board-fallback .d2-diagram')).toHaveCount(6);
  await expect(page.locator('.terminal-session-command')).toContainText('node -e');
  await page.locator('[data-variant="unavailable"] > summary').click();
  await expect(page.locator('[data-variant="unavailable"]')).toContainText('temporarily_unavailable');
  await page.goto('http://127.0.0.1:4173/async/async-await/');
  await expect(page.locator('.code-diff')).toContainText('async function layData');
  await page.locator('.span-waterfall-table-disclosure > summary').click();
  await expect(page.locator('.span-waterfall-table-scroll tbody tr')).toHaveCount(6);
  await page.goto('http://127.0.0.1:4173/interview/event-loop-microtask-macrotask/');
  await expect(page.locator('.code-walkthrough pre')).toBeVisible();
  await expect(page.locator('.code-walkthrough noscript ol li')).toHaveCount(3);
  await context.close();
});
