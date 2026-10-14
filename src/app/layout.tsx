import type { Metadata, Viewport } from 'next';
import { Prompt } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const prompt = Prompt({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-prompt',
});

export const metadata: Metadata = {
  title: 'EDU Pass | ระบบบันทึกชั่วโมงกิจกรรมนักศึกษา คณะศึกษาศาสตร์',
  description: 'ระบบบันทึกและตรวจสอบชั่วโมงกิจกรรมนักศึกษาออนไลน์ คณะศึกษาศาสตร์ มหาวิทยาลัยฟาฏอนี เชื่อมต่อ Google Sheets',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'EDU Pass FTU',
  },
};

export const viewport: Viewport = {
  themeColor: '#7c3aed',
};

import Footer from '@/components/Footer';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={prompt.variable}>
      <body className="font-sans antialiased bg-[#f8fafc] text-[#1e1333] min-h-screen flex flex-col selection:bg-blue-100 selection:text-blue-900">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
