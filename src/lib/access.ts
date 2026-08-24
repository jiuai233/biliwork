/** 有身份码才能进完整看板；否则只有收礼报告。 */
export function hasLiveAuthCode(authCode: string | null | undefined): boolean {
    return Boolean(authCode && authCode.trim() && !authCode.startsWith('qr-'));
}

export function homePathForAuthCode(authCode: string | null | undefined): '/dashboard' | '/gift' {
    return hasLiveAuthCode(authCode) ? '/dashboard' : '/gift';
}
