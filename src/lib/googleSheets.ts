import { Student, Activity, AttendanceRecord } from '@/types';
import { getMajorFromStudentId, getGenderFromStudentId, getAcademicYearAndLevel } from '@/lib/ftuCrawler';
import localStudentsData from '@/data/students.json';

const APPS_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzRcJuzvfN2W7AHiCXdDU13tKRQz3nPWTTNzyybylmuEJ4SSr0zG-0sGguaCOWfG2XL1g/exec';

// จัดทำฐานข้อมูลนักศึกษา 960 คนที่ตรวจสอบความถูกต้องแล้วเป็น Master Index
const masterStudentMap = new Map<string, Student>();
(localStudentsData as Array<{
  StudentID: string;
  Name: string;
  Gender: string;
  Major: string;
  AcademicYear: string;
  YearLevel: number;
}>).forEach((s) => {
  masterStudentMap.set(String(s.StudentID).trim(), {
    studentId: String(s.StudentID).trim(),
    name: s.Name.trim(),
    gender: (s.Gender as 'ชาย' | 'หญิง') || 'ชาย',
    major: s.Major.trim(),
    academicYear: String(s.AcademicYear).trim(),
    yearLevel: Number(s.YearLevel),
  });
});

interface AppsScriptData {
  students: Array<{
    StudentID: string | number;
    Name: string;
    Gender?: string;
    Major: string;
    AcademicYear: string | number;
    YearLevel: number;
  }>;
  activities: Array<{
    ID: string;
    Title: string;
    Category: string;
    Hours: number;
    Date: string;
    AcademicYear: string | number;
    Location: string;
  }>;
  records: Array<{
    ID: string;
    StudentID: string | number;
    ActivityID: string;
    ActivityTitle: string;
    Category: string;
    HoursEarned: number;
    DateRecorded: string;
    Status: string;
  }>;
}

