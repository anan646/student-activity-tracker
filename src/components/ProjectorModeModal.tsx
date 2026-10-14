'use client';

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { X, Maximize, Minimize, Users, Clock, MapPin, Award, Sparkles, CheckCircle2 } from 'lucide-react';
import { Activity } from '@/types';

interface ProjectorModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null;
  attendeeCount: number;
  totalPool: number;
}

export default function ProjectorModeModal({
  isOpen,
  onClose,
  activity,
  attendeeCount,
  totalPool,
}: ProjectorModeModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!isOpen || !activity) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://edupass.ftu.ac.th';
  const qrUrl = `${currentHost}/student?actId=${activity.id}`;

  const maxCap = activity.capacity || totalPool;
  const percentage = Math.min(100, Math.round((attendeeCount / maxCap) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0d19] text-white flex flex-col justify-between p-6 sm:p-10 overflow-hidden select-none animate-in fade-in duration-300">
      {/* Background ambient light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-purple-600/15 via-blue-600/15 to-pink-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/10 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/30">
            ED
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                EDU Pass Projector Station
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                LIVE CHECK-IN
              </span>
            </div>
            <p className="text-xs text-white/50 font-medium">คณะศึกษาศาสตร์ มหาวิทยาลัยฟาฏอนี • Faculty of Education</p>
          </div>
        </div>

        {/* Live Clock & Action Buttons */}
        <div className="flex items-center gap-4">
          <div className="font-mono text-xl sm:text-2xl font-black text-white/90 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
            {currentTime}
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-2xl transition cursor-pointer border border-white/10"
            title="เต็มจอ"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          <button
            onClick={onClose}
            className="p-3 bg-rose-500/20 hover:bg-rose-500/30 active:scale-95 text-rose-300 rounded-2xl transition cursor-pointer border border-rose-500/30"
            title="ปิดหน้าจอโปรเจกเตอร์"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-6">
        {/* Left Side: Activity Information & Live Counters (7 cols) */}
        <div className="lg:col-span-7 space-y-6 flex flex-col justify-center">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
              {activity.category}
            </span>
            <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              สะสม +{activity.hours} ชั่วโมงกิจกรรม
            </span>
            {activity.checkInMode === 'IN_OUT' && (
              <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                รอบเข้า/ออก (2-Step)
              </span>
            )}
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            {activity.title}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-white/70">
            <div className="flex items-center gap-2.5 bg-white/5 p-3 rounded-2xl border border-white/5">
              <Clock className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{activity.date}</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white/5 p-3 rounded-2xl border border-white/5">
              <MapPin className="w-4 h-4 text-pink-400 shrink-0" />
              <span className="truncate">{activity.location || 'มหาวิทยาลัยฟาฏอนี'}</span>
            </div>
          </div>

          {/* Big Live Attendee Counter */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 p-6 sm:p-8 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-xs uppercase tracking-widest text-white/60 font-black block mb-1">
                  ยอดนักศึกษาเช็คอินปัจจุบัน
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-pink-400 font-mono">
                    {attendeeCount}
                  </span>
                  <span className="text-lg font-bold text-white/40">
                    / {activity.capacity ? `${activity.capacity} ที่นั่ง` : `${totalPool} คน`}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                  {percentage}%
                </span>
                <span className="block text-xs text-white/50">ของความจุ</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-pink-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Giant QR Code (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="relative group">
            <div className="absolute -inset-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />
            <div className="relative bg-white rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
              <div className="bg-white p-3 rounded-2xl border-4 border-slate-900/10">
                <QRCode
                  value={qrUrl}
                  size={260}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                />
              </div>

              <div className="mt-5 space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-slate-900 font-black text-base">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>สแกนเพื่อเปิดบัตรหรือเช็คชื่อ</span>
                </div>
                <p className="text-xs text-slate-500 max-w-[240px]">
                  เปิดกล้องโทรศัพท์สแกน QR Code นี้เพื่อเข้าสู่ระบบบัตรกิจกรรม EDU Pass ทันที
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer Note */}
      <footer className="relative z-10 border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-white/50 gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>ระบบบันทึกเวลาจริงและป้องกันการถ่ายรูปส่งต่อ (Time-based Rotating QR Pass)</span>
        </div>
        <div className="font-mono text-white/40">
          Activity ID: {activity.id} • กด Esc เพื่อปิด
        </div>
      </footer>
    </div>
  );
}
