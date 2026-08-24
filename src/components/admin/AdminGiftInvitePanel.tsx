'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ticket, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Table } from '@heroui/react';
import {
    createGiftInviteAction,
    disableGiftInviteAction,
    listGiftInvitesAction,
} from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import { SectionCard } from '@/components/shared/SectionCard';
import { tableChrome } from '@/components/shared/table';
import { formatInviteCode } from '@/lib/gift-invite';
import type { GiftInviteView } from '@/lib/services/gift-invite';

function pad(value: number) {
    return String(value).padStart(2, '0');
}

function defaultExpiresLocal() {
    const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function statusLabel(invite: GiftInviteView) {
    if (invite.status === 'disabled') return '已停用';
    if (invite.status === 'expired') return '已过期';
    if (invite.status === 'exhausted') return '已用完';
    return '有效';
}

export function AdminGiftInvitePanel() {
    const [invites, setInvites] = useState<GiftInviteView[]>([]);
    const [loading, setLoading] = useState(true);
    const [code, setCode] = useState('');
    const [maxUses, setMaxUses] = useState('10');
    const [expiresAt, setExpiresAt] = useState(defaultExpiresLocal);
    const [note, setNote] = useState('');
    const [pending, setPending] = useState(false);

    const load = useCallback(async () => {
        try {
            setInvites(await listGiftInvitesAction());
        } catch {
            toast.error('加载邀请码失败');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const handleCreate = async (event: React.FormEvent) => {
        event.preventDefault();
        const uses = Number(maxUses);
        const expires = new Date(expiresAt).getTime();
        setPending(true);
        try {
            const result = await createGiftInviteAction({
                code: code.trim() || undefined,
                maxUses: uses,
                expiresAt: expires,
                note: note.trim() || undefined,
            });
            if (!result.ok) {
                toast.error(result.message);
                return;
            }
            toast.success(`已创建 ${formatInviteCode(result.invite.code)}`);
            setCode('');
            setNote('');
            setMaxUses('10');
            setExpiresAt(defaultExpiresLocal());
            await load();
        } finally {
            setPending(false);
        }
    };

    return (
        <div className="space-y-4">
            <SectionCard title="生成邀请码" accent="bg-primary" bodyClassName="px-4 py-4">
                <p className="mb-4 text-sm text-muted-foreground">
                    生成后发给外部用户，平台登录不需要。
                </p>
                <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <label className="space-y-1 text-sm">
                        <span className="text-muted-foreground">邀请码（可空，自动生成）</span>
                        <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="例如 GIFT2026" />
                    </label>
                    <label className="space-y-1 text-sm">
                        <span className="text-muted-foreground">最大访问次数</span>
                        <Input type="number" min={1} value={maxUses} onChange={(event) => setMaxUses(event.target.value)} required />
                    </label>
                    <label className="space-y-1 text-sm">
                        <span className="text-muted-foreground">过期时间</span>
                        <Input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} required />
                    </label>
                    <label className="space-y-1 text-sm">
                        <span className="text-muted-foreground">备注</span>
                        <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="可选" />
                    </label>
                    <div className="flex items-end">
                        <Button type="submit" className="h-10 w-full" disabled={pending}>
                            {pending ? '创建中…' : '生成'}
                        </Button>
                    </div>
                </form>
            </SectionCard>

            <SectionCard title="邀请码列表" accent="bg-primary">
                {loading ? (
                    <EmptyState title="正在加载邀请码" />
                ) : invites.length === 0 ? (
                    <EmptyState
                        icon={<Ticket className="h-6 w-6" />}
                        title="还没有邀请码"
                        description="生成后把码或链接发给外部用户。"
                    />
                ) : (
                    <Table variant="secondary">
                        <Table.ScrollContainer className="dark-scrollbar overflow-x-auto">
                            <Table.Content aria-label="邀请码列表" className={tableChrome}>
                                <Table.Header>
                                    <Table.Column id="code" isRowHeader>邀请码</Table.Column>
                                    <Table.Column id="uses">访问</Table.Column>
                                    <Table.Column id="expires">过期时间</Table.Column>
                                    <Table.Column id="status">状态</Table.Column>
                                    <Table.Column id="note">备注</Table.Column>
                                    <Table.Column id="actions" className="text-right">操作</Table.Column>
                                </Table.Header>
                                <Table.Body>
                                    {invites.map((invite) => (
                                        <Table.Row key={invite.id} id={invite.id}>
                                            <Table.Cell className="font-mono tracking-wide">
                                                {formatInviteCode(invite.code)}
                                            </Table.Cell>
                                            <Table.Cell className="tabular-nums">
                                                {invite.usedCount}/{invite.maxUses}
                                            </Table.Cell>
                                            <Table.Cell className="tabular-nums text-sm">
                                                {new Date(invite.expiresAt).toLocaleString('zh-CN')}
                                            </Table.Cell>
                                            <Table.Cell>{statusLabel(invite)}</Table.Cell>
                                            <Table.Cell className="max-w-[180px] truncate text-sm text-muted-foreground">
                                                {invite.note || '—'}
                                            </Table.Cell>
                                            <Table.Cell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="h-8"
                                                        onClick={async () => {
                                                            const display = formatInviteCode(invite.code);
                                                            const url = `${window.location.origin}/gift?code=${invite.code}`;
                                                            try {
                                                                await navigator.clipboard.writeText(`${display}\n${url}`);
                                                                toast.success('已复制邀请码和链接');
                                                            } catch {
                                                                window.prompt('邀请链接', url);
                                                            }
                                                        }}
                                                    >
                                                        <Copy className="h-3.5 w-3.5" />
                                                        复制
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="h-8"
                                                        disabled={invite.disabled === 1}
                                                        onClick={async () => {
                                                            const result = await disableGiftInviteAction(invite.id);
                                                            if (result.ok) {
                                                                toast.success('已停用');
                                                                await load();
                                                            } else {
                                                                toast.error(result.message);
                                                            }
                                                        }}
                                                    >
                                                        停用
                                                    </Button>
                                                </div>
                                            </Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Content>
                        </Table.ScrollContainer>
                    </Table>
                )}
            </SectionCard>
        </div>
    );
}
