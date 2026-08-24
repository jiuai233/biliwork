import { expect, test } from '@playwright/test';
import {
    expectDashboardShell,
    expectNoDocumentVerticalOverflow,
    expectNoHorizontalOverflow,
    openFirstBroadcasterDashboard,
} from './helpers/dashboard';

const dashboardRoutes = [
    '/dashboard',
    '/dashboard/gift-stream',
    '/dashboard/blindbox',
    '/dashboard/live',
    '/dashboard/analytics',
    '/dashboard/report',
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

            if (route === '/dashboard/report' && viewport && viewport.width >= 1024) {
                await expect(dashboardPage.getByRole('tab', { name: /概览/ })).toBeVisible();
                await dashboardPage.getByRole('tab', { name: /场次/ }).click();
                const sessionsHeight = await dashboardPage.getByTestId('report-sessions-viewport').evaluate((element) => {
                    return Math.round(element.getBoundingClientRect().height);
                }).catch(() => 0);
                const emptyState = dashboardPage.getByText('本周暂无开播记录');
                const hasEmpty = await emptyState.isVisible().catch(() => false);

                expect(
                    hasEmpty || sessionsHeight > 40,
                    `weekly report sessions table should render, got ${sessionsHeight}px`,
                ).toBeTruthy();
            }

            if (route === '/dashboard/analytics') {
                const typeFilterHasScrollbar = await dashboardPage.getByTestId('analytics-type-filter').evaluate((element) => {
                    return element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2;
                });

                expect(typeFilterHasScrollbar, 'analytics type filter should not expose native scrollbars').toBe(false);
                await expect(dashboardPage.getByTestId('analytics-records-viewport')).toHaveClass(/dark-scrollbar/);

                if (viewport && viewport.width >= 1024) {
                    const recordsHeight = await dashboardPage.getByTestId('analytics-records-viewport').evaluate((element) => {
                        return Math.round(element.getBoundingClientRect().height);
                    });

                    expect(recordsHeight, 'analytics records viewport should keep a useful default height').toBeGreaterThan(400);

                    const overlapPx = await dashboardPage.evaluate(() => {
                        const viewport = document.querySelector('[data-testid="analytics-records-viewport"]');
                        const pager = document.querySelector('[data-testid="analytics-pagination"]');
                        if (!viewport || !pager) return Number.NaN;
                        return Math.round(viewport.getBoundingClientRect().bottom - pager.getBoundingClientRect().top);
                    });

                    expect(overlapPx, 'analytics pagination must sit below the table, not over the last row').toBeLessThanOrEqual(1);
                }
            }

            if (route === '/dashboard/ranking' && viewport && viewport.width >= 1024) {
                const limit = dashboardPage.getByTestId('ranking-limit-control');
                await expect(limit).toBeVisible();
                await expect(limit.getByRole('button', { name: '10' })).toBeVisible();
                await expect(limit.getByRole('button', { name: '应用' })).toHaveCount(0);
                await expect(dashboardPage.getByText('显示数量')).toHaveCount(0);
                await expect(limit.getByText('每页')).toBeVisible();

                const limitBelowHeader = await dashboardPage.evaluate(() => {
                    const header = document.querySelector('main h1')?.closest('section');
                    const control = document.querySelector('[data-testid="ranking-limit-control"]');
                    if (!header || !control) return false;
                    return control.getBoundingClientRect().top > header.getBoundingClientRect().bottom + 8;
                });
                expect(limitBelowHeader, 'ranking page size must sit under the list, not in the page header').toBe(true);
            }

            if (route === '/dashboard/blindbox' && viewport && viewport.width >= 1024) {
                await expect(dashboardPage.getByTestId('blindbox-distribution-grid')).toHaveCount(0);

                const recordsHeight = await dashboardPage.getByTestId('blindbox-records-viewport').evaluate((element) => {
                    return Math.round(element.getBoundingClientRect().height);
                });

                expect(recordsHeight, 'blindbox records should render').toBeGreaterThan(40);

                await dashboardPage.getByRole('button', { name: /种有产出.*展开/ }).click();
                const distributionWidth = await dashboardPage.getByTestId('blindbox-distribution-grid').evaluate((element) => {
                    return Math.round(element.getBoundingClientRect().width);
                });

                expect(distributionWidth, 'expanded blindbox distribution should remain full width').toBeGreaterThan(600);

                const emptyState = dashboardPage.getByText('暂无开盒记录');
                if (await emptyState.isVisible().catch(() => false)) {
                    const hasVerticalScroll = await dashboardPage.getByTestId('blindbox-records-viewport').evaluate((element) => {
                        return element.scrollHeight > element.clientHeight + 8;
                    });

                    expect(hasVerticalScroll, 'empty blindbox records should not scroll or expose a second layer').toBe(false);
                }
            }

            if (route === '/dashboard/live' && viewport && viewport.width >= 1024) {
                const liveTableMetrics = await dashboardPage.getByTestId('live-records-viewport').evaluate((element) => {
                    const table = element.querySelector('table');
                    const headerWidths = [...element.querySelectorAll('th')]
                        .slice(0, 5)
                        .map((header) => Math.round(header.getBoundingClientRect().width));

                    return {
                        scrollWidth: element.scrollWidth,
                        tableWidth: table ? Math.round(table.getBoundingClientRect().width) : 0,
                        headerWidths,
                    };
                });

                expect(liveTableMetrics.tableWidth, 'live records table width should stay bounded').toBeLessThan(1800);
                for (const width of liveTableMetrics.headerWidths) {
                    expect(width, 'live records columns should not expand abnormally').toBeLessThan(320);
                }
            }
        });
    }
});
