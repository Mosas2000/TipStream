import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    testMatch: '**/*.spec.{js,ts}',
    timeout: 30000,
    retries: 1,
    use: {
        baseURL: 'http://localhost:4173',
        headless: true,
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' },
        },
    ],
    webServer: {
        command: 'npx vite preview --port 4173',
        port: 4173,
        reuseExistingServer: true,
        timeout: 30000,
    },
});
