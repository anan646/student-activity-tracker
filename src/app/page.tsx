'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { 
  Search, 
  Award, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  BookOpen, 
  Clock, 
  HeartHandshake, 
  Briefcase, 
  QrCode, 
  Printer,
  Sparkles,
  TrendingUp,
  GraduationCap
} from 'lucide-react';
import { StudentSummary } from '@/types';

export default function StudentPortal() {
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StudentSummary | null>(null);
  const [showQR, setShowQR] = useState(false);

  const TARGET_HOURS = 60; // เกณฑ์ชั่วโมงสะสมขั้นต่ำตลอดหลักสูตร

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/students?studentId=${encodeURIComponent(studentId.trim())}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'ไม่พบข้อมูลนักศึกษารหัสนี้ในฐานข้อมูล Google Sheets');
      }

      setData(json);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'มหาวิทยาลัย':
        return {
          icon: <Award className="w-5 h-5 text-indigo-600" />,
          bg: 'bg-indigo-50/70 border-indigo-100 text-indigo-900',
          accent: 'text-indigo-600',
        };
      case 'คณะ/สาขา':
        return {
          icon: <Briefcase className="w-5 h-5 text-blue-600" />,
          bg: 'bg-blue-50/70 border-blue-100 text-blue-900',
          accent: 'text-blue-600',
        };
      case 'บำเพ็ญประโยชน์/จิตอาสา':
        return {
          icon: <HeartHandshake className="w-5 h-5 text-emerald-600" />,
          bg: 'bg-emerald-50/70 border-emerald-100 text-emerald-900',
          accent: 'text-emerald-600',
        };
      case 'ส่งเสริมวิชาการ/วิชาชีพ':
        return {
          icon: <BookOpen className="w-5 h-5 text-amber-600" />,
          bg: 'bg-amber-50/70 border-amber-100 text-amber-900',
          accent: 'text-amber-600',
        };
      default:
        return {
          icon: <Clock className="w-5 h-5 text-slate-600" />,
          bg: 'bg-slate-50 border-slate-100 text-slate-900',
          accent: 'text-slate-600',
        };
    }
  };

  const percentage = data ? Math.min(100, Math.round((data.totalHours / TARGET_HOURS) * 100)) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      {/* Hero Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-3">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span>ระบบตรวจสอบชั่วโมงกิจกรรมออนไลน์ (เชื่อมต่อ Google Sheets)</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          ระบบบันทึกชั่วโมงกิจกรรมนักศึกษา
        </h1>
        <p className="text-slate-500 mt-2.5 text-sm sm:text-base max-w-xl mx-auto">
          ตรวจสอบประวัติการเข้าร่วมกิจกรรมสะสม เกณฑ์สำเร็จการศึกษา และดาวน์โหลดใบรายงานผลกิจกรรมได้ตลอด 24 ชั่วโมง
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 sm:p-8 mb-10 max-w-xl mx-auto transition-all">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="กรอกรหัสนักศึกษา เช่น 6601001"
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-800 font-semibold placeholder:font-normal placeholder:text-slate-400 text-base transition"
              required
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-4" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-2xl transition shadow-lg shadow-indigo-600/20 disabled:bg-indigo-300 flex items-center justify-center gap-2 cursor-pointer text-base"
          >
            {loading ? (
              <span className="inline-block animate-spin">⏳</span>
            ) : (
              <span>ตรวจสอบ</span>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl flex items-center gap-3 text-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4 text-xs text-slate-400 text-center flex items-center justify-center gap-2">
          <span>💡 นักศึกษาตัวอย่างใน Google Sheet:</span>
          <button 
            type="button"
            onClick={() => setStudentId('6601001')}
            className="text-indigo-600 font-mono font-medium hover:underline cursor-pointer"
          >
            6601001
          </button>
          <span>•</span>
          <button 
            type="button"
            onClick={() => setStudentId('6701001')}
            className="text-indigo-600 font-mono font-medium hover:underline cursor-pointer"
          >
            6701001
          </button>
        </div>
      </div>

      {/* Student Data Content */}
      {data && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* การ์ดข้อมูลส่วนตัว & ภาพรวม */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-100">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/20">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                      ID: {data.student.studentId}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
                      ชั้นปีที่ {data.student.yearLevel}
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900">{data.student.name}</h2>
                  <p className="text-sm text-slate-500 font-medium">
                    สาขาวิชา{data.student.major} • ปีการศึกษา {data.student.academicYear}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-indigo-600" />
                  <span>{showQR ? 'ซ่อน QR Code' : 'แสดงบัตร QR Code'}</span>
                </button>

                <a
                  href={`/api/export?type=student&studentId=${data.student.studentId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-emerald-600/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Transcript (Excel)</span>
                </a>
              </div>
            </div>

            {/* Modal/Box แสดง QR Code ด่วน */}
            {showQR && (
              <div className="my-6 p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center animate-in zoom-in-95">
                <h4 className="text-sm font-bold text-slate-800 mb-1">บัตรนักศึกษาดิจิทัลสำหรับสแกนเข้ากิจกรรม</h4>
                <p className="text-xs text-slate-500 mb-4">แสดง QR Code นี้แก่สตาฟหรืออาจารย์เพื่อเช็คชื่อชั่วโมงกิจกรรม</p>
                <div className="p-4 bg-white rounded-2xl inline-block shadow-sm border">
                  <QRCode value={data.student.studentId} size={160} />
                </div>
                <p className="mt-3 font-mono font-bold text-slate-800 text-base tracking-wider">{data.student.studentId}</p>
                <p className="text-xs text-slate-500">{data.student.name}</p>
              </div>
            )}

            {/* แถบ Progress และสถานะเกณฑ์สะสม */}
            <div className="mt-8">
              <div className="flex justify-between items-end mb-3">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    ความคืบหน้าชั่วโมงกิจกรรมทั้งหมด
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">{data.totalHours}</span>
                    <span className="text-slate-400 text-sm font-medium">/ {TARGET_HOURS} ชั่วโมง</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black text-indigo-600">{percentage}%</span>
                </div>
              </div>

              {/* Progress Bar ดีไซน์นุ่มนวล */}
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden p-0.5 border border-slate-200/50">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="mt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs gap-2">
                <div>
                  {data.totalHours >= TARGET_HOURS ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> บรรลุเกณฑ์ชั่วโมงกิจกรรมขั้นต่ำสำหรับจบการศึกษาแล้ว
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> ยังขาดอีก {TARGET_HOURS - data.totalHours} ชั่วโมง จึงจะครบตามเกณฑ์บังคับ
                    </span>
                  )}
                </div>
                <span className="text-slate-400">เกณฑ์บังคับตลอดหลักสูตร: {TARGET_HOURS} ชั่วโมง</span>
              </div>
            </div>

            {/* การ์ดสถิติแยก 4 หมวดหมู่ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              {Object.entries(data.hoursByCategory).map(([cat, hrs]) => {
                const theme = getCategoryTheme(cat);
                return (
                  <div key={cat} className={`p-4 rounded-2xl border ${theme.bg} transition hover:shadow-sm`}>
                    <div className="flex items-center gap-2 mb-2">
                      {theme.icon}
                      <span className="text-xs font-bold truncate">{cat}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black">{hrs}</span>
                      <span className="text-xs font-semibold opacity-70">ชั่วโมง</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* รายการประวัติกิจกรรม */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-lg">ประวัติกิจกรรมที่เข้าร่วม</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                  {data.records.length} รายการ
                </span>
              </div>
            </div>

            {data.records.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-slate-500">ยังไม่พบประวัติการเข้าร่วมกิจกรรม</p>
                <p className="text-xs text-slate-400 mt-1">เมื่อสแกนหรือเข้าร่วมกิจกรรม ข้อมูลจะปรากฏที่นี่</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.records.map((rec) => (
                  <div key={rec.id} className="p-5 hover:bg-slate-50/70 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {rec.category}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {rec.dateRecorded}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base">{rec.activityTitle}</h4>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                      <div className="text-right">
                        <span className="font-extrabold text-indigo-600 text-lg">+{rec.hoursEarned}</span>
                        <span className="text-xs text-slate-500 font-medium ml-1">ชม.</span>
                      </div>
                      <div>
                        {rec.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> อนุมัติแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                            รอตรวจสอบ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
