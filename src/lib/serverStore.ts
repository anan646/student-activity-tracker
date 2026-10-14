import fs from 'fs';
import path from 'path';
import { Student, Activity, AttendanceRecord, StudentStatus } from '@/types';
import localStudentsData from '@/data/students.json';

export interface SystemSettings {
  requiredHours: number;
  superAdminPin: string;
  staffScannerPin: string;
}

export interface ServerStoreState {
  version: number;
  lastUpdated: number;
  activities: Activity[];
  records: AttendanceRecord[];
  students: Student[];
  studentStatusMap: Record<string, StudentStatus>;
  settings: SystemSettings;
}

export type SyncEventType =
  | 'INITIAL_STATE'
  | 'RECORD_ATTENDANCE'
  | 'MANUAL_GRANT_CREDIT'
  | 'CREATE_ACTIVITY'
  | 'DELETE_ACTIVITY'
  | 'ADD_STUDENT'
  | 'IMPORT_STUDENTS'
  | 'DELETE_STUDENT'
  | 'UPDATE_STUDENT_STATUS'
  | 'UPDATE_SETTINGS';

export interface SyncEvent {
  id: string;
  type: SyncEventType;
  version: number;
  timestamp: number;
  payload: any;
}

type Subscriber = (event: SyncEvent) => void;

// ใช้ globalThis เพื่อรักษา state และ connections ข้าม API Routes และ Hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __edupass_server_store__: ServerStoreState | undefined;
  // eslint-disable-next-line no-var
  var __edupass_subscribers__: Set<Subscriber> | undefined;
}

const DB_PATH = path.join(process.cwd(), 'src', 'data', 'db.json');

