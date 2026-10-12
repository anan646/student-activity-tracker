import { google } from 'googleapis';
import { Student, Activity, AttendanceRecord } from '@/types';

// Mock data กรณีที่ยังไม่ได้ตั้งค่า Google Sheets Credentials
const MOCK_STUDENTS: Student[] = [
  { studentId: '6601001', name: 'สมชาย มุ่งมั่น', major: 'วิทยาการคอมพิวเตอร์', academicYear: '2566', yearLevel: 2 },
  { studentId: '6601002', name: 'สมหญิง รักเรียน', major: 'วิทยาการคอมพิวเตอร์', academicYear: '2566', yearLevel: 2 },
  { studentId: '6601003', name: 'วีระ ชาญฉลาด', major: 'เทคโนโลยีสารสนเทศ', academicYear: '2566', yearLevel: 2 },
  { studentId: '6701001', name: 'กานดา ใจดี', major: 'วิทยาการคอมพิวเตอร์', academicYear: '2567', yearLevel: 1 },
  { studentId: '6701002', name: 'ธนากร สว่างวงศ์', major: 'เทคโนโลยีสารสนเทศ', academicYear: '2567', yearLevel: 1 },
];

const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'ACT-001',
    title: 'ปฐมนิเทศนักศึกษาใหม่ ประจำปีการศึกษา 2567',
    category: 'มหาวิทยาลัย',
    hours: 6,
    date: '2024-06-15',
    academicYear: '2567',
    location: 'หอประชุมใหญ่',
    description: 'กิจกรรมต้อนรับและชี้แจงแนวทางการศึกษาแก่นักศึกษาใหม่',
  },
  {
    id: 'ACT-002',
    title: 'อบรมสัมมนาเทคโนโลยี AI กับโลกยุคใหม่',
    category: 'ส่งเสริมวิชาการ/วิชาชีพ',
    hours: 3,
    date: '2024-07-20',
    academicYear: '2567',
    location: 'ห้องประชุม IT 301',
    description: 'เรียนรู้แนวโน้มเทคโนโลยีปัญญาประดิษฐ์และการประยุกต์ใช้',
  },
  {
    id: 'ACT-003',
    title: 'จิตอาสาพัฒนาสิ่งแวดล้อมชุมชนรอบสถาบัน',
    category: 'บำเพ็ญประโยชน์/จิตอาสา',
    hours: 4,
    date: '2024-08-10',
    academicYear: '2567',
    location: 'ชุมชนหน้ามหาวิทยาลัย',
    description: 'ร่วมกันปลูกต้นไม้และเก็บขยะเพื่อรักษาสิ่งแวดล้อม',
  },
  {
    id: 'ACT-004',
    title: 'กิจกรรมสานสัมพันธ์พี่น้องสาขา CS/IT',
    category: 'คณะ/สาขา',
    hours: 3,
    date: '2024-09-05',
    academicYear: '2567',
    location: 'ลานกิจกรรมคณะ',
    description: 'สร้างความสามัคคีระหว่างรุ่นพี่และรุ่นน้องในสาขา',
  },
];

const MOCK_RECORDS: AttendanceRecord[] = [
  {
    id: 'REC-1',
    studentId: '6601001',
    activityId: 'ACT-002',
    activityTitle: 'อบรมสัมมนาเทคโนโลยี AI กับโลกยุคใหม่',
    category: 'ส่งเสริมวิชาการ/วิชาชีพ',
    hoursEarned: 3,
    dateRecorded: '2024-07-20',
    status: 'APPROVED',
  },
  {
    id: 'REC-2',
    studentId: '6601001',
    activityId: 'ACT-003',
    activityTitle: 'จิตอาสาพัฒนาสิ่งแวดล้อมชุมชนรอบสถาบัน',
    category: 'บำเพ็ญประโยชน์/จิตอาสา',
    hoursEarned: 4,
    dateRecorded: '2024-08-10',
    status: 'APPROVED',
  },
  {
    id: 'REC-3',
    studentId: '6701001',
    activityId: 'ACT-001',
    activityTitle: 'ปฐมนิเทศนักศึกษาใหม่ ประจำปีการศึกษา 2567',
    category: 'มหาวิทยาลัย',
    hoursEarned: 6,
    dateRecorded: '2024-06-15',
    status: 'APPROVED',
  },
  {
    id: 'REC-4',
    studentId: '6701001',
    activityId: 'ACT-003',
    activityTitle: 'จิตอาสาพัฒนาสิ่งแวดล้อมชุมชนรอบสถาบัน',
    category: 'บำเพ็ญประโยชน์/จิตอาสา',
    hoursEarned: 4,
    dateRecorded: '2024-08-10',
    status: 'APPROVED',
  },
];

function getGoogleSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !sheetId) {
    return null;
  }

  // รองรับ newlines ใน private key ทั้งแบบ escape \n และ multiline
  privateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, sheetId };
}

