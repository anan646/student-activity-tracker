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
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import { StudentSummary } from '@/types';

export default function StudentPortal() {
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StudentSummary | null>(null);
  const [passTab, setPassTab] = useState<'card' | 'history'>('card');

  const TARGET_HOURS = 60; // เกณฑ์ 60 ชม.

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/students?studentId=${encodeURIComponent(studentId.trim())}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'ไม่พบข้อมูลนักศึกษารหัสนี้ในระบบ UniPass');
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

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'มหาวิทยาลัย':
        return {
          icon: <Award className="w-5 h-5 text-purple-600" />,
          cardBg: 'bg-purple-50/70 border-purple-200/70 text-purple-950',
          numberColor: 'text-purple-700',
        };
      case 'คณะ/สาขา':
        return {
          icon: <Briefcase className="w-5 h-5 text-indigo-600" />,
          cardBg: 'bg-indigo-50/70 border-indigo-200/70 text-indigo-950',
          numberColor: 'text-indigo-700',
        };
      case 'บำเพ็ญประโยชน์/จิตอาสา':
        return {
          icon: <HeartHandshake className="w-5 h-5 text-fuchsia-600" />,
          cardBg: 'bg-fuchsia-50/70 border-fuchsia-200/70 text-fuchsia-950',
          numberColor: 'text-fuchsia-700',
        };
      case 'ส่งเสริมวิชาการ/วิชาชีพ':
        return {
          icon: <BookOpen className="w-5 h-5 text-violet-600" />,
          cardBg: 'bg-violet-50/70 border-violet-200/70 text-violet-950',
          numberColor: 'text-violet-700',
        };
      default:
        return {
          icon: <Clock className="w-5 h-5 text-slate-600" />,
          cardBg: 'bg-slate-50 border-slate-200 text-slate-800',
          numberColor: 'text-slate-800',
        };
    }
  };

  const percentage = data ? Math.min(100, Math.round((data.totalHours / TARGET_HOURS) * 100)) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      {/* Hero Section สไตล์ UniPass FTU */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-100 to-fuchsia-100 border border-purple-200 text-purple-900 text-xs font-bold mb-4 shadow-sm animate-in fade-in">
          <Zap className="w-3.5 h-3.5 text-purple-600" />
          <span>Fatoni University • UniPass Digital Student Pass & Activity System</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-purple-950 mb-3">
          UniPass <span className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">บัตรกิจกรรมดิจิทัล</span>
        </h1>
        <p className="text-purple-900/60 text-sm sm:text-base max-w-xl mx-auto font-normal">
          ระบบเช็คอินด้วย QR Code และตรวจสอบชั่วโมงกิจกรรมนักศึกษา มหาวิทยาลัยฟาฏอนี
        </p>
      </div>

      {/* กล่องค้นหา (Search Box) UniPass Minimal */}
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100 p-4 sm:p-6 mb-10 max-w-xl mx-auto">
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
            className="px-7 py-3.5 bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-700 hover:opacity-95 active:scale-95 text-white font-bold rounded-2xl transition shadow-md shadow-purple-700/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
          >
            {loading ? (
              <span className="inline-block animate-spin text-base">⏳</span>
            ) : (
              <span>เปิดบัตร UniPass</span>
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
          <span>💡 นักศึกษาตัวอย่างในระบบ:</span>
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

      {/* ผลลัพธ์ข้อมูล: FTU Virtual UniPass Card */}
      {data && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Virtual Student Card (บัตรนักศึกษาดิจิทัล UniPass เสมือนจริง) */}
          <div className="max-w-md mx-auto bg-gradient-to-br from-purple-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-6 sm:p-7 shadow-2xl shadow-purple-950/30 border border-purple-500/20 relative overflow-hidden">
            {/* Background Glow Accents */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-fuchsia-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-44 h-44 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Card Header */}
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                  <GraduationCap className="w-6 h-6 text-purple-200" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-wide text-white">FATONI UNIVERSITY</h3>
                  <p className="text-[10px] text-purple-200/70 font-semibold tracking-widest uppercase">Student UniPass ID</p>
                </div>
              </div>

              <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-bold text-purple-200">
                ปีการศึกษา {data.student.academicYear}
              </div>
            </div>

            {/* QR Code Center Section */}
            <div className="my-4 text-center relative z-10">
              <div className="p-3.5 bg-white rounded-2xl inline-block shadow-lg">
                <QRCode value={data.student.studentId} size={150} />
              </div>
              <p className="mt-3 font-mono font-black text-xl tracking-widest text-white">{data.student.studentId}</p>
              <h2 className="text-lg font-bold text-purple-100">{data.student.name}</h2>
              <p className="text-xs font-semibold text-purple-300">
                สาขาวิชา{data.student.major} • ชั้นปีที่ {data.student.yearLevel}
              </p>
            </div>

            {/* Card Footer: Hours Badge */}
            <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center relative z-10">
              <div>
                <span className="text-[10px] text-purple-200/60 uppercase block font-bold">ชั่วโมงสะสมรวม</span>
                <span className="text-xl font-black text-white">{data.totalHours} <span className="text-xs font-normal text-purple-300">/ {TARGET_HOURS} ชม.</span></span>
              </div>

              <div>
                {data.totalHours >= TARGET_HOURS ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ครบเกณฑ์แล้ว
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/30 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> ขาดอีก {TARGET_HOURS - data.totalHours} ชม.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={`/api/export?type=student&studentId=${data.student.studentId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-md shadow-emerald-600/20 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลด Activity Transcript (Excel)</span>
            </a>

            <a
              href="https://unipass.ftu.ac.th/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 text-purple-900 text-xs sm:text-sm font-bold transition shadow-sm"
            >
              <span>ไปยัง UniPass Portal หลัก</span>
              <ExternalLink className="w-3.5 h-3.5 text-purple-500" />
            </a>
          </div>

          {/* สรุปชั่วโมง 4 หมวดหมู่กิจกรรม */}
          <div className="bg-white rounded-3xl shadow-xl shadow-purple-950/5 border border-purple-100 p-6 sm:p-8">
            <h3 className="font-extrabold text-purple-950 text-base sm:text-lg mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              <span>สถิติชั่วโมงกิจกรรมแยกตามหมวดหมู่</span>
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
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

          {/* รายการประวัติการเข้าร่วมกิจกรรม */}
          <div className="bg-white rounded-3xl shadow-xl shadow-purple-950/5 border border-purple-100 overflow-hidden">
            <div className="p-6 border-b border-purple-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 rounded-xl">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-extrabold text-purple-950 text-base sm:text-lg">ประวัติกิจกรรมที่ได้รับการเช็คอิน</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                  {data.records.length} รายการ
                </span>
              </div>
            </div>

            {data.records.length === 0 ? (
              <div className="py-16 text-center text-purple-900/40">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30 text-purple-600" />
                <p className="font-bold text-purple-900/60">ยังไม่มีประวัติการเช็คอินกิจกรรม</p>
                <p className="text-xs text-purple-900/40 mt-1">เมื่อแสดงบัตร UniPass เพื่อสแกนหน้างาน ชั่วโมงจะแสดงขึ้นที่นี่</p>
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
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> เช็คอินแล้ว
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
