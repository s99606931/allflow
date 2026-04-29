/**
 * PDCA-10 a11y gate — runs axe-core against every primary route.
 *
 * Failing rule severities (`critical`, `serious`) abort the build; lighter
 * findings are reported but tolerated so the suite never gets disabled.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = [
  '/',
  '/projects',
  '/tasks',
  '/issues',
  '/calendar',
  '/docs',
  '/chat',
  '/clients',
  '/reports/weekly',
  '/reports/monthly',
  '/notifications',
  '/settings',
];

async function runAxe(page: Page) {
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
}

for (const route of ROUTES) {
  test(`a11y ${route}`, async ({ page }) => {
    await page.goto(route);
    // Allow client islands to settle.
    await page.waitForLoadState('networkidle');
    const result = await runAxe(page);
    const blocking = result.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious',
    );
    if (blocking.length > 0) {
      // Pretty-print the first few violations so the failure log is actionable.
      const summary = blocking
        .slice(0, 5)
        .map(v => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)`)
        .join('\n');
      throw new Error(`Critical/serious a11y violations on ${route}:\n${summary}`);
    }
    expect(blocking).toHaveLength(0);
  });
}
