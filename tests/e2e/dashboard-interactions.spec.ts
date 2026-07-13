import { expect, test } from '@playwright/test';
import { openFirstBroadcasterDashboard } from './helpers/dashboard';

test.describe('dashboard interactions', () => {
    test('dashboard feed tabs switch active panels', async ({ page }) => {
        const dashboardPage = await openFirstBroadcasterDashboard(page);
        await dashboardPage.goto('/dashboard');

        const giftTab = dashboardPage.getByTestId('dashboard-feed-tab-gifts');
        const danmakuTab = dashboardPage.getByTestId('dashboard-feed-tab-danmaku');
        const guardTab = dashboardPage.getByTestId('dashboard-feed-tab-guards');

        await expect(giftTab).toHaveAttribute('aria-selected', 'true');
        await danmakuTab.click();
        await expect(danmakuTab).toHaveAttribute('aria-selected', 'true');
        await guardTab.click();
        await expect(guardTab).toHaveAttribute('aria-selected', 'true');
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

    test('blindbox search controls are usable', async ({ page }) => {
        const dashboardPage = await openFirstBroadcasterDashboard(page);
        await dashboardPage.goto('/dashboard/blindbox');

        await dashboardPage.getByPlaceholder('搜索用户名...').fill('test-user');
        await dashboardPage.getByRole('button', { name: '搜索' }).click();
        await expect(dashboardPage.getByPlaceholder('搜索用户名...')).toHaveValue('test-user');
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

    test('date range presets apply once from the shared picker', async ({ page }) => {
        const dashboardPage = await openFirstBroadcasterDashboard(page);
        await dashboardPage.goto('/dashboard/analytics');
        const initialUrl = dashboardPage.url();

        await dashboardPage.getByRole('button', { name: /今天|\d{4}\/\d{2}\/\d{2}/ }).click();
        const dialog = dashboardPage.getByRole('dialog', { name: '选择日期范围' });
        await dialog.getByRole('button', { name: '近7日' }).click();
        await expect(dialog).toBeHidden();
        await expect(dashboardPage).toHaveURL(/from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/);
        expect(dashboardPage.url()).not.toBe(initialUrl);

        const trigger = dashboardPage.locator('button[aria-haspopup="dialog"]');
        await trigger.click();
        const customDialog = dashboardPage.getByRole('dialog', { name: '选择日期范围' });
        await customDialog.getByRole('button', { name: '自定义' }).click();
        await expect(customDialog.getByRole('button', { name: '下个月' })).toBeDisabled();
        await dashboardPage.keyboard.press('Escape');
        await expect(customDialog).toBeHidden();
        await expect(trigger).toBeFocused();
    });

    test('ranking tabs switch between danmaku and gift charts', async ({ page }) => {
        const dashboardPage = await openFirstBroadcasterDashboard(page);
        await dashboardPage.goto('/dashboard/ranking');

        await dashboardPage.getByRole('tab', { name: '礼物榜' }).click();
        await expect(dashboardPage.getByText('礼物贡献榜')).toBeVisible();

        await dashboardPage.getByRole('tab', { name: '弹幕榜' }).click();
        await expect(dashboardPage.getByText('弹幕活跃榜')).toBeVisible();
    });

    test('board controls expose real interactions', async ({ page }) => {
        const dashboardPage = await openFirstBroadcasterDashboard(page);
        await dashboardPage.goto('/dashboard/board');

        await expect(dashboardPage.getByRole('button', { name: '刷新可用记录' })).toBeVisible();
        await expect(dashboardPage.getByRole('button', { name: '全部导入' })).toBeVisible();
        await expect(dashboardPage.getByRole('button', { name: '导出图片' })).toBeVisible();
        await expect(dashboardPage.getByRole('switch', { name: /自动滚动/ }).or(dashboardPage.getByRole('switch'))).toBeVisible();
    });

    test('board waits for persisted state before syncing', async ({ page }) => {
        const dashboardPage = await openFirstBroadcasterDashboard(page);
        let releasePoll!: () => void;
        const pollGate = new Promise<void>((resolve) => { releasePoll = resolve; });
        const syncPayloads: unknown[][] = [];
        const persistedItem = {
            id: 'persisted-item',
            type: 'gift',
            uname: 'saved-user',
            uface: '',
            content: 'saved-gift x1',
            price: 10,
            ts: Date.now(),
        };

        await dashboardPage.route('**/api/overlay/*/poll', async (route) => {
            await pollGate;
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([persistedItem]) });
        });
        await dashboardPage.route('**/api/overlay/*/sync', async (route) => {
            syncPayloads.push(route.request().postDataJSON() as unknown[]);
            await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        });
        await dashboardPage.route('**/api/overlay/*/config', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: route.request().method() === 'GET'
                    ? JSON.stringify({ scrollSpeed: 3, scrollEnabled: false })
                    : '{}',
            });
        });

        await dashboardPage.goto('/dashboard/board');
        await dashboardPage.waitForTimeout(650);
        expect(syncPayloads).toHaveLength(0);

        releasePoll();
        await expect.poll(() => syncPayloads.length).toBeGreaterThan(0);
        expect(syncPayloads.at(-1)?.[0]).toMatchObject({ id: persistedItem.id });
    });

    test('board never writes defaults after restore failure', async ({ page }) => {
        const dashboardPage = await openFirstBroadcasterDashboard(page);
        let writeCount = 0;

        await dashboardPage.route('**/api/overlay/*/poll', (route) => route.fulfill({ status: 503, body: '{}' }));
        await dashboardPage.route('**/api/overlay/*/sync', async (route) => {
            writeCount += 1;
            await route.fulfill({ status: 200, body: '{}' });
        });
        await dashboardPage.route('**/api/overlay/*/config', async (route) => {
            if (route.request().method() !== 'GET') writeCount += 1;
            await route.fulfill({ status: route.request().method() === 'GET' ? 503 : 200, body: '{}' });
        });

        await dashboardPage.goto('/dashboard/board');
        await dashboardPage.waitForTimeout(900);
        expect(writeCount).toBe(0);
        await expect(dashboardPage.getByText('读取已保存看板失败，已停止自动同步')).toBeVisible();
        await expect(dashboardPage.getByText('读取 OBS 滚动配置失败，已停止自动写入')).toBeVisible();
    });
});
