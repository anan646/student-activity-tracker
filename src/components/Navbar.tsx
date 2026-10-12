import Link from 'next/link';
import { Award, Users, ShieldCheck, Sparkles } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="border-b border-purple-100/70 bg-white/80 backdrop-blur-xl sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 sm:h-20 items-center">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center space-x-3.5 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-fuchsia-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform duration-300">
              <Award className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg bg-gradient-to-r from-purple-900 via-indigo-950 to-purple-800 bg-clip-text text-transparent">
                  ระบบบันทึกชั่วโมงกิจกรรม
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                  FTU
                </span>
              </div>
              <p className="text-[11px] text-purple-900/50 font-medium">Student Activity Hour Tracker</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link
              href="/"
              className="flex items-center space-x-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-purple-900/70 hover:text-purple-900 hover:bg-purple-50/70 transition-all duration-200"
            >
              <Users className="w-4 h-4 text-purple-600" />
              <span>หน้านักศึกษา</span>
            </Link>

            <Link
              href="/admin"
              className="flex items-center space-x-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 text-white hover:opacity-95 shadow-md shadow-purple-600/20 active:scale-95 transition-all duration-200"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>ระบบแอดมิน</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
