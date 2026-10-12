import { Student, Activity, AttendanceRecord } from '@/types';

const APPS_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzRcJuzvfN2W7AHiCXdDU13tKRQz3nPWTTNzyybylmuEJ4SSr0zG-0sGguaCOWfG2XL1g/exec';

interface AppsScriptData {
  students: Array<{
    StudentID: string | number;
    Name: string;
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
      next: { revalidate: 0 }, // ไม่เก็บ cache เพื่อให้อัปเดตสดจาก Google Sheets เสมอ
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

// 1. ดึงข้อมูลนักศึกษา
export async function getStudents(): Promise<Student[]> {
  const data = await fetchFromAppsScript();
  if (!data || !data.students) return [];

  return data.students.map((s) => ({
    studentId: String(s.StudentID).trim(),
    name: String(s.Name || '').trim(),
    major: String(s.Major || '').trim(),
    academicYear: String(s.AcademicYear || '').trim(),
    yearLevel: Number(s.YearLevel || 1),
  }));
}

// 2. ดึงข้อมูลกิจกรรม
export async function getActivities(): Promise<Activity[]> {
  const data = await fetchFromAppsScript();
  if (!data || !data.activities) return [];

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