// กิจกรรมมาตรฐาน EDU Pass คณะศึกษาศาสตร์ ม.ฟาฏอนี
const DEFAULT_ACTIVITIES: Activity[] = [
  {
    id: 'ACT-2026-01',
    title: 'EDU Talk : Debate Competition 2026',
    category: 'คณะ',
    activityType: 'บังคับ',
    hours: 3,
    date: '2026-09-22 10:00',
    academicYear: '2569',
    location: 'ห้องประชุม 1 อาคารศึกษาศาสตร์',
    description: 'การแข่งขันโต้วาทีและทักษะการสื่อสารเพื่อการศึกษา 2026',
  },
  {
    id: 'ACT-2026-02',
    title: 'EDU PREMIER CUP 2026 / Out',
    category: 'สโมสรนักศึกษา',
    activityType: 'เลือก',
    hours: 2,
    date: '2026-09-19 17:30',
    academicYear: '2569',
    location: 'สนามฟุตบอล มหาวิทยาลัยฟาฏอนี',
    description: 'การแข่งขันกีฬาเชื่อมความสัมพันธ์ EDU Premier Cup (ช่วงเย็น/รอบนอก)',
  },
  {
    id: 'ACT-2026-03',
    title: 'EDU GIRLS UNITY GAMES 2026 / บ่าย',
    category: 'สโมสรนักศึกษา',
    activityType: 'เลือก',
    hours: 3,
    date: '2026-09-19 13:00',
    academicYear: '2569',
    location: 'โรงยิมเนเซียมหญิง มหาวิทยาลัยฟาฏอนี',
    description: 'มหกรรมกีฬาสานสัมพันธ์นักศึกษาหญิง EDU Girls Unity Games (รอบบ่าย)',
  },
  {
    id: 'ACT-2026-04',
    title: 'EDU PREMIER CUP 2026 / In',
    category: 'สโมสรนักศึกษา',
    activityType: 'เลือก',
    hours: 2,
    date: '2026-09-19 11:50',
    academicYear: '2569',
    location: 'สนามฟุตบอล มหาวิทยาลัยฟาฏอนี',
    description: 'การแข่งขันกีฬาเชื่อมความสัมพันธ์ EDU Premier Cup (ช่วงสาย/รอบใน)',
  },
  {
    id: 'ACT-2026-05',
    title: 'EDU GIRLS UNITY GAMES 2026 / เช้า',
    category: 'สโมสรนักศึกษา',
    activityType: 'เลือก',
    hours: 3,
    date: '2026-09-19 07:30',
    academicYear: '2569',
    location: 'โรงยิมเนเซียมหญิง มหาวิทยาลัยฟาฏอนี',
    description: 'มหกรรมกีฬาสานสัมพันธ์นักศึกษาหญิง EDU Girls Unity Games (รอบเช้า)',
  },
  {
    id: 'ACT-2026-06',
    title: 'KHUTBAH NEXT GEN คุตบะห์ × สุนทรพจน์',
    category: 'เสริมทักษะวิชาชีพ',
    activityType: 'เลือก',
    hours: 3,
    date: '2026-09-08 10:00',
    academicYear: '2569',
    location: 'หอประชุมใหญ่ อาคารเฉลิมพระเกียรติ',
    description: 'อบรมและฝึกปฏิบัติการแสดงธรรมและสุนทรพจน์เชิงสร้างสรรค์',
  },
  {
    id: 'ACT-2026-07',
    title: "USRAH (us) SA'EDAH ครั้งที่ 2 ตอน บ้านแห่งความผูกพัน เพราะเราคือครอบครัวเดียวกัน",
    category: 'จิตอาสา/บำเพ็ญประโยชน์',
    activityType: 'เลือก',
    hours: 4,
    date: '2026-08-31 17:00',
    academicYear: '2569',
    location: 'ลานกิจกรรม คณะศึกษาศาสตร์',
    description: 'กิจกรรมอุสเราะฮ์สร้างความสัมพันธ์และบำเพ็ญประโยชน์เพื่อสังคม',
  },
  {
    id: 'ACT-2026-08',
    title: 'โครงการปฐมนิเทศและเสริมสร้างคุณธรรมจริยธรรมวิชาชีพครู',
    category: 'คณะ',
    activityType: 'บังคับ',
    hours: 2,
    date: '2026-08-31 10:00',
    academicYear: '2569',
    location: 'มัสยิดประจำมหาวิทยาลัยฟาฏอนี',
    description: 'โครงการพัฒนาคุณธรรมจริยธรรมและเจตคติต่อวิชาชีพครู ประจำปีการศึกษา 2569',
  },
];

function initDefaultState(): ServerStoreState {
  const students: Student[] = (localStudentsData as Array<{
    StudentID: string;
    Name: string;
    Gender: string;
    Major: string;
    AcademicYear: string;
    YearLevel: number;
  }>).map((s) => ({
    studentId: String(s.StudentID).trim(),
    name: s.Name.trim(),
    gender: (s.Gender as 'ชาย' | 'หญิง') || 'ชาย',
    major: s.Major.trim(),
    academicYear: String(s.AcademicYear).trim(),
    yearLevel: Number(s.YearLevel),
    status: 'ACTIVE',
  }));

  const initialRecords: AttendanceRecord[] = [];
  const targets = [
    { actId: 'ACT-2026-01', count: 527, date: '2026-09-22 10:00', title: 'EDU Talk : Debate Competition 2026', cat: 'คณะ', hrs: 3 },
    { actId: 'ACT-2026-02', count: 62, date: '2026-09-19 17:30', title: 'EDU PREMIER CUP 2026 / Out', cat: 'สโมสรนักศึกษา', hrs: 2 },
    { actId: 'ACT-2026-03', count: 339, date: '2026-09-19 13:00', title: 'EDU GIRLS UNITY GAMES 2026 / บ่าย', cat: 'สโมสรนักศึกษา', hrs: 3 },
    { actId: 'ACT-2026-04', count: 69, date: '2026-09-19 11:50', title: 'EDU PREMIER CUP 2026 / In', cat: 'สโมสรนักศึกษา', hrs: 2 },
    { actId: 'ACT-2026-05', count: 405, date: '2026-09-19 07:30', title: 'EDU GIRLS UNITY GAMES 2026 / เช้า', cat: 'สโมสรนักศึกษา', hrs: 3 },
    { actId: 'ACT-2026-06', count: 52, date: '2026-09-08 10:00', title: 'KHUTBAH NEXT GEN คุตบะห์ × สุนทรพจน์', cat: 'เสริมทักษะวิชาชีพ', hrs: 3 },
    { actId: 'ACT-2026-08', count: 547, date: '2026-08-31 10:00', title: 'โครงการปฐมนิเทศและเสริมสร้างคุณธรรมจริยธรรมวิชาชีพครู', cat: 'คณะ', hrs: 2 },
  ];

  targets.forEach((t) => {
    const attendees = students.slice(0, Math.min(t.count, students.length));
    attendees.forEach((st, idx) => {
      initialRecords.push({
        id: `REC-${t.actId}-${idx}`,
        studentId: st.studentId,
        activityId: t.actId,
        activityTitle: t.title,
        category: t.cat,
        hoursEarned: t.hrs,
        dateRecorded: t.date,
        status: 'APPROVED',
        checkInType: 'SINGLE',
      });
    });
  });

  return {
    version: 1,
    lastUpdated: Date.now(),
    activities: DEFAULT_ACTIVITIES,
    records: initialRecords,
    students,
    studentStatusMap: {},
    settings: {
      requiredHours: 60,
      superAdminPin: '1234',
      staffScannerPin: '5678',
    },
  };
}

