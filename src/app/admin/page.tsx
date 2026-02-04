import BroadcasterManager from '@/components/admin/BroadcasterManager';
import { fetchBroadcasters } from './actions';

export default async function AdminPage() {
    const broadcasters = await fetchBroadcasters();

    return <BroadcasterManager initialBroadcasters={broadcasters} />;
}