// 1. ดึงข้อมูลนักศึกษา
export async function getStudents(): Promise<Student[]> {
  const gClient = getGoogleSheetsClient();
  if (!gClient) return MOCK_STUDENTS;

  try {
    const res = await gClient.sheets.spreadsheets.values.get({
      spreadsheetId: gClient.sheetId,
      range: 'Students!A2:E', // A: StudentID, B: Name, C: Major, D: AcademicYear, E: YearLevel
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) return MOCK_STUDENTS;

    return rows.map((row) => ({
      studentId: String(row[0] || '').trim(),
      name: String(row[1] || '').trim(),
      major: String(row[2] || '').trim(),
      academicYear: String(row[3] || '').trim(),
      yearLevel: Number(row[4] || 1),
    }));
  } catch (err) {
    console.error('Error fetching students from Google Sheet, using mock fallback:', err);
    return MOCK_STUDENTS;
  }
}

// 2. ดึงข้อมูลกิจกรรม
export async function getActivities(): Promise<Activity[]> {
  const gClient = getGoogleSheetsClient();
  if (!gClient) return MOCK_ACTIVITIES;

  try {
    const res = await gClient.sheets.spreadsheets.values.get({
      spreadsheetId: gClient.sheetId,
      range: 'Activities!A2:G', // A: ID, B: Title, C: Category, D: Hours, E: Date, F: AcademicYear, G: Location
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) return MOCK_ACTIVITIES;

    return rows.map((row) => ({
      id: String(row[0] || '').trim(),
      title: String(row[1] || '').trim(),
      category: (row[2] || 'มหาวิทยาลัย') as Activity['category'],
      hours: Number(row[3] || 0),
      date: String(row[4] || '').trim(),
      academicYear: String(row[5] || '').trim(),
      location: String(row[6] || '').trim(),
    }));
  } catch (err) {
    console.error('Error fetching activities from Google Sheet, using mock fallback:', err);
    return MOCK_ACTIVITIES;
  }
}

// 3. ดึงประวัติการเข้าร่วมกิจกรรม
export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  const gClient = getGoogleSheetsClient();
  if (!gClient) return MOCK_RECORDS;

  try {
    const res = await gClient.sheets.spreadsheets.values.get({
      spreadsheetId: gClient.sheetId,
      range: 'Attendance!A2:H', // A: ID, B: StudentID, C: ActivityID, D: ActivityTitle, E: Category, F: HoursEarned, G: DateRecorded, H: Status
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) return MOCK_RECORDS;

    return rows.map((row) => ({
      id: String(row[0] || '').trim(),
      studentId: String(row[1] || '').trim(),
      activityId: String(row[2] || '').trim(),
      activityTitle: String(row[3] || '').trim(),
      category: String(row[4] || '').trim(),
      hoursEarned: Number(row[5] || 0),
      dateRecorded: String(row[6] || '').trim(),
      status: (row[7] || 'APPROVED') as AttendanceRecord['status'],
    }));
  } catch (err) {
    console.error('Error fetching attendance from Google Sheet, using mock fallback:', err);
    return MOCK_RECORDS;
  }
}

// 4. บันทึกกิจกรรมใหม่
export async function createActivity(activity: Activity): Promise<boolean> {
  const gClient = getGoogleSheetsClient();
  if (!gClient) {
    MOCK_ACTIVITIES.unshift(activity);
    return true;
  }

  try {
    await gClient.sheets.spreadsheets.values.append({
      spreadsheetId: gClient.sheetId,
      range: 'Activities!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            activity.id,
            activity.title,
            activity.category,
            activity.hours,
            activity.date,
            activity.academicYear,
            activity.location,
          ],
        ],
      },
    });
    return true;
  } catch (err) {
    console.error('Error saving activity to Google Sheet:', err);
    return false;
  }
}

// 5. บันทึกการเข้าร่วมกิจกรรม (Attendance Check-in)
export async function recordAttendance(
  studentIds: string[],
  activity: Activity
): Promise<{ successCount: number; failed: string[] }> {
  const gClient = getGoogleSheetsClient();
  const dateRecorded = new Date().toISOString().split('T')[0];

  const newRecords: AttendanceRecord[] = studentIds.map((sid, idx) => ({
    id: `REC-${Date.now()}-${idx}`,
    studentId: sid,
    activityId: activity.id,
    activityTitle: activity.title,
    category: activity.category,
    hoursEarned: activity.hours,
    dateRecorded,
    status: 'APPROVED',
  }));

  if (!gClient) {
    MOCK_RECORDS.push(...newRecords);
    return { successCount: newRecords.length, failed: [] };
  }

  try {
    const rows = newRecords.map((r) => [
      r.id,
      r.studentId,
      r.activityId,
      r.activityTitle,
      r.category,
      r.hoursEarned,
      r.dateRecorded,
      r.status,
    ]);

    await gClient.sheets.spreadsheets.values.append({
      spreadsheetId: gClient.sheetId,
      range: 'Attendance!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });

    return { successCount: newRecords.length, failed: [] };
  } catch (err) {
    console.error('Error recording attendance to Google Sheet:', err);
    return { successCount: 0, failed: studentIds };
  }
}
