'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { QrCode, ShieldCheck, LogOut, User, BarChart3, Calendar, Layers } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('unipass_user');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {}
    } else {
      setCurrentUser(null);
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('unipass_user');
    setCurrentUser(null);
    router.push('/login');
  };

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <nav className="border-b border-purple-100/70 bg-white/90 backdrop-blur-xl sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 sm:h-20 items-center">
          {/* UniPass Brand Logo */}
          <Link href="/" className="flex items-center space-x-3.5 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 group-hover:scale-105 transition-transform duration-300">
              <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg sm:text-xl tracking-tight bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 bg-clip-text text-transparent">
                  UniPass
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-purple-100 to-fuchsia-100 text-purple-800 border border-purple-200">
                  FTU
                </span>
              </div>
              <p className="text-[11px] text-purple-900/50 font-medium">ระบบจัดการกิจกรรมและเช็คอินด้วย QR Code</p>
            </div>
          </Link>

          {/* User Nav Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {currentUser?.role === 'student' && (
              <>
                <Link
                  href="/student"
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-purple-900/80 hover:text-purple-950 hover:bg-purple-50 transition"
                >
                  <User className="w-4 h-4 text-purple-600" />
                  <span className="hidden sm:inline">บัตรของฉัน:</span>
                  <span className="font-mono text-purple-700">{currentUser.studentId}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">ออก</span>
                </button>
              </>
            )}

            {currentUser?.role === 'admin' && (
              <>
                <Link
                  href="/admin"
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 transition"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>แอดมิน</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">ออก</span>
                </button>
              </>
            )}

            {!currentUser && pathname !== '/login' && (
              <Link
                href="/login"
                className="flex items-center space-x-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-700 text-white hover:opacity-95 shadow-md shadow-purple-700/20 active:scale-95 transition"
              >
                <span>เข้าสู่ระบบ UniPass</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