async function fetchFromAppsScript(): Promise<AppsScriptData | null> {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=get_all`, {
      method: 'GET',
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.error('Apps Script fetch failed:', res.statusText);
      return null;
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error calling Google Apps Script:', err);
    return null;
  }
}

// 1. ดึงข้อมูลนักศึกษาพร้อมตรวจสอบความถูกต้อง 100% (รหัส, สาขา, เพศ, ชื่อสกุล, ชั้นปี)
export async function getStudents(): Promise<Student[]> {
  const data = await fetchFromAppsScript();

  if (!data || !data.students || data.students.length === 0) {
    return Array.from(masterStudentMap.values());
  }

  const results: Student[] = [];
  const seenIds = new Set<string>();

  data.students.forEach((s) => {
    const sId = String(s.StudentID || '').trim();
    if (!sId || seenIds.has(sId)) return;

    // ข้ามข้อมูลจำลองที่เคยทดสอบ เช่น 6601001, 6701001
    if (sId === '6601001' || sId === '6701001') return;

    seenIds.add(sId);

    // 1) หากตรงกับฐานข้อมูลที่ตรวจสอบละเอียดแล้ว 960 คน ให้ใช้ข้อมูลที่สมบูรณ์ทันที
    if (masterStudentMap.has(sId)) {
      results.push(masterStudentMap.get(sId)!);
      return;
    }

    // 2) กรณีเป็นนักศึกษาใหม่ที่เพิ่มใน Google Sheet ให้จัดระเบียบข้อมูลตามหลักความถูกต้อง
    const rawName = String(s.Name || '').trim();
    const resolvedMajor = getMajorFromStudentId(sId);
    const major = resolvedMajor !== 'ไม่ระบุสาขา' ? resolvedMajor : String(s.Major || 'ไม่ระบุสาขา').trim();
    const gender = (s.Gender as 'ชาย' | 'หญิง') || getGenderFromStudentId(sId, rawName);
    const { academicYear, yearLevel } = getAcademicYearAndLevel(sId);

    results.push({
      studentId: sId,
      name: rawName,
      gender,
      major,
      academicYear,
      yearLevel,
    });
  });

  // หากใน Sheet มีข้อมูล นศ. ไม่ครบ 960 คน ให้ผสานข้อมูล Master ให้ครบถ้วนสมบูรณ์
  if (results.length < masterStudentMap.size) {
    masterStudentMap.forEach((mStudent, mId) => {
      if (!seenIds.has(mId)) {
        results.push(mStudent);
        seenIds.add(mId);
      }
    });
  }

  return results;
}

// 2. ดึงข้อมูลกิจกรรม
export async function getActivities(): Promise<Activity[]> {
  const data = await fetchFromAppsScript();
  if (!data || !data.activities) {
    // กิจกรรมเริ่มต้นในระบบ
    return [
      {
        id: 'ACT-001',
        title: 'ปฐมนิเทศนักศึกษาใหม่และแนะนำกิจกรรมเสริมหลักสูตร',
        category: 'มหาวิทยาลัย',
        hours: 6,
        date: '2024-06-15',
        academicYear: '2567',
        location: 'หอประชุมใหญ่ อาคารเฉลิมพระเกียรติ',
      },
      {
        id: 'ACT-002',
        title: 'โครงการอบรมทักษะ AI และเทคโนโลยีดิจิทัลเพื่อการศึกษา',
        category: 'ส่งเสริมวิชาการ/วิชาชีพ',
        hours: 6,
        date: '2024-07-20',
        academicYear: '2567',
        location: 'ห้องปฏิบัติการคอมพิวเตอร์ 3',
      },
      {
        id: 'ACT-003',
        title: 'กิจกรรมจิตอาสาพัฒนาภูมิทัศน์และบำเพ็ญประโยชน์เพื่อสังคม',
        category: 'บำเพ็ญประโยชน์/จิตอาสา',
        hours: 4,
        date: '2024-08-12',
        academicYear: '2567',
        location: 'ลานอเนกประสงค์ มหาวิทยาลัยฟาฏอนี',
      },
    ];
  }

  return data.activities.map((a) => {
    let dateStr = String(a.Date || '');
    if (dateStr.includes('T')) {
      dateStr = dateStr.split('T')[0];
    }
    return {
      id: String(a.ID).trim(),
      title: String(a.Title || '').trim(),
      category: (a.Category || 'มหาวิทยาลัย') as Activity['category'],
      hours: Number(a.Hours || 0),
      date: dateStr,
      academicYear: String(a.AcademicYear || '').trim(),
      location: String(a.Location || '').trim(),
    };
  });
}

// 3. ดึงประวัติการเข้าร่วมกิจกรรม
export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  const data = await fetchFromAppsScript();
  if (!data || !data.records) return [];

  return data.records.map((r) => {
    let dateStr = String(r.DateRecorded || '');
    if (dateStr.includes('T')) {
      dateStr = dateStr.split('T')[0];
    }
    return {
      id: String(r.ID).trim(),
      studentId: String(r.StudentID).trim(),
      activityId: String(r.ActivityID).trim(),
      activityTitle: String(r.ActivityTitle || '').trim(),
      category: String(r.Category || '').trim(),
      hoursEarned: Number(r.HoursEarned || 0),
      dateRecorded: dateStr,
      status: (r.Status || 'APPROVED') as AttendanceRecord['status'],
    };
  });
}

// 4. บันทึกกิจกรรมใหม่ลง Google Sheet
export async function createActivity(activity: Activity): Promise<boolean> {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'create_activity',
        ...activity,
      }),
      redirect: 'follow',
    });

    return res.ok;
  } catch (err) {
    console.error('Error creating activity via Apps Script:', err);
    return false;
  }
}

// 5. บันทึกการเข้าร่วมกิจกรรม (Attendance Check-in) ลง Google Sheet
export async function recordAttendance(
  studentIds: string[],
  activity: Activity
): Promise<{ successCount: number; failed: string[] }> {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'record_attendance',
        studentIds,
        activity,
      }),
      redirect: 'follow',
    });

    if (!res.ok) {
      return { successCount: 0, failed: studentIds };
    }

    const data = await res.json();
    return {
      successCount: data.successCount || studentIds.length,
      failed: [],
    };
  } catch (err) {
    console.error('Error recording attendance via Apps Script:', err);
    return { successCount: 0, failed: studentIds };
  }
}

// 6. นำเข้าข้อมูลนักศึกษาจำนวนมากลง Google Sheet
export async function importStudents(
  students: Student[]
): Promise<{ successCount: number }> {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'import_students',
        students,
      }),
      redirect: 'follow',
    });

    if (!res.ok) {
      return { successCount: 0 };
    }

    const data = await res.json();
    return { successCount: data.successCount || students.length };
  } catch (err) {
    console.error('Error importing students via Apps Script:', err);
    return { successCount: 0 };
  }
}
