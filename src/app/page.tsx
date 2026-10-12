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
  Sparkles, 
  GraduationCap,
  Layers,
  ChevronRight,
  User
} from 'lucide-react';
import { StudentSummary } from '@/types';

export default function StudentPortal() {
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StudentSummary | null>(null);
  const [showQR, setShowQR] = useState(false);

  const TARGET_HOURS = 60; // เกณฑ์สะสม 60 ชม.

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/students?studentId=${encodeURIComponent(studentId.trim())}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'ไม่พบข้อมูลนักศึกษารหัสนี้ในระบบ');
      }

      setData(json);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('เกิดข้อผิดพลาดในการค้นหา');
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // ธีมสีม่วงหลากหลายเฉดตามหมวดกิจกรรม
  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'มหาวิทยาลัย':
        return {
          icon: <Award className="w-5 h-5 text-purple-600" />,
          cardBg: 'bg-purple-50/70 border-purple-200/70 text-purple-950',
          badgeBg: 'bg-purple-100 text-purple-700',
          numberColor: 'text-purple-700',
        };
      case 'คณะ/สาขา':
        return {
          icon: <Briefcase className="w-5 h-5 text-indigo-600" />,
          cardBg: 'bg-indigo-50/70 border-indigo-200/70 text-indigo-950',
          badgeBg: 'bg-indigo-100 text-indigo-700',
          numberColor: 'text-indigo-700',
        };
      case 'บำเพ็ญประโยชน์/จิตอาสา':
        return {
          icon: <HeartHandshake className="w-5 h-5 text-fuchsia-600" />,
          cardBg: 'bg-fuchsia-50/70 border-fuchsia-200/70 text-fuchsia-950',
          badgeBg: 'bg-fuchsia-100 text-fuchsia-700',
          numberColor: 'text-fuchsia-700',
        };
      case 'ส่งเสริมวิชาการ/วิชาชีพ':
        return {
          icon: <BookOpen className="w-5 h-5 text-violet-600" />,
          cardBg: 'bg-violet-50/70 border-violet-200/70 text-violet-950',
          badgeBg: 'bg-violet-100 text-violet-700',
          numberColor: 'text-violet-700',
        };
      default:
        return {
          icon: <Clock className="w-5 h-5 text-slate-600" />,
          cardBg: 'bg-slate-50 border-slate-200 text-slate-800',
          badgeBg: 'bg-slate-100 text-slate-700',
          numberColor: 'text-slate-800',
        };
    }
  };

  const percentage = data ? Math.min(100, Math.round((data.totalHours / TARGET_HOURS) * 100)) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-14">
      {/* Hero Section */}
      <div className="text-center mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full purple-badge text-purple-800 text-xs font-bold mb-4 shadow-sm animate-in fade-in">
          <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
          <span>ระบบตรวจสอบชั่วโมงกิจกรรมออนไลน์ • มหาวิทยาลัยฟาฏอนี</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-purple-950 mb-3">
          สะสมชั่วโมง <span className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">กิจกรรมนักศึกษา</span>
        </h1>
        <p className="text-purple-900/60 text-sm sm:text-base max-w-xl mx-auto font-normal">
          ตรวจสอบความคืบหน้าของตนเอง ดาวน์โหลดใบทรานสคริปต์ และแสดงบัตร QR Code ประจำตัวเพื่อเข้าร่วมกิจกรรม
        </p>
      </div>

      {/* กล่องค้นหา (Search Box) Minimal Purple */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100 p-4 sm:p-6 mb-10 max-w-xl mx-auto">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="กรอกรหัสนักศึกษา เช่น 661441001"
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-purple-100 bg-purple-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-purple-950 font-semibold placeholder:font-normal placeholder:text-purple-900/30 text-sm sm:text-base transition-all"
              required
            />
            <Search className="w-5 h-5 text-purple-400 absolute left-3.5 top-4" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-7 py-3.5 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:opacity-95 active:scale-95 text-white font-bold rounded-2xl transition-all shadow-md shadow-purple-600/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
          >
            {loading ? (
              <span className="inline-block animate-spin text-base">⏳</span>
            ) : (
              <span>ตรวจสอบ</span>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-3.5 p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-center gap-2.5 text-rose-700 text-xs sm:text-sm animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-3.5 text-xs text-purple-900/40 text-center flex flex-wrap items-center justify-center gap-1.5">
          <span>💡 ทดลองคลิกตรวจรหัสจริง:</span>
          <button 
            type="button"
            onClick={() => setStudentId('661441001')}
            className="text-purple-700 font-mono font-bold hover:underline cursor-pointer px-1.5 py-0.5 rounded bg-purple-50"
          >
            661441001 (อิสลามศึกษา)
          </button>
          <span>•</span>
          <button 
            type="button"
            onClick={() => setStudentId('692447060')}
            className="text-purple-700 font-mono font-bold hover:underline cursor-pointer px-1.5 py-0.5 rounded bg-purple-50"
          >
            692447060 (ปฐมวัย)
          </button>
        </div>
      </div>

      {/* ผลลัพธ์ข้อมูลนักศึกษา */}
      {data && (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
          {/* Card ข้อมูลส่วนตัว & ความคืบหน้า */}
          <div className="bg-white rounded-3xl shadow-xl shadow-purple-950/5 border border-purple-100 p-6 sm:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-purple-50">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-purple-600/20">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-purple-100 text-purple-800">
                      ID: {data.student.studentId}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200/50">
                      ชั้นปีที่ {data.student.yearLevel}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-purple-950">{data.student.name}</h2>
                  <p className="text-sm font-semibold text-purple-700 mt-0.5">
                    สาขาวิชา{data.student.major} <span className="text-purple-300">•</span> ปีการศึกษา {data.student.academicYear}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-50/50 text-purple-800 text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-purple-600" />
                  <span>{showQR ? 'ซ่อนบัตร QR' : 'แสดงบัตร QR Code'}</span>
                </button>

                <a
                  href={`/api/export?type=student&studentId=${data.student.studentId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-md shadow-emerald-600/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Excel (.xlsx)</span>
                </a>
              </div>
            </div>

            {/* กล่องแสดงบัตร QR Code */}
            {showQR && (
              <div className="my-6 p-6 rounded-3xl bg-gradient-to-b from-purple-50/80 to-indigo-50/40 border border-purple-200/70 text-center animate-in zoom-in-95">
                <h4 className="text-sm font-bold text-purple-950 mb-1">บัตรนักศึกษาดิจิทัลสำหรับเช็คชื่อกิจกรรม</h4>
                <p className="text-xs text-purple-900/60 mb-5">แสดง QR Code นี้ให้เจ้าหน้าที่หน้างานสแกนบันทึกชั่วโมง</p>
                <div className="p-4 bg-white rounded-2xl inline-block shadow-md shadow-purple-950/5 border border-purple-100">
                  <QRCode value={data.student.studentId} size={160} />
                </div>
                <p className="mt-3.5 font-mono font-black text-purple-950 text-lg tracking-wider">{data.student.studentId}</p>
                <p className="text-xs font-semibold text-purple-700">{data.student.name} • {data.student.major}</p>
              </div>
            )}

            {/* แถบ Progress สะสมชั่วโมง */}
            <div className="mt-8">
              <div className="flex justify-between items-end mb-2.5">
                <div>
                  <span className="text-[11px] font-bold text-purple-900/50 uppercase tracking-wider block mb-0.5">
                    ความคืบหน้าชั่วโมงกิจกรรมสะสม
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-purple-950">{data.totalHours}</span>
                    <span className="text-purple-900/40 text-sm font-bold">/ {TARGET_HOURS} ชั่วโมง</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                    {percentage}%
                  </span>
                </div>
              </div>

              {/* Progress Bar Gradient */}
              <div className="w-full bg-purple-100/60 rounded-full h-4 overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="mt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs gap-2">
                <div>
                  {data.totalHours >= TARGET_HOURS ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ครบตามเกณฑ์ชั่วโมงกิจกรรมขั้นต่ำสำหรับจบการศึกษาแล้ว
                    </span>
                  ) : (
                    <span className="text-purple-800 font-bold flex items-center gap-1.5 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                      <Clock className="w-3.5 h-3.5 text-purple-600" /> ยังขาดอีก {TARGET_HOURS - data.totalHours} ชั่วโมง จึงจะครบเกณฑ์
                    </span>
                  )}
                </div>
                <span className="text-purple-900/40 font-medium">เกณฑ์บังคับตลอดหลักสูตร: {TARGET_HOURS} ชั่วโมง</span>
              </div>
            </div>

            {/* การ์ดสถิติแยกตามหมวดหมู่ (เฉดสีม่วงหลากสไตล์) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mt-8">
              {Object.entries(data.hoursByCategory).map(([cat, hrs]) => {
                const theme = getCategoryTheme(cat);
                return (
                  <div key={cat} className={`p-4 rounded-2xl border ${theme.cardBg} transition-all hover:scale-[1.02]`}>
                    <div className="flex items-center gap-2 mb-2">
                      {theme.icon}
                      <span className="text-xs font-bold truncate">{cat}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-2xl font-black ${theme.numberColor}`}>{hrs}</span>
                      <span className="text-xs font-semibold opacity-60">ชม.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* รายการประวัติกิจกรรมที่เข้าร่วม */}
          <div className="bg-white rounded-3xl shadow-xl shadow-purple-950/5 border border-purple-100 overflow-hidden">
            <div className="p-6 border-b border-purple-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 rounded-xl">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-extrabold text-purple-950 text-base sm:text-lg">ประวัติกิจกรรมที่เข้าร่วม</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                  {data.records.length} รายการ
                </span>
              </div>
            </div>

            {data.records.length === 0 ? (
              <div className="py-16 text-center text-purple-900/40">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30 text-purple-600" />
                <p className="font-bold text-purple-900/60">ยังไม่พบประวัติการเข้าร่วมกิจกรรม</p>
                <p className="text-xs text-purple-900/40 mt-1">เมื่อเข้าร่วมและได้รับการบันทึก ชั่วโมงจะแสดงขึ้นที่นี่</p>
              </div>
            ) : (
              <div className="divide-y divide-purple-50">
                {data.records.map((rec) => (
                  <div key={rec.id} className="p-5 hover:bg-purple-50/40 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-100">
                          {rec.category}
                        </span>
                        <span className="text-xs text-purple-900/40 font-mono">
                          {rec.dateRecorded}
                        </span>
                      </div>
                      <h4 className="font-bold text-purple-950 text-base">{rec.activityTitle}</h4>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                      <div className="text-right">
                        <span className="font-black text-purple-700 text-lg">+{rec.hoursEarned}</span>
                        <span className="text-xs text-purple-900/50 font-bold ml-1">ชม.</span>
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
