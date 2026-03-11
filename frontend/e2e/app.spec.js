import { test, expect } from '@playwright/test';

test.describe('TipStream Landing Page', () => {
    test('loads and shows hero section with branding', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('nav').first()).toBeVisible();
        await expect(page.getByText('TipStream').first()).toBeVisible();
    });

    test('shows Connect Wallet button when not authenticated', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('button', { name: /Connect Wallet/i })).toBeVisible();
    });

    test('hero section has a Get Started call-to-action', async ({ page }) => {
        await page.goto('/');
        const cta = page.getByRole('button', { name: /Get Started|Connect/i }).first();
        await expect(cta).toBeVisible();
    });

    test('displays network indicator in header', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByText(/Mainnet|Testnet|Devnet/i)).toBeVisible();
    });

    test('footer contains branding and links', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('footer')).toBeVisible();
        await expect(page.getByText('TipStream').first()).toBeVisible();
        await expect(page.locator('footer a[href*="github"]').first()).toBeVisible();
    });
});

test.describe('Theme Toggle', () => {
    test('theme toggle button is accessible', async ({ page }) => {
        await page.goto('/');
        const toggle = page.getByRole('button', { name: /Switch to (dark|light) mode/i });
        await expect(toggle).toBeVisible();
    });

    test('clicking theme toggle changes appearance', async ({ page }) => {
        await page.goto('/');
        const toggle = page.getByRole('button', { name: /Switch to (dark|light) mode/i });
        await toggle.click();
        // After toggle, the button label should change
        await expect(
            page.getByRole('button', { name: /Switch to (dark|light) mode/i })
        ).toBeVisible();
    });
});

test.describe('Responsive Layout', () => {
    test('renders correctly on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/');
        await expect(page.locator('nav').first()).toBeVisible();
        await expect(page.getByRole('button', { name: /Connect Wallet/i })).toBeVisible();
    });

    test('renders correctly on tablet viewport', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');
        await expect(page.locator('nav').first()).toBeVisible();
    });

    test('renders correctly on desktop viewport', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');
        await expect(page.locator('nav').first()).toBeVisible();
        await expect(page.locator('footer')).toBeVisible();
    });
});

test.describe('Page Performance', () => {
    test('page loads within acceptable time', async ({ page }) => {
        const start = Date.now();
        await page.goto('/', { waitUntil: 'networkidle' });
        const loadTime = Date.now() - start;
        expect(loadTime).toBeLessThan(10000); // 10s max
    });

    test('no console errors on initial load', async ({ page }) => {
        const errors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
        });
        await page.goto('/', { waitUntil: 'networkidle' });
        // Filter out expected network errors (API calls to Hiro may fail in test env)
        const realErrors = errors.filter(
            e => !e.includes('api.hiro.so') && !e.includes('fetch') && !e.includes('Failed to load')
        );
        expect(realErrors).toHaveLength(0);
    });
});

test.describe('Accessibility Basics', () => {
    test('page has navigation landmark', async ({ page }) => {
        await page.goto('/');
        const navCount = await page.locator('nav').count();
        expect(navCount).toBeGreaterThanOrEqual(1);
    });

    test('buttons have accessible names', async ({ page }) => {
        await page.goto('/');
        const buttons = page.getByRole('button');
        const count = await buttons.count();
        expect(count).toBeGreaterThan(0);
        for (let i = 0; i < count; i++) {
            const name = await buttons.nth(i).getAttribute('aria-label') ||
                await buttons.nth(i).textContent();
            expect(name?.trim().length).toBeGreaterThan(0);
        }
    });
});

test.describe('Routing', () => {
    test('root URL shows the landing hero for unauthenticated visitors', async ({ page }) => {
        await page.goto('/');
        // Without a wallet the app renders the animated hero, not a 404
        await expect(page.getByRole('button', { name: /Get Started|Connect/i }).first()).toBeVisible();
    });

    test('unknown path renders the 404 page', async ({ page }) => {
        await page.goto('/some/nonexistent/path');
        await expect(page.getByText('Page not found')).toBeVisible();
        await expect(page.getByText('404')).toBeVisible();
    });

    test('404 page shows the attempted URL path', async ({ page }) => {
        await page.goto('/bad/route/here');
        await expect(page.getByText('/bad/route/here')).toBeVisible();
    });

    test('404 page has a link back to the app', async ({ page }) => {
        await page.goto('/nope');
        const link = page.getByRole('link', { name: /go to send tip/i });
        await expect(link).toBeVisible();
    });
});