// โหลดฐานข้อมูลจากไฟล์ หรือสร้างค่าเริ่มต้น
function loadOrInitState(): ServerStoreState {
  if (globalThis.__edupass_server_store__) {
    return globalThis.__edupass_server_store__;
  }

  try {
    if (fs.existsSync(DB_PATH)) {
      const fileContent = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(fileContent);
      if (parsed && Array.isArray(parsed.students) && Array.isArray(parsed.activities)) {
        if (!parsed.settings) {
          parsed.settings = {
            requiredHours: 60,
            superAdminPin: '1234',
            staffScannerPin: '5678',
          };
        } else {
          parsed.settings.requiredHours = Number(parsed.settings.requiredHours) || 60;
          parsed.settings.superAdminPin = String(parsed.settings.superAdminPin || '1234');
          parsed.settings.staffScannerPin = String(parsed.settings.staffScannerPin || '5678');
        }
        globalThis.__edupass_server_store__ = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed reading db.json, initializing fresh store:', err);
  }

  const fresh = initDefaultState();
  globalThis.__edupass_server_store__ = fresh;
  persistToDisk(fresh);
  return fresh;
}

function persistToDisk(state: ServerStoreState) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db.json:', err);
  }
}

function getSubscribers(): Set<Subscriber> {
  if (!globalThis.__edupass_subscribers__) {
    globalThis.__edupass_subscribers__ = new Set<Subscriber>();
  }
  return globalThis.__edupass_subscribers__;
}

