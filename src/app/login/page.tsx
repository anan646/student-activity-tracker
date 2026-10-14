'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QrCode, ShieldCheck, User, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const cleanId = studentId.trim();
      if (!cleanId) {
        throw new Error('กรุณากรอกรหัสนักศึกษา');
      }

      // ตรวจสอบกับ API ว่ามีรหัสนักศึกษานี้จริงหรือไม่
      const res = await fetch(`/api/students?studentId=${encodeURIComponent(cleanId)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'ไม่พบรหัสนักศึกษานี้ในระบบ EDU Pass');
      }

      // บันทึก Session ลง localStorage
      const sessionData = JSON.stringify({
        role: 'student',
        studentId: cleanId,
        name: data.student.name,
        major: data.student.major,
      });
      localStorage.setItem('edupass_user', sessionData);
      localStorage.setItem('unipass_user', sessionData); // backward compatibility

      router.push(`/student?id=${cleanId}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center px-4 py-12">
      <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-purple-950/10 border border-purple-100 p-6 sm:p-10 max-w-md w-full animate-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-purple-600/30">
            <QrCode className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-purple-950 tracking-tight">
            EDU Pass <span className="bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent">FTU</span>
          </h1>
          <p className="text-xs sm:text-sm text-purple-900/60 mt-1.5 font-medium">
            ระบบจัดการกิจกรรมและเช็คอินด้วย QR Code คณะศึกษาศาสตร์
          </p>
        </div>

        {/* Student Login Card Header Badge */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/80">
            <User className="w-3.5 h-3.5 text-purple-600" />
            เข้าสู่ระบบสำหรับนักศึกษา
          </span>
        </div>

        {/* Form Login สำหรับนักศึกษา */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-purple-950 mb-1.5">
              รหัสนักศึกษา (Student ID) *
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="กรอกรหัสนักศึกษา เช่น 661441001"
              className="w-full py-3.5 px-4 rounded-2xl border border-purple-100 bg-purple-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-purple-950 font-bold placeholder:font-normal placeholder:text-purple-900/30 text-base transition"
              autoFocus
              required
            />
            <p className="text-[11px] text-purple-900/50 mt-1.5">
              * ใช้เพียงแค่รหัสนักศึกษาเพื่อเปิดบัตร EDU Pass และดูประวัติของตนเอง
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-bold animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-700 hover:opacity-95 active:scale-95 text-white font-bold rounded-2xl transition shadow-lg shadow-purple-700/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base mt-2"
          >
            {loading ? (
              <span className="inline-block animate-spin">⏳ กำลังตรวจสอบ...</span>
            ) : (
              <>
                <span>เข้าสู่ระบบ EDU Pass</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* แยกทางเข้าของเจ้าหน้าที่/แอดมิน อย่างชัดเจน */}
        <div className="mt-8 pt-6 border-t border-purple-100 text-center">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-xs font-bold text-purple-900/60 hover:text-purple-900 bg-purple-50 hover:bg-purple-100/80 px-4 py-2.5 rounded-xl border border-purple-200/70 transition cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>เข้าสู่ระบบสำหรับเจ้าหน้าที่และผู้ดูแลระบบ (Admin Portal) →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
