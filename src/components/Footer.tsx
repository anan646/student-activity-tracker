'use client';

import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="border-t border-purple-100/60 bg-white/70 backdrop-blur-md py-6 text-center text-xs text-purple-900/40">
      <p>© ระบบบันทึกชั่วโมงกิจกรรมนักศึกษา UniPass • มหาวิทยาลัยฟาฏอนี • เชื่อมต่อ Google Sheets</p>
    </footer>
  );
}
