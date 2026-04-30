#!/usr/bin/env tsx
/**
 * Screenshot diff helper — emits the gstack command list the QA gate runs.
 *
 * The actual capture happens via the gstack plugin (`Skill("gstack",
 * "screenshot {url}")`); this script just prints a deterministic list of
 * routes so CI can fan out the captures without hard-coding the URL list
 * inside the workflow yaml.
 */
const ROUTES = [
  '/',
  '/projects',
  '/tasks',
  '/issues',
  '/calendar',
  '/docs',
  '/chat',
  '/clients',
  '/approvals',
  '/resources',
  '/reports/weekly',
  '/reports/monthly',
  '/notifications',
  '/settings',
  '/oauth-callback?provider=google&status=success',
];

const baseUrl = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:3000';
for (const route of ROUTES) {
  // eslint-disable-next-line no-console
  console.log(`gstack screenshot "${baseUrl}${route}" --out "screenshots${route.replace(/\//g, '_') || '_root'}.png"`);
}
