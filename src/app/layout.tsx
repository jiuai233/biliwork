
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ['latin'] });

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
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 min-h-screen`}>
        {children}
        <Toaster richColors position="top-center" theme="dark" />
      </body>
    </html>
  );
}
