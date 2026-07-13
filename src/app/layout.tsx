
import type { Metadata } from 'next';
import './globals.css';
import { ThemeAwareToaster } from "@/components/shared/theme";

/** Runs before paint so the stored theme applies without a flash. Dark is the default. */
const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem("biweb-theme")!=="light")document.documentElement.classList.add("dark")}catch(e){document.documentElement.classList.add("dark")}})()`;

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
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans bg-background text-foreground">
        {children}
        <ThemeAwareToaster />
      </body>
    </html>
  );
}
