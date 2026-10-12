import type { Metadata } from 'next';
import { Prompt } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const prompt = Prompt({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ระบบบันทึกชั่วโมงกิจกรรมนักศึกษา',
  description: 'ระบบบันทึกและตรวจสอบชั่วโมงกิจกรรมนักศึกษา เชื่อมต่อ Google Sheets',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${prompt.className} antialiased bg-slate-50 min-h-screen flex flex-col`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t bg-white py-6 text-center text-xs text-slate-500">
          <p>© ระบบบันทึกชั่วโมงกิจกรรมนักศึกษา • รองรับ Google Sheets & Vercel</p>
        </footer>
      </body>
    </html>
  );
}
