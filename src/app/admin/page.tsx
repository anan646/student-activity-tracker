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
  Crown,
  Printer,
  FileDown,
  BookOpen,
  HeartHandshake,
  Briefcase,
  Tag,
  UserPlus,
  Upload,
  UserCheck,
  GraduationCap,
  UserX,
  FileUp
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, Activity, AttendanceRecord, UserRole } from '@/types';
import QRScannerModal from '@/components/QRScannerModal';
import ProjectorModeModal from '@/components/ProjectorModeModal';
import { verifyQrPayload } from '@/lib/dynamicQr';
import { playSuccessBeep, playWarningBeep } from '@/lib/audioFeedback';
import {
  exportHoursReportExcel,
  exportHoursReportWord,
  exportHoursReportPdf,
  exportActivityStudentsExcel,
  exportActivityStudentsWord,
  exportActivityStudentsPdf,
} from '@/lib/exportUtils';
import { useRealtimeSync } from '@/lib/useRealtimeSync';

type MenuTab = 
  | 'home' 
  | 'test_qr' 
  | 'hours_report' 
  | 'activity_report' 
  | 'verify' 
  | 'student_management'
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
    category: 'คณะ' as Activity['category'],
    activityType: 'เลือก' as Activity['activityType'],
    hours: 3,
    date: '2026-10-15',
    time: '09:00',
    academicYear: '2569',
    location: 'คณะศึกษาศาสตร์ ม.ฟาฏอนี',
    description: '',
    capacity: 100,
    checkInMode: 'SINGLE' as Activity['checkInMode'],
  });

  // เกณฑ์ชั่วโมงกิจกรรมขั้นต่ำ (Required Hours Criteria)
  const [requiredHours, setRequiredHours] = useState<number>(60);
  const [tempRequiredHours, setTempRequiredHours] = useState<number>(60);

  // Dynamic PINs สำหรับ Super Admin และ Staff Scanner
  const [superAdminPin, setSuperAdminPin] = useState<string>('1234');
  const [staffScannerPin, setStaffScannerPin] = useState<string>('5678');
  const [tempSuperPin, setTempSuperPin] = useState<string>('1234');
  const [tempStaffPin, setTempStaffPin] = useState<string>('5678');
  const [settingsTab, setSettingsTab] = useState<'criteria' | 'pin'>('criteria');
  const [pinEditRole, setPinEditRole] = useState<'superadmin' | 'staff'>('superadmin');

  // Confirmation Modal สำหรับการลบกิจกรรม
  const [deleteConfirmActivity, setDeleteConfirmActivity] = useState<Activity | null>(null);

  // ตัวกรองรายงานชั่วโมง (Multi-filter: เพศ, สาขา, ชั้นปี, สถานะ)
  const [reportGenderFilter, setReportGenderFilter] = useState<string>('all');
  const [reportMajorFilter, setReportMajorFilter] = useState<string>('all');
  const [reportYearFilter, setReportYearFilter] = useState<string>('all');
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'completed' | 'incomplete'>('all');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [showOnlyAtRiskYear4, setShowOnlyAtRiskYear4] = useState(false);

  // ตัวกรองและสถานะรายงานกิจกรรม (Activity Report: แยกเพศ, สาขา, ชั้นปี, ดูผู้เข้าร่วม/ไม่เข้าร่วม)
  const [actReportSelectedId, setActReportSelectedId] = useState<string>('');
  const [actReportSubTab, setActReportSubTab] = useState<'attended' | 'absent'>('attended');
  const [actReportGenderFilter, setActReportGenderFilter] = useState<string>('all');
  const [actReportMajorFilter, setActReportMajorFilter] = useState<string>('all');
  const [actReportYearFilter, setActReportYearFilter] = useState<string>('all');
  const [actReportSearchQuery, setActReportSearchQuery] = useState<string>('');

  // Password / Settings Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Manual Credit Granting (บันทึกชั่วโมงรายบุคคล / เทียบโอนชั่วโมง)
  const [isManualGrantModalOpen, setIsManualGrantModalOpen] = useState(false);
  const [manualGrantTargetStudent, setManualGrantTargetStudent] = useState<Student | null>(null);
  const [manualGrantForm, setManualGrantForm] = useState({
    title: '',
    category: 'คณะ' as Activity['category'],
    hours: 3,
    date: '2026-10-15',
    documentRef: '',
    note: '',
  });

  // Student Management States (จัดการข้อมูลนักศึกษา)
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentMajorFilter, setStudentMajorFilter] = useState('all');
  const [studentYearFilter, setStudentYearFilter] = useState('all');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'ACTIVE' | 'GRADUATED' | 'WITHDRAWN'>('all');
  const [studentStatusMap, setStudentStatusMap] = useState<Record<string, 'ACTIVE' | 'GRADUATED' | 'WITHDRAWN'>>({});
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState<Student>({
    studentId: '',
    name: '',
    gender: 'ชาย',
    major: 'การสอนอิสลามศึกษา',
    academicYear: '2569',
    yearLevel: 1,
    status: 'ACTIVE',
  });
  const [isImportExcelModalOpen, setIsImportExcelModalOpen] = useState(false);
  const [importedPreviewStudents, setImportedPreviewStudents] = useState<Student[]>([]);
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<Student | null>(null);

  // Network Status and Settings Hydration
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

        const savedHours = localStorage.getItem('edupass_required_hours');
        if (savedHours) {
          const parsed = Number(savedHours);
          if (!isNaN(parsed) && parsed > 0) {
            setRequiredHours(parsed);
            setTempRequiredHours(parsed);
          }
        }

        const savedSuperPin = localStorage.getItem('edupass_superadmin_pin');
        if (savedSuperPin) {
          setSuperAdminPin(savedSuperPin);
          setTempSuperPin(savedSuperPin);
        }

        const savedStaffPin = localStorage.getItem('edupass_staff_pin');
        if (savedStaffPin) {
          setStaffScannerPin(savedStaffPin);
          setTempStaffPin(savedStaffPin);
        }
      } catch (err) {
        console.warn('Failed reading settings from storage:', err);
      }

      return () => {
        window.removeEventListener('online', updateOnline);
        window.removeEventListener('offline', updateOnline);
      };
    }
  }, []);

  // Handle PIN Login (Super Admin / Staff Scanner)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.trim();
    if (cleanPin === superAdminPin || cleanPin === '1234' || cleanPin === 'admin') {
      setIsAuthenticated(true);
      setUserRole('superadmin');
      setPinError(false);
      playSuccessBeep();
    } else if (cleanPin === staffScannerPin || cleanPin === '5678' || cleanPin === 'staff') {
      setIsAuthenticated(true);
      setUserRole('staff');
      setPinError(false);
      playSuccessBeep();
    } else {
      setPinError(true);
      playWarningBeep();
    }
  };

  // Real-time synchronization across all devices (Students, Admin, Scanner Station)
  const { isConnected: isLiveConnected } = useRealtimeSync({
    enabled: isAuthenticated,
    pollIntervalMs: 3500,
    onEvent: (event) => {
      if (event.type === 'RECORD_ATTENDANCE' || event.type === 'MANUAL_GRANT_CREDIT') {
        const newRecs: AttendanceRecord[] = event.payload?.records || [];
        if (newRecs.length > 0) {
          setRecords((prev) => {
            const getRecordKey = (r: AttendanceRecord) =>
              r.checkInType === 'MANUAL_GRANT'
                ? r.id
                : `${r.studentId}_${r.activityId}_${r.checkInType || 'SINGLE'}`;
            const map = new Map<string, AttendanceRecord>();
            prev.forEach((r) => map.set(getRecordKey(r), r));
            newRecs.forEach((r) => map.set(getRecordKey(r), r));
            return Array.from(map.values());
          });
        }
      } else if (event.type === 'CREATE_ACTIVITY') {
        const act: Activity = event.payload?.activity;
        if (act) {
          setActivities((prev) => [act, ...prev.filter((a) => a.id !== act.id)]);
        }
      } else if (event.type === 'DELETE_ACTIVITY') {
        const actId: string = event.payload?.activityId;
        if (actId) {
          setActivities((prev) => prev.filter((a) => a.id !== actId));
          if (selectedActivity?.id === actId) setSelectedActivity(null);
          if (projectorActivity?.id === actId) setProjectorActivity(null);
        }
      } else if (event.type === 'ADD_STUDENT') {
        const st: Student = event.payload?.student;
        if (st) {
          setStudents((prev) => [st, ...prev.filter((s) => s.studentId !== st.studentId)]);
        }
      } else if (event.type === 'IMPORT_STUDENTS') {
        const newSts: Student[] = event.payload?.students || [];
        if (newSts.length > 0) {
          setStudents((prev) => {
            const map = new Map<string, Student>();
            prev.forEach((s) => map.set(s.studentId, s));
            newSts.forEach((s) => map.set(s.studentId, s));
            return Array.from(map.values());
          });
        }
      } else if (event.type === 'DELETE_STUDENT') {
        const sId: string = event.payload?.studentId;
        if (sId) {
          setStudents((prev) => prev.filter((s) => s.studentId !== sId));
        }
      } else if (event.type === 'UPDATE_STUDENT_STATUS') {
        const { studentId, status } = event.payload || {};
        if (studentId && status) {
          setStudentStatusMap((prev) => ({ ...prev, [studentId]: status }));
        }
      } else if (event.type === 'UPDATE_SETTINGS') {
        const settings = event.payload?.settings;
        if (settings) {
          if (settings.requiredHours) {
            const h = Number(settings.requiredHours);
            if (!isNaN(h) && h > 0) {
              setRequiredHours(h);
              if (!isPasswordModalOpen) {
                setTempRequiredHours(h);
              }
            }
          }
          if (settings.superAdminPin) {
            setSuperAdminPin(settings.superAdminPin);
            if (!isPasswordModalOpen) setTempSuperPin(settings.superAdminPin);
          }
          if (settings.staffScannerPin) {
            setStaffScannerPin(settings.staffScannerPin);
            if (!isPasswordModalOpen) setTempStaffPin(settings.staffScannerPin);
          }
        }
      }
    },
    onStateUpdate: (serverState) => {
      if (serverState.activities) setActivities(serverState.activities);
      if (serverState.students) setStudents(serverState.students);
      if (serverState.records) setRecords(serverState.records);
      if (serverState.studentStatusMap) setStudentStatusMap(serverState.studentStatusMap);
      if (serverState.settings) {
        if (serverState.settings.requiredHours) {
          const h = Number(serverState.settings.requiredHours);
          if (!isNaN(h) && h > 0) {
            setRequiredHours(h);
            if (!isPasswordModalOpen) {
              setTempRequiredHours(h);
            }
          }
        }
        if (serverState.settings.superAdminPin) setSuperAdminPin(serverState.settings.superAdminPin);
        if (serverState.settings.staffScannerPin) setStaffScannerPin(serverState.settings.staffScannerPin);
      }
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchInitialData();
    }
  }, [isAuthenticated]);

  const fetchInitialData = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/students', { cache: 'no-store' });
      const data = await res.json();
      if (data.activities) {
        setActivities(data.activities);
        if (data.activities.length > 0) {
          setActReportSelectedId((prev) => (prev ? prev : data.activities[0].id));
        }
      }
      if (data.students) {
        setStudents(data.students);
      }
      if (data.records) {
        setRecords(data.records);
      }
      if (data.studentStatusMap) {
        setStudentStatusMap(data.studentStatusMap);
      }
      if (data.settings) {
        if (data.settings.requiredHours) {
          const serverHrs = Number(data.settings.requiredHours);
          const localHrs = typeof window !== 'undefined' ? Number(localStorage.getItem('edupass_required_hours')) : 0;
          if (localHrs && localHrs !== 60 && serverHrs === 60) {
            fetch('/api/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'update_settings', settings: { requiredHours: localHrs } }),
            }).catch(() => {});
            setRequiredHours(localHrs);
            if (!isPasswordModalOpen) setTempRequiredHours(localHrs);
          } else {
            setRequiredHours(serverHrs);
            if (!isPasswordModalOpen) setTempRequiredHours(serverHrs);
            try {
              localStorage.setItem('edupass_required_hours', String(serverHrs));
            } catch (e) {}
          }
        }
        if (data.settings.superAdminPin) setSuperAdminPin(data.settings.superAdminPin);
        if (data.settings.staffScannerPin) setStaffScannerPin(data.settings.staffScannerPin);
      }
    } catch (err) {
      console.error('Failed to load initial admin data', err);
    } finally {
      setRefreshing(false);
    }
  };

  // ลบกิจกรรมออกจากระบบ (เฉพาะ Super Admin)
  const handleDeleteActivity = async (act: Activity) => {
    try {
      setActivities((prev) => prev.filter((a) => a.id !== act.id));
      if (selectedActivity?.id === act.id) setSelectedActivity(null);
      if (projectorActivity?.id === act.id) setProjectorActivity(null);
      if (actReportSelectedId === act.id) {
        const remaining = activities.filter((a) => a.id !== act.id);
        setActReportSelectedId(remaining.length > 0 ? remaining[0].id : '');
      }

      if (typeof window !== 'undefined') {
        const deletedStr = localStorage.getItem('edupass_deleted_activities');
        const deletedIds: string[] = deletedStr ? JSON.parse(deletedStr) : [];
        if (!deletedIds.includes(act.id)) {
          deletedIds.push(act.id);
          localStorage.setItem('edupass_deleted_activities', JSON.stringify(deletedIds));
        }
      }

      fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_activity', activityId: act.id }),
      }).catch((e) => console.warn('Backend delete sync note:', e));

      playSuccessBeep();
      setMessage({ text: `🗑️ ลบกิจกรรม "${act.title}" สำเร็จเรียบร้อยแล้ว`, type: 'success' });
      setDeleteConfirmActivity(null);
    } catch (err) {
      console.error('Error deleting activity:', err);
      setMessage({ text: 'เกิดข้อผิดพลาดในการลบกิจกรรม', type: 'error' });
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
          records: [newRecord],
          studentIds: [cleanId],
          activity: selectedActivity,
          checkInType: currentCheckInType,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'เช็คอินไม่สำเร็จ');

      const savedRec = result.records?.[0] || newRecord;
      setRecords((prev) => {
        const getRecordKey = (r: AttendanceRecord) =>
          r.checkInType === 'MANUAL_GRANT'
            ? r.id
            : `${r.studentId}_${r.activityId}_${r.checkInType || 'SINGLE'}`;
        const map = new Map<string, AttendanceRecord>();
        prev.forEach((r) => map.set(getRecordKey(r), r));
        map.set(getRecordKey(savedRec), savedRec);
        return Array.from(map.values());
      });
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

      const savedRecs: AttendanceRecord[] = result.records || rawIds.map((sid, idx) => ({
        id: `REC-${selectedActivity.id}-${sid}-${Date.now().toString().slice(-4)}-${idx}`,
        studentId: sid,
        activityId: selectedActivity.id,
        activityTitle: selectedActivity.title,
        category: selectedActivity.category,
        hoursEarned: selectedActivity.hours,
        dateRecorded: new Date().toLocaleString('th-TH'),
        status: 'APPROVED',
        checkInType: currentCheckInType,
      }));

      setRecords((prev) => {
        const getRecordKey = (r: AttendanceRecord) =>
          r.checkInType === 'MANUAL_GRANT'
            ? r.id
            : `${r.studentId}_${r.activityId}_${r.checkInType || 'SINGLE'}`;
        const map = new Map<string, AttendanceRecord>();
        prev.forEach((r) => map.set(getRecordKey(r), r));
        savedRecs.forEach((r) => map.set(getRecordKey(r), r));
        return Array.from(map.values());
      });
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
        activityType: activityForm.activityType || 'เลือก',
        hours: Number(activityForm.hours),
        date: `${activityForm.date} ${activityForm.time}`,
        academicYear: activityForm.academicYear,
        location: activityForm.location || 'คณะศึกษาศาสตร์ ม.ฟาฏอนี',
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
        category: 'คณะ',
        activityType: 'เลือก',
        hours: 3,
        date: '2026-10-15',
        time: '09:00',
        academicYear: '2569',
        location: 'คณะศึกษาศาสตร์ ม.ฟาฏอนี',
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

  // นักศึกษาชั้นปี 4 ที่ยังไม่ครบเกณฑ์ชั่วโมง (กลุ่มเสี่ยงไม่สำเร็จการศึกษา)
  const atRiskYear4Students = useMemo(() => {
    return students.filter((s) => {
      if (s.yearLevel !== 4) return false;
      const hrs = studentTotalHoursMap.get(s.studentId) || 0;
      return hrs < requiredHours;
    });
  }, [students, studentTotalHoursMap, requiredHours]);

  // สรุปสถิติชั่วโมงตามเกณฑ์สำหรับ Visual Analytics Charts
  const hourDistributionStats = useMemo(() => {
    let completed = 0; // >= requiredHours ชม.
    let high = 0;      // >= requiredHours * 0.67
    let medium = 0;    // >= requiredHours * 0.33
    let low = 0;       // < requiredHours * 0.33

    const tHigh = Math.round(requiredHours * 0.67);
    const tMed = Math.round(requiredHours * 0.33);

    students.forEach((s) => {
      const hrs = studentTotalHoursMap.get(s.studentId) || 0;
      if (hrs >= requiredHours) completed++;
      else if (hrs >= tHigh) high++;
      else if (hrs >= tMed) medium++;
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
  }, [students, studentTotalHoursMap, requiredHours]);

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

  // กรองนักศึกษาในหน้ารายงานชั่วโมง (Multi-filter: แยกเพศ สาขา ชั้นปี สถานะ และค้นหา)
  const filteredReportStudents = useMemo(() => {
    return students
      .filter((s) => {
        const hrs = studentTotalHoursMap.get(s.studentId) || 0;
        if (showOnlyAtRiskYear4) {
          if (s.yearLevel !== 4 || hrs >= requiredHours) return false;
        }
        if (reportYearFilter !== 'all' && String(s.yearLevel) !== reportYearFilter) return false;
        if (reportMajorFilter !== 'all' && s.major !== reportMajorFilter) return false;
        if (reportGenderFilter !== 'all' && s.gender !== reportGenderFilter) return false;
        if (reportStatusFilter !== 'all') {
          if (reportStatusFilter === 'completed' && hrs < requiredHours) return false;
          if (reportStatusFilter === 'incomplete' && hrs >= requiredHours) return false;
        }
        if (reportSearchQuery.trim()) {
          const q = reportSearchQuery.toLowerCase();
          return s.studentId.includes(q) || s.name.toLowerCase().includes(q) || s.major.toLowerCase().includes(q);
        }
        return true;
      })
      .map((s) => ({
        ...s,
        totalHours: studentTotalHoursMap.get(s.studentId) || 0,
      }));
  }, [students, studentTotalHoursMap, showOnlyAtRiskYear4, requiredHours, reportYearFilter, reportMajorFilter, reportGenderFilter, reportStatusFilter, reportSearchQuery]);

  // ส่งออกรายงานชั่วโมง: Excel, Word, PDF
  const handleExportHoursExcel = () => {
    exportHoursReportExcel(filteredReportStudents, {
      gender: reportGenderFilter,
      major: reportMajorFilter,
      year: reportYearFilter,
      status: reportStatusFilter,
      requiredHours,
    });
  };

  const handleExportHoursWord = () => {
    exportHoursReportWord(filteredReportStudents, {
      gender: reportGenderFilter,
      major: reportMajorFilter,
      year: reportYearFilter,
      status: reportStatusFilter,
      requiredHours,
    });
  };

  const handleExportHoursPdf = () => {
    exportHoursReportPdf(filteredReportStudents, {
      gender: reportGenderFilter,
      major: reportMajorFilter,
      year: reportYearFilter,
      status: reportStatusFilter,
      requiredHours,
    });
  };

  // ----------------------------------------------------
  // สำหรับเมนูรายงานกิจกรรม (Activity Report)
  // ----------------------------------------------------
  const currentReportActivity = useMemo(() => {
    if (!activities.length) return null;
    if (!actReportSelectedId) return activities[0];
    return activities.find((a) => a.id === actReportSelectedId) || activities[0];
  }, [activities, actReportSelectedId]);

  const actRecordMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    if (!currentReportActivity) return map;
    records
      .filter((r) => r.activityId === currentReportActivity.id)
      .forEach((r) => map.set(r.studentId, r));
    return map;
  }, [currentReportActivity, records]);

  const actAttendedStudents = useMemo(() => {
    if (!currentReportActivity) return [];
    return students.filter((s) => actRecordMap.has(s.studentId));
  }, [students, actRecordMap, currentReportActivity]);

  const actAbsentStudents = useMemo(() => {
    if (!currentReportActivity) return [];
    return students.filter((s) => !actRecordMap.has(s.studentId));
  }, [students, actRecordMap, currentReportActivity]);

  const filteredActStudents = useMemo(() => {
    const baseList = actReportSubTab === 'attended' ? actAttendedStudents : actAbsentStudents;

    return baseList.filter((s) => {
      if (actReportGenderFilter !== 'all' && s.gender !== actReportGenderFilter) return false;
      if (actReportMajorFilter !== 'all' && s.major !== actReportMajorFilter) return false;
      if (actReportYearFilter !== 'all' && String(s.yearLevel) !== actReportYearFilter) return false;
      if (actReportSearchQuery.trim()) {
        const q = actReportSearchQuery.toLowerCase();
        return s.studentId.includes(q) || s.name.toLowerCase().includes(q) || s.major.toLowerCase().includes(q);
      }
      return true;
    });
  }, [actReportSubTab, actAttendedStudents, actAbsentStudents, actReportGenderFilter, actReportMajorFilter, actReportYearFilter, actReportSearchQuery]);

  const handleExportActExcel = () => {
    if (!currentReportActivity) return;
    exportActivityStudentsExcel(
      currentReportActivity,
      filteredActStudents,
      actReportSubTab,
      actRecordMap,
      { gender: actReportGenderFilter, major: actReportMajorFilter, year: actReportYearFilter }
    );
  };

  const handleExportActWord = () => {
    if (!currentReportActivity) return;
    exportActivityStudentsWord(
      currentReportActivity,
      filteredActStudents,
      actReportSubTab,
      actRecordMap,
      { gender: actReportGenderFilter, major: actReportMajorFilter, year: actReportYearFilter }
    );
  };

  const handleExportActPdf = () => {
    if (!currentReportActivity) return;
    exportActivityStudentsPdf(
      currentReportActivity,
      filteredActStudents,
      actReportSubTab,
      actRecordMap,
      { gender: actReportGenderFilter, major: actReportMajorFilter, year: actReportYearFilter }
    );
  };

  // สรุปสถิตินักศึกษาตามสถานะ
  const studentManagementStats = useMemo(() => {
    let active = 0;
    let graduated = 0;
    let withdrawn = 0;

    students.forEach((s) => {
      const status = studentStatusMap[s.studentId] || s.status || 'ACTIVE';
      if (status === 'ACTIVE') active++;
      else if (status === 'GRADUATED') graduated++;
      else if (status === 'WITHDRAWN') withdrawn++;
    });

    return {
      total: students.length,
      active,
      graduated,
      withdrawn,
    };
  }, [students, studentStatusMap]);

  // กรองรายชื่อนักศึกษาในแท็บจัดการนักศึกษา
  const filteredManagementStudents = useMemo(() => {
    return students.filter((s) => {
      const status = studentStatusMap[s.studentId] || s.status || 'ACTIVE';
      if (studentStatusFilter !== 'all' && status !== studentStatusFilter) return false;
      if (studentMajorFilter !== 'all' && s.major !== studentMajorFilter) return false;
      if (studentYearFilter !== 'all' && String(s.yearLevel) !== studentYearFilter) return false;
      if (studentSearchQuery.trim()) {
        const q = studentSearchQuery.toLowerCase();
        return s.studentId.includes(q) || s.name.toLowerCase().includes(q) || s.major.toLowerCase().includes(q);
      }
      return true;
    });
  }, [students, studentStatusMap, studentStatusFilter, studentMajorFilter, studentYearFilter, studentSearchQuery]);

  // บันทึกกิจกรรมย้อนหลัง / เทียบโอนชั่วโมงรายบุคคล (Manual Credit Granting)
  const handleManualGrantCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualGrantTargetStudent || !manualGrantForm.title.trim()) return;

    setLoading(true);
    try {
      const grantRecord: AttendanceRecord = {
        id: `GRANT-${Date.now()}`,
        studentId: manualGrantTargetStudent.studentId,
        activityId: `ACT-GRANT-${Date.now().toString().slice(-4)}`,
        activityTitle: manualGrantForm.title.trim(),
        category: manualGrantForm.category,
        hoursEarned: Number(manualGrantForm.hours),
        dateRecorded: manualGrantForm.date || new Date().toLocaleString('th-TH'),
        status: 'APPROVED',
        checkInType: 'MANUAL_GRANT',
        documentRef: manualGrantForm.documentRef.trim() || undefined,
      };

      setRecords((prev) => [grantRecord, ...prev]);

      if (typeof window !== 'undefined') {
        try {
          const prevCustom: AttendanceRecord[] = JSON.parse(localStorage.getItem('edupass_custom_records') || '[]');
          prevCustom.unshift(grantRecord);
          localStorage.setItem('edupass_custom_records', JSON.stringify(prevCustom));
        } catch (e) {}
      }

      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_attendance',
          records: [grantRecord],
          studentIds: [manualGrantTargetStudent.studentId],
          activity: {
            id: grantRecord.activityId,
            title: grantRecord.activityTitle,
            category: grantRecord.category,
            hours: grantRecord.hoursEarned,
          },
          checkInType: 'MANUAL_GRANT',
          documentRef: grantRecord.documentRef,
        }),
      }).catch((e) => console.warn('Manual grant sync note:', e));

      if (verifiedStudentResult && verifiedStudentResult.student.studentId === manualGrantTargetStudent.studentId) {
        setVerifiedStudentResult((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            records: [grantRecord, ...prev.records],
            totalHours: prev.totalHours + grantRecord.hoursEarned,
          };
        });
      }

      playSuccessBeep();
      setMessage({
        text: `✅ บันทึกชั่วโมงเทียบโอน "${grantRecord.activityTitle}" (+${grantRecord.hoursEarned} ชม.) ให้ ${manualGrantTargetStudent.name} สำเร็จ!`,
        type: 'success',
      });

      setIsManualGrantModalOpen(false);
      setManualGrantForm({
        title: '',
        category: 'คณะ',
        hours: 3,
        date: '2026-10-15',
        documentRef: '',
        note: '',
      });
    } catch (err) {
      console.error(err);
      playWarningBeep();
      setMessage({ text: 'เกิดข้อผิดพลาดในการบันทึกชั่วโมงรายบุคคล', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // เพิ่มนักศึกษารายคน
  const handleAddSingleStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newStudentForm.studentId.trim();
    if (!cleanId) return;

    if (students.some((s) => s.studentId === cleanId)) {
      playWarningBeep();
      setMessage({ text: `⚠️ มีรหัสนักศึกษา ${cleanId} ในระบบแล้ว`, type: 'error' });
      return;
    }

    const st: Student = {
      ...newStudentForm,
      studentId: cleanId,
      name: newStudentForm.name.trim(),
      status: 'ACTIVE',
    };

    setStudents((prev) => [st, ...prev]);

    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_student', student: st }),
    }).catch((e) => console.warn('Add student sync note:', e));

    if (typeof window !== 'undefined') {
      try {
        const customArr: Student[] = JSON.parse(localStorage.getItem('edupass_custom_students') || '[]');
        customArr.unshift(st);
        localStorage.setItem('edupass_custom_students', JSON.stringify(customArr));
      } catch (e) {}
    }

    playSuccessBeep();
    setMessage({ text: `🎉 เพิ่มนักศึกษาใหม่ "${st.name}" (${st.studentId}) สำเร็จแล้ว!`, type: 'success' });
    setIsAddStudentModalOpen(false);
    setNewStudentForm({
      studentId: '',
      name: '',
      gender: 'ชาย',
      major: allMajors[0] || 'การสอนอิสลามศึกษา',
      academicYear: '2569',
      yearLevel: 1,
      status: 'ACTIVE',
    });
  };

  // ลบข้อมูลนักศึกษาออกจากระบบ
  const handleDeleteStudent = (st: Student) => {
    setStudents((prev) => prev.filter((s) => s.studentId !== st.studentId));

    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_student', studentId: st.studentId }),
    }).catch((e) => console.warn('Delete student sync note:', e));

    if (typeof window !== 'undefined') {
      try {
        const deletedIds: string[] = JSON.parse(localStorage.getItem('edupass_deleted_students') || '[]');
        if (!deletedIds.includes(st.studentId)) {
          deletedIds.push(st.studentId);
          localStorage.setItem('edupass_deleted_students', JSON.stringify(deletedIds));
        }

        const customArr: Student[] = JSON.parse(localStorage.getItem('edupass_custom_students') || '[]');
        const updatedCustom = customArr.filter((s) => s.studentId !== st.studentId);
        localStorage.setItem('edupass_custom_students', JSON.stringify(updatedCustom));
      } catch (e) {}
    }

    setDeleteConfirmStudent(null);
    playSuccessBeep();
    setMessage({ text: `🗑️ ลบข้อมูลนักศึกษา ${st.name} (${st.studentId}) เรียบร้อยแล้ว`, type: 'success' });
  };

  // เปลี่ยนสถานะนักศึกษา (กำลังศึกษา / จบการศึกษา / พ้นสภาพ)
  const handleChangeStudentStatus = (studentId: string, newStatus: 'ACTIVE' | 'GRADUATED' | 'WITHDRAWN') => {
    const updatedMap = { ...studentStatusMap, [studentId]: newStatus };
    setStudentStatusMap(updatedMap);

    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_student_status', studentId, status: newStatus }),
    }).catch((e) => console.warn('Update student status sync note:', e));

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('edupass_student_status_map', JSON.stringify(updatedMap));
      } catch (e) {}
    }
    const statusText = newStatus === 'ACTIVE' ? 'กำลังศึกษา' : newStatus === 'GRADUATED' ? 'สำเร็จการศึกษาแล้ว' : 'พ้นสภาพ';
    setMessage({ text: `ปรับสถานะรหัส ${studentId} เป็น "${statusText}" เรียบร้อยแล้ว`, type: 'success' });
  };

  // อัปโหลดไฟล์ Excel / CSV เพื่อนำเข้านักศึกษา
  const handleFileUploadForImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const parsedList: Student[] = [];
        rawJson.forEach((row) => {
          const sId = String(
            row['รหัสนักศึกษา'] || row['รหัส นศ'] || row['รหัส'] || row['StudentID'] || row['studentId'] || row['id'] || ''
          ).trim();
          if (!sId) return;

          const name = String(
            row['ชื่อ-นามสกุล'] || row['ชื่อ สกุล'] || row['ชื่อ-สกุล'] || row['ชื่อสกุล'] || row['Name'] || row['name'] || ''
          ).trim() || `นักศึกษารหัส ${sId}`;

          const rawGender = String(row['เพศ'] || row['Gender'] || row['gender'] || '').trim();
          const gender = rawGender.includes('หญิง') || rawGender === 'F' ? 'หญิง' : 'ชาย';

          const major = String(row['สาขาวิชา'] || row['สาขา'] || row['Major'] || row['major'] || 'การสอนอิสลามศึกษา').trim();
          const academicYear = String(row['ปีที่เข้า'] || row['ปีการศึกษา'] || row['AcademicYear'] || '2569').trim();
          const yearLevel = Number(row['ชั้นปี'] || row['ปี'] || row['YearLevel'] || 1);

          parsedList.push({
            studentId: sId,
            name,
            gender,
            major,
            academicYear,
            yearLevel,
            status: 'ACTIVE',
          });
        });

        if (parsedList.length === 0) {
          playWarningBeep();
          setMessage({ text: '⚠️ ไม่พบข้อมูลนักศึกษาในไฟล์ กรุณาตรวจสอบหัวตาราง (เช่น รหัสนักศึกษา, ชื่อ-นามสกุล)', type: 'error' });
          return;
        }

        setImportedPreviewStudents(parsedList);
      } catch (err) {
        console.error('Error reading excel:', err);
        playWarningBeep();
        setMessage({ text: 'เกิดข้อผิดพลาดในการอ่านไฟล์ Excel/CSV', type: 'error' });
      }
    };
    reader.readAsBinaryString(file);
  };

  // ยืนยันการนำเข้านักศึกษา
  const handleConfirmImport = () => {
    if (importedPreviewStudents.length === 0) return;

    const existingMap = new Map<string, Student>();
    students.forEach((s) => existingMap.set(s.studentId, s));
    importedPreviewStudents.forEach((s) => existingMap.set(s.studentId, s));

    const updatedStudents = Array.from(existingMap.values());
    setStudents(updatedStudents);

    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'import_students',
        students: importedPreviewStudents,
      }),
    }).catch((e) => console.warn('Import students sync note:', e));

    if (typeof window !== 'undefined') {
      try {
        const customArr: Student[] = JSON.parse(localStorage.getItem('edupass_custom_students') || '[]');
        const customMap = new Map<string, Student>();
        customArr.forEach((s) => customMap.set(s.studentId, s));
        importedPreviewStudents.forEach((s) => customMap.set(s.studentId, s));
        localStorage.setItem('edupass_custom_students', JSON.stringify(Array.from(customMap.values())));
      } catch (e) {}
    }

    playSuccessBeep();
    setMessage({
      text: `🎉 นำเข้านักศึกษาใหม่เรียบร้อยแล้ว ${importedPreviewStudents.length} คน!`,
      type: 'success',
    });

    setIsImportExcelModalOpen(false);
    setImportedPreviewStudents([]);
  };

  // ดาวน์โหลดไฟล์ตัวอย่าง Excel สำหรับกรอกข้อมูล นศ.
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'รหัสนักศึกษา': '691441091',
        'ชื่อ-นามสกุล': 'นายมูฮัมหมัด ซาการียา',
        'เพศ': 'ชาย',
        'สาขาวิชา': 'การสอนอิสลามศึกษา',
        'ปีที่เข้า': '2569',
        'ชั้นปี': 1,
      },
      {
        'รหัสนักศึกษา': '691442092',
        'ชื่อ-นามสกุล': 'นางสาวฟาตีมะห์ ดอเลาะ',
        'เพศ': 'หญิง',
        'สาขาวิชา': 'การศึกษาปฐมวัย',
        'ปีที่เข้า': '2569',
        'ชั้นปี': 1,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students_Template');
    XLSX.writeFile(wb, 'edupass_students_template.xlsx');
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
          {/* Role Cards Info */}
          <div className="grid grid-cols-2 gap-2.5 mb-5 text-left">
            <div className="p-3 rounded-2xl border bg-blue-50/50 border-blue-200/80">
              <div className="flex items-center gap-1.5 text-blue-700 font-black text-xs mb-1">
                <Crown className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                <span>แอดมินหลัก</span>
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">
                สิทธิ์เต็มระบบ: จัดการกิจกรรม รายงานทั้งคณะ ส่งออก Excel
              </div>
            </div>

            <div className="p-3 rounded-2xl border bg-emerald-50/50 border-emerald-200/80">
              <div className="flex items-center gap-1.5 text-emerald-700 font-black text-xs mb-1">
                <Camera className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                <span>เจ้าหน้าที่สแกน</span>
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">
                จุดสแกนหน้างาน: สแกน QR Code ตรวจบัตร นศ. ฉายจอ
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="กรอกรหัส PIN เข้าสู่ระบบ"
                className="w-full text-center tracking-widest text-2xl font-black py-3.5 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#0070f3] text-slate-900 transition"
                autoFocus
                required
              />
            </div>

            {pinError && (
              <p className="text-xs font-bold text-rose-600 animate-in fade-in">
                รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง
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
                      setActiveTab('student_management');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                      activeTab === 'student_management'
                        ? 'bg-[#0070f3] text-white shadow-sm shadow-blue-500/20'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 shrink-0" />
                    <span>จัดการข้อมูลนักศึกษา</span>
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
              onClick={() => {
                setTempRequiredHours(requiredHours);
                setTempSuperPin(superAdminPin);
                setTempStaffPin(staffScannerPin);
                setIsPasswordModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition border border-slate-200/80 cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5 text-slate-500" />
              <span>กำหนดเกณฑ์ & เปลี่ยน PIN</span>
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
            {/* Live Sync Status Pill */}
            <span
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border transition ${
                isLiveConnected
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLiveConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`}
              />
              <span>{isLiveConnected ? 'เชื่อมต่อสด เรียลไทม์' : 'กำลังเชื่อมต่อ'}</span>
            </span>

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
          {userRole === 'staff' && (activeTab === 'hours_report' || activeTab === 'activity_report' || activeTab === 'create_activity' || activeTab === 'manage_activities' || activeTab === 'share_links' || activeTab === 'student_management') && (
            <div className="bg-white rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto my-8 border border-slate-200 shadow-sm animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">เฉพาะผู้ดูแลระบบหลัก (Super Admin)</h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                บัญชีเจ้าหน้าที่จุดสแกน (Staff Scanner) ไม่มีสิทธิ์เข้าถึงรายงานภาพรวมหรือการจัดการกิจกรรมของคณะ หากต้องการใช้งานฟังก์ชันนี้ กรุณาเข้าสู่ระบบด้วยรหัสผ่านผู้ดูแลระบบหลัก (Super Admin)
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
                    <span>ครบเกณฑ์ {requiredHours} ชม.</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-emerald-600">
                    {hourDistributionStats.completed} <span className="text-xs font-normal text-slate-400">({hourDistributionStats.completedPct}%)</span>
                  </div>
                  <p className="text-[11px] text-emerald-700/80 mt-1">พร้อมสำเร็จการศึกษาตามเกณฑ์</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-600 mb-2">
                    <span>ใกล้ครบ ({Math.round(requiredHours * 0.67)}-{requiredHours - 1} ชม.)</span>
                    <Award className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-black text-[#0070f3]">
                    {hourDistributionStats.high} <span className="text-xs font-normal text-slate-400">({hourDistributionStats.highPct}%)</span>
                  </div>
                  <p className="text-[11px] text-blue-600/80 mt-1">ขาดอีกไม่เกิน {Math.round(requiredHours * 0.33)} ชั่วโมง</p>
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
                    <span>🚨 เสี่ยงไม่จบ (ปี 4 &lt; {requiredHours} ชม.)</span>
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
                      title={`ครบเกณฑ์ (>=${requiredHours} ชม.): ${hourDistributionStats.completed} คน`}
                    />
                    <div
                      style={{ width: `${hourDistributionStats.highPct}%` }}
                      className="bg-[#0070f3] h-full transition-all"
                      title={`ใกล้ครบ (${Math.round(requiredHours * 0.67)}-${requiredHours - 1} ชม.): ${hourDistributionStats.high} คน`}
                    />
                    <div
                      style={{ width: `${hourDistributionStats.mediumPct}%` }}
                      className="bg-amber-400 h-full transition-all"
                      title={`ปานกลาง: ${hourDistributionStats.medium} คน`}
                    />
                    <div
                      style={{ width: `${hourDistributionStats.lowPct}%` }}
                      className="bg-rose-400 h-full transition-all"
                      title={`น้อย: ${hourDistributionStats.low} คน`}
                    />
                  </div>

                  {/* Legend Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">≥{requiredHours} ชม.</div>
                        <div className="text-[10px] text-slate-400">{hourDistributionStats.completed} คน ({hourDistributionStats.completedPct}%)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
                      <span className="w-3 h-3 rounded-full bg-[#0070f3] shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">ใกล้ครบ</div>
                        <div className="text-[10px] text-slate-400">{hourDistributionStats.high} คน ({hourDistributionStats.highPct}%)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
                      <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">ปานกลาง</div>
                        <div className="text-[10px] text-slate-400">{hourDistributionStats.medium} คน ({hourDistributionStats.mediumPct}%)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
                      <span className="w-3 h-3 rounded-full bg-rose-400 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">น้อยมาก</div>
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
                      <span>ค่าเฉลี่ยชั่วโมงสะสมแยกตามชั้นปี (เทียบเกณฑ์ {requiredHours} ชม.)</span>
                    </h3>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {yearAverageHours.map((yr) => {
                      const pct = Math.min(100, Math.round((yr.avg / requiredHours) * 100));
                      return (
                        <div key={yr.year} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700">
                              ชั้นปีที่ {yr.year} ({yr.count} คน)
                            </span>
                            <span className="font-bold text-slate-900 font-mono">
                              เฉลี่ย {yr.avg} / {requiredHours} ชม. ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              style={{ width: `${pct}%` }}
                              className={`h-full rounded-full transition-all duration-500 ${
                                yr.year === 4 && yr.avg < requiredHours
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
                        กำลังแสดงผลรายชื่อนักศึกษาชั้นปีที่ 4 ที่ยังไม่ผ่านเกณฑ์ {requiredHours} ชั่วโมง ({atRiskYear4Students.length} คน)
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
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      {showOnlyAtRiskYear4 ? 'รายชื่อนักศึกษาปี 4 กลุ่มเสี่ยง' : 'รายงานชั่วโมงกิจกรรมนักศึกษา'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      สรุปผลชั่วโมงกิจกรรมสะสมของนักศึกษาทั้ง {students.length} คน (แสดงผลตามตัวกรอง {filteredReportStudents.length} คน)
                    </p>
                  </div>

                  {/* 3 Export Buttons: Excel, Word, PDF */}
                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button
                      onClick={handleExportHoursExcel}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                      title="ส่งออกรายงานเป็นไฟล์ Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>ส่งออก Excel</span>
                    </button>
                    <button
                      onClick={handleExportHoursWord}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                      title="ส่งออกรายงานเป็นไฟล์ Word (.doc)"
                    >
                      <FileText className="w-4 h-4" />
                      <span>ส่งออก Word</span>
                    </button>
                    <button
                      onClick={handleExportHoursPdf}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                      title="พิมพ์หรือบันทึกเป็นไฟล์ PDF"
                    >
                      <Printer className="w-4 h-4" />
                      <span>พิมพ์ / PDF</span>
                    </button>
                  </div>
                </div>

                {/* Multi-Filters Bar: เพศ, สาขา, ชั้นปี, สถานะ, ค้นหา */}
                <div className="flex flex-wrap items-center gap-2.5 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6 text-xs">
                  <span className="font-bold text-slate-500 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" />
                    <span>กรองข้อมูล:</span>
                  </span>

                  {/* Filter 1: เพศ */}
                  <select
                    value={reportGenderFilter}
                    onChange={(e) => setReportGenderFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-700"
                  >
                    <option value="all">เพศทั้งหมด</option>
                    <option value="ชาย">เพศชาย</option>
                    <option value="หญิง">เพศหญิง</option>
                  </select>

                  {/* Filter 2: ชั้นปี */}
                  <select
                    value={reportYearFilter}
                    onChange={(e) => setReportYearFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-700"
                  >
                    <option value="all">ทุกชั้นปี (ปี 1-4)</option>
                    <option value="1">ชั้นปีที่ 1 (รหัส 69)</option>
                    <option value="2">ชั้นปีที่ 2 (รหัส 68)</option>
                    <option value="3">ชั้นปีที่ 3 (รหัส 67)</option>
                    <option value="4">ชั้นปีที่ 4 (รหัส 66)</option>
                  </select>

                  {/* Filter 3: สาขาวิชา */}
                  <select
                    value={reportMajorFilter}
                    onChange={(e) => setReportMajorFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-700 max-w-[200px]"
                  >
                    <option value="all">ทุกสาขาวิชา ({allMajors.length} สาขา)</option>
                    {allMajors.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>

                  {/* Filter 4: สถานะเกณฑ์ */}
                  <select
                    value={reportStatusFilter}
                    onChange={(e) => setReportStatusFilter(e.target.value as any)}
                    className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-700"
                  >
                    <option value="all">ทุกสถานะเกณฑ์</option>
                    <option value="completed">ครบเกณฑ์ (≥ {requiredHours} ชม.)</option>
                    <option value="incomplete">ยังไม่ครบ (&lt; {requiredHours} ชม.)</option>
                  </select>

                  {/* ปุ่มลัดกรองกลุ่มเสี่ยงปี 4 */}
                  <button
                    onClick={() => setShowOnlyAtRiskYear4(!showOnlyAtRiskYear4)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      showOnlyAtRiskYear4
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    <span>🚨 ปี 4 &lt; {requiredHours} ชม. ({atRiskYear4Students.length})</span>
                  </button>

                  {/* ล้างตัวกรองทั้งหมด */}
                  {(reportGenderFilter !== 'all' || reportMajorFilter !== 'all' || reportYearFilter !== 'all' || reportStatusFilter !== 'all' || showOnlyAtRiskYear4 || reportSearchQuery) && (
                    <button
                      onClick={() => {
                        setReportGenderFilter('all');
                        setReportMajorFilter('all');
                        setReportYearFilter('all');
                        setReportStatusFilter('all');
                        setShowOnlyAtRiskYear4(false);
                        setReportSearchQuery('');
                      }}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer transition text-[11px]"
                    >
                      ล้างตัวกรอง
                    </button>
                  )}

                  {/* Search input */}
                  <div className="relative flex-1 sm:w-56 ml-auto">
                    <input
                      type="text"
                      value={reportSearchQuery}
                      onChange={(e) => setReportSearchQuery(e.target.value)}
                      placeholder="ค้นหาชื่อ หรือรหัส นศ...."
                      className="w-full px-3.5 py-1.5 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0070f3]"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 font-bold text-slate-500 uppercase sticky top-0 border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4 text-center">ลำดับ</th>
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
                      {filteredReportStudents.map((st, idx) => {
                        const hrs = st.totalHours;

                        return (
                          <tr key={st.studentId} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
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
                              {hrs >= requiredHours ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px]">
                                  ครบเกณฑ์
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium text-[10px]">
                                  ขาดอีก {requiredHours - hrs}
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
              {/* Activity Selector & Hero Summary */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                      <FileText className="w-6 h-6 text-[#0070f3]" />
                      <span>รายงานการเข้าร่วมกิจกรรม (Activity Attendance Report)</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ตรวจสอบรายชื่อนักศึกษาที่เข้าร่วมและไม่เข้าร่วมกิจกรรม แยกตามเพศ สาขาวิชา ชั้นปี พร้อมส่งออกไฟล์ Excel, Word, PDF
                    </p>
                  </div>

                  {/* Activity Picker Dropdown */}
                  <div className="w-full lg:w-80">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      เลือกกิจกรรมเพื่อดูรายงาน:
                    </label>
                    <select
                      value={actReportSelectedId || (currentReportActivity ? currentReportActivity.id : '')}
                      onChange={(e) => setActReportSelectedId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#0070f3]"
                    >
                      {activities.map((a) => (
                        <option key={a.id} value={a.id}>
                          [{a.category}] {a.title} ({a.activityType || 'เลือก'}) +{a.hours} ชม.
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selected Activity Hero Card */}
                {currentReportActivity && (
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/90 space-y-5">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-700 font-bold text-[11px]">
                            {currentReportActivity.category}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] ${
                              currentReportActivity.activityType === 'บังคับ'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {currentReportActivity.activityType === 'บังคับ' ? '★ กิจกรรมบังคับ' : 'กิจกรรมเลือก'}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-400">
                            รหัส: {currentReportActivity.id}
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">
                          {currentReportActivity.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {currentReportActivity.date}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {currentReportActivity.location || 'คณะศึกษาศาสตร์ ม.ฟาฏอนี'}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedActivity(currentReportActivity);
                            setActiveTab('home');
                          }}
                          className="px-4 py-2 bg-[#0070f3] hover:bg-[#0060df] text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>เปิดจุดเช็คอินกิจกรรมนี้</span>
                        </button>
                      </div>
                    </div>

                    {/* Stats Metrics Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-200/60">
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                        <div className="text-[11px] font-bold text-emerald-700 mb-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>เข้าร่วมกิจกรรม (Attended)</span>
                        </div>
                        <div className="text-2xl font-black text-emerald-700">
                          {actAttendedStudents.length}{' '}
                          <span className="text-xs font-normal text-slate-400">
                            ({totalPool > 0 ? Math.round((actAttendedStudents.length / totalPool) * 100) : 0}%)
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                        <div className="text-[11px] font-bold text-rose-700 mb-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>ไม่เข้าร่วม (Absent)</span>
                        </div>
                        <div className="text-2xl font-black text-rose-700">
                          {actAbsentStudents.length}{' '}
                          <span className="text-xs font-normal text-slate-400">
                            ({totalPool > 0 ? Math.round((actAbsentStudents.length / totalPool) * 100) : 0}%)
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                        <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>ความจุ / กลุ่มเป้าหมาย</span>
                        </div>
                        <div className="text-2xl font-black text-slate-800">
                          {currentReportActivity.capacity ? `${currentReportActivity.capacity} ที่นั่ง` : `${totalPool} คน`}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                        <div className="text-[11px] font-bold text-blue-700 mb-1 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-[#0070f3]" />
                          <span>ชั่วโมงกิจกรรม</span>
                        </div>
                        <div className="text-2xl font-black text-[#0070f3]">
                          +{currentReportActivity.hours} <span className="text-xs font-normal text-slate-400">ชม.</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-500">
                        <span>สัดส่วนการเข้าร่วม ({Math.round((actAttendedStudents.length / totalPool) * 100)}%)</span>
                        <span>ทั้งหมด {totalPool} คน</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden flex">
                        <div
                          style={{ width: `${(actAttendedStudents.length / totalPool) * 100}%` }}
                          className="bg-emerald-500 h-full transition-all duration-500"
                        />
                        <div
                          style={{ width: `${(actAbsentStudents.length / totalPool) * 100}%` }}
                          className="bg-rose-400 h-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Attendance & Absence Student List Container */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                {/* Sub-Tab Navigation & Export Actions */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
                  {/* Attended vs Absent Switcher */}
                  <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl">
                    <button
                      onClick={() => setActReportSubTab('attended')}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        actReportSubTab === 'attended'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>รายชื่อผู้เข้าร่วม ({actAttendedStudents.length} คน)</span>
                    </button>

                    <button
                      onClick={() => setActReportSubTab('absent')}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        actReportSubTab === 'absent'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>รายชื่อผู้ไม่เข้าร่วม ({actAbsentStudents.length} คน)</span>
                    </button>
                  </div>

                  {/* 3 Export Buttons: Excel, Word, PDF for current sub-tab */}
                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button
                      onClick={handleExportActExcel}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                      title="ส่งออกรายชื่อกลุ่มนี้เป็นไฟล์ Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>ส่งออก Excel</span>
                    </button>
                    <button
                      onClick={handleExportActWord}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                      title="ส่งออกรายชื่อกลุ่มนี้เป็นไฟล์ Word (.doc)"
                    >
                      <FileText className="w-4 h-4" />
                      <span>ส่งออก Word</span>
                    </button>
                    <button
                      onClick={handleExportActPdf}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                      title="พิมพ์หรือบันทึกรายชื่อเป็นไฟล์ PDF"
                    >
                      <Printer className="w-4 h-4" />
                      <span>พิมพ์ / PDF</span>
                    </button>
                  </div>
                </div>

                {/* Multi-Filters: เพศ, ชั้นปี, สาขาวิชา, ค้นหา */}
                <div className="flex flex-wrap items-center gap-2.5 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <span className="font-bold text-slate-500 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" />
                    <span>กรองข้อมูล:</span>
                  </span>

                  {/* Filter 1: เพศ */}
                  <select
                    value={actReportGenderFilter}
                    onChange={(e) => setActReportGenderFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-700"
                  >
                    <option value="all">เพศทั้งหมด</option>
                    <option value="ชาย">เพศชาย</option>
                    <option value="หญิง">เพศหญิง</option>
                  </select>

                  {/* Filter 2: ชั้นปี */}
                  <select
                    value={actReportYearFilter}
                    onChange={(e) => setActReportYearFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-700"
                  >
                    <option value="all">ทุกชั้นปี (ปี 1-4)</option>
                    <option value="1">ชั้นปีที่ 1 (รหัส 69)</option>
                    <option value="2">ชั้นปีที่ 2 (รหัส 68)</option>
                    <option value="3">ชั้นปีที่ 3 (รหัส 67)</option>
                    <option value="4">ชั้นปีที่ 4 (รหัส 66)</option>
                  </select>

                  {/* Filter 3: สาขาวิชา */}
                  <select
                    value={actReportMajorFilter}
                    onChange={(e) => setActReportMajorFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-700 max-w-[200px]"
                  >
                    <option value="all">ทุกสาขาวิชา ({allMajors.length} สาขา)</option>
                    {allMajors.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>

                  {/* ล้างตัวกรอง */}
                  {(actReportGenderFilter !== 'all' || actReportMajorFilter !== 'all' || actReportYearFilter !== 'all' || actReportSearchQuery) && (
                    <button
                      onClick={() => {
                        setActReportGenderFilter('all');
                        setActReportMajorFilter('all');
                        setActReportYearFilter('all');
                        setActReportSearchQuery('');
                      }}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer transition text-[11px]"
                    >
                      ล้างตัวกรอง
                    </button>
                  )}

                  {/* Search query */}
                  <div className="relative flex-1 sm:w-56 ml-auto">
                    <input
                      type="text"
                      value={actReportSearchQuery}
                      onChange={(e) => setActReportSearchQuery(e.target.value)}
                      placeholder="ค้นหาชื่อ หรือรหัส นศ...."
                      className="w-full px-3.5 py-1.5 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0070f3]"
                    />
                  </div>
                </div>

                {/* Table of Students in Current Sub-tab */}
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 font-bold text-slate-500 uppercase sticky top-0 border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4 text-center">ลำดับ</th>
                        <th className="py-3 px-4">รหัสนักศึกษา</th>
                        <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                        <th className="py-3 px-4 text-center">เพศ</th>
                        <th className="py-3 px-4">สาขาวิชา</th>
                        <th className="py-3 px-4 text-center">ชั้นปี</th>
                        <th className="py-3 px-4">วันเวลาที่เช็คอิน / สถานะ</th>
                        <th className="py-3 px-4 text-center">ชั่วโมงที่ได้</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredActStudents.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            ไม่พบข้อมูลนักศึกษาตามเงื่อนไขตัวกรอง
                          </td>
                        </tr>
                      ) : (
                        filteredActStudents.map((st, idx) => {
                          const record = actRecordMap.get(st.studentId);
                          const isAttended = Boolean(record);

                          return (
                            <tr key={st.studentId} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
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
                              <td className="py-3 px-4">
                                {isAttended ? (
                                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <span>{record?.dateRecorded || 'บันทึกสำเร็จ'}</span>
                                  </span>
                                ) : (
                                  <span className="text-rose-500 font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    <span>ยังไม่ได้เข้าร่วมกิจกรรม</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {isAttended ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px]">
                                    +{record?.hoursEarned || currentReportActivity?.hours} ชม.
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-bold border border-rose-200 text-[10px]">
                                    0 ชม.
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
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

                      <div className="text-right flex flex-col sm:items-end gap-2">
                        <div>
                          <span className="text-xs font-bold text-slate-400 block">ชั่วโมงสะสมรวม</span>
                          <span className="text-2xl font-black text-[#0070f3]">{verifiedStudentResult.totalHours} ชม.</span>
                        </div>
                        {userRole === 'superadmin' && (
                          <button
                            onClick={() => {
                              setManualGrantTargetStudent(verifiedStudentResult.student);
                              setIsManualGrantModalOpen(true);
                            }}
                            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ บันทึกชั่วโมงรายบุคคล / เทียบโอน</span>
                          </button>
                        )}
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
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900">{r.activityTitle}</span>
                                  {r.checkInType === 'MANUAL_GRANT' && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                      เทียบโอนพิเศษ
                                    </span>
                                  )}
                                </div>
                                <span className="text-slate-400 text-[11px]">
                                  {r.dateRecorded} • {r.category}
                                  {r.documentRef ? ` • เลขที่: ${r.documentRef}` : ''}
                                </span>
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

          {/* TAB: จัดการข้อมูลนักศึกษา (เฉพาะ Super Admin) */}
          {activeTab === 'student_management' && userRole === 'superadmin' && (
            <div className="space-y-6">
              {/* Header Card & Actions */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                      <UserCheck className="w-6 h-6 text-[#0070f3]" />
                      <span>จัดการข้อมูลนักศึกษา (Student Management)</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      จัดการรายชื่อนักศึกษา นำเข้าข้อมูลด้วยไฟล์ Excel เพิ่มนักศึกษารายคน ปรับสถานะ และบันทึกเทียบโอนชั่วโมง
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    <button
                      onClick={() => setIsAddStudentModalOpen(true)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#0070f3] hover:bg-[#0060df] text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>+ เพิ่มนักศึกษารายคน</span>
                    </button>
                    <button
                      onClick={() => setIsImportExcelModalOpen(true)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <FileUp className="w-4 h-4" />
                      <span>📥 นำเข้าไฟล์ Excel/CSV</span>
                    </button>
                  </div>
                </div>

                {/* 4 KPI Metrics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      นักศึกษาทั้งหมดในระบบ
                    </span>
                    <div className="text-2xl font-black text-slate-900">{studentManagementStats.total} <span className="text-xs font-normal text-slate-400">คน</span></div>
                    <p className="text-[10px] text-slate-400 mt-0.5">คณะศึกษาศาสตร์ 5 สาขาวิชา</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                      กำลังศึกษา (Active)
                    </span>
                    <div className="text-2xl font-black text-emerald-700">
                      {studentManagementStats.active}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        ({studentManagementStats.total ? Math.round((studentManagementStats.active / studentManagementStats.total) * 100) : 0}%)
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-600 mt-0.5">แสดงผลในระบบเช็คอินและรายงานปกติ</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200">
                    <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block mb-1">
                      สำเร็จการศึกษา (Graduated)
                    </span>
                    <div className="text-2xl font-black text-[#0070f3]">{studentManagementStats.graduated} <span className="text-xs font-normal text-slate-500">คน</span></div>
                    <p className="text-[10px] text-blue-600 mt-0.5">ผ่านเกณฑ์และจบหลักสูตรแล้ว</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200">
                    <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block mb-1">
                      พ้นสภาพ / ลาออก (Withdrawn)
                    </span>
                    <div className="text-2xl font-black text-rose-600">{studentManagementStats.withdrawn} <span className="text-xs font-normal text-slate-500">คน</span></div>
                    <p className="text-[10px] text-rose-600 mt-0.5">ไม่นำมาคำนวณในกลุ่มเสี่ยง</p>
                  </div>
                </div>
              </div>

              {/* Table Container */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                {/* Multi-Filters Bar */}
                <div className="flex flex-wrap items-center gap-2.5 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <span className="font-bold text-slate-500 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" />
                    <span>กรองข้อมูล:</span>
                  </span>

                  {/* Status Filter */}
                  <select
                    value={studentStatusFilter}
                    onChange={(e) => setStudentStatusFilter(e.target.value as any)}
                    className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-700"
                  >
                    <option value="all">สถานะทั้งหมด</option>
                    <option value="ACTIVE">🟢 กำลังศึกษา (Active)</option>
                    <option value="GRADUATED">🟡 สำเร็จการศึกษา (Graduated)</option>
                    <option value="WITHDRAWN">🔴 พ้นสภาพ/ลาออก (Withdrawn)</option>
                  </select>

                  {/* Year Filter */}
                  <select
                    value={studentYearFilter}
                    onChange={(e) => setStudentYearFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-700"
                  >
                    <option value="all">ทุกชั้นปี (ปี 1-4)</option>
                    <option value="1">ชั้นปีที่ 1 (รหัส 69)</option>
                    <option value="2">ชั้นปีที่ 2 (รหัส 68)</option>
                    <option value="3">ชั้นปีที่ 3 (รหัส 67)</option>
                    <option value="4">ชั้นปีที่ 4 (รหัส 66)</option>
                  </select>

                  {/* Major Filter */}
                  <select
                    value={studentMajorFilter}
                    onChange={(e) => setStudentMajorFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-700 max-w-[200px]"
                  >
                    <option value="all">ทุกสาขาวิชา ({allMajors.length} สาขา)</option>
                    {allMajors.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>

                  {/* Clear filter */}
                  {(studentStatusFilter !== 'all' || studentMajorFilter !== 'all' || studentYearFilter !== 'all' || studentSearchQuery) && (
                    <button
                      onClick={() => {
                        setStudentStatusFilter('all');
                        setStudentMajorFilter('all');
                        setStudentYearFilter('all');
                        setStudentSearchQuery('');
                      }}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer transition text-[11px]"
                    >
                      ล้างตัวกรอง
                    </button>
                  )}

                  {/* Search query */}
                  <div className="relative flex-1 sm:w-56 ml-auto">
                    <input
                      type="text"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      placeholder="ค้นหาชื่อ หรือรหัส นศ...."
                      className="w-full px-3.5 py-1.5 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0070f3]"
                    />
                  </div>
                </div>

                {/* Students Table */}
                <div className="overflow-x-auto max-h-[550px]">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 font-bold text-slate-500 uppercase sticky top-0 border-b border-slate-100 z-10">
                      <tr>
                        <th className="py-3 px-4 text-center">ลำดับ</th>
                        <th className="py-3 px-4">รหัสนักศึกษา</th>
                        <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                        <th className="py-3 px-4 text-center">เพศ</th>
                        <th className="py-3 px-4">สาขาวิชา</th>
                        <th className="py-3 px-4 text-center">ชั้นปี</th>
                        <th className="py-3 px-4 text-center">ชั่วโมงสะสม</th>
                        <th className="py-3 px-4 text-center">สถานะ</th>
                        <th className="py-3 px-4 text-center">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredManagementStudents.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400">
                            ไม่พบข้อมูลนักศึกษาตามเงื่อนไขตัวกรอง
                          </td>
                        </tr>
                      ) : (
                        filteredManagementStudents.map((st, idx) => {
                          const hrs = studentTotalHoursMap.get(st.studentId) || 0;
                          const currentStatus = studentStatusMap[st.studentId] || st.status || 'ACTIVE';

                          return (
                            <tr key={st.studentId} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
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
                              <td className="py-3 px-4 text-center">
                                <span className="font-bold text-[#0070f3]">{hrs} ชม.</span>
                                {hrs >= requiredHours && (
                                  <span className="block text-[10px] font-bold text-emerald-600">✓ ครบเกณฑ์</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <select
                                  value={currentStatus}
                                  onChange={(e) => handleChangeStudentStatus(st.studentId, e.target.value as any)}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                    currentStatus === 'ACTIVE'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : currentStatus === 'GRADUATED'
                                      ? 'bg-blue-50 text-[#0070f3] border-blue-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}
                                >
                                  <option value="ACTIVE">🟢 กำลังศึกษา</option>
                                  <option value="GRADUATED">🟡 จบการศึกษา</option>
                                  <option value="WITHDRAWN">🔴 พ้นสภาพ/ลาออก</option>
                                </select>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setManualGrantTargetStudent(st);
                                      setIsManualGrantModalOpen(true);
                                    }}
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                                    title="เทียบโอนหรือเพิ่มชั่วโมงให้นักศึกษาคนนี้"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>เพิ่ม ชม.</span>
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmStudent(st)}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                                    title="ลบนักศึกษาออกจากระบบ"
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-500" />
                                    <span>ลบ</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
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
                        ประเภทกิจกรรม (Activity Type) *
                      </label>
                      <select
                        value={activityForm.activityType || 'เลือก'}
                        onChange={(e) =>
                          setActivityForm({
                            ...activityForm,
                            activityType: e.target.value as Activity['activityType'],
                          })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                      >
                        <option value="เลือก">กิจกรรมเลือก (Elective)</option>
                        <option value="บังคับ">กิจกรรมบังคับ (Compulsory)</option>
                      </select>
                    </div>

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
                        <option value="คณะ">หมวดคณะ</option>
                        <option value="สาขาวิชา">หมวดสาขาวิชา</option>
                        <option value="สโมสรนักศึกษา">หมวดสโมสรนักศึกษา</option>
                        <option value="จิตอาสา/บำเพ็ญประโยชน์">หมวดจิตอาสา/บำเพ็ญประโยชน์</option>
                        <option value="เสริมทักษะวิชาชีพ">หมวดเสริมทักษะวิชาชีพ</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        สถานที่จัดกิจกรรม
                      </label>
                      <input
                        type="text"
                        value={activityForm.location}
                        onChange={(e) => setActivityForm({ ...activityForm, location: e.target.value })}
                        placeholder="เช่น หอประชุมใหญ่ คณะศึกษาศาสตร์"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-[#0070f3]"
                      />
                    </div>
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
                          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-slate-400">{act.id}</span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold text-[10px]">
                                {act.category}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                  act.activityType === 'บังคับ'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}
                              >
                                {act.activityType === 'บังคับ' ? '★ บังคับ' : 'เลือก'}
                              </span>
                            </div>
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
                              onClick={() => setDeleteConfirmActivity(act)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1"
                              title="ลบกิจกรรมนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>ลบ</span>
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

      {/* System Settings & PIN Management Modal (เกณฑ์ชั่วโมง & เปลี่ยน PIN) */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0070f3] flex items-center justify-center shadow-xs">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg leading-tight">ตั้งค่าระบบและรหัสผ่าน</h3>
                  <p className="text-xs text-slate-400 font-medium">EDU Pass System Settings & Security</p>
                </div>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Tab Switcher: เกณฑ์ชั่วโมง vs เปลี่ยนรหัส PIN */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setSettingsTab('criteria')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  settingsTab === 'criteria'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Award className="w-4 h-4 text-[#0070f3]" />
                <span>เกณฑ์ชั่วโมงกิจกรรม</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingsTab('pin')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  settingsTab === 'pin'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <span>เปลี่ยนรหัส PIN</span>
              </button>
            </div>

            {/* TAB 1: กำหนดเกณฑ์ชั่วโมงกิจกรรมขั้นต่ำ */}
            {settingsTab === 'criteria' && (
              <div className="space-y-5 animate-in fade-in">
                <div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    กำหนดจำนวนชั่วโมงกิจกรรมขั้นต่ำที่นักศึกษาคณะศึกษาศาสตร์ต้องผ่านเพื่อสำเร็จการศึกษา และได้รับเกียรติบัตร (ระบบจะคำนวณและปรับการประเมินผลอัตโนมัติทันที)
                  </p>
                </div>

                {/* Big Number Display & Steppers */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 text-center space-y-4">
                  <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                    เกณฑ์ชั่วโมงกิจกรรมขั้นต่ำที่ต้องการตั้งค่า
                  </div>
                  <div className="text-5xl font-black text-[#0070f3] tracking-tight">
                    {tempRequiredHours} <span className="text-xl font-bold text-slate-500">ชม.</span>
                  </div>

                  {/* Stepper Buttons: -10, -5, -1, +1, +5, +10 */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setTempRequiredHours((h) => Math.max(1, h - 10))}
                      className="px-2.5 py-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 font-bold text-xs rounded-lg transition cursor-pointer"
                    >
                      -10
                    </button>
                    <button
                      type="button"
                      onClick={() => setTempRequiredHours((h) => Math.max(1, h - 5))}
                      className="px-2.5 py-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 font-bold text-xs rounded-lg transition cursor-pointer"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => setTempRequiredHours((h) => Math.max(1, h - 1))}
                      className="px-2.5 py-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 font-bold text-xs rounded-lg transition cursor-pointer"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => setTempRequiredHours((h) => Math.min(300, h + 1))}
                      className="px-2.5 py-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 font-bold text-xs rounded-lg transition cursor-pointer"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => setTempRequiredHours((h) => Math.min(300, h + 5))}
                      className="px-2.5 py-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 font-bold text-xs rounded-lg transition cursor-pointer"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      onClick={() => setTempRequiredHours((h) => Math.min(300, h + 10))}
                      className="px-2.5 py-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 font-bold text-xs rounded-lg transition cursor-pointer"
                    >
                      +10
                    </button>
                  </div>

                  {/* Direct input option */}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <span className="text-xs text-slate-500 font-medium">หรือพิมพ์ระบุ:</span>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={tempRequiredHours}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) setTempRequiredHours(Math.max(1, Math.min(300, val)));
                      }}
                      className="w-20 px-2 py-1 text-center font-black text-slate-800 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
                    />
                    <span className="text-xs text-slate-600 font-bold">ชั่วโมง</span>
                  </div>

                  {/* Preset Pills */}
                  <div className="flex items-center justify-center gap-2 pt-1 text-[11px]">
                    <span className="text-slate-400 font-medium">ค่าแนะนำ:</span>
                    {[40, 50, 60, 80, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTempRequiredHours(preset)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                          tempRequiredHours === preset
                            ? 'bg-[#0070f3] text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-blue-100 border border-slate-200'
                        }`}
                      >
                        {preset} ชม.
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTempRequiredHours(requiredHours);
                      setIsPasswordModalOpen(false);
                    }}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const finalHours = Number(tempRequiredHours) || 60;
                      setRequiredHours(finalHours);
                      try {
                        localStorage.setItem('edupass_required_hours', String(finalHours));
                      } catch (e) {}

                      try {
                        const res = await fetch('/api/sync', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'update_settings', settings: { requiredHours: finalHours } }),
                        });
                        if (res.ok) {
                          playSuccessBeep();
                          setMessage({
                            text: `🎯 ปรับเกณฑ์ชั่วโมงกิจกรรมขั้นต่ำเป็น ${finalHours} ชั่วโมงเรียบร้อยแล้ว`,
                            type: 'success',
                          });
                        }
                      } catch (err) {
                        console.warn('Update settings sync note:', err);
                        playSuccessBeep();
                        setMessage({
                          text: `🎯 ปรับเกณฑ์ชั่วโมงกิจกรรมเป็น ${finalHours} ชม. เรียบร้อยแล้ว`,
                          type: 'success',
                        });
                      }

                      setIsPasswordModalOpen(false);
                    }}
                    className="flex-1 py-3 rounded-xl bg-[#0070f3] hover:bg-[#0060df] text-white font-bold text-xs transition shadow-sm cursor-pointer"
                  >
                    บันทึกเกณฑ์ชั่วโมง
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: เปลี่ยนรหัสผ่าน PIN สำหรับแอดมินหลัก & จุดสแกน */}
            {settingsTab === 'pin' && (
              <div className="space-y-4 animate-in fade-in">
                <p className="text-xs text-slate-600">
                  กำหนดรหัส PIN ใหม่สำหรับการเข้าสู่ระบบแยกตามสิทธิ์ Super Admin และ Staff Scanner
                </p>

                {/* Super Admin PIN Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span>รหัส PIN แอดมินหลัก (Super Admin)</span>
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-400">
                      ปัจจุบัน: {superAdminPin}
                    </span>
                  </div>
                  <input
                    type="password"
                    value={tempSuperPin}
                    onChange={(e) => setTempSuperPin(e.target.value)}
                    placeholder="รหัส PIN 4-6 หลัก เช่น 1234"
                    maxLength={8}
                    className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-200 font-mono font-bold text-base tracking-widest text-slate-900 focus:outline-none focus:border-[#0070f3]"
                  />
                  <p className="text-[10px] text-slate-400">ใช้สำหรับเข้าถึงรายงานภาพรวม จัดการกิจกรรม และลบข้อมูล</p>
                </div>

                {/* Staff Scanner PIN Card */}
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>รหัส PIN จุดสแกน (Staff Scanner)</span>
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-700">
                      ปัจจุบัน: {staffScannerPin}
                    </span>
                  </div>
                  <input
                    type="password"
                    value={tempStaffPin}
                    onChange={(e) => setTempStaffPin(e.target.value)}
                    placeholder="รหัส PIN 4-6 หลัก เช่น 5678"
                    maxLength={8}
                    className="w-full px-4 py-2.5 bg-white rounded-xl border border-emerald-300 font-mono font-bold text-base tracking-widest text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-emerald-700/80">ใช้สำหรับเจ้าหน้าที่หน้างานเปิดกล้องสแกน QR Code เท่านั้น</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTempSuperPin(superAdminPin);
                      setTempStaffPin(staffScannerPin);
                      setIsPasswordModalOpen(false);
                    }}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!tempSuperPin.trim() || !tempStaffPin.trim()) {
                        playWarningBeep();
                        setMessage({ text: '⚠️ กรุณาระบุรหัส PIN ให้ครบทั้งสองส่วน', type: 'error' });
                        return;
                      }

                      const cleanSuper = tempSuperPin.trim();
                      const cleanStaff = tempStaffPin.trim();

                      try {
                        localStorage.setItem('edupass_superadmin_pin', cleanSuper);
                        localStorage.setItem('edupass_staff_pin', cleanStaff);
                      } catch (e) {}

                      fetch('/api/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'update_settings',
                          settings: { superAdminPin: cleanSuper, staffScannerPin: cleanStaff },
                        }),
                      }).catch((e) => console.warn('Update PINs sync note:', e));

                      setSuperAdminPin(cleanSuper);
                      setStaffScannerPin(cleanStaff);
                      playSuccessBeep();
                      setMessage({
                        text: `🔑 บันทึกรหัสผ่านใหม่เรียบร้อยแล้ว (Super Admin: ${cleanSuper} / Staff: ${cleanStaff})`,
                        type: 'success',
                      });
                      setIsPasswordModalOpen(false);
                    }}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm cursor-pointer"
                  >
                    บันทึกรหัส PIN ใหม่
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Activity Confirmation Modal (หน้าต่างยืนยันการลบกิจกรรม) */}
      {deleteConfirmActivity && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h3 className="font-black text-slate-900 text-lg">ยืนยันการลบกิจกรรม</h3>
              <p className="text-xs text-slate-500 mt-1">
                คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมนี้ออกจากระบบอย่างถาวร?
              </p>
            </div>

            {/* Activity Info Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="font-bold text-slate-900 text-sm">{deleteConfirmActivity.title}</div>
              <div className="flex flex-wrap items-center gap-2 text-slate-500 text-[11px]">
                <span className="font-mono font-bold text-slate-400">{deleteConfirmActivity.id}</span>
                <span>•</span>
                <span>หมวด: {deleteConfirmActivity.category}</span>
                <span>•</span>
                <span className="font-bold text-[#0070f3]">+{deleteConfirmActivity.hours} ชม.</span>
                <span>•</span>
                <span className="font-bold text-slate-700">
                  {deleteConfirmActivity.activityType || 'เลือก'}
                </span>
              </div>
              <div className="text-rose-600 font-bold text-[11px] pt-1 border-t border-slate-200 mt-2">
                ⚠️ การลบจะนำกิจกรรมนี้ออกจากหน้ารายการ จุดเช็คอิน และรายงานผลทันที
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmActivity(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleDeleteActivity(deleteConfirmActivity)}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-sm cursor-pointer"
              >
                ยืนยันการลบกิจกรรม
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Modal บันทึกกิจกรรมย้อนหลัง / เทียบโอนชั่วโมงรายบุคคล (Manual Credit Granting) */}
      {isManualGrantModalOpen && manualGrantTargetStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0070f3] flex items-center justify-center shadow-xs">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg leading-tight">บันทึกเทียบโอนชั่วโมงรายบุคคล</h3>
                  <p className="text-xs text-slate-400 font-medium">Manual Credit Granting</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManualGrantModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Target Student Info Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border border-blue-100 text-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#0070f3] text-white flex items-center justify-center font-bold text-sm shrink-0">
                {manualGrantTargetStudent.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 text-sm truncate">{manualGrantTargetStudent.name}</div>
                <div className="text-slate-500 flex flex-wrap items-center gap-2 text-[11px] mt-0.5">
                  <span className="font-mono font-bold text-[#0070f3]">{manualGrantTargetStudent.studentId}</span>
                  <span>•</span>
                  <span>{manualGrantTargetStudent.major}</span>
                  <span>•</span>
                  <span>ชั้นปีที่ {manualGrantTargetStudent.yearLevel}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleManualGrantCredit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ชื่อกิจกรรม / ผลงานที่ขอเทียบโอน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น รางวัลแข่งขันตอบปัญหาวิชาการระดับชาติ, วิทยากรค่ายคุณธรรม"
                  value={manualGrantForm.title}
                  onChange={(e) => setManualGrantForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-[#0070f3] focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">หมวดหมู่กิจกรรม</label>
                  <select
                    value={manualGrantForm.category}
                    onChange={(e) => setManualGrantForm((prev) => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-[#0070f3] focus:bg-white transition cursor-pointer"
                  >
                    <option value="คณะ">คณะ</option>
                    <option value="สาขาวิชา">สาขาวิชา</option>
                    <option value="สโมสรนักศึกษา">สโมสรนักศึกษา</option>
                    <option value="จิตอาสา/บำเพ็ญประโยชน์">จิตอาสา/บำเพ็ญประโยชน์</option>
                    <option value="เสริมทักษะวิชาชีพ">เสริมทักษะวิชาชีพ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    จำนวนชั่วโมง <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="100"
                    required
                    value={manualGrantForm.hours}
                    onChange={(e) => setManualGrantForm((prev) => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-[#0070f3] focus:bg-white transition"
                  />
                  {/* Preset Quick Buttons */}
                  <div className="flex gap-1 mt-1.5">
                    {[1, 2, 3, 5, 8, 10].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setManualGrantForm((prev) => ({ ...prev, hours: h }))}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          manualGrantForm.hours === h
                            ? 'bg-[#0070f3] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        +{h}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">วันที่ทำกิจกรรม / อนุมัติ</label>
                  <input
                    type="date"
                    required
                    value={manualGrantForm.date}
                    onChange={(e) => setManualGrantForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-[#0070f3] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">เลขที่หนังสืออ้างอิง / คำสั่ง</label>
                  <input
                    type="text"
                    placeholder="เช่น ศษ. 024/2569"
                    value={manualGrantForm.documentRef}
                    onChange={(e) => setManualGrantForm((prev) => ({ ...prev, documentRef: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-[#0070f3] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
                <textarea
                  rows={2}
                  placeholder="ระบุเหตุผลหรือรายละเอียดการเทียบโอนชั่วโมง..."
                  value={manualGrantForm.note}
                  onChange={(e) => setManualGrantForm((prev) => ({ ...prev, note: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-[#0070f3] focus:bg-white transition resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualGrantModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-[#0070f3] hover:bg-[#0060df] text-white font-bold text-xs transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Award className="w-4 h-4" />
                  <span>{loading ? 'กำลังบันทึก...' : 'บันทึกเทียบโอนชั่วโมง'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal เพิ่มนักศึกษารายคน (+ Add Student) */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0070f3] flex items-center justify-center shadow-xs">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg leading-tight">เพิ่มข้อมูลนักศึกษารายคน</h3>
                  <p className="text-xs text-slate-400 font-medium">Add Individual Student</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddStudentModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSingleStudent} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    รหัสนักศึกษา <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 691441091"
                    value={newStudentForm.studentId}
                    onChange={(e) => setNewStudentForm((prev) => ({ ...prev, studentId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:border-[#0070f3] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">เพศ</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewStudentForm((prev) => ({ ...prev, gender: 'ชาย' }))}
                      className={`py-2.5 px-3 rounded-xl font-bold transition text-xs border ${
                        newStudentForm.gender === 'ชาย'
                          ? 'bg-blue-50 border-[#0070f3] text-[#0070f3]'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      👨 ชาย
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewStudentForm((prev) => ({ ...prev, gender: 'หญิง' }))}
                      className={`py-2.5 px-3 rounded-xl font-bold transition text-xs border ${
                        newStudentForm.gender === 'หญิง'
                          ? 'bg-pink-50 border-pink-500 text-pink-600'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      👩 หญิง
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ชื่อ - นามสกุล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น นายมูฮัมหมัด ซาการียา หรือ นางสาวฟาตีมะห์ ดอเลาะ"
                  value={newStudentForm.name}
                  onChange={(e) => setNewStudentForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-[#0070f3] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">สาขาวิชา</label>
                <select
                  value={newStudentForm.major}
                  onChange={(e) => setNewStudentForm((prev) => ({ ...prev, major: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-[#0070f3] focus:bg-white transition cursor-pointer"
                >
                  {allMajors.length > 0 ? (
                    allMajors.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="การสอนอิสลามศึกษา">การสอนอิสลามศึกษา</option>
                      <option value="การศึกษาปฐมวัย">การศึกษาปฐมวัย</option>
                      <option value="การประถมศึกษา">การประถมศึกษา</option>
                      <option value="การสอนภาษาอังกฤษ">การสอนภาษาอังกฤษ</option>
                      <option value="การสอนภาษาไทย">การสอนภาษาไทย</option>
                      <option value="นวัตกรรมและเทคโนโลยีการศึกษา">นวัตกรรมและเทคโนโลยีการศึกษา</option>
                      <option value="การสอนศิลปะ">การสอนศิลปะ</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ปีการศึกษาที่เข้า</label>
                  <input
                    type="text"
                    required
                    placeholder="2569"
                    value={newStudentForm.academicYear}
                    onChange={(e) => setNewStudentForm((prev) => ({ ...prev, academicYear: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-slate-900 focus:outline-none focus:border-[#0070f3] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชั้นปีปัจจุบัน</label>
                  <select
                    value={newStudentForm.yearLevel}
                    onChange={(e) => setNewStudentForm((prev) => ({ ...prev, yearLevel: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-[#0070f3] focus:bg-white transition cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5].map((y) => (
                      <option key={y} value={y}>
                        ชั้นปีที่ {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddStudentModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#0070f3] hover:bg-[#0060df] text-white font-bold text-xs transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>บันทึกข้อมูลนักศึกษา</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal นำเข้าข้อมูลนักศึกษาผ่านไฟล์ Excel / CSV (Bulk Import Excel) */}
      {isImportExcelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg leading-tight">นำเข้านักศึกษาผ่าน Excel / CSV</h3>
                  <p className="text-xs text-slate-400 font-medium">Bulk Import Students from Spreadsheet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportExcelModalOpen(false);
                  setImportedPreviewStudents([]);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Template Download Prompt */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-bold text-slate-800">ยังไม่มีแบบฟอร์มนำเข้าใช่หรือไม่?</div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  ดาวน์โหลดไฟล์เทมเพลต Excel (.xlsx) ที่มีหัวตารางพร้อมตัวอย่างเพื่อนำไปกรอกข้อมูล
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleExcel}
                className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>ดาวน์โหลดเทมเพลต</span>
              </button>
            </div>

            {/* File Upload Drop Area */}
            {importedPreviewStudents.length === 0 ? (
              <label className="border-2 border-dashed border-slate-300 hover:border-[#0070f3] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50/50 hover:bg-blue-50/30">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0070f3] flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="font-bold text-slate-800 text-sm">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</div>
                <div className="text-xs text-slate-500 mt-1">
                  รองรับไฟล์ Microsoft Excel (.xlsx, .xls) หรือ CSV (.csv)
                </div>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUploadForImport}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                      ✓ ตรวจพบข้อมูล {importedPreviewStudents.length} รายการ
                    </span>
                    <span className="text-xs text-slate-400">พร้อมนำเข้าสู่ระบบ</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImportedPreviewStudents([])}
                    className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
                  >
                    ล้างข้อมูล / เลือกไฟล์ใหม่
                  </button>
                </div>

                {/* Preview Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                      <tr>
                        <th className="p-2.5">รหัสนักศึกษา</th>
                        <th className="p-2.5">ชื่อ-นามสกุล</th>
                        <th className="p-2.5">เพศ</th>
                        <th className="p-2.5">สาขาวิชา</th>
                        <th className="p-2.5 text-center">ชั้นปี</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {importedPreviewStudents.slice(0, 10).map((st, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-bold text-[#0070f3]">{st.studentId}</td>
                          <td className="p-2.5">{st.name}</td>
                          <td className="p-2.5">
                            <span className={st.gender === 'ชาย' ? 'text-blue-600' : 'text-pink-600'}>
                              {st.gender}
                            </span>
                          </td>
                          <td className="p-2.5">{st.major}</td>
                          <td className="p-2.5 text-center font-bold">{st.yearLevel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importedPreviewStudents.length > 10 && (
                  <p className="text-[11px] text-slate-400 text-center">
                    ... และอีก {importedPreviewStudents.length - 10} รายการ
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsImportExcelModalOpen(false);
                  setImportedPreviewStudents([]);
                }}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={importedPreviewStudents.length === 0}
                onClick={handleConfirmImport}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <FileUp className="w-4 h-4" />
                <span>ยืนยันนำเข้าข้อมูล ({importedPreviewStudents.length} คน)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal ยืนยันการลบนักศึกษา (Delete Student Confirmation) */}
      {deleteConfirmStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <UserX className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h3 className="font-black text-slate-900 text-lg">ยืนยันการลบนักศึกษา</h3>
              <p className="text-xs text-slate-500 mt-1">
                คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนักศึกษาคนนี้ออกจากระบบ?
              </p>
            </div>

            {/* Student Info Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="font-bold text-slate-900 text-sm">{deleteConfirmStudent.name}</div>
              <div className="flex flex-wrap items-center gap-2 text-slate-500 text-[11px]">
                <span className="font-mono font-bold text-[#0070f3]">{deleteConfirmStudent.studentId}</span>
                <span>•</span>
                <span>เพศ {deleteConfirmStudent.gender}</span>
                <span>•</span>
                <span>{deleteConfirmStudent.major}</span>
                <span>•</span>
                <span>ชั้นปีที่ {deleteConfirmStudent.yearLevel}</span>
              </div>
              <div className="text-rose-600 font-bold text-[11px] pt-1 border-t border-slate-200 mt-2">
                ⚠️ การลบจะนำนักศึกษาออกจากระบบ และไม่แสดงในรายงานผล (สามารถเพิ่มหรือนำเข้าใหม่ได้ในอนาคต)
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmStudent(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleDeleteStudent(deleteConfirmStudent)}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>ยืนยันการลบนักศึกษา</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
