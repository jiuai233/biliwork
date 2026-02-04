
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: 'Bilibili Live Monitor',
  description: 'Real-time dashboard for Bilibili live data',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="font-sans bg-zinc-950 text-zinc-100 min-h-screen">
        {children}
        <Toaster richColors position="top-center" theme="dark" />
      </body>
    </html>
  );
}
