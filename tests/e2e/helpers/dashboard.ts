import { expect, type Page } from '@playwright/test';

export const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME || 'admin';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'jiuai233';
const NOTICE_DISMISSED_KEY = 'bili-dashboard-notice-dismissed';

export async function suppressDashboardNotice(page: Page) {
    await page.context().addInitScript((key) => {
        window.localStorage.setItem(key, 'true');
    }, NOTICE_DISMISSED_KEY);
    await page.evaluate((key) => {
        window.localStorage.setItem(key, 'true');
    }, NOTICE_DISMISSED_KEY).catch(() => undefined);
}

export async function loginAdmin(page: Page) {
    await suppressDashboardNotice(page);
    await page.goto('/admin/login');
    await page.getByLabel('用户名').fill(ADMIN_USERNAME);
    await page.getByLabel('密码').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: '进入后台' }).click();
    await expect(page.getByRole('heading', { name: '监控控制台' })).toBeVisible();
}

export async function openFirstBroadcasterDashboard(page: Page) {
    await loginAdmin(page);

    const dashboardButton = page.getByRole('button', { name: /看板/ }).first();
    await expect(dashboardButton).toBeVisible();

    const broadcasterId = await dashboardButton.evaluate((element) => {
        return element.closest('tr')?.id || '';
    });

    if (/^\d+$/.test(broadcasterId)) {
        const response = await page.request.get(`/admin/impersonate/${broadcasterId}?format=json`, {
            headers: { Accept: 'application/json' },
        });
        expect(response.ok()).toBeTruthy();

        const result = await response.json() as { redirectTo?: string };
        await page.goto(result.redirectTo || '/dashboard');
        await page.waitForLoadState('domcontentloaded');
        await expect(page).toHaveURL(/\/dashboard/);
        await dismissDashboardNotice(page);
        return page;
    }

    const popupPromise = page.waitForEvent('popup');
    await dashboardButton.click();
    const dashboardPage = await popupPromise;
    await dashboardPage.waitForLoadState('domcontentloaded');
    await expect(dashboardPage).toHaveURL(/\/dashboard/);
    await dashboardPage.bringToFront();
    await dismissDashboardNotice(dashboardPage);

    return dashboardPage;
}

export async function dismissDashboardNotice(page: Page) {
    const confirmButton = page.getByRole('button', { name: '知道了' });
    await confirmButton.waitFor({ state: 'visible', timeout: 1000 }).catch(() => undefined);
    if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click();
    }
}

export async function expectNoHorizontalOverflow(page: Page) {
    const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        const body = document.body;
        const rootOverflow = root.scrollWidth - root.clientWidth;
        const bodyOverflow = body ? body.scrollWidth - body.clientWidth : 0;

        return Math.max(rootOverflow, bodyOverflow);
    });

    expect(overflow, `horizontal overflow: ${overflow}px`).toBeLessThanOrEqual(2);
}

export async function expectNoDocumentVerticalOverflow(page: Page) {
    const overflow = await page.evaluate(() => {
        const scrollingElement = document.scrollingElement || document.documentElement;
        return scrollingElement.scrollHeight - scrollingElement.clientHeight;
    });

    expect(overflow, `document vertical overflow: ${overflow}px`).toBeLessThanOrEqual(2);
}

export async function expectDashboardShell(page: Page) {
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 1024) {
        await expect(page.getByTestId('mobile-menu-button')).toBeVisible();
    } else {
        await expect(page.getByRole('navigation').or(page.locator('nav')).first()).toBeVisible();
    }
    await expect(page.locator('body')).not.toBeEmpty();
}
