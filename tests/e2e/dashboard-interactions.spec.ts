import { expect, test } from '@playwright/test';
import { openFirstBroadcasterDashboard } from './helpers/dashboard';

test.describe('dashboard interactions', () => {
    test('dashboard feed tabs switch active panels', async ({ page }) => {
        const dashboardPage = await openFirstBroadcasterDashboard(page);
        await dashboardPage.goto('/dashboard');

        const giftTab = dashboardPage.getByTestId('dashboard-feed-tab-gifts');
        const danmakuTab = dashboardPage.getByTestId('dashboard-feed-tab-danmaku');
        const guardTab = dashboardPage.getByTestId('dashboard-feed-tab-guards');

        await expect(giftTab).toHaveAttribute('aria-pressed', 'true');
        await danmakuTab.click();
        await expect(danmakuTab).toHaveAttribute('aria-pressed', 'true');
        await guardTab.click();
        await expect(guardTab).toHaveAttribute('aria-pressed', 'true');
    });

    test('feedback entry opens QQ group dialog', async ({ page }) => {
        const dashboardPage = await openFirstBroadcasterDashboard(page);
        await dashboardPage.goto('/dashboard');

        const mobileMenuButton = dashboardPage.getByTestId('mobile-menu-button');
        if (await mobileMenuButton.isVisible().catch(() => false)) {
            await mobileMenuButton.click();
        }

        await dashboardPage.locator('[data-testid="dashboard-feedback-entry"]:visible').click();

        const dialog = dashboardPage.getByRole('dialog');
        await expect(dialog.getByRole('heading', { name: '问题反馈' })).toBeVisible();
        await expect(dialog.getByText('672791477')).toBeVisible();
        await expect(dialog.getByRole('button', { name: '打开加群链接' })).toBeVisible();
        await expect(dialog.getByRole('button', { name: '复制', exact: true })).toBeVisible();
        await expect(dialog.getByText('不再提示')).toHaveCount(0);
    });

    test('blindbox search and refresh controls are usable', async ({ page }) => {
        const dashboardPage = await openFirstBroadcasterDashboard(page);
        await dashboardPage.goto('/dashboard/blindbox');

        await dashboardPage.getByPlaceholder('搜索用户名...').fill('test-user');
        await dashboardPage.getByRole('button', { name: '搜索' }).click();
        await expect(dashboardPage.getByPlaceholder('搜索用户名...')).toHaveValue('test-user');

        await dashboardPage.getByRole('button', { name: '刷新' }).click();
    });

    test('analytics filters and sorting are usable', async ({ page }) => {
        const dashboardPage = await openFirstBroadcasterDashboard(page);
        await dashboardPage.goto('/dashboard/analytics');

        await dashboardPage.getByPlaceholder('搜索用户 / 内容 / 金额').fill('gift');
        await dashboardPage.getByRole('button', { name: '礼物' }).click();
        await dashboardPage.getByRole('button', { name: /时间/ }).click();
        await dashboardPage.getByRole('button', { name: '重置' }).click();

        await expect(dashboardPage.getByPlaceholder('搜索用户 / 内容 / 金额')).toHaveValue('');
    });

    test('ranking tabs switch between danmaku and gift charts', async ({ page }) => {
        const dashboardPage = await openFirstBroadcasterDashboard(page);
        await dashboardPage.goto('/dashboard/ranking');

        await dashboardPage.getByRole('button', { name: '礼物榜' }).click();
        await expect(dashboardPage.getByText('礼物贡献榜')).toBeVisible();

        await dashboardPage.getByRole('button', { name: '弹幕榜' }).click();
        await expect(dashboardPage.getByText('弹幕活跃榜')).toBeVisible();
    });

    test('board controls expose real interactions', async ({ page }) => {
        const dashboardPage = await openFirstBroadcasterDashboard(page);
        await dashboardPage.goto('/dashboard/board');

        await expect(dashboardPage.getByRole('button', { name: '刷新可用记录' })).toBeVisible();
        await expect(dashboardPage.getByRole('button', { name: '全部导入' })).toBeVisible();
        await expect(dashboardPage.getByRole('button', { name: '导出图片' })).toBeDisabled();
        await expect(dashboardPage.getByRole('switch', { name: /自动滚动/ }).or(dashboardPage.getByRole('switch'))).toBeVisible();
    });
});
