'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, ShieldCheck, User, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [studentId, setStudentId] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (role === 'student') {
        const cleanId = studentId.trim();
        if (!cleanId) {
          throw new Error('กรุณากรอกรหัสนักศึกษา');
        }

        // ตรวจสอบกับ API ว่ามีรหัสนักศึกษานี้จริงหรือไม่
        const res = await fetch(`/api/students?studentId=${encodeURIComponent(cleanId)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'ไม่พบรหัสนักศึกษานี้ในระบบ UniPass');
        }

        // บันทึก Session ลง localStorage
        localStorage.setItem(
          'unipass_user',
          JSON.stringify({
            role: 'student',
            studentId: cleanId,
            name: data.student.name,
            major: data.student.major,
          })
        );

        router.push(`/student?id=${cleanId}`);
      } else {
        // Admin Login
        if (adminPin === '1234' || adminPin === 'admin') {
          localStorage.setItem(
            'unipass_user',
            JSON.stringify({
              role: 'admin',
              name: 'ผู้ดูแลระบบ (Admin)',
            })
          );
          router.push('/admin');
        } else {
          throw new Error('รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง (รหัสคือ: 1234)');
        }
      }
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
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-purple-950/10 border border-purple-100 p-6 sm:p-10 max-w-md w-full animate-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-purple-600/30">
            <QrCode className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-purple-950 tracking-tight">
            UniPass <span className="bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent">FTU</span>
          </h1>
          <p className="text-xs sm:text-sm text-purple-900/50 mt-1">
            ระบบจัดการกิจกรรมและเช็คอินด้วย QR Code มหาวิทยาลัยฟาฏอนี
          </p>
        </div>

        {/* Role Selector (นักศึกษา vs เจ้าหน้าที่) */}
        <div className="flex bg-purple-100/60 p-1 rounded-2xl mb-6 text-xs sm:text-sm font-bold">
          <button
            type="button"
            onClick={() => { setRole('student'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition cursor-pointer ${
              role === 'student' ? 'bg-white text-purple-950 shadow-sm' : 'text-purple-900/60 hover:text-purple-950'
            }`}
          >
            <User className="w-4 h-4 text-purple-600" />
            <span>นักศึกษา</span>
          </button>
          <button
            type="button"
            onClick={() => { setRole('admin'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition cursor-pointer ${
              role === 'admin' ? 'bg-white text-purple-950 shadow-sm' : 'text-purple-900/60 hover:text-purple-950'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>ผู้ดูแล/แอดมิน</span>
          </button>
        </div>

        {/* Form Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          {role === 'student' ? (
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
              <p className="text-[11px] text-purple-900/40 mt-1">
                * ใช้เพียงแค่รหัสนักศึกษาเพื่อเปิดบัตร UniPass และดูประวัติของตนเอง
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-purple-950 mb-1.5">
                รหัสผ่านผู้ดูแลระบบ (Admin PIN) *
              </label>
              <input
                type="password"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="กรอกรหัส PIN (ค่าเริ่มต้น: 1234)"
                className="w-full text-center tracking-widest text-xl py-3.5 px-4 rounded-2xl border border-purple-100 bg-purple-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-purple-950 font-black transition"
                autoFocus
                required
              />
              <p className="text-[11px] text-purple-900/40 mt-1 text-center">
                * รหัสทดสอบตั้งต้น: <span className="font-mono font-bold text-purple-700">1234</span>
              </p>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-bold animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-700 hover:opacity-95 active:scale-95 text-white font-bold rounded-2xl transition shadow-lg shadow-purple-700/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
          >
            {loading ? (
              <span className="inline-block animate-spin">⏳ กำลังตรวจสอบ...</span>
            ) : (
              <>
                <span>เข้าสู่ระบบ UniPass</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Quick links */}
        {role === 'student' && (
          <div className="mt-6 pt-5 border-t border-purple-50 text-center">
            <span className="text-[11px] text-purple-900/40 block mb-2 font-medium">💡 คลิกเพื่อทดสอบรหัสนักศึกษาจริง:</span>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setStudentId('661441001')}
                className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-mono text-xs font-bold transition cursor-pointer"
              >
                661441001 (อิสลามศึกษา)
              </button>
              <button
                type="button"
                onClick={() => setStudentId('692447060')}
                className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-mono text-xs font-bold transition cursor-pointer"
              >
                692447060 (ปฐมวัย)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
