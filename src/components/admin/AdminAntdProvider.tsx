'use client';

import App from 'antd/es/app';
import ConfigProvider from 'antd/es/config-provider';
import theme from 'antd/es/theme';

export function AdminAntdProvider({ children }: { children: React.ReactNode }) {
    return (
        <ConfigProvider
            theme={{
                algorithm: theme.darkAlgorithm,
                token: {
                    colorPrimary: '#2563eb',
                    borderRadius: 8,
                    colorBgLayout: '#09090b',
                    colorBgContainer: '#18181b',
                    colorBorder: '#27272a',
                    colorText: '#f4f4f5',
                    colorTextSecondary: '#a1a1aa',
                },
                components: {
                    Table: {
                        headerBg: '#18181b',
                        rowHoverBg: '#27272a',
                        borderColor: '#27272a',
                    },
                    Card: {
                        colorBgContainer: 'rgba(24, 24, 27, 0.72)',
                    },
                },
            }}
        >
            <App>{children}</App>
        </ConfigProvider>
    );
}
