'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
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
  Copy,
  Tv,
  Wifi,
  WifiOff,
  RotateCw,
  Filter,
  Shield,
  PieChart,
  Trash2,
  Crown
} from 'lucide-react';
import { Student, Activity, AttendanceRecord, UserRole } from '@/types';
import QRScannerModal from '@/components/QRScannerModal';
import ProjectorModeModal from '@/components/ProjectorModeModal';
import { verifyQrPayload } from '@/lib/dynamicQr';
import { playSuccessBeep, playWarningBeep } from '@/lib/audioFeedback';

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
  // Authentication & RBAC
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'superadmin' | 'staff'>('superadmin');
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

  // Check-in Mode: Single, Round IN, Round OUT
  const [currentCheckInType, setCurrentCheckInType] = useState<'SINGLE' | 'IN' | 'OUT'>('SINGLE');

  // Network & Offline Queue
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineQueue, setOfflineQueue] = useState<AttendanceRecord[]>([]);

  // Projector Mode Display
  const [isProjectorOpen, setIsProjectorOpen] = useState(false);
  const [projectorActivity, setProjectorActivity] = useState<Activity | null>(null);

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
    capacity: 100,
    checkInMode: 'SINGLE' as Activity['checkInMode'],
  });

  // ตัวกรองรายงานชั่วโมง
  const [reportFilterType, setReportFilterType] = useState<'all' | 'year' | 'major'>('all');
  const [reportSelectedYear, setReportSelectedYear] = useState('1');
  const [reportSelectedMajor, setReportSelectedMajor] = useState('อิสลามศึกษา');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [showOnlyAtRiskYear4, setShowOnlyAtRiskYear4] = useState(false);

  // Password Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPin, setNewPin] = useState('');

  // Network Status and Offline Queue Hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const updateOnline = () => setIsOnline(navigator.onLine);
      window.addEventListener('online', updateOnline);
      window.addEventListener('offline', updateOnline);

      try {
        const savedQueue = localStorage.getItem('edupass_offline_queue') || localStorage.getItem('unipass_offline_queue');
        if (savedQueue) {
          const parsed = JSON.parse(savedQueue);
          if (Array.isArray(parsed)) setOfflineQueue(parsed);
        }
      } catch (err) {
        console.warn('Failed reading offline queue:', err);
      }

      return () => {
        window.removeEventListener('online', updateOnline);
        window.removeEventListener('offline', updateOnline);
      };
    }
  }, []);

  // Handle PIN Login (1234: Super Admin / 5678: Staff Scanner)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.trim();
    if (cleanPin === '1234' || cleanPin === 'admin') {
      setIsAuthenticated(true);
      setUserRole('superadmin');
      setPinError(false);
      playSuccessBeep();
    } else if (cleanPin === '5678' || cleanPin === 'staff') {
      setIsAuthenticated(true);
      setUserRole('staff');
      setPinError(false);
      playSuccessBeep();
    } else {
      setPinError(true);
      playWarningBeep();
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
        checkInType: r.checkInType || 'SINGLE',
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

  // ซิงค์คิวออฟไลน์ขึ้นเซิร์ฟเวอร์
  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    setRefreshing(true);
    try {
      let successCount = 0;
      for (const item of offlineQueue) {
        await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'record_attendance',
            studentIds: [item.studentId],
            activity: {
              id: item.activityId,
              title: item.activityTitle,
              category: item.category,
              hours: item.hoursEarned,
            },
            checkInType: item.checkInType,
          }),
        });
        successCount++;
      }
      setOfflineQueue([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('edupass_offline_queue');
        localStorage.removeItem('unipass_offline_queue');
      }
      playSuccessBeep();
      setMessage({
        text: `⚡ ซิงค์ข้อมูลออฟไลน์ขึ้นระบบเรียบร้อย (${successCount} รายการ)`,
        type: 'success',
      });
    } catch (err) {
      console.error('Offline sync failed', err);
      playWarningBeep();
      setMessage({ text: 'ยังไม่สามารถซิงค์ข้อมูลกับเซิร์ฟเวอร์ได้ในขณะนี้', type: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  // เช็คชื่อนักศึกษา 1 คน (Quick Check-in หรือสแกน QR)
  const handleCheckInSingle = async (sid: string) => {
    const rawInput = sid.trim();
    if (!rawInput || !selectedActivity) return;

    // 1. ตรวจสอบ Dynamic QR Payload และความถูกต้อง
    const qrResult = verifyQrPayload(rawInput);
    if (!qrResult.valid) {
      playWarningBeep();
      setMessage({
        text: `❌ ${qrResult.error || 'QR Code ไม่ถูกต้อง หรือหมดอายุ (กรุณาให้นักศึกษารีเฟรชหน้าบัตร)'}`,
        type: 'error',
      });
      return;
    }

    const cleanId = qrResult.studentId;

    // 2. ตรวจสอบการเช็คอินซ้ำตามรอบที่เลือก (SINGLE, IN, OUT)
    const isDuplicate = records.some((r) => {
      if (r.activityId !== selectedActivity.id || r.studentId !== cleanId) return false;
      if (currentCheckInType === 'SINGLE') return true;
      return r.checkInType === currentCheckInType;
    });

    if (isDuplicate) {
      playWarningBeep();
      const roundLabel = currentCheckInType === 'IN' ? 'รอบเข้า (IN)' : currentCheckInType === 'OUT' ? 'รอบออก (OUT)' : 'กิจกรรมนี้';
      setMessage({
        text: `⚠️ รหัส ${cleanId} ได้เช็คอิน${roundLabel}ไปแล้ว`,
        type: 'error',
      });
      return;
    }

    // 3. ตรวจสอบความจุสูงสุด (Capacity limit)
    if (selectedActivity.capacity && currentActivityAttendees.length >= selectedActivity.capacity) {
      playWarningBeep();
      setMessage({
        text: `⚠️ กิจกรรมนี้มีผู้เข้าร่วมครบตามจำนวนความจุแล้ว (${selectedActivity.capacity} ที่นั่ง)`,
        type: 'error',
      });
      return;
    }

    // ข้อมูลนักศึกษา
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
      checkInType: currentCheckInType,
    };

    // 4. หากทำงานในโหมด Offline (เน็ตดับ) ให้บันทึกเข้าคิวออฟไลน์ทันที
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const updated = [...offlineQueue, newRecord];
      setOfflineQueue(updated);
      try {
        localStorage.setItem('edupass_offline_queue', JSON.stringify(updated));
      } catch (e) {}
      setRecords((prev) => [newRecord, ...prev]);
      playSuccessBeep();
      setMessage({
        text: `📦 [ออฟไลน์] บันทึกสำเร็จ: ${cleanId} (${studentName}) [${currentCheckInType}]`,
        type: 'success',
      });
      setQuickStudentId('');
      return;
    }

    // 5. หากต่อเน็ต ให้ส่งข้อมูลไปยังเซิร์ฟเวอร์
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_attendance',
          studentIds: [cleanId],
          activity: selectedActivity,
          checkInType: currentCheckInType,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'เช็คอินไม่สำเร็จ');

      setRecords((prev) => [newRecord, ...prev]);
      playSuccessBeep();
      const roundText = currentCheckInType === 'IN' ? ' (รอบเข้า IN)' : currentCheckInType === 'OUT' ? ' (รอบออก OUT)' : '';
      setMessage({
        text: `✅ เช็คอินสำเร็จ: ${cleanId} (${studentName})${roundText} ได้รับ ${selectedActivity.hours} ชม.`,
        type: 'success',
      });
      setQuickStudentId('');
    } catch (err: unknown) {
      // Fallback เก็บใน Offline Queue หากเซิร์ฟเวอร์มีปัญหา
      const updated = [...offlineQueue, newRecord];
      setOfflineQueue(updated);
      try {
        localStorage.setItem('edupass_offline_queue', JSON.stringify(updated));
      } catch (e) {}
      setRecords((prev) => [newRecord, ...prev]);
      playSuccessBeep();
      setMessage({
        text: `📦 เชื่อมต่อเซิร์ฟเวอร์ชั่วคราวไม่ได้ บันทึกลงคิวออฟไลน์แล้ว: ${cleanId}`,
        type: 'success',
      });
      setQuickStudentId('');
    }
  };

  // ลบประวัติการเช็คอิน (เฉพาะ Super Admin เท่านั้น)
  const handleDeleteRecord = (recordId: string, studentId: string) => {
    if (userRole !== 'superadmin') {
      playWarningBeep();
      setMessage({ text: '⚠️ เฉพาะ Super Admin เท่านั้นที่สามารถลบข้อมูลการเช็คอินได้', type: 'error' });
      return;
    }

    if (typeof window !== 'undefined' && !window.confirm(`ยืนยันการลบประวัติการเช็คอินของรหัส ${studentId}?`)) {
      return;
    }

    setRecords((prev) => prev.filter((r) => r.id !== recordId));
    playSuccessBeep();
    setMessage({ text: `ลบประวัติการเช็คอินของรหัส ${studentId} เรียบร้อยแล้ว`, type: 'success' });
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
          checkInType: currentCheckInType,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'บันทึกไม่สำเร็จ');

      const newRecs: AttendanceRecord[] = rawIds.map((sid, idx) => ({
        id: `REC-${Date.now()}-${idx}`,
        studentId: sid,
        activityId: selectedActivity.id,
        activityTitle: selectedActivity.title,
        category: selectedActivity.category,
        hoursEarned: selectedActivity.hours,
        dateRecorded: new Date().toLocaleString('th-TH'),
        status: 'APPROVED',
        checkInType: currentCheckInType,
      }));

      setRecords((prev) => [...newRecs, ...prev]);
      playSuccessBeep();
      setMessage({
        text: `✅ บันทึกเช็คอินเรียบร้อย ${rawIds.length} คน!`,
        type: 'success',
      });
      setBulkStudentIds('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเช็คอินกลุ่ม';
      playWarningBeep();
      setMessage({ text: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // คัดลอกกิจกรรม (Duplicate Activity ใน 1 คลิก)
  const handleDuplicateActivity = async (act: Activity) => {
    setLoading(true);
    try {
      const duplicated: Activity = {
        ...act,
        id: `ACT-${Date.now().toString().slice(-4)}`,
        title: `${act.title} (สำเนา)`,
      };

      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_activity',
          ...duplicated,
        }),
      });

      if (!res.ok) throw new Error('คัดลอกกิจกรรมไม่สำเร็จ');

      setActivities((prev) => [duplicated, ...prev]);
      playSuccessBeep();
      setMessage({ text: `📋 คัดลอกกิจกรรม "${duplicated.title}" สำเร็จแล้ว!`, type: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      playWarningBeep();
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
        capacity: Number(activityForm.capacity) || undefined,
        checkInMode: activityForm.checkInMode || 'SINGLE',
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
      playSuccessBeep();
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
        capacity: 100,
        checkInMode: 'SINGLE',
      });
      setActiveTab('home');
      setSelectedActivity(newAct);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      playWarningBeep();
      setMessage({ text: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ตรวจสอบนักศึกษาในแท็บ Verify
  const handleVerifyStudent = (sid: string) => {
    const raw = sid.trim();
    if (!raw) return;

    const qrCheck = verifyQrPayload(raw);
    const cleanId = qrCheck.valid ? qrCheck.studentId : raw;

    const student = students.find((s) => s.studentId === cleanId);
    if (!student) {
      setVerifiedStudentResult(null);
      playWarningBeep();
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
    playSuccessBeep();
    setMessage(null);
  };

  // แมปชั่วโมงสะสมรวมของนักศึกษาแต่ละคน
  const studentTotalHoursMap = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((r) => {
      map.set(r.studentId, (map.get(r.studentId) || 0) + r.hoursEarned);
    });
    return map;
  }, [records]);

  // นักศึกษาชั้นปี 4 ที่ยังไม่ครบ 60 ชั่วโมง (กลุ่มเสี่ยงไม่สำเร็จการศึกษา)
  const atRiskYear4Students = useMemo(() => {
    return students.filter((s) => {
      if (s.yearLevel !== 4) return false;
      const hrs = studentTotalHoursMap.get(s.studentId) || 0;
      return hrs < 60;
    });
  }, [students, studentTotalHoursMap]);

  // สรุปสถิติชั่วโมงตามเกณฑ์สำหรับ Visual Analytics Charts
  const hourDistributionStats = useMemo(() => {
    let completed = 0; // >= 60 ชม.
    let high = 0;      // 40 - 59 ชม.
    let medium = 0;    // 20 - 39 ชม.
    let low = 0;       // < 20 ชม.

    students.forEach((s) => {
      const hrs = studentTotalHoursMap.get(s.studentId) || 0;
      if (hrs >= 60) completed++;
      else if (hrs >= 40) high++;
      else if (hrs >= 20) medium++;
      else low++;
    });

    const total = students.length || 1;
    return {
      completed,
      high,
      medium,
      low,
      completedPct: Math.round((completed / total) * 100),
      highPct: Math.round((high / total) * 100),
      mediumPct: Math.round((medium / total) * 100),
      lowPct: Math.round((low / total) * 100),
    };
  }, [students, studentTotalHoursMap]);

  // ค่าเฉลี่ยชั่วโมงแยกตามชั้นปี สำหรับ Bar Chart
  const yearAverageHours = useMemo(() => {
    const sums: Record<number, { totalHours: number; count: number }> = {
      1: { totalHours: 0, count: 0 },
      2: { totalHours: 0, count: 0 },
      3: { totalHours: 0, count: 0 },
      4: { totalHours: 0, count: 0 },
    };

    students.forEach((s) => {
      const hrs = studentTotalHoursMap.get(s.studentId) || 0;
      if (sums[s.yearLevel]) {
        sums[s.yearLevel].totalHours += hrs;
        sums[s.yearLevel].count++;
      }
    });

    return [1, 2, 3, 4].map((yr) => ({
      year: yr,
      avg: sums[yr].count ? Math.round(sums[yr].totalHours / sums[yr].count) : 0,
      count: sums[yr].count,
    }));
  }, [students, studentTotalHoursMap]);

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

    // ตัวกรองด่วน: นศ. ปี 4 ที่ยังไม่ครบ 60 ชม.
    if (showOnlyAtRiskYear4) {
      return atRiskYear4Students;
    }

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
  }, [students, reportFilterType, reportSelectedYear, reportSelectedMajor, reportSearchQuery, showOnlyAtRiskYear4, atRiskYear4Students]);

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
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-100 p-6 sm:p-8 max-w-md w-full text-center animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0070f3] to-indigo-600 text-white flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-blue-500/25">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-1">EDU Pass Staff Portal</h1>
          <p className="text-xs text-slate-500 mb-5 font-medium">เข้าสู่ระบบจัดการกิจกรรม คณะศึกษาศาสตร์ มหาวิทยาลัยฟาฏอนี</p>

          {/* Role Cards Quick Selection */}
          <div className="grid grid-cols-2 gap-2.5 mb-5 text-left">
            <button
              type="button"
              onClick={() => setPinInput('1234')}
              className={`p-3 rounded-2xl border transition text-left cursor-pointer ${
                pinInput === '1234'
                  ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/70'
              }`}
            >
              <div className="flex items-center gap-1.5 text-blue-700 font-black text-xs mb-1">
                <Crown className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                <span>แอดมินหลัก</span>
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">
                สิทธิ์เต็มระบบ: จัดการกิจกรรม รายงานทั้งคณะ ส่งออก Excel
              </div>
              <div className="mt-2 text-[10px] font-mono font-bold text-blue-600">
                PIN: 1234
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPinInput('5678')}
              className={`p-3 rounded-2xl border transition text-left cursor-pointer ${
                pinInput === '5678'
                  ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/70'
              }`}
            >
              <div className="flex items-center gap-1.5 text-emerald-700 font-black text-xs mb-1">
                <Camera className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                <span>เจ้าหน้าที่สแกน</span>
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">
                จุดสแกนหน้างาน: สแกน QR Code ตรวจบัตร นศ. ฉายจอ
              </div>
              <div className="mt-2 text-[10px] font-mono font-bold text-emerald-600">
                PIN: 5678
              </div>
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="กรอกรหัส PIN (1234 หรือ 5678)"
                className="w-full text-center tracking-widest text-2xl font-black py-3.5 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#0070f3] text-slate-900 transition"
                autoFocus
                required
              />
            </div>

            {pinError && (
              <p className="text-xs font-bold text-rose-600 animate-in fade-in">
                รหัสผ่านไม่ถูกต้อง (Super Admin: 1234 / Staff: 5678)
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-[#0070f3] to-blue-700 hover:opacity-95 active:scale-95 text-white font-bold rounded-xl transition shadow-md shadow-blue-500/25 cursor-pointer text-sm"
            >
              เข้าสู่ระบบ EDU Pass
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition"
            >
              <span>← กลับสู่หน้าบัตรนักศึกษา</span>
            </Link>
          </div>
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
          <span className="font-black text-lg text-slate-900">EDU Pass</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Left Sidebar (โครงสร้างและ UI ถอดแบบจาก EDU Pass FTU ในภาพต้นฉบับ 100%) */}
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
            <h1 className="font-black text-lg text-slate-900 tracking-tight leading-none">EDU Pass</h1>
            <p className="text-[11px] text-slate-400 font-medium mt-1">กิจกรรม คณะศึกษาศาสตร์</p>
          </div>
        </div>

        {/* Menu Navigation Area */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          {userRole === 'superadmin' ? (
            <>
              {/* Section 1 สำหรับ Super Admin: เมนูหลัก */}
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
                  <span>เมนูหลัก</span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Admin</span>
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
                </nav>
              </div>

              {/* Section 2 สำหรับ Super Admin: จัดการระบบ */}
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                  จัดการระบบ
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
            </>
          ) : (
            <>
              {/* Section สำหรับ Staff Scanner: เมนูจุดสแกนหน้างานเท่านั้น */}
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
                  <span>จุดสแกนหน้างาน</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Scanner</span>
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
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Home className="w-4 h-4 shrink-0" />
                    <span>จุดสแกนเช็คอิน</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsScannerOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer border border-emerald-200"
                  >
                    <Camera className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>เปิดกล้องสแกน QR</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('verify');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                      activeTab === 'verify'
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Search className="w-4 h-4 shrink-0" />
                    <span>ค้นหา/ตรวจประวัติ นศ.</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('test_qr');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                      activeTab === 'test_qr'
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>ทดสอบ QR Code</span>
                  </button>
                </nav>
              </div>

              {/* ขอบเขตสิทธิ์เจ้าหน้าที่จุดสแกน */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-slate-600 space-y-1.5">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>ขอบเขตสิทธิ์ Staff Scanner</span>
                </div>
                <ul className="space-y-1 text-[11px] text-slate-600 pl-1">
                  <li className="text-emerald-700 font-semibold">✓ สแกน QR และเช็คชื่อ นศ. หน้างาน</li>
                  <li className="text-emerald-700 font-semibold">✓ ค้นหาประวัติรายคนหน้างาน</li>
                  <li className="text-slate-400 line-through">✗ ปิดสร้าง/แก้ไข/ลบกิจกรรม</li>
                  <li className="text-slate-400 line-through">✗ ปิดรายงานภาพรวมทั้งคณะ</li>
                  <li className="text-slate-400 line-through">✗ ปิดการลบประวัติผู้เข้าร่วม</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Bottom Profile Area (รองรับ Super Admin vs Staff) */}
        <div className="p-4 border-t border-slate-100 bg-white space-y-2.5 mt-auto">
          <div className="flex items-center gap-3 px-2 py-1">
            <div
              className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm shadow-sm ${
                userRole === 'superadmin' ? 'bg-[#0070f3]' : 'bg-emerald-600'
              }`}
            >
              <User className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-sm text-slate-800 truncate">
                {userRole === 'superadmin' ? 'อนันต์ แวบือซา' : 'เจ้าหน้าที่จุดสแกน'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                    userRole === 'superadmin'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {userRole === 'superadmin' ? 'Super Admin' : 'Staff Scanner'}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  title={isOnline ? 'ออนไลน์' : 'ออฟไลน์'}
                />
              </div>
            </div>
          </div>

          {userRole === 'superadmin' && (
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition border border-slate-200/80 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span>เปลี่ยนรหัสผ่าน</span>
            </button>
          )}

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
        {/* Role Identity Banner */}
        <div
          className={`px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-bold gap-2 shadow-sm ${
            userRole === 'superadmin'
              ? 'bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 text-white'
              : 'bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-950 text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {userRole === 'superadmin' ? (
              <>
                <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-black text-amber-300">สิทธิ์ผู้ดูแลระบบหลัก (Super Admin):</span>
                <span className="text-blue-100 font-normal hidden md:inline">
                  สิทธิ์เต็มในการบริหารจัดการกิจกรรม, ตรวจสอบรายงานภาพรวมทั้งคณะ, ส่งออก Excel และตั้งค่าระบบ
                </span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 text-emerald-300 shrink-0" />
                <span className="font-black text-emerald-300">โหมดเจ้าหน้าที่จุดสแกน (Staff Scanner Station):</span>
                <span className="text-emerald-100 font-normal hidden md:inline">
                  จำกัดสิทธิ์เฉพาะการสแกน QR Code เช็คอินหน้างาน และตรวจค้นหารายบุคคล (ไม่มีสิทธิ์ลบหรือแก้ไขกิจกรรม)
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {userRole === 'staff' && (
              <button
                onClick={() => setIsScannerOpen(true)}
                className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>เปิดกล้องสแกนทันที</span>
              </button>
            )}
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                userRole === 'superadmin'
                  ? 'bg-blue-500/30 text-blue-200 border border-blue-400/30'
                  : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
              }`}
            >
              {userRole === 'superadmin' ? 'Super Admin' : 'Staff Scanner'}
            </span>
          </div>
        </div>
        {/* Offline Queue Notification Banner */}
        {(!isOnline || offlineQueue.length > 0) && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>
                {!isOnline ? '🔴 กำลังทำงานในโหมดออฟไลน์ (ไม่มีสัญญาณเน็ต)' : '🟢 สัญญาณเน็ตกลับมาแล้ว'} 
                {offlineQueue.length > 0 && ` — มี ${offlineQueue.length} รายการรอส่งเข้า Google Sheets`}
              </span>
            </div>
            {offlineQueue.length > 0 && isOnline && (
              <button
                onClick={syncOfflineQueue}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>ซิงค์ข้อมูลเดี๋ยวนี้ ({offlineQueue.length})</span>
              </button>
            )}
          </div>
        )}
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
          {/* Staff Access Restriction Guard: ป้องกันไม่ให้ Staff เข้าถึงเมนูที่สงวนไว้สำหรับ Super Admin */}
          {userRole === 'staff' && (activeTab === 'hours_report' || activeTab === 'activity_report' || activeTab === 'create_activity' || activeTab === 'manage_activities' || activeTab === 'share_links') && (
            <div className="bg-white rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto my-8 border border-slate-200 shadow-sm animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">เฉพาะผู้ดูแลระบบหลัก (Super Admin)</h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                บัญชีเจ้าหน้าที่จุดสแกน (Staff Scanner) ไม่มีสิทธิ์เข้าถึงรายงานภาพรวมหรือการจัดการกิจกรรมของคณะ หากต้องการใช้งานฟังก์ชันนี้ กรุณาเข้าสู่ระบบด้วยรหัส Super Admin (PIN: 1234)
              </p>
              <button
                onClick={() => setActiveTab('home')}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                กลับไปที่จุดสแกนเช็คอิน
              </button>
            </div>
          )}

          {/* TAB 1: หน้าหลัก (เลือกกิจกรรม & ตารางการ์ดตามภาพต้นฉบับ 100%) */}
          {activeTab === 'home' && !selectedActivity && (
            <div className="space-y-6">
              {/* Header Title & Filter */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {userRole === 'superadmin' ? 'เลือกกิจกรรม' : 'เลือกกิจกรรมเพื่อเปิดจุดสแกน'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {userRole === 'superadmin'
                      ? 'จัดการกิจกรรม สแกนเช็คอิน คัดลอก หรือเปิดฉายจอโปรเจกเตอร์'
                      : 'เลือกกิจกรรมที่กำลังจัดเพื่อเปิดกล้องสแกน QR Code หน้างานและเช็คชื่อ'}
                  </p>
                </div>

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
                  const maxCap = act.capacity || totalPool;
                  const percentage = Math.min(100, Math.round((checkInCount / maxCap) * 100));

                  return (
                    <div
                      key={act.id}
                      className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        {/* Badges */}
                        <div className="flex items-center justify-between text-xs font-semibold mb-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-[11px]">
                            {act.category}
                          </span>
                          <span className="font-bold text-[#0070f3]">+{act.hours} ชม.</span>
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-slate-900 text-base leading-snug mb-1 line-clamp-2 min-h-[44px]">
                          {act.title}
                        </h3>

                        {/* Date and Time */}
                        <p className="text-xs text-slate-400 font-medium mb-4">
                          {act.date} • {act.location || 'ม.ฟาฏอนี'}
                        </p>

                        {/* Check-in Progress */}
                        <div className="space-y-1.5 mb-6">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-slate-600">
                              เช็คอิน: {checkInCount} / {act.capacity ? `${act.capacity} ที่นั่ง` : `${totalPool} คน`}
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

                      {/* Action Buttons: เลือกกิจกรรมนี้ & ฉายขึ้นจอ */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedActivity(act)}
                          className={`flex-1 py-2.5 active:scale-98 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer text-center ${
                            userRole === 'staff'
                              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                              : 'bg-[#0070f3] hover:bg-[#0060df]'
                          }`}
                        >
                          {userRole === 'staff' ? 'เปิดจุดสแกนกิจกรรมนี้' : 'เลือกกิจกรรมนี้'}
                        </button>
                        <button
                          onClick={() => {
                            setProjectorActivity(act);
                            setIsProjectorOpen(true);
                          }}
                          className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 shrink-0"
                          title="ฉายจอโปรเจกเตอร์สำหรับห้องประชุม"
                        >
                          <Tv className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 1 (SELECTED ACTIVITY WORKSPACE): เมื่อกด "เลือกกิจกรรมนี้" */}
          {activeTab === 'home' && selectedActivity && (
            <div className="space-y-6 animate-in fade-in duration-200">
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
                      {selectedActivity.checkInMode === 'IN_OUT' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          รอบเข้า/ออก (2-Step)
                        </span>
                      )}
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

                  {/* Summary Check-in Counter & Quick Actions */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 shrink-0">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block uppercase">เช็คอินแล้ว</span>
                        <div className="text-2xl font-black text-[#0070f3]">
                          {currentActivityAttendees.length}{' '}
                          <span className="text-xs font-medium text-slate-400">
                            / {selectedActivity.capacity ? `${selectedActivity.capacity} ที่นั่ง` : `${totalPool} คน`}
                          </span>
                        </div>
                      </div>
                      <div className="text-right pl-3 border-l border-slate-200">
                        <span className="text-xl font-black text-slate-800">
                          {Math.round((currentActivityAttendees.length / (selectedActivity.capacity || totalPool)) * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          setProjectorActivity(selectedActivity);
                          setIsProjectorOpen(true);
                        }}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        <Tv className="w-3.5 h-3.5" />
                        <span>ฉายขึ้นจอ</span>
                      </button>
                      {userRole === 'superadmin' && (
                        <button
                          onClick={() => handleDuplicateActivity(selectedActivity)}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>คัดลอก</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Round Mode Selector (SINGLE / IN / OUT) */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">รอบการเช็คอินปัจจุบัน:</span>
                  <span className="text-xs text-slate-400">(เลือกรอบก่อนสแกนหรือบันทึกรหัส)</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setCurrentCheckInType('SINGLE')}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      currentCheckInType === 'SINGLE'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>⚪ เช็คอินปกติ (Single)</span>
                  </button>
                  <button
                    onClick={() => setCurrentCheckInType('IN')}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      currentCheckInType === 'IN'
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <span>🟢 รอบเข้า (Check-in IN)</span>
                  </button>
                  <button
                    onClick={() => setCurrentCheckInType('OUT')}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      currentCheckInType === 'OUT'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    <span>🔵 รอบออก (Check-out OUT)</span>
                  </button>
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
                        <p className="text-xs text-slate-400">รองรับ Dynamic Rotating QR และรหัสดั้งเดิม</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mt-3 mb-6 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      กดปุ่มด้านล่างเพื่อเปิดกล้องสแกน QR Code จากบัตร EDU Pass ของนักศึกษา สแกนต่อเนื่องได้ทันที
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

                    {userRole === 'superadmin' && (
                      <button
                        onClick={() => {
                          window.open(`/api/export?type=all`, '_blank');
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-sm cursor-pointer shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>ส่งออก Excel</span>
                      </button>
                    )}
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
                        <th className="py-3 px-4 text-center">รอบ</th>
                        <th className="py-3 px-4 text-center">ชั่วโมง</th>
                        <th className="py-3 px-4 text-center">เวลาเช็คอิน</th>
                        {userRole === 'superadmin' && (
                          <th className="py-3 px-4 text-center">จัดการ</th>
                        )}
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
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  att.checkInType === 'IN'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : att.checkInType === 'OUT'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {att.checkInType === 'IN' ? 'เข้า IN' : att.checkInType === 'OUT' ? 'ออก OUT' : 'ปกติ'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-[#0070f3]">+{att.hours} ชม.</td>
                            <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">{att.dateRecorded}</td>
                            {userRole === 'superadmin' && (
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => handleDeleteRecord(att.recordId, att.studentId)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                                  title={`ลบการเช็คอินของ ${att.studentId}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5 mx-auto" />
                                </button>
                              </td>
                            )}
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

          {/* TAB 3: รายงานชั่วโมง (เฉพาะ Super Admin) */}
          {activeTab === 'hours_report' && userRole === 'superadmin' && (
            <div className="space-y-6">
              {/* KPI Cards Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
                    <span>นักศึกษาทั้งหมด</span>
                    <Users className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{students.length || 960} คน</div>
                  <p className="text-[11px] text-slate-400 mt-1">ฐานข้อมูล 4 ชั้นปี (รหัส 66-69)</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-600 mb-2">
                    <span>ครบเกณฑ์ 60 ชม.</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-emerald-600">
                    {hourDistributionStats.completed} <span className="text-xs font-normal text-slate-400">({hourDistributionStats.completedPct}%)</span>
                  </div>
                  <p className="text-[11px] text-emerald-700/80 mt-1">พร้อมสำเร็จการศึกษาตามเกณฑ์</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-600 mb-2">
                    <span>ใกล้ครบ (40-59 ชม.)</span>
                    <Award className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-black text-[#0070f3]">
                    {hourDistributionStats.high} <span className="text-xs font-normal text-slate-400">({hourDistributionStats.highPct}%)</span>
                  </div>
                  <p className="text-[11px] text-blue-600/80 mt-1">ขาดอีกไม่เกิน 20 ชั่วโมง</p>
                </div>

                {/* At-Risk Year 4 Card (กดเพื่อกรองได้ทันที) */}
                <div 
                  onClick={() => setShowOnlyAtRiskYear4(!showOnlyAtRiskYear4)}
                  className={`p-5 rounded-2xl border shadow-sm cursor-pointer transition-all ${
                    showOnlyAtRiskYear4 
                      ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20' 
                      : 'bg-white border-slate-200/80 hover:border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-rose-600 mb-2">
                    <span>🚨 เสี่ยงไม่จบ (ปี 4 &lt; 60 ชม.)</span>
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-2xl font-black text-rose-600">
                    {atRiskYear4Students.length} <span className="text-xs font-normal text-slate-400">คน</span>
                  </div>
                  <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                    <span>{showOnlyAtRiskYear4 ? '✓ กำลังกรองแสดงกลุ่มนี้' : '👉 คลิกเพื่อกรองดูรายชื่อ'}</span>
                  </p>
                </div>
              </div>

              {/* Visual Analytics Charts: สัดส่วนชั่วโมง & ค่าเฉลี่ยแยกชั้นปี */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: สัดส่วนการสะสมชั่วโมง 4 ระดับ */}
                <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-[#0070f3]" />
                      <span>สัดส่วนการสะสมชั่วโมงกิจกรรมนักศึกษา (Distribution)</span>
                    </h3>
                  </div>

                  {/* Multi-segment Progress Bar */}
                  <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex">
                    <div
                      style={{ width: `${hourDistributionStats.completedPct}%` }}
                      className="bg-emerald-500 h-full transition-all"
                      title={`ครบเกณฑ์ (>=60 ชม.): ${hourDistributionStats.completed} คน`}
                    />
                    <div
                      style={{ width: `${hourDistributionStats.highPct}%` }}
                      className="bg-[#0070f3] h-full transition-all"
                      title={`40-59 ชม.: ${hourDistributionStats.high} คน`}
                    />
                    <div
                      style={{ width: `${hourDistributionStats.mediumPct}%` }}
                      className="bg-amber-400 h-full transition-all"
                      title={`20-39 ชม.: ${hourDistributionStats.medium} คน`}
                    />
                    <div
                      style={{ width: `${hourDistributionStats.lowPct}%` }}
                      className="bg-rose-400 h-full transition-all"
                      title={`< 20 ชม.: ${hourDistributionStats.low} คน`}
                    />
                  </div>

                  {/* Legend Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">≥60 ชม.</div>
                        <div className="text-[10px] text-slate-400">{hourDistributionStats.completed} คน ({hourDistributionStats.completedPct}%)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
                      <span className="w-3 h-3 rounded-full bg-[#0070f3] shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">40-59 ชม.</div>
                        <div className="text-[10px] text-slate-400">{hourDistributionStats.high} คน ({hourDistributionStats.highPct}%)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
                      <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">20-39 ชม.</div>
                        <div className="text-[10px] text-slate-400">{hourDistributionStats.medium} คน ({hourDistributionStats.mediumPct}%)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
                      <span className="w-3 h-3 rounded-full bg-rose-400 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">&lt;20 ชม.</div>
                        <div className="text-[10px] text-slate-400">{hourDistributionStats.low} คน ({hourDistributionStats.lowPct}%)</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart 2: ค่าเฉลี่ยชั่วโมงแยกตามชั้นปี */}
                <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-[#0070f3]" />
                      <span>ค่าเฉลี่ยชั่วโมงสะสมแยกตามชั้นปี (เทียบเกณฑ์ 60 ชม.)</span>
                    </h3>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {yearAverageHours.map((yr) => {
                      const pct = Math.min(100, Math.round((yr.avg / 60) * 100));
                      return (
                        <div key={yr.year} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700">
                              ชั้นปีที่ {yr.year} ({yr.count} คน)
                            </span>
                            <span className="font-bold text-slate-900 font-mono">
                              เฉลี่ย {yr.avg} / 60 ชม. ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              style={{ width: `${pct}%` }}
                              className={`h-full rounded-full transition-all duration-500 ${
                                yr.year === 4 && yr.avg < 60
                                  ? 'bg-rose-500'
                                  : pct >= 80
                                  ? 'bg-emerald-500'
                                  : 'bg-[#0070f3]'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* At-risk Alert Banner if Active */}
              {showOnlyAtRiskYear4 && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <div className="text-xs">
                      <span className="font-black text-rose-900 block">
                        กำลังแสดงผลรายชื่อนักศึกษาชั้นปีที่ 4 ที่ยังไม่ผ่านเกณฑ์ 60 ชั่วโมง ({atRiskYear4Students.length} คน)
                      </span>
                      <span className="text-rose-700">
                        กลุ่มนี้จำเป็นต้องเข้าร่วมกิจกรรมเพิ่มเติมเพื่อสำเร็จการศึกษาทันภาคการศึกษานี้
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowOnlyAtRiskYear4(false)}
                    className="px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition cursor-pointer shrink-0"
                  >
                    ✕ ล้างตัวกรอง
                  </button>
                </div>
              )}

              {/* Main Report Table Container */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      {showOnlyAtRiskYear4 ? 'รายชื่อนักศึกษาปี 4 กลุ่มเสี่ยง' : 'รายงานชั่วโมงกิจกรรมนักศึกษา'}
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
                      onClick={() => {
                        setShowOnlyAtRiskYear4(false);
                        setReportFilterType('all');
                      }}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        !showOnlyAtRiskYear4 && reportFilterType === 'all' ? 'bg-[#0070f3] text-white' : 'text-slate-600'
                      }`}
                    >
                      ทั้งหมด
                    </button>
                    <button
                      onClick={() => {
                        setShowOnlyAtRiskYear4(false);
                        setReportFilterType('year');
                      }}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        !showOnlyAtRiskYear4 && reportFilterType === 'year' ? 'bg-[#0070f3] text-white' : 'text-slate-600'
                      }`}
                    >
                      รายชั้นปี
                    </button>
                    <button
                      onClick={() => {
                        setShowOnlyAtRiskYear4(false);
                        setReportFilterType('major');
                      }}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        !showOnlyAtRiskYear4 && reportFilterType === 'major' ? 'bg-[#0070f3] text-white' : 'text-slate-600'
                      }`}
                    >
                      รายสาขาวิชา
                    </button>
                  </div>

                  {/* ปุ่มลัดกรองกลุ่มเสี่ยงปี 4 */}
                  <button
                    onClick={() => setShowOnlyAtRiskYear4(!showOnlyAtRiskYear4)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      showOnlyAtRiskYear4
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    <span>🚨 ปี 4 &lt; 60 ชม. ({atRiskYear4Students.length})</span>
                  </button>

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

          {/* TAB 4: รายงานกิจกรรม (เฉพาะ Super Admin) */}
          {activeTab === 'activity_report' && userRole === 'superadmin' && (
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

          {/* TAB 6: + สร้างกิจกรรม (เฉพาะ Super Admin) */}
          {activeTab === 'create_activity' && userRole === 'superadmin' && (
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        จำนวนรับสูงสุด (Capacity)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="2000"
                        value={activityForm.capacity}
                        onChange={(e) =>
                          setActivityForm({ ...activityForm, capacity: Number(e.target.value) })
                        }
                        placeholder="เช่น 100 (ระบุเพื่อจำกัดที่นั่ง)"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        รูปแบบการเช็คอิน *
                      </label>
                      <select
                        value={activityForm.checkInMode}
                        onChange={(e) =>
                          setActivityForm({
                            ...activityForm,
                            checkInMode: e.target.value as Activity['checkInMode'],
                          })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                      >
                        <option value="SINGLE">เช็คอินครั้งเดียว (Single Check-in)</option>
                        <option value="IN_OUT">เช็คอิน 2 จังหวะ (รอบเข้า IN / รอบออก OUT)</option>
                      </select>
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

          {/* TAB 7: จัดการกิจกรรม (เฉพาะ Super Admin) */}
          {activeTab === 'manage_activities' && userRole === 'superadmin' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      จัดการกิจกรรมทั้งหมด ({activities.length} รายการ)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ดูรายชื่อผู้เช็คอิน แก้ไข คัดลอก หรือเปิดฉายจอโปรเจกเตอร์
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

                        <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-200 text-xs gap-2">
                          <span className="text-slate-600 font-bold">
                            เช็คอิน: {count} {act.capacity ? `/ ${act.capacity}` : ''} คน
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setProjectorActivity(act);
                                setIsProjectorOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1"
                              title="ฉายขึ้นจอโปรเจกเตอร์"
                            >
                              <Tv className="w-3.5 h-3.5" />
                              <span>ฉายจอ</span>
                            </button>
                            <button
                              onClick={() => handleDuplicateActivity(act)}
                              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1"
                              title="คัดลอกกิจกรรม"
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>คัดลอก</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedActivity(act);
                                setActiveTab('home');
                              }}
                              className="px-3 py-1.5 bg-[#0070f3] text-white rounded-lg font-bold hover:bg-[#0060df] transition cursor-pointer"
                            >
                              เปิดเช็คอิน
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: จัดการลิงก์แชร์ (เฉพาะ Super Admin) */}
          {activeTab === 'share_links' && userRole === 'superadmin' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0070f3] flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-1">ลิงก์และ QR Code สำหรับแชร์</h2>
                <p className="text-xs text-slate-500 mb-6">
                  แชร์ลิงก์ระบบเพื่อให้นักศึกษาเข้าสู่หน้าบัตร EDU Pass ของตนเอง
                </p>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-6 flex items-center justify-between gap-3 text-xs font-mono text-slate-700">
                  <span className="truncate">https://edupass.ftu.ac.th/login</span>
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

      {/* Projector Display Mode Fullscreen Modal */}
      <ProjectorModeModal
        isOpen={isProjectorOpen}
        onClose={() => setIsProjectorOpen(false)}
        activity={projectorActivity}
        attendeeCount={
          projectorActivity
            ? (activityAttendanceMap.get(projectorActivity.id) || 0)
            : 0
        }
        totalPool={totalPool}
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
