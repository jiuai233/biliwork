type QrSession = {
    expiresAt: number;
    expectedUid?: number;
};

const sessions = new Map<string, QrSession>();

const TTL_MS = 180_000;

export function rememberQrSession(qrcodeKey: string, expectedUid?: number): void {
    sessions.set(qrcodeKey, { expiresAt: Date.now() + TTL_MS, expectedUid });
}

export function takeQrSession(qrcodeKey: string): QrSession | null {
    const session = sessions.get(qrcodeKey);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
        sessions.delete(qrcodeKey);
        return null;
    }
    return session;
}

export function dropQrSession(qrcodeKey: string): void {
    sessions.delete(qrcodeKey);
}
