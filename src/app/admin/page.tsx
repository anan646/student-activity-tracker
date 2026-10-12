'use client';

import { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  UserCheck, 
  FileSpreadsheet, 
  Filter, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Search,
  Camera,
  ShieldAlert,
  BarChart3,
  Award,
  Sparkles,
  Lock,
  Unlock,
  KeyRound,
  RefreshCw,
  DownloadCloud,
  FileCheck
} from 'lucide-react';
import { Student, Activity, AttendanceRecord } from '@/types';
import QRScannerModal from '@/components/QRScannerModal';

export default function AdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [tab, setTab] = useState<'analytics' | 'reports' | 'attendance' | 'create_activity' | 'import_ftu'>('analytics');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingFtu, setSyncingFtu] = useState(false);
  const [selectedSyncYears, setSelectedSyncYears] = useState<string[]>(['2565', '2566', '2567', '2568']);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Scanner Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // ฟอร์มสร้างกิจกรรม
  const [activityForm, setActivityForm] = useState({
    title: '',
    category: 'มหาวิทยาลัย',
    hours: 3,
    date: '2024-10-01',
    academicYear: '2567',
    location: '',
    description: '',
  });

  // ฟอร์มเช็คชื่อ
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [studentIdsInput, setStudentIdsInput] = useState('');

  // ตัวกรองรายงาน
  const [filterType, setFilterType] = useState<'all' | 'year' | 'major'>('all');
  const [selectedYear, setSelectedYear] = useState('1');
  const [selectedMajor, setSelectedMajor] = useState('วิทยาการคอมพิวเตอร์');

  // ตรวจสอบ PIN (รหัสเริ่มต้นคือ 1234 หรือปล่อยว่างได้)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '1234' || pinInput === 'admin') {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchInitialData();
    }
  }, [isAuthenticated]);

  const fetchInitialData = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.activities) setActivities(data.activities);
      if (data.students) setStudents(data.students);
      if (data.records) setRecords(data.records);
      if (data.activities && data.activities.length > 0) {
        setSelectedActivityId(data.activities[0].id);
      }
    } catch (err) {
      console.error('Failed to load initial admin data', err);
    } finally {
      setRefreshing(false);
    }
  };

  // รับผลจากการสแกน QR Code
  const handleScanSuccess = (scannedId: string) => {
    setStudentIdsInput((prev) => {
      const currentList = prev.split(/[\n, ]+/).filter(Boolean);
      if (currentList.includes(scannedId)) {
        return prev; // มีอยู่แล้ว
      }
      return prev ? `${prev}\n${scannedId}` : scannedId;
    });
  };

  // บันทึกกิจกรรมใหม่
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_activity',
          ...activityForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');

      setMessage({ text: 'สร้างกิจกรรมและบันทึกลง Google Sheets เรียบร้อยแล้ว!', type: 'success' });
      setActivityForm({
        title: '',
        category: 'มหาวิทยาลัย',
        hours: 3,
        date: '2024-10-01',
        academicYear: '2567',
        location: '',
        description: '',
      });
      fetchInitialData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ text: err.message, type: 'error' });
      } else {
        setMessage({ text: 'เกิดข้อผิดพลาดในการบันทึกกิจกรรม', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  // บันทึกการเข้าร่วมกิจกรรม
  const handleRecordAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const activity = activities.find((a) => a.id === selectedActivityId);
    if (!activity) {
      setMessage({ text: 'กรุณาเลือกกิจกรรม', type: 'error' });
      setLoading(false);
      return;
    }

    const rawIds = studentIdsInput
      .split(/[\n, ]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (rawIds.length === 0) {
      setMessage({ text: 'กรุณากรอกหรือสแกนรหัสนักศึกษาอย่างน้อย 1 คน', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_attendance',
          studentIds: rawIds,
          activity,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'บันทึกการเข้าร่วมไม่สำเร็จ');

      setMessage({
        text: `บันทึกการเข้าร่วมและให้ชั่วโมงกิจกรรมสำเร็จ (${result.successCount} คน)`,
        type: 'success',
      });
      setStudentIdsInput('');
      fetchInitialData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ text: err.message, type: 'error' });
      } else {
        setMessage({ text: 'เกิดข้อผิดพลาดในการบันทึกชั่วโมงกิจกรรม', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    let url = '/api/export?type=all';
    if (filterType === 'year') {
      url = `/api/export?type=year&yearLevel=${selectedYear}`;
    } else if (filterType === 'major') {
      url = `/api/export?type=major&major=${encodeURIComponent(selectedMajor)}`;
    }
    window.open(url, '_blank');
  };

  // ดึงข้อมูลรายชื่อ นศ. จากระบบสำนักทะเบียน FTU
  const handleSyncFTU = async () => {
    if (selectedSyncYears.length === 0) {
      setMessage({ text: 'กรุณาเลือกปีการศึกษาอย่างน้อย 1 ปี', type: 'error' });
      return;
    }

    setSyncingFtu(true);
    setMessage(null);

    try {
      const res = await fetch('/api/sync-ftu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acadYears: selectedSyncYears }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ดึงข้อมูลไม่สำเร็จ');

      setMessage({
        text: `ดึงข้อมูลนักศึกษาจากระบบสำนักทะเบียนสำเร็จจำนวน ${data.totalCrawled} คน และบันทึกลงระบบแล้ว!`,
        type: 'success',
      });
      fetchInitialData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ text: err.message, type: 'error' });
      } else {
        setMessage({ text: 'เกิดข้อผิดพลาดในการดึงข้อมูลจากระบบสำนักทะเบียน', type: 'error' });
      }
    } finally {
      setSyncingFtu(false);
    }
  };

  const majors = Array.from(new Set(students.map((s) => s.major)));

  // สถิติ Analytics
  const totalStudents = students.length;
  const totalActivities = activities.length;
  const totalRecords = records.length;
  const qualifiedStudentsCount = students.filter((s) => {
    const sRecords = records.filter((r) => r.studentId === s.studentId);
    const hrs = sRecords.reduce((sum, r) => sum + r.hoursEarned, 0);
    return hrs >= 60;
  }).length;

  // หน้า Login PIN ก่อนเข้าสู่ระบบแอดมิน
  if (!isAuthenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-950/10 border border-purple-100 p-8 max-w-sm w-full text-center animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-600/25">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-purple-950 mb-1">เข้าสู่ระบบผู้ดูแลระบบ</h2>
          <p className="text-xs text-purple-900/50 mb-6">กรุณากรอกรหัสผ่านเพื่อเข้าใช้งานจัดการกิจกรรมและข้อมูล นศ.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="กรอก PIN (เช่น 1234)"
                className="w-full text-center tracking-widest text-xl font-black py-3.5 px-4 rounded-2xl border border-purple-100 bg-purple-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-purple-950 transition"
                autoFocus
                required
              />
            </div>

            {pinError && (
              <p className="text-xs font-bold text-rose-600 animate-in fade-in">
                รหัสผ่านไม่ถูกต้อง (รหัสเริ่มต้นคือ: 1234)
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:opacity-95 active:scale-95 text-white font-bold rounded-2xl transition shadow-lg shadow-purple-600/25 cursor-pointer"
            >
              เข้าสู่ระบบ
            </button>
          </form>

          <p className="mt-4 text-[11px] text-purple-900/40">
            * รหัสผ่านตั้งต้น: <span className="font-mono font-bold text-purple-800">1234</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              Live Connected with Google Sheets
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-purple-950 tracking-tight">
            ระบบจัดการกิจกรรมและรายงาน (Admin Portal)
          </h1>
          <p className="text-purple-900/50 text-xs sm:text-sm mt-0.5">
            จัดการกิจกรรม เช็คชื่อนักศึกษาผ่านกล้อง และส่งออกรายงานสรุปผลตามเกณฑ์
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInitialData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-purple-200/80 bg-white hover:bg-purple-50 text-purple-800 text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-600' : ''}`} />
            <span>ซิงค์ข้อมูล</span>
          </button>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-100/60 hover:bg-purple-100 text-purple-800 text-xs font-bold transition cursor-pointer"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>

      {/* Main Tab Bar (Refined Purple Aesthetic) */}
      <div className="flex bg-purple-100/60 p-1.5 rounded-2xl text-xs sm:text-sm font-bold mb-8 overflow-x-auto gap-1">
        <button
          onClick={() => { setTab('analytics'); setMessage(null); }}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all ${
            tab === 'analytics' ? 'bg-white text-purple-900 shadow-sm' : 'text-purple-900/60 hover:text-purple-950'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-purple-600" />
          <span>แดชบอร์ดภาพรวม</span>
        </button>
        <button
          onClick={() => { setTab('reports'); setMessage(null); }}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all ${
            tab === 'reports' ? 'bg-white text-purple-900 shadow-sm' : 'text-purple-900/60 hover:text-purple-950'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
          <span>สรุปผล & Export</span>
        </button>
        <button
          onClick={() => { setTab('attendance'); setMessage(null); }}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all ${
            tab === 'attendance' ? 'bg-white text-purple-900 shadow-sm' : 'text-purple-900/60 hover:text-purple-950'
          }`}
        >
          <UserCheck className="w-4 h-4 text-fuchsia-600" />
          <span>เช็คชื่อ/ให้ชั่วโมง</span>
        </button>
        <button
          onClick={() => { setTab('create_activity'); setMessage(null); }}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all ${
            tab === 'create_activity' ? 'bg-white text-purple-900 shadow-sm' : 'text-purple-900/60 hover:text-purple-950'
          }`}
        >
          <PlusCircle className="w-4 h-4 text-violet-600" />
          <span>สร้างกิจกรรมใหม่</span>
        </button>
        <button
          onClick={() => { setTab('import_ftu'); setMessage(null); }}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all ${
            tab === 'import_ftu' ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-sm' : 'text-purple-900/70 hover:bg-white/50'
          }`}
        >
          <DownloadCloud className="w-4 h-4" />
          <span>นำเข้า นศ. ทะเบียน (FTU)</span>
        </button>
      </div>

      {/* Alert Notifications */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tab 1: แดชบอร์ดภาพรวมสถิติ (Analytics Dashboard) */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
            <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-sm">
              <span className="text-[11px] font-bold text-purple-900/40 uppercase tracking-wider block mb-1">นักศึกษาในระบบ</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl sm:text-4xl font-black text-purple-950">{totalStudents}</span>
                <span className="text-xs text-purple-900/50 font-bold">คน</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-sm">
              <span className="text-[11px] font-bold text-purple-900/40 uppercase tracking-wider block mb-1">กิจกรรมที่เปิดจัด</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl sm:text-4xl font-black text-purple-700">{totalActivities}</span>
                <span className="text-xs text-purple-900/50 font-bold">รายการ</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-sm">
              <span className="text-[11px] font-bold text-purple-900/40 uppercase tracking-wider block mb-1">การเช็คชื่อทั้งหมด</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl sm:text-4xl font-black text-fuchsia-700">{totalRecords}</span>
                <span className="text-xs text-purple-900/50 font-bold">ครั้ง</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-sm">
              <span className="text-[11px] font-bold text-purple-900/40 uppercase tracking-wider block mb-1">ผ่านเกณฑ์ (≥60 ชม.)</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl sm:text-4xl font-black text-emerald-600">{qualifiedStudentsCount}</span>
                <span className="text-xs text-purple-900/50 font-bold">คน</span>
              </div>
            </div>
          </div>

          {/* ตารางแสดงนักศึกษาและชั่วโมงสะสมล่าสุด */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>รายชื่อนักศึกษาและชั่วโมงสะสมรวม</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">รหัสนักศึกษา</th>
                    <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                    <th className="py-3 px-4">สาขาวิชา</th>
                    <th className="py-3 px-4 text-center">ชั้นปี</th>
                    <th className="py-3 px-4 text-center">ชั่วโมงสะสม</th>
                    <th className="py-3 px-4 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((st) => {
                    const stRecords = records.filter((r) => r.studentId === st.studentId);
                    const hrs = stRecords.reduce((sum, r) => sum + r.hoursEarned, 0);
                    return (
                      <tr key={st.studentId} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">{st.studentId}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">{st.name}</td>
                        <td className="py-3 px-4 text-slate-600">{st.major}</td>
                        <td className="py-3 px-4 text-center">ปี {st.yearLevel}</td>
                        <td className="py-3 px-4 text-center font-bold text-indigo-600">{hrs} ชม.</td>
                        <td className="py-3 px-4 text-center">
                          {hrs >= 60 ? (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              ผ่านเกณฑ์
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                              ยังไม่ครบ ({60 - hrs})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: ส่งออกรายงานสรุปผล (Excel Export) */}
      {tab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Filter className="w-5 h-5 text-indigo-600" />
              <span>ส่งออกรายงานสรุปผลกิจกรรม (Excel Format)</span>
            </h2>
            <p className="text-slate-500 text-xs mb-6">
              เลือกเงื่อนไขเพื่อสร้างไฟล์สรุปผล Excel ที่พร้อมนำส่งฝ่ายทะเบียน หรือนำไปประชุมประเมินผล
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">รูปแบบการสรุปรายงาน</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'year' | 'major')}
                  className="w-full p-3 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="all">นักศึกษาทั้งหมด (ทุกชั้นปี / ทุกสาขา)</option>
                  <option value="year">สรุปผลแยกตามชั้นปี</option>
                  <option value="major">สรุปผลแยกตามสาขาวิชา</option>
                </select>
              </div>

              {filterType === 'year' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">เลือกชั้นปี</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full p-3 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="1">ชั้นปีที่ 1</option>
                    <option value="2">ชั้นปีที่ 2</option>
                    <option value="3">ชั้นปีที่ 3</option>
                    <option value="4">ชั้นปีที่ 4</option>
                  </select>
                </div>
              )}

              {filterType === 'major' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">เลือกสาขาวิชา</label>
                  <select
                    value={selectedMajor}
                    onChange={(e) => setSelectedMajor(e.target.value)}
                    className="w-full p-3 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    {majors.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={handleDownloadReport}
              className="flex items-center gap-2.5 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-2xl transition shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>ดาวน์โหลดไฟล์สรุปผล Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: เช็คชื่อ/ให้ชั่วโมง พร้อมตัวสแกน QR Code */}
      {tab === 'attendance' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <span>เช็คชื่อและให้ชั่วโมงกิจกรรมแก่นักศึกษา</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                เปิดกล้องสแกน QR Code นศ. หรือคัดลอกรหัสจาก Excel มาวาง
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-sm transition cursor-pointer shadow-sm"
            >
              <Camera className="w-5 h-5" />
              <span>เปิดกล้องสแกน QR Code</span>
            </button>
          </div>

          <form onSubmit={handleRecordAttendance} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                เลือกกิจกรรมที่ต้องการบันทึก *
              </label>
              <select
                value={selectedActivityId}
                onChange={(e) => setSelectedActivityId(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
                required
              >
                {activities.map((act) => (
                  <option key={act.id} value={act.id}>
                    [{act.id}] {act.title} (+{act.hours} ชม. - {act.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-600">
                  รหัสนักศึกษาที่เข้าร่วม (ขึ้นบรรทัดใหม่ หรือเว้นวรรค) *
                </label>
                <span className="text-xs font-semibold text-indigo-600">
                  จำนวน: {studentIdsInput.split(/[\n, ]+/).filter(Boolean).length} คน
                </span>
              </div>
              <textarea
                rows={6}
                value={studentIdsInput}
                onChange={(e) => setStudentIdsInput(e.target.value)}
                placeholder="6601001&#10;6701001"
                className="w-full p-3.5 rounded-2xl border border-slate-200 font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-2xl transition shadow-lg shadow-indigo-600/20 disabled:bg-indigo-300 cursor-pointer flex items-center gap-2"
            >
              {loading ? 'กำลังบันทึกลง Google Sheets...' : 'บันทึกการเข้าร่วมและให้ชั่วโมงทันที'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: สร้างกิจกรรมใหม่ */}
      {tab === 'create_activity' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-2">
            <PlusCircle className="w-5 h-5 text-indigo-600" />
            <span>สร้างกิจกรรมใหม่และระบุชั่วโมง</span>
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            ข้อมูลกิจกรรมจะถูกบันทึกตรงลงแผ่นงาน Google Sheets `Activities` แบบ Real-time
          </p>

          <form onSubmit={handleCreateActivity} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">ชื่อกิจกรรม *</label>
                <input
                  type="text"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  placeholder="เช่น โครงการเสริมสร้างทักษะดิจิทัลสำหรับบัณฑิตใหม่"
                  className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">หมวดกิจกรรม *</label>
                <select
                  value={activityForm.category}
                  onChange={(e) => setActivityForm({ ...activityForm, category: e.target.value })}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="มหาวิทยาลัย">มหาวิทยาลัย</option>
                  <option value="คณะ/สาขา">คณะ/สาขา</option>
                  <option value="บำเพ็ญประโยชน์/จิตอาสา">บำเพ็ญประโยชน์/จิตอาสา</option>
                  <option value="ส่งเสริมวิชาการ/วิชาชีพ">ส่งเสริมวิชาการ/วิชาชีพ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">จำนวนชั่วโมงที่ได้รับ *</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={activityForm.hours}
                  onChange={(e) => setActivityForm({ ...activityForm, hours: Number(e.target.value) })}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">วันที่จัดกิจกรรม *</label>
                <input
                  type="date"
                  value={activityForm.date}
                  onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">ปีการศึกษา *</label>
                <input
                  type="text"
                  value={activityForm.academicYear}
                  onChange={(e) => setActivityForm({ ...activityForm, academicYear: e.target.value })}
                  placeholder="เช่น 2567"
                  className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">สถานที่จัดกิจกรรม</label>
                <input
                  type="text"
                  value={activityForm.location}
                  onChange={(e) => setActivityForm({ ...activityForm, location: e.target.value })}
                  placeholder="เช่น ห้องสัมมนา อาคาร 50 ปี"
                  className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-2xl transition shadow-lg shadow-indigo-600/20 disabled:bg-indigo-300 cursor-pointer flex items-center gap-2"
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกกิจกรรมใหม่ลง Google Sheets'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 5: ดึงข้อมูล นศ. อัตโนมัติจากสำนักทะเบียน FTU */}
      {tab === 'import_ftu' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-700">
              <DownloadCloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                ดึงข้อมูลรายชื่อนักศึกษาจากระบบสำนักทะเบียน (FTU Registrar)
              </h2>
              <p className="text-xs text-slate-500">
                เชื่อมต่อดึงข้อมูลโดยตรงจากระบบทะเบียนมหาวิทยาลัยฟาฏอนี (reg.ftu.ac.th) และบันทึกลง Google Sheets
              </p>
            </div>
          </div>

          <div className="my-6 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              เลือกปีการศึกษาที่ต้องการดึงข้อมูล (สามารถพิมพ์เพิ่มปีถัดไปได้ เช่น 2569, 2570...):
            </h4>
            <div className="flex flex-wrap gap-2.5 mb-4">
              {selectedSyncYears.map((year) => (
                <div
                  key={year}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold text-sm"
                >
                  <span>ปีการศึกษา {year}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSyncYears(selectedSyncYears.filter((y) => y !== year))}
                    className="text-indigo-400 hover:text-red-500 font-bold ml-1 text-base cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* ช่องเพิ่มปีการศึกษาใหม่ในอนาคต */}
            <div className="flex items-center gap-2 max-w-sm mb-4">
              <input
                type="text"
                id="newYearInput"
                placeholder="ระบุปี เช่น 2569"
                className="p-2.5 px-3.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = (e.currentTarget.value || '').trim();
                    if (val && !selectedSyncYears.includes(val)) {
                      setSelectedSyncYears([...selectedSyncYears, val].sort());
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('newYearInput') as HTMLInputElement;
                  if (input && input.value.trim()) {
                    const val = input.value.trim();
                    if (!selectedSyncYears.includes(val)) {
                      setSelectedSyncYears([...selectedSyncYears, val].sort());
                      input.value = '';
                    }
                  }
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                + เพิ่มปีการศึกษา
              </button>
            </div>

            {/* กล่องแสดงโครงสร้างรหัสสาขาวิชา */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 block mb-1">🏷️ การจำแนกสาขาวิชาอัตโนมัติตามรหัส 3 หลัก:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-slate-600">
                <span>• <b>441:</b> อิสลามศึกษา</span>
                <span>• <b>442:</b> ภาษาอาหรับ</span>
                <span>• <b>443:</b> วิทยาศาสตร์ทั่วไป</span>
                <span>• <b>444:</b> เคมี</span>
                <span>• <b>445:</b> ภาษาอังกฤษ</span>
                <span>• <b>446:</b> ภาษามลายูและเทคโนโลยีการศึกษา</span>
                <span>• <b>447:</b> การศึกษาปฐมวัย</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleSyncFTU}
              disabled={syncingFtu}
              className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-2xl transition shadow-lg shadow-indigo-600/20 disabled:bg-indigo-300 cursor-pointer flex items-center justify-center gap-2"
            >
              {syncingFtu ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  <span>กำลังดึงข้อมูลจากระบบทะเบียน FTU...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-5 h-5" />
                  <span>เริ่มดึงข้อมูลและบันทึกลงระบบทันที</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modal เปิดกล้องสแกน QR Code */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
}
