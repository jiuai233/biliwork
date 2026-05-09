import { AntdRegistry } from '@ant-design/nextjs-registry';
import { AdminAntdProvider } from '@/components/admin/AdminAntdProvider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AntdRegistry>
            <AdminAntdProvider>{children}</AdminAntdProvider>
        </AntdRegistry>
    );
}
