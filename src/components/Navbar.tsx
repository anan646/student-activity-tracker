import Link from 'next/link';
import { Award, Users, ShieldCheck, ExternalLink, QrCode } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="border-b border-purple-100/70 bg-white/85 backdrop-blur-xl sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 sm:h-20 items-center">
          {/* Logo & Brand: FTU UniPass Activity */}
          <Link href="/" className="flex items-center space-x-3.5 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 group-hover:scale-105 transition-transform duration-300">
              <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-800 bg-clip-text text-transparent">
                  UniPass FTU
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-purple-100 to-fuchsia-100 text-purple-800 border border-purple-200">
                  Activity Tracker
                </span>
              </div>
              <p className="text-[11px] text-purple-900/50 font-medium">ระบบบันทึกชั่วโมงกิจกรรมและเช็คอิน QR Code</p>
            </div>
          </Link>

          {/* Navigation & FTU Ecosystem Links */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link
              href="/"
              className="flex items-center space-x-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-purple-900/70 hover:text-purple-900 hover:bg-purple-50 transition"
            >
              <Users className="w-4 h-4 text-purple-600" />
              <span>บัตร UniPass นศ.</span>
            </Link>

            <Link
              href="/admin"
              className="flex items-center space-x-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-700 text-white hover:opacity-95 shadow-md shadow-purple-700/20 active:scale-95 transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>ระบบแอดมิน</span>
            </Link>

            {/* Quick Link ไปยัง UniPass FTU ทางการ */}
            <a
              href="https://unipass.ftu.ac.th/"
              target="_blank"
              rel="noreferrer"
              className="hidden md:flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold text-purple-900/50 hover:text-purple-900 hover:bg-purple-50/70 transition"
              title="ไปยังเว็บไซต์ UniPass FTU หลัก"
            >
              <span>UniPass Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