export function subscribeToStore(cb: Subscriber): () => void {
  const subs = getSubscribers();
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

export function broadcastEvent(type: SyncEventType, payload: any): SyncEvent {
  const state = loadOrInitState();
  state.version += 1;
  state.lastUpdated = Date.now();

  const event: SyncEvent = {
    id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type,
    version: state.version,
    timestamp: state.lastUpdated,
    payload,
  };

  persistToDisk(state);

  const subs = getSubscribers();
  subs.forEach((cb) => {
    try {
      cb(event);
    } catch (e) {
      console.error('SSE subscriber callback failed:', e);
    }
  });

  return event;
}

// -------------------------------------------------------------------
// Store Query and Mutation APIs
// -------------------------------------------------------------------

export function getServerStore(): ServerStoreState {
  return loadOrInitState();
}

// 1. เช็คอินนักศึกษา หรือ เทียบโอนชั่วโมง
export function recordAttendanceInStore(newRecords: AttendanceRecord[]): SyncEvent {
  const state = loadOrInitState();

  const getRecordKey = (r: AttendanceRecord) =>
    r.checkInType === 'MANUAL_GRANT'
      ? r.id
      : `${r.studentId}_${r.activityId}_${r.checkInType || 'SINGLE'}`;

  const recordMap = new Map<string, AttendanceRecord>();
  state.records.forEach((r) => recordMap.set(getRecordKey(r), r));
  newRecords.forEach((r) => recordMap.set(getRecordKey(r), r));

  state.records = Array.from(recordMap.values());

  const eventType: SyncEventType =
    newRecords.some((r) => r.checkInType === 'MANUAL_GRANT')
      ? 'MANUAL_GRANT_CREDIT'
      : 'RECORD_ATTENDANCE';

  return broadcastEvent(eventType, { records: newRecords });
}

// 2. สร้างกิจกรรมใหม่
export function createActivityInStore(activity: Activity): SyncEvent {
  const state = loadOrInitState();
  state.activities = [activity, ...state.activities.filter((a) => a.id !== activity.id)];
  return broadcastEvent('CREATE_ACTIVITY', { activity });
}

// 3. ลบกิจกรรม
export function deleteActivityInStore(activityId: string): SyncEvent {
  const state = loadOrInitState();
  state.activities = state.activities.filter((a) => a.id !== activityId);
  return broadcastEvent('DELETE_ACTIVITY', { activityId });
}

// 4. เพิ่มนักศึกษารายคน
export function addStudentInStore(student: Student): SyncEvent {
  const state = loadOrInitState();
  state.students = [student, ...state.students.filter((s) => s.studentId !== student.studentId)];
  return broadcastEvent('ADD_STUDENT', { student });
}

// 5. นำเข้านักศึกษาผ่าน Excel
export function importStudentsInStore(newStudents: Student[]): SyncEvent {
  const state = loadOrInitState();
  const studentMap = new Map<string, Student>();
  state.students.forEach((s) => studentMap.set(s.studentId, s));
  newStudents.forEach((s) => studentMap.set(s.studentId, s));
  state.students = Array.from(studentMap.values());

  return broadcastEvent('IMPORT_STUDENTS', { count: newStudents.length, students: newStudents });
}

// 6. ลบข้อมูลนักศึกษา
export function deleteStudentInStore(studentId: string): SyncEvent {
  const state = loadOrInitState();
  state.students = state.students.filter((s) => s.studentId !== studentId);
  delete state.studentStatusMap[studentId];
  return broadcastEvent('DELETE_STUDENT', { studentId });
}

// 7. เปลี่ยนสถานะนักศึกษา (ACTIVE, GRADUATED, WITHDRAWN)
export function updateStudentStatusInStore(studentId: string, status: StudentStatus): SyncEvent {
  const state = loadOrInitState();
  state.studentStatusMap[studentId] = status;
  return broadcastEvent('UPDATE_STUDENT_STATUS', { studentId, status });
}

// 8. อัปเดตการตั้งค่าระบบ (เกณฑ์ชั่วโมงกิจกรรมขั้นต่ำ หรือ รหัส PIN)
export function updateSettingsInStore(settings: Partial<SystemSettings>): SyncEvent {
  const state = loadOrInitState();
  const updatedSettings = { ...state.settings };

  if (settings.requiredHours !== undefined && settings.requiredHours !== null) {
    const cleanHours = Number(settings.requiredHours);
    if (!isNaN(cleanHours) && cleanHours > 0) {
      updatedSettings.requiredHours = cleanHours;
    }
  }

  if (settings.superAdminPin) {
    updatedSettings.superAdminPin = String(settings.superAdminPin).trim();
  }

  if (settings.staffScannerPin) {
    updatedSettings.staffScannerPin = String(settings.staffScannerPin).trim();
  }

  state.settings = updatedSettings;
  return broadcastEvent('UPDATE_SETTINGS', { settings: state.settings });
}
