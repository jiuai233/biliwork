import { expect, test } from '@playwright/test';
import {
    expectDashboardShell,
    expectNoDocumentVerticalOverflow,
    expectNoHorizontalOverflow,
    openFirstBroadcasterDashboard,
} from './helpers/dashboard';

const dashboardRoutes = [
    '/dashboard',
    '/dashboard/blindbox',
    '/dashboard/live',
    '/dashboard/analytics',
    '/dashboard/ranking',
    '/dashboard/board',
];

test.describe('dashboard local layout', () => {
    test('admin can impersonate a broadcaster dashboard', async ({ page }) => {
        const dashboardPage = await openFirstBroadcasterDashboard(page);
        await expect(dashboardPage).toHaveURL(/\/dashboard/);
        await expectDashboardShell(dashboardPage);
    });

    for (const route of dashboardRoutes) {
        test(`${route} renders without page overflow`, async ({ page }) => {
            const dashboardPage = await openFirstBroadcasterDashboard(page);
            await dashboardPage.goto(route);
            await dashboardPage.waitForLoadState('domcontentloaded');
            await expectDashboardShell(dashboardPage);
            await expectNoHorizontalOverflow(dashboardPage);

            const viewport = dashboardPage.viewportSize();
            if (viewport && viewport.width >= 1024) {
                await expectNoDocumentVerticalOverflow(dashboardPage);
            }

            if (route === '/dashboard' && viewport && viewport.width >= 1024) {
                const leftGap = await dashboardPage.evaluate(() => {
                    const firstSection = document.querySelector('main > div')?.getBoundingClientRect();
                    return firstSection ? firstSection.left - 256 : 999;
                });

                expect(leftGap, `dashboard content starts ${leftGap}px after sidebar`).toBeLessThanOrEqual(48);
            }

            if (route === '/dashboard/analytics') {
                const typeFilterHasScrollbar = await dashboardPage.getByTestId('analytics-type-filter').evaluate((element) => {
                    return element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2;
                });

                expect(typeFilterHasScrollbar, 'analytics type filter should not expose native scrollbars').toBe(false);

                if (viewport && viewport.width >= 1024) {
                    const recordsHeight = await dashboardPage.getByTestId('analytics-records-viewport').evaluate((element) => {
                        return Math.round(element.getBoundingClientRect().height);
                    });

                    expect(recordsHeight, 'analytics records viewport should keep a useful default height').toBeGreaterThan(400);
                }
            }

            if (route === '/dashboard/blindbox' && viewport && viewport.width >= 1024) {
                const distributionWidth = await dashboardPage.getByTestId('blindbox-distribution-grid').evaluate((element) => {
                    return Math.round(element.getBoundingClientRect().width);
                });

                expect(distributionWidth, 'blindbox distribution should be a full-width summary grid').toBeGreaterThan(600);

                const recordsHeight = await dashboardPage.getByTestId('blindbox-records-viewport').evaluate((element) => {
                    return Math.round(element.getBoundingClientRect().height);
                });

                expect(recordsHeight, 'blindbox records viewport should keep a useful default height').toBeGreaterThan(280);

                const emptyState = dashboardPage.getByText('暂无开盒记录');
                if (await emptyState.isVisible().catch(() => false)) {
                    const hasVerticalScroll = await dashboardPage.getByTestId('blindbox-records-viewport').evaluate((element) => {
                        return element.scrollHeight > element.clientHeight + 8;
                    });

                    expect(hasVerticalScroll, 'empty blindbox records should not scroll or expose a second layer').toBe(false);
                }
            }
        });
    }
});
