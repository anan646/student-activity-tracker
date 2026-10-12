import type { Metadata } from 'next';
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
  title: 'ระบบบันทึกชั่วโมงกิจกรรมนักศึกษา | Student Activity Tracker',
  description: 'ระบบบันทึกและตรวจสอบชั่วโมงกิจกรรมนักศึกษาออนไลน์ เชื่อมต่อ Google Sheets',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={prompt.variable}>
      <body className="font-sans antialiased bg-[#fcfaff] text-[#1e1333] min-h-screen flex flex-col selection:bg-purple-200 selection:text-purple-900">
        <div className="fixed inset-0 purple-gradient-hero pointer-events-none -z-10" />
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-purple-100/60 bg-white/70 backdrop-blur-md py-6 text-center text-xs text-purple-900/40">
          <p>© ระบบบันทึกชั่วโมงกิจกรรมนักศึกษา • สถาบันการศึกษา • เชื่อมต่อ Google Sheets</p>
        </footer>
      </body>
    </html>
  );
}
