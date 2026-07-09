import { defineConfig, devices } from '@playwright/test';

const E2E_PORT = 4173;
const e2eSslEnabled = process.env.E2E_SSL === 'true';
const e2eSslInsecure = process.env.E2E_SSL_INSECURE === 'true';
const scheme = e2eSslEnabled ? 'https' : 'http';
const baseURL = `${scheme}://localhost:${E2E_PORT}`;

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: 0,
	workers: process.env.CI ? 4 : undefined,
	reporter: 'html',
	globalSetup: './tests/e2e/global-setup.ts',
	use: {
		baseURL,
		ignoreHTTPSErrors: e2eSslEnabled && e2eSslInsecure,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		serviceWorkers: 'block'
	},
	projects: [
		{
			name: 'auth-setup',
			testMatch: 'auth.spec.ts',
			fullyParallel: false,
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'app',
			testIgnore: 'auth.spec.ts',
			dependencies: ['auth-setup'],
			use: { ...devices['Desktop Chrome'] }
		}
	],
	webServer: {
		command: `pnpm preview --port ${E2E_PORT}`,
		url: baseURL,
		ignoreHTTPSErrors: e2eSslEnabled && e2eSslInsecure,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		env: {
			DATABASE_URL: './data/test-crumbs.db',
			NODE_ENV: 'test',
			ORIGIN: baseURL,
			SSL_ENABLED: e2eSslEnabled ? 'true' : 'false',
			SSL_CERT_FILE: process.env.SSL_CERT_FILE ?? '',
			SSL_KEY_FILE: process.env.SSL_KEY_FILE ?? ''
		}
	}
});
