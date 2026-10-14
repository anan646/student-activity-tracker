const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'src', 'data', 'db.json');
const STUDENTS_PATH = path.join(__dirname, '..', 'src', 'data', 'students.json');

const DEFAULT_ACTIVITIES = [
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

const rawStudents = JSON.parse(fs.readFileSync(STUDENTS_PATH, 'utf-8'));
const students = rawStudents.map((s) => ({
  studentId: String(s.StudentID).trim(),
  name: s.Name.trim(),
  gender: s.Gender || 'ชาย',
  major: s.Major.trim(),
  academicYear: String(s.AcademicYear).trim(),
  yearLevel: Number(s.YearLevel),
  status: 'ACTIVE',
}));

const initialRecords = [];
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

const defaultState = {
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

fs.writeFileSync(DB_PATH, JSON.stringify(defaultState, null, 2), 'utf-8');
console.log('db.json generated successfully at:', DB_PATH);
