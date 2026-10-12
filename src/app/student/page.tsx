'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'react-qr-code';
import { 
  Award, 
  Calendar, 
  CheckCircle2, 
  Download, 
  BookOpen, 
  Clock, 
  HeartHandshake, 
  Briefcase, 
  GraduationCap,
  LogOut,
  Sparkles,
  QrCode,
  User,
  ShieldCheck
} from 'lucide-react';
import { StudentSummary } from '@/types';

function StudentPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<StudentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const TARGET_HOURS = 60;

  useEffect(() => {
    // ดึง studentId จาก URL query หรือ localStorage
    let id = searchParams.get('id');
    if (!id) {
      const saved = localStorage.getItem('unipass_user');
      if (saved) {
        try {
          const user = JSON.parse(saved);
          if (user.role === 'student') {
            id = user.studentId;
          }
        } catch (e) {}
      }
    }

    if (!id) {
      router.push('/login');
      return;
    }

    fetchStudentData(id);
  }, [searchParams]);

  const fetchStudentData = async (studentId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students?studentId=${encodeURIComponent(studentId)}`);
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      router.push('/login');
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

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <span className="inline-block animate-spin text-3xl">⏳</span>
        <p className="text-sm font-bold text-purple-900/60">กำลังโหลดบัตร UniPass ของคุณ...</p>
      </div>
    );
  }

  if (!data) return null;

  const percentage = Math.min(100, Math.round((data.totalHours / TARGET_HOURS) * 100));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-in fade-in duration-300">
      {/* Top Profile Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-purple-100 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-purple-700/20">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-purple-700 px-2 py-0.5 rounded-lg bg-purple-100">
                นักศึกษาปัจจุบัน
              </span>
              <span className="text-xs font-mono font-bold text-purple-900/40">
                {data.student.studentId}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-purple-950">{data.student.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <a
            href={`/api/export?type=student&studentId=${data.student.studentId}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-md shadow-emerald-600/20 active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลด Activity Transcript (Excel)</span>
          </a>
        </div>
      </div>

      {/* Virtual Student Card (บัตรนักศึกษาดิจิทัล UniPass) */}
      <div className="max-w-md mx-auto bg-gradient-to-br from-purple-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-6 sm:p-7 shadow-2xl shadow-purple-950/35 border border-purple-500/20 relative overflow-hidden">
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
          <p className="mt-3 font-mono font-black text-2xl tracking-widest text-white">{data.student.studentId}</p>
          <h2 className="text-lg font-bold text-purple-100">{data.student.name}</h2>
          <p className="text-xs font-semibold text-purple-300">
            สาขาวิชา{data.student.major} • ชั้นปีที่ {data.student.yearLevel}
          </p>
        </div>

        {/* Card Footer */}
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

      {/* ความคืบหน้าเกณฑ์ชั่วโมงตลอดหลักสูตร */}
      <div className="bg-white rounded-3xl shadow-xl shadow-purple-950/5 border border-purple-100 p-6 sm:p-8">
        <div className="flex justify-between items-end mb-2.5">
          <div>
            <span className="text-[11px] font-bold text-purple-900/50 uppercase tracking-wider block mb-0.5">
              ความคืบหน้าชั่วโมงกิจกรรมสะสมตลอดหลักสูตร
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

        <div className="w-full bg-purple-100/60 rounded-full h-4 overflow-hidden p-0.5">
          <div
            className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 h-full rounded-full transition-all duration-700 shadow-sm"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* แยกตามหมวดหมู่ */}
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

      {/* ประวัติการเช็คอินกิจกรรม */}
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
  );
}

export default function StudentPortal() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
          <span className="inline-block animate-spin text-3xl">⏳</span>
          <p className="text-sm font-bold text-purple-900/60">กำลังโหลดบัตร UniPass ของคุณ...</p>
        </div>
      }
    >
      <StudentPortalContent />
    </Suspense>
  );
}
