import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import '../globals.css';

/**
 * /admin 子树自带根 <html>（后台在 locale 前缀之外，界面仅中文）。
 * [locale]/layout 是前台的 html 根；admin 与其平级，故这里独立提供。
 */
export const metadata: Metadata = {
  title: 'Aurora 管理后台',
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="min-h-screen bg-bg font-sans text-text-primary antialiased">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
