/**
 * OBS Overlay 文件同步存储
 * 
 * 使用文件系统代替内存存储，解决 Next.js 多进程模块隔离问题。
 * 制作板 POST → 写入 JSON 文件 → OBS SSE 读取同一文件。
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const STORE_DIR = path.join(os.tmpdir(), 'biweb-overlay');

// 确保目录存在
function ensureDir() {
    if (!fs.existsSync(STORE_DIR)) {
        fs.mkdirSync(STORE_DIR, { recursive: true });
    }
}

function getFilePath(code: string): string {
    // 只允许字母数字，防止路径注入
    const safeCode = code.replace(/[^a-z0-9]/gi, '');
    return path.join(STORE_DIR, `${safeCode}.json`);
}

export function setOverlayItems(code: string, items: unknown[]) {
    ensureDir();
    const filePath = getFilePath(code);
    fs.writeFileSync(filePath, JSON.stringify(items), 'utf-8');
}

export function getOverlayItems(code: string): unknown[] {
    const filePath = getFilePath(code);
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        }
    } catch { }
    return [];
}

function getConfigFilePath(code: string): string {
    const safeCode = code.replace(/[^a-z0-9]/gi, '');
    return path.join(STORE_DIR, `${safeCode}-config.json`);
}

export function setOverlayConfig(code: string, config: Record<string, unknown>) {
    ensureDir();
    const filePath = getConfigFilePath(code);
    fs.writeFileSync(filePath, JSON.stringify(config), 'utf-8');
}

export function getOverlayConfig(code: string): Record<string, unknown> {
    const filePath = getConfigFilePath(code);
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        }
    } catch { }
    return {};
}
