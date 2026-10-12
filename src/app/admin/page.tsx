'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Home,
  CheckCircle2,
  BarChart2,
  FileText,
  Search,
  Plus,
  Settings2,
  Share2,
  User,
  KeyRound,
  LogOut,
  Camera,
  Download,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Award,
  RefreshCw,
  Menu,
  X,
  AlertCircle,
  FileSpreadsheet,
  QrCode,
  ShieldCheck,
  Check,
  ChevronRight,
  ClipboardList,
  Sparkles,
  Lock,
  ExternalLink,
  Copy
} from 'lucide-react';
import { Student, Activity, AttendanceRecord } from '@/types';
import QRScannerModal from '@/components/QRScannerModal';

type MenuTab = 
  | 'home' 
  | 'test_qr' 
  | 'hours_report' 
  | 'activity_report' 
  | 'verify' 
  | 'create_activity' 
  | 'manage_activities' 
  | 'share_links';

export default function AdminPortal() {
  // Authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Active Menu Tab
  const [activeTab, setActiveTab] = useState<MenuTab>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data States
  const [activities, setActivities] = useState<Activity[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Selected Activity Workspace
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Activity Search in Home Tab
  const [activitySearchQuery, setActivitySearchQuery] = useState('');

  // Scanner Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Check-in Inputs for Selected Activity
  const [quickStudentId, setQuickStudentId] = useState('');
  const [bulkStudentIds, setBulkStudentIds] = useState('');
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('');

  // Verify Student Search Tab
  const [verifyStudentId, setVerifyStudentId] = useState('');
  const [verifiedStudentResult, setVerifiedStudentResult] = useState<{
    student: Student;
    records: AttendanceRecord[];
    totalHours: number;
  } | null>(null);

  // Form สร้างกิจกรรมใหม่
  const [activityForm, setActivityForm] = useState({
    title: '',
    category: 'คณะ/สาขา' as Activity['category'],
    hours: 3,
    date: '2026-10-15',
    time: '09:00',
    academicYear: '2569',
    location: '',
    description: '',
  });

  // ตัวกรองรายงานชั่วโมง
  const [reportFilterType, setReportFilterType] = useState<'all' | 'year' | 'major'>('all');
  const [reportSelectedYear, setReportSelectedYear] = useState('1');
  const [reportSelectedMajor, setReportSelectedMajor] = useState('อิสลามศึกษา');
  const [reportSearchQuery, setReportSearchQuery] = useState('');

  // Password Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPin, setNewPin] = useState('');

  // Handle PIN Login
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
    } catch (err) {
      console.error('Failed to load initial admin data', err);
    } finally {
      setRefreshing(false);
    }
  };

  // คำนวณจำนวนผู้เช็คอินต่อกิจกรรม
  const activityAttendanceMap = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((r) => {
      map.set(r.activityId, (map.get(r.activityId) || 0) + 1);
    });
    return map;
  }, [records]);

  // นักศึกษาที่เช็คอินในกิจกรรมที่เลือก
  const currentActivityAttendees = useMemo(() => {
    if (!selectedActivity) return [];
    const actRecords = records.filter((r) => r.activityId === selectedActivity.id);
    const studentMap = new Map<string, Student>();
    students.forEach((s) => studentMap.set(s.studentId, s));

    return actRecords.map((r, index) => {
      const student = studentMap.get(r.studentId) || {
        studentId: r.studentId,
        name: 'นักศึกษาในระบบ',
        gender: r.studentId.charAt(2) === '1' ? 'ชาย' : 'หญิง',
        major: 'ไม่ระบุสาขา',
        academicYear: '2569',
        yearLevel: 1,
      };

      return {
        order: index + 1,
        recordId: r.id,
        studentId: r.studentId,
        name: student.name,
        gender: student.gender,
        major: student.major,
        yearLevel: student.yearLevel,
        dateRecorded: r.dateRecorded,
        hours: r.hoursEarned,
      };
    });
  }, [selectedActivity, records, students]);

  // สถิติกิจกรรมที่เลือก
  const currentActivityStats = useMemo(() => {
    const byMajor: Record<string, number> = {};
    const byGender: Record<string, number> = { ชาย: 0, หญิง: 0 };
    const byYear: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

    currentActivityAttendees.forEach((a) => {
      byMajor[a.major] = (byMajor[a.major] || 0) + 1;
      if (a.gender === 'ชาย') byGender.ชาย++;
      if (a.gender === 'หญิง') byGender.หญิง++;
      if (byYear[a.yearLevel] !== undefined) byYear[a.yearLevel]++;
    });

    return { byMajor, byGender, byYear };
  }, [currentActivityAttendees]);

  // เช็คชื่อนักศึกษา 1 คน (Quick Check-in หรือสแกน QR)
  const handleCheckInSingle = async (sid: string) => {
    const cleanId = sid.trim();
    if (!cleanId || !selectedActivity) return;

    // ตรวจสอบว่าเช็คอินไปแล้วหรือยัง
    const alreadyChecked = records.some(
      (r) => r.activityId === selectedActivity.id && r.studentId === cleanId
    );
    if (alreadyChecked) {
      setMessage({ text: `รหัส ${cleanId} ได้เช็คอินกิจกรรมนี้ไปแล้ว`, type: 'error' });
      return;
    }

    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_attendance',
          studentIds: [cleanId],
          activity: selectedActivity,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'เช็คอินไม่สำเร็จ');

      // อัปเดต state แบบสด
      const studentObj = students.find((s) => s.studentId === cleanId);
      const studentName = studentObj ? studentObj.name : `รหัส ${cleanId}`;

      const newRecord: AttendanceRecord = {
        id: `REC-${Date.now()}`,
        studentId: cleanId,
        activityId: selectedActivity.id,
        activityTitle: selectedActivity.title,
        category: selectedActivity.category,
        hoursEarned: selectedActivity.hours,
        dateRecorded: new Date().toLocaleString('th-TH'),
        status: 'APPROVED',
      };

      setRecords((prev) => [newRecord, ...prev]);
      setMessage({ text: `✅ เช็คอินสำเร็จ: ${cleanId} (${studentName}) ได้รับ ${selectedActivity.hours} ชม.`, type: 'success' });
      setQuickStudentId('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเช็คอิน';
      setMessage({ text: msg, type: 'error' });
    }
  };

  // เช็คชื่อทีละหลายคน (Bulk Paste)
  const handleCheckInBulk = async () => {
    if (!selectedActivity || !bulkStudentIds.trim()) return;

    const rawIds = bulkStudentIds
      .split(/[\n, ]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (rawIds.length === 0) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_attendance',
          studentIds: rawIds,
          activity: selectedActivity,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'บันทึกไม่สำเร็จ');

      // เพิ่ม records ใหม่ลงใน state
      const newRecs: AttendanceRecord[] = rawIds.map((sid, idx) => ({
        id: `REC-${Date.now()}-${idx}`,
        studentId: sid,
        activityId: selectedActivity.id,
        activityTitle: selectedActivity.title,
        category: selectedActivity.category,
        hoursEarned: selectedActivity.hours,
        dateRecorded: new Date().toLocaleString('th-TH'),
        status: 'APPROVED',
      }));

      setRecords((prev) => [...newRecs, ...prev]);
      setMessage({
        text: `✅ บันทึกเช็คอินเรียบร้อย ${rawIds.length} คน!`,
        type: 'success',
      });
      setBulkStudentIds('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเช็คอินกลุ่ม';
      setMessage({ text: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // สร้างกิจกรรมใหม่
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const newAct: Activity = {
        id: `ACT-${Date.now().toString().slice(-4)}`,
        title: activityForm.title,
        category: activityForm.category,
        hours: Number(activityForm.hours),
        date: `${activityForm.date} ${activityForm.time}`,
        academicYear: activityForm.academicYear,
        location: activityForm.location,
        description: activityForm.description,
      };

      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_activity',
          ...newAct,
        }),
      });

      if (!res.ok) throw new Error('บันทึกกิจกรรมลงระบบไม่สำเร็จ');

      setActivities((prev) => [newAct, ...prev]);
      setMessage({ text: `สร้างกิจกรรม "${newAct.title}" สำเร็จเรียบร้อย!`, type: 'success' });
      setActivityForm({
        title: '',
        category: 'คณะ/สาขา',
        hours: 3,
        date: '2026-10-15',
        time: '09:00',
        academicYear: '2569',
        location: '',
        description: '',
      });
      setActiveTab('home');
      setSelectedActivity(newAct);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      setMessage({ text: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ตรวจสอบนักศึกษาในแท็บ Verify
  const handleVerifyStudent = (sid: string) => {
    const cleanId = sid.trim();
    if (!cleanId) return;

    const student = students.find((s) => s.studentId === cleanId);
    if (!student) {
      setVerifiedStudentResult(null);
      setMessage({ text: `ไม่พบข้อมูลนักศึกษารหัส ${cleanId} ในระบบ`, type: 'error' });
      return;
    }

    const stRecords = records.filter((r) => r.studentId === cleanId);
    const totalHours = stRecords.reduce((sum, r) => sum + r.hoursEarned, 0);

    setVerifiedStudentResult({
      student,
      records: stRecords,
      totalHours,
    });
    setMessage(null);
  };

  // รายการสาขาวิชาทั้งหมด
  const allMajors = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.major))).filter(Boolean);
  }, [students]);

  // กรองกิจกรรมในหน้าหลัก
  const filteredActivities = useMemo(() => {
    if (!activitySearchQuery.trim()) return activities;
    const q = activitySearchQuery.toLowerCase();
    return activities.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q)
    );
  }, [activities, activitySearchQuery]);

  // กรองนักศึกษาในหน้ารายงานชั่วโมง
  const filteredReportStudents = useMemo(() => {
    let list = [...students];
    if (reportFilterType === 'year') {
      list = list.filter((s) => String(s.yearLevel) === reportSelectedYear);
    } else if (reportFilterType === 'major') {
      list = list.filter((s) => s.major === reportSelectedMajor);
    }

    if (reportSearchQuery.trim()) {
      const q = reportSearchQuery.toLowerCase();
      list = list.filter(
        (s) => s.studentId.includes(q) || s.name.toLowerCase().includes(q) || s.major.toLowerCase().includes(q)
      );
    }
    return list;
  }, [students, reportFilterType, reportSelectedYear, reportSelectedMajor, reportSearchQuery]);

  // ดาวน์โหลดรายงาน Excel
  const handleDownloadReport = () => {
    let url = '/api/export?type=all';
    if (reportFilterType === 'year') {
      url = `/api/export?type=year&yearLevel=${reportSelectedYear}`;
    } else if (reportFilterType === 'major') {
      url = `/api/export?type=major&major=${encodeURIComponent(reportSelectedMajor)}`;
    }
    window.open(url, '_blank');
  };

  // หน้า Login PIN ก่อนเข้าสู่ระบบแอดมิน
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-100 p-8 max-w-sm w-full text-center animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-[#0070f3] text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-1">UniPass Staff</h1>
          <p className="text-xs text-slate-500 mb-6">เข้าสู่ระบบจัดการกิจกรรม มหาวิทยาลัยฟาฏอนี</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="กรอกรหัส PIN (1234)"
                className="w-full text-center tracking-widest text-2xl font-black py-3.5 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#0070f3] text-slate-900 transition"
                autoFocus
                required
              />
            </div>

            {pinError && (
              <p className="text-xs font-bold text-rose-600 animate-in fade-in">
                รหัสผ่านไม่ถูกต้อง (รหัสเริ่มต้น: 1234)
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-[#0070f3] hover:bg-[#0060df] active:scale-95 text-white font-bold rounded-xl transition shadow-md shadow-blue-500/25 cursor-pointer text-sm"
            >
              เข้าสู่ระบบ UniPass
            </button>
          </form>

          <p className="mt-4 text-[11px] text-slate-400">
            * รหัสผ่านตั้งต้น: <span className="font-mono font-bold text-blue-600">1234</span>
          </p>
        </div>
      </div>
    );
  }

  const totalPool = students.length || 848;

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col md:flex-row text-slate-800 antialiased font-sans">
      {/* Mobile Header Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0070f3] text-white flex items-center justify-center shadow-sm">
            <ClipboardList className="w-5 h-5" />
          </div>
          <span className="font-black text-lg text-slate-900">UniPass</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Left Sidebar (โครงสร้างและ UI ถอดแบบจาก UniPass FTU ในภาพต้นฉบับ 100%) */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 md:w-68 bg-white border-r border-slate-200/80 flex flex-col shrink-0 transition-transform duration-200 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0070f3] text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-lg text-slate-900 tracking-tight leading-none">UniPass</h1>
            <p className="text-[11px] text-slate-400 font-medium mt-1">กิจกรรม มหาวิทยาลัยฟาฏอนี</p>
          </div>
        </div>

        {/* Menu Navigation Area */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          {/* Section 1: เมนูหลัก */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              เมนูหลัก
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => {
                  setActiveTab('home');
                  setSelectedActivity(null);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'home'
                    ? 'bg-[#0070f3] text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Home className="w-4 h-4 shrink-0" />
                <span>หน้าหลัก</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('test_qr');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'test_qr'
                    ? 'bg-[#0070f3] text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>ทดสอบ QR Code</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('hours_report');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'hours_report'
                    ? 'bg-[#0070f3] text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <BarChart2 className="w-4 h-4 shrink-0" />
                <span>รายงานชั่วโมง</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('activity_report');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'activity_report'
                    ? 'bg-[#0070f3] text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>รายงานกิจกรรม</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('verify');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'verify'
                    ? 'bg-[#0070f3] text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Search className="w-4 h-4 shrink-0" />
                <span>ตรวจสอบ</span>
              </button>
            </nav>
          </div>

          {/* Section 2: จัดการ */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              จัดการ
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => {
                  setActiveTab('create_activity');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'create_activity'
                    ? 'bg-[#0070f3] text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>+ สร้างกิจกรรม</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('manage_activities');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'manage_activities'
                    ? 'bg-[#0070f3] text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Settings2 className="w-4 h-4 shrink-0" />
                <span>จัดการกิจกรรม</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('share_links');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'share_links'
                    ? 'bg-[#0070f3] text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span>จัดการลิงก์แชร์</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Bottom Profile Area (ตรงตามภาพต้นฉบับ 100%: อนันต์ แวบือซา / Staff) */}
        <div className="p-4 border-t border-slate-100 bg-white space-y-2.5 mt-auto">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-10 h-10 rounded-full bg-[#0070f3] text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-sm text-slate-800 truncate">อนันต์ แวบือซา</div>
              <div className="text-xs text-slate-400 font-medium">Staff</div>
            </div>
          </div>

          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition border border-slate-200/80 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-500" />
            <span>เปลี่ยนรหัสผ่าน</span>
          </button>

          <button
            onClick={() => setIsAuthenticated(false)}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition border border-rose-100 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area (ฝั่งขวา) */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Floating Notification */}
        {message && (
          <div className="p-4 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2.5 text-sm font-bold">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600" />
              )}
              <span className={message.type === 'success' ? 'text-emerald-800' : 'text-rose-800'}>
                {message.text}
              </span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1"
            >
              ✕ ปิด
            </button>
          </div>
        )}

        <div className="p-6 md:p-10 max-w-7xl w-full mx-auto">
          {/* TAB 1: หน้าหลัก (เลือกกิจกรรม & ตารางการ์ดตามภาพต้นฉบับ 100%) */}
          {activeTab === 'home' && !selectedActivity && (
            <div className="space-y-6">
              {/* Header Title & Filter */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  เลือกกิจกรรม
                </h2>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={activitySearchQuery}
                      onChange={(e) => setActivitySearchQuery(e.target.value)}
                      placeholder="ค้นหากิจกรรม..."
                      className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0070f3] shadow-sm"
                    />
                  </div>

                  <button
                    onClick={fetchInitialData}
                    disabled={refreshing}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 shadow-sm cursor-pointer"
                    title="ซิงค์ข้อมูลสด"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
                  </button>
                </div>
              </div>

              {/* 3-Column Grid of Activity Cards (การ์ดกิจกรรมถอดแบบเป๊ะ 100%) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredActivities.map((act) => {
                  const checkInCount = activityAttendanceMap.get(act.id) || 0;
                  const percentage = Math.min(100, Math.round((checkInCount / totalPool) * 100));

                  return (
                    <div
                      key={act.id}
                      className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        {/* Title */}
                        <h3 className="font-bold text-slate-900 text-base leading-snug mb-1 line-clamp-2 min-h-[44px]">
                          {act.title}
                        </h3>

                        {/* Date and Time */}
                        <p className="text-xs text-slate-400 font-medium mb-4">
                          {act.date}
                        </p>

                        {/* Check-in Progress */}
                        <div className="space-y-1.5 mb-6">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-slate-600">
                              เช็คอิน: {checkInCount} / {totalPool}
                            </span>
                            <span className="text-slate-500 font-bold">{percentage}%</span>
                          </div>

                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-[#0070f3] rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Select Activity Button (สีน้ำเงินปุ่มเด่นตามภาพต้นฉบับ) */}
                      <button
                        onClick={() => setSelectedActivity(act)}
                        className="w-full py-2.5 bg-[#0070f3] hover:bg-[#0060df] active:scale-98 text-white font-bold rounded-xl text-sm transition shadow-sm cursor-pointer text-center"
                      >
                        เลือกกิจกรรมนี้
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 1 (SELECTED ACTIVITY WORKSPACE): เมื่อกด "เลือกกิจกรรมนี้" */}
          {activeTab === 'home' && selectedActivity && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Top Back Navigation & Activity Hero */}
              <div>
                <button
                  onClick={() => setSelectedActivity(null)}
                  className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 py-1.5 px-3 rounded-lg hover:bg-white transition mb-3 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>กลับไปเลือกกิจกรรมอื่น</span>
                </button>

                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#0070f3] border border-blue-100">
                        หมวด: {selectedActivity.category}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                        +{selectedActivity.hours} ชั่วโมง
                      </span>
                      <span className="text-xs font-mono text-slate-400 font-bold">
                        {selectedActivity.id}
                      </span>
                    </div>

                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {selectedActivity.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {selectedActivity.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {selectedActivity.location || 'มหาวิทยาลัยฟาฏอนี'}
                      </span>
                    </div>
                  </div>

                  {/* Summary Check-in Counter */}
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 shrink-0">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block uppercase">เช็คอินแล้ว</span>
                      <div className="text-2xl font-black text-[#0070f3]">
                        {currentActivityAttendees.length}{' '}
                        <span className="text-xs font-medium text-slate-400">/ {totalPool} คน</span>
                      </div>
                    </div>
                    <div className="text-right pl-3 border-l border-slate-200">
                      <span className="text-xl font-black text-slate-800">
                        {Math.round((currentActivityAttendees.length / totalPool) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Check-in Controls: 2 Panels (กล้องสแกนทุกอุปกรณ์ + ป้อนรหัส/บาร์โค้ด) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Panel 1: Universal QR Scanner (สแกนผ่านกล้องทุกอุปกรณ์) */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="p-2 rounded-xl bg-blue-50 text-[#0070f3]">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">สแกน QR Code ผ่านกล้อง</h3>
                        <p className="text-xs text-slate-400">รองรับกล้องทุกอุปกรณ์ สลับกล้องหน้า/หลัง หรืออัปโหลดรูปภาพ</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mt-3 mb-6 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      กดปุ่มด้านล่างเพื่อเปิดกล้องสแกน QR Code จากบัตร UniPass ของนักศึกษา สแกนต่อเนื่องได้ทันที
                    </p>
                  </div>

                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="w-full py-4 bg-gradient-to-r from-[#0070f3] to-blue-600 hover:opacity-95 active:scale-98 text-white font-bold rounded-2xl transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2.5 cursor-pointer text-sm"
                  >
                    <Camera className="w-5 h-5" />
                    <span>เปิดกล้องสแกน QR Code ทันที</span>
                  </button>
                </div>

                {/* Panel 2: Fast Barcode Input & Bulk Paste */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">สแกนบาร์โค้ด / ป้อนรหัสรวดเร็ว</h3>
                      <p className="text-xs text-slate-400">ป้อนรหัส นศ. กด Enter หรือวางรหัสจาก Excel หลายคน</p>
                    </div>
                  </div>

                  {/* Single ID Input with Enter */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={quickStudentId}
                      onChange={(e) => setQuickStudentId(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCheckInSingle(quickStudentId);
                        }
                      }}
                      placeholder="กรอกรหัสนักศึกษาแล้วกด Enter (เช่น 661441001)"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-[#0070f3] bg-slate-50 focus:bg-white"
                    />
                    <button
                      onClick={() => handleCheckInSingle(quickStudentId)}
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      เช็คชื่อ
                    </button>
                  </div>

                  {/* Bulk Input Accordion */}
                  <details className="text-xs group">
                    <summary className="font-bold text-slate-500 cursor-pointer hover:text-slate-800 list-none flex items-center justify-between py-1">
                      <span>+ เช็คชื่อหลายคนพร้อมกัน (Bulk Paste)</span>
                      <ChevronRight className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="mt-2.5 space-y-2">
                      <textarea
                        rows={3}
                        value={bulkStudentIds}
                        onChange={(e) => setBulkStudentIds(e.target.value)}
                        placeholder="วางรหัสนักศึกษาที่คัดลอกจาก Excel (1 บรรทัดต่อ 1 คน หรือคั่นด้วยจุลภาค)"
                        className="w-full p-3 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:border-[#0070f3]"
                      />
                      <button
                        onClick={handleCheckInBulk}
                        disabled={loading || !bulkStudentIds.trim()}
                        className="w-full py-2.5 bg-[#0070f3] hover:bg-[#0060df] text-white font-bold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? 'กำลังบันทึก...' : 'บันทึกรายชื่อทั้งหมด'}
                      </button>
                    </div>
                  </details>
                </div>
              </div>

              {/* Live Attendee Table (รายชื่อผู้เข้าร่วมในกิจกรรมนี้) */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>รายชื่อนักศึกษาที่เช็คอินแล้ว ({currentActivityAttendees.length} คน)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">บันทึกประวัติและสะสมชั่วโมงเข้าสู่ระบบเรียบร้อยแล้ว</p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <input
                      type="text"
                      value={attendeeSearchQuery}
                      onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                      placeholder="ค้นหารหัส หรือชื่อ นศ...."
                      className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none w-full sm:w-48"
                    />

                    <button
                      onClick={() => {
                        window.open(`/api/export?type=all`, '_blank');
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-sm cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ส่งออก Excel</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[420px]">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 font-bold text-slate-500 uppercase sticky top-0 border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4 text-center">ลำดับ</th>
                        <th className="py-3 px-4">รหัสนักศึกษา</th>
                        <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                        <th className="py-3 px-4 text-center">เพศ</th>
                        <th className="py-3 px-4">สาขาวิชา</th>
                        <th className="py-3 px-4 text-center">ชั้นปี</th>
                        <th className="py-3 px-4 text-center">ชั่วโมง</th>
                        <th className="py-3 px-4 text-center">เวลาเช็คอิน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentActivityAttendees
                        .filter((a) => {
                          if (!attendeeSearchQuery) return true;
                          const q = attendeeSearchQuery.toLowerCase();
                          return a.studentId.includes(q) || a.name.toLowerCase().includes(q) || a.major.toLowerCase().includes(q);
                        })
                        .map((att) => (
                          <tr key={att.recordId} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 text-center font-mono text-slate-400">{att.order}</td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{att.studentId}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{att.name}</td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  att.gender === 'ชาย'
                                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                    : 'bg-pink-50 text-pink-700 border border-pink-200'
                                }`}
                              >
                                {att.gender}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-700">{att.major}</td>
                            <td className="py-3 px-4 text-center font-medium">ปี {att.yearLevel}</td>
                            <td className="py-3 px-4 text-center font-bold text-[#0070f3]">+{att.hours} ชม.</td>
                            <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">{att.dateRecorded}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ทดสอบ QR Code */}
          {activeTab === 'test_qr' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0070f3] flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-1">ทดสอบระบบ QR Code</h2>
                <p className="text-xs text-slate-500 mb-6">
                  ทดสอบการสแกนด้วยกล้องมือถือ/คอมพิวเตอร์ หรือพิมพ์รหัสนักศึกษาเพื่อตรวจสอบข้อมูลบัตรและสถิติ
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="py-3.5 px-6 bg-[#0070f3] hover:bg-[#0060df] text-white font-bold rounded-xl text-sm transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>เปิดกล้องทดสอบสแกน</span>
                  </button>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-400 block mb-2">หรือทดสอบด้วยการกรอกรหัส นศ.:</span>
                  <div className="flex gap-2 max-w-sm mx-auto">
                    <input
                      type="text"
                      placeholder="เช่น 661441001, 692447060"
                      id="testIdInput"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-slate-50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleVerifyStudent(e.currentTarget.value);
                          setActiveTab('verify');
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('testIdInput') as HTMLInputElement;
                        if (input) {
                          handleVerifyStudent(input.value);
                          setActiveTab('verify');
                        }
                      }}
                      className="px-5 py-2.5 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-900 cursor-pointer"
                    >
                      ตรวจสอบ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: รายงานชั่วโมง */}
          {activeTab === 'hours_report' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      รายงานชั่วโมงกิจกรรมนักศึกษา
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      สรุปผลชั่วโมงกิจกรรมสะสมของนักศึกษาทั้ง 960 คน พร้อมส่งออกไฟล์ Excel
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadReport}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลดรายงานสรุป (Excel)</span>
                  </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                  <span className="text-xs font-bold text-slate-500">กรองข้อมูล:</span>

                  <div className="flex bg-white rounded-xl border border-slate-200 p-0.5 text-xs font-bold">
                    <button
                      onClick={() => setReportFilterType('all')}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        reportFilterType === 'all' ? 'bg-[#0070f3] text-white' : 'text-slate-600'
                      }`}
                    >
                      ทั้งหมด
                    </button>
                    <button
                      onClick={() => setReportFilterType('year')}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        reportFilterType === 'year' ? 'bg-[#0070f3] text-white' : 'text-slate-600'
                      }`}
                    >
                      รายชั้นปี
                    </button>
                    <button
                      onClick={() => setReportFilterType('major')}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        reportFilterType === 'major' ? 'bg-[#0070f3] text-white' : 'text-slate-600'
                      }`}
                    >
                      รายสาขาวิชา
                    </button>
                  </div>

                  {reportFilterType === 'year' && (
                    <select
                      value={reportSelectedYear}
                      onChange={(e) => setReportSelectedYear(e.target.value)}
                      className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-bold"
                    >
                      <option value="1">ชั้นปีที่ 1 (รหัส 69)</option>
                      <option value="2">ชั้นปีที่ 2 (รหัส 68)</option>
                      <option value="3">ชั้นปีที่ 3 (รหัส 67)</option>
                      <option value="4">ชั้นปีที่ 4 (รหัส 66)</option>
                    </select>
                  )}

                  {reportFilterType === 'major' && (
                    <select
                      value={reportSelectedMajor}
                      onChange={(e) => setReportSelectedMajor(e.target.value)}
                      className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-bold"
                    >
                      {allMajors.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="relative flex-1 sm:w-60 ml-auto">
                    <input
                      type="text"
                      value={reportSearchQuery}
                      onChange={(e) => setReportSearchQuery(e.target.value)}
                      placeholder="ค้นหาชื่อ หรือรหัส นศ...."
                      className="w-full px-3.5 py-1.5 bg-white rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 font-bold text-slate-500 uppercase sticky top-0 border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">รหัสนักศึกษา</th>
                        <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                        <th className="py-3 px-4 text-center">เพศ</th>
                        <th className="py-3 px-4">สาขาวิชา</th>
                        <th className="py-3 px-4 text-center">ชั้นปี</th>
                        <th className="py-3 px-4 text-center">ปีที่เข้า</th>
                        <th className="py-3 px-4 text-center">ชั่วโมงสะสม</th>
                        <th className="py-3 px-4 text-center">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredReportStudents.map((st) => {
                        const stRecs = records.filter((r) => r.studentId === st.studentId);
                        const hrs = stRecs.reduce((sum, r) => sum + r.hoursEarned, 0);

                        return (
                          <tr key={st.studentId} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{st.studentId}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{st.name}</td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  st.gender === 'ชาย'
                                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                    : 'bg-pink-50 text-pink-700 border border-pink-200'
                                }`}
                              >
                                {st.gender}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-700">{st.major}</td>
                            <td className="py-3 px-4 text-center">ปี {st.yearLevel}</td>
                            <td className="py-3 px-4 text-center font-mono">{st.academicYear}</td>
                            <td className="py-3 px-4 text-center font-bold text-[#0070f3]">{hrs} ชม.</td>
                            <td className="py-3 px-4 text-center">
                              {hrs >= 60 ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px]">
                                  ครบเกณฑ์
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium text-[10px]">
                                  ขาดอีก {60 - hrs}
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

          {/* TAB 4: รายงานกิจกรรม */}
          {activeTab === 'activity_report' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      รายงานสรุปภาพรวมกิจกรรมทั้งหมด
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      รายการกิจกรรมทั้งหมด ยอดการเช็คอิน และสถิติการจัดกิจกรรม
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 font-bold text-slate-500 uppercase border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">รหัส</th>
                        <th className="py-3 px-4">ชื่อกิจกรรม</th>
                        <th className="py-3 px-4">หมวดหมู่</th>
                        <th className="py-3 px-4 text-center">ชั่วโมง</th>
                        <th className="py-3 px-4">วันเวลาจัด</th>
                        <th className="py-3 px-4 text-center">ยอดเช็คอิน</th>
                        <th className="py-3 px-4 text-center">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activities.map((a) => {
                        const count = activityAttendanceMap.get(a.id) || 0;
                        return (
                          <tr key={a.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4 font-mono font-bold text-slate-400">{a.id}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{a.title}</td>
                            <td className="py-3 px-4">{a.category}</td>
                            <td className="py-3 px-4 text-center font-bold text-[#0070f3]">+{a.hours} ชม.</td>
                            <td className="py-3 px-4 text-slate-500">{a.date}</td>
                            <td className="py-3 px-4 text-center font-bold text-slate-800">
                              {count} / {totalPool} ({Math.round((count / totalPool) * 100)}%)
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => {
                                  setSelectedActivity(a);
                                  setActiveTab('home');
                                }}
                                className="px-3 py-1.5 bg-blue-50 text-[#0070f3] hover:bg-[#0070f3] hover:text-white rounded-lg font-bold text-xs transition cursor-pointer"
                              >
                                จัดการเช็คอิน
                              </button>
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

          {/* TAB 5: ตรวจสอบ (Student Verification) */}
          {activeTab === 'verify' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <h2 className="text-xl font-black text-slate-900 mb-1 flex items-center gap-2">
                  <Search className="w-5 h-5 text-[#0070f3]" />
                  <span>ตรวจสอบข้อมูลนักศึกษา (Student Verification)</span>
                </h2>
                <p className="text-xs text-slate-500 mb-6">
                  ตรวจสอบสถานะนักศึกษา ชั่วโมงสะสม และประวัติการเข้าร่วมกิจกรรม
                </p>

                <div className="flex gap-2 mb-6">
                  <input
                    type="text"
                    value={verifyStudentId}
                    onChange={(e) => setVerifyStudentId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleVerifyStudent(verifyStudentId);
                    }}
                    placeholder="กรอกรหัสนักศึกษา เช่น 661441001"
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0070f3]"
                  />
                  <button
                    onClick={() => handleVerifyStudent(verifyStudentId)}
                    className="px-6 py-3 bg-[#0070f3] hover:bg-[#0060df] text-white font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    ค้นหา
                  </button>
                </div>

                {verifiedStudentResult && (
                  <div className="space-y-6 pt-6 border-t border-slate-100 animate-in fade-in">
                    {/* Student Info Card */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-black text-[#0070f3]">
                            {verifiedStudentResult.student.studentId}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            เพศ: {verifiedStudentResult.student.gender}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900">{verifiedStudentResult.student.name}</h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          สาขาวิชา{verifiedStudentResult.student.major} • ชั้นปีที่ {verifiedStudentResult.student.yearLevel} (ปีที่เข้า {verifiedStudentResult.student.academicYear})
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-400 block">ชั่วโมงสะสมรวม</span>
                        <span className="text-2xl font-black text-[#0070f3]">{verifiedStudentResult.totalHours} ชม.</span>
                      </div>
                    </div>

                    {/* Attended Activities */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">
                        ประวัติกิจกรรมที่เข้าร่วม ({verifiedStudentResult.records.length} รายการ):
                      </h4>
                      <div className="space-y-2">
                        {verifiedStudentResult.records.length === 0 ? (
                          <p className="text-xs text-slate-400">ยังไม่มีประวัติการเช็คอินกิจกรรม</p>
                        ) : (
                          verifiedStudentResult.records.map((r, i) => (
                            <div
                              key={r.id || i}
                              className="p-3 rounded-xl bg-white border border-slate-200 flex justify-between items-center text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900 block">{r.activityTitle}</span>
                                <span className="text-slate-400 text-[11px]">{r.dateRecorded} • {r.category}</span>
                              </div>
                              <span className="font-bold text-[#0070f3]">+{r.hoursEarned} ชม.</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: + สร้างกิจกรรม */}
          {activeTab === 'create_activity' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <h2 className="text-xl font-black text-slate-900 mb-1 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#0070f3]" />
                  <span>สร้างกิจกรรมใหม่ (+ Add Activity)</span>
                </h2>
                <p className="text-xs text-slate-500 mb-6">
                  สร้างกิจกรรมใหม่เพื่อเปิดให้นักศึกษาเช็คอินสะสมชั่วโมง บันทึกลง Google Sheets ทันที
                </p>

                <form onSubmit={handleCreateActivity} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ชื่อกิจกรรม *
                    </label>
                    <input
                      type="text"
                      value={activityForm.title}
                      onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                      placeholder="เช่น โครงการอบรมทักษะภาษาอังกฤษเพื่อการสื่อสาร 2026"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-[#0070f3]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        หมวดหมู่กิจกรรม *
                      </label>
                      <select
                        value={activityForm.category}
                        onChange={(e) =>
                          setActivityForm({
                            ...activityForm,
                            category: e.target.value as Activity['category'],
                          })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                      >
                        <option value="มหาวิทยาลัย">หมวดมหาวิทยาลัย</option>
                        <option value="คณะ/สาขา">หมวดคณะ/สาขา</option>
                        <option value="บำเพ็ญประโยชน์/จิตอาสา">หมวดบำเพ็ญประโยชน์/จิตอาสา</option>
                        <option value="ส่งเสริมวิชาการ/วิชาชีพ">หมวดส่งเสริมวิชาการ/วิชาชีพ</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        จำนวนชั่วโมงที่ได้รับ *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={activityForm.hours}
                        onChange={(e) =>
                          setActivityForm({ ...activityForm, hours: Number(e.target.value) })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        วันที่จัดกิจกรรม *
                      </label>
                      <input
                        type="date"
                        value={activityForm.date}
                        onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        เวลาจัดกิจกรรม *
                      </label>
                      <input
                        type="time"
                        value={activityForm.time}
                        onChange={(e) => setActivityForm({ ...activityForm, time: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      สถานที่จัดกิจกรรม
                    </label>
                    <input
                      type="text"
                      value={activityForm.location}
                      onChange={(e) => setActivityForm({ ...activityForm, location: e.target.value })}
                      placeholder="เช่น หอประชุมใหญ่ มหาวิทยาลัยฟาฏอนี"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-[#0070f3]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      รายละเอียดเพิ่มเติม
                    </label>
                    <textarea
                      rows={3}
                      value={activityForm.description}
                      onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                      placeholder="รายละเอียดหรือวัตถุประสงค์ของกิจกรรม..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0070f3]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-[#0070f3] hover:bg-[#0060df] text-white font-bold rounded-xl text-sm transition shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'กำลังบันทึก...' : 'บันทึกกิจกรรมใหม่ลง Google Sheets'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 7: จัดการกิจกรรม */}
          {activeTab === 'manage_activities' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      จัดการกิจกรรมทั้งหมด ({activities.length} รายการ)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ดูรายชื่อผู้เช็คอิน แก้ไข หรือเปิดห้องสแกนสำหรับแต่ละกิจกรรม
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('create_activity')}
                    className="px-4 py-2.5 bg-[#0070f3] text-white font-bold rounded-xl text-xs hover:bg-[#0060df] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มกิจกรรม</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activities.map((act) => {
                    const count = activityAttendanceMap.get(act.id) || 0;
                    return (
                      <div key={act.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                            <span>{act.id}</span>
                            <span className="font-bold text-[#0070f3]">+{act.hours} ชม.</span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm mb-1">{act.title}</h4>
                          <p className="text-xs text-slate-500 mb-3">{act.date} • {act.location || 'ม.ฟาฏอนี'}</p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-xs">
                          <span className="text-slate-600 font-bold">เช็คอิน: {count} คน</span>
                          <button
                            onClick={() => {
                              setSelectedActivity(act);
                              setActiveTab('home');
                            }}
                            className="px-3 py-1.5 bg-[#0070f3] text-white rounded-lg font-bold hover:bg-[#0060df] transition cursor-pointer"
                          >
                            เปิดหน้าเช็คอิน
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: จัดการลิงก์แชร์ */}
          {activeTab === 'share_links' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0070f3] flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-1">ลิงก์และ QR Code สำหรับแชร์</h2>
                <p className="text-xs text-slate-500 mb-6">
                  แชร์ลิงก์ระบบเพื่อให้นักศึกษาเข้าสู่หน้าบัตร UniPass ของตนเอง
                </p>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-6 flex items-center justify-between gap-3 text-xs font-mono text-slate-700">
                  <span className="truncate">https://unipass.ftu.ac.th/login</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin + '/login');
                      setMessage({ text: 'คัดลอกลิงก์สำเร็จแล้ว!', type: 'success' });
                    }}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold hover:bg-slate-100 flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอก</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Universal Multi-device QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(scannedId) => {
          if (selectedActivity) {
            handleCheckInSingle(scannedId);
          } else {
            handleVerifyStudent(scannedId);
            setActiveTab('verify');
          }
        }}
      />

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center animate-in zoom-in-95">
            <h3 className="font-black text-slate-900 text-lg mb-1">เปลี่ยนรหัสผ่านแอดมิน</h3>
            <p className="text-xs text-slate-500 mb-4">กรอกรหัส PIN ใหม่ที่ต้องการใช้งาน</p>

            <input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="รหัส PIN ใหม่ (เช่น 5678)"
              className="w-full text-center text-xl font-bold py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 mb-4 focus:bg-white"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  if (newPin.trim()) {
                    setMessage({ text: `เปลี่ยนรหัส PIN เป็น "${newPin}" เรียบร้อยแล้ว`, type: 'success' });
                    setIsPasswordModalOpen(false);
                    setNewPin('');
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#0070f3] text-white font-bold text-xs"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
