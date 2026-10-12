import Link from 'next/link';
import { Award, Users, CalendarCheck, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="border-b bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <Link href="/" className="font-bold text-lg text-slate-800 hover:text-indigo-600 transition">
                ระบบบันทึกชั่วโมงกิจกรรมนักศึกษา
              </Link>
              <p className="text-xs text-slate-400">Student Activity Hour Management System</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link
              href="/"
              className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition"
            >
              <Users className="w-4 h-4" />
              <span>หน้านักศึกษา</span>
            </Link>

            <Link
              href="/admin"
              className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
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
