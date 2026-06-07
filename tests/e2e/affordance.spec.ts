import { expect, test } from '@playwright/test';
import { openFirstBroadcasterDashboard } from './helpers/dashboard';

test.describe('interactive affordances', () => {
    test('blindbox records render without duplicate React keys', async ({ page }) => {
        const dashboardPage = await openFirstBroadcasterDashboard(page);
        const duplicateKeyErrors: string[] = [];

        dashboardPage.on('console', (message) => {
            const text = message.text();
            if (message.type() === 'error' && text.includes('Encountered two children with the same key')) {
                duplicateKeyErrors.push(text);
            }
        });

        await dashboardPage.goto('/dashboard/blindbox');
        await expect(dashboardPage.getByRole('heading', { name: '心动盲盒分析' })).toBeVisible();

        expect(duplicateKeyErrors).toEqual([]);
    });

    test('blindbox does not show row chevrons unless rows are actionable', async ({ page }) => {
        const dashboardPage = await openFirstBroadcasterDashboard(page);
        await dashboardPage.goto('/dashboard/blindbox');

        const misleadingChevrons = dashboardPage.locator('svg.lucide-chevron-right');
        await expect(misleadingChevrons).toHaveCount(0);
    });
});
