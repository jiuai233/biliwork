import { GiftReportClient } from './GiftReportClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function GiftReportPage({
    searchParams,
}: {
    searchParams: Promise<{ code?: string }>;
}) {
    const params = await searchParams;
    return <GiftReportClient initialCode={params.code ?? ''} />;
}
