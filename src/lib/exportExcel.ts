import * as XLSX from 'xlsx';
import { Student, AttendanceRecord } from '@/types';

// สรุปข้อมูลรายบุคคล (Student Transcript)
export function exportStudentTranscript(
  student: Student,
  records: AttendanceRecord[]
) {
  const totalHours = records.reduce((sum, r) => sum + r.hoursEarned, 0);

  const data = [
    ['ใบสรุปผลการเข้าร่วมกิจกรรมพัฒนานักศึกษา (UniPass Activity Transcript)'],
    ['มหาวิทยาลัยฟาฏอนี (Fatoni University)'],
    [],
    ['รหัสนักศึกษา:', student.studentId, 'ชื่อ-นามสกุล:', student.name],
    ['เพศ:', student.gender || 'ไม่ระบุ', 'สาขาวิชา:', student.major],
    ['ชั้นปี:', `ปี ${student.yearLevel}`, 'ปีการศึกษาที่เข้า:', student.academicYear],
    ['ชั่วโมงสะสมรวม:', `${totalHours} ชั่วโมง`, 'เกณฑ์บังคับขั้นต่ำ:', '60 ชั่วโมง'],
    ['สถานะการประเมิน:', totalHours >= 60 ? 'ครบตามเกณฑ์ที่กำหนด' : `ยังไม่ครบ (ขาดอีก ${60 - totalHours} ชม.)`],
    [],
    ['ลำดับ', 'วันที่จัดกิจกรรม', 'ชื่อกิจกรรม', 'หมวดหมู่กิจกรรม', 'จำนวนชั่วโมง', 'สถานะ'],
    ...records.map((r, i) => [
      i + 1,
      r.dateRecorded,
      r.activityTitle,
      r.category,
      r.hoursEarned,
      r.status === 'APPROVED' ? 'ผ่าน/อนุมัติ' : 'รอตรวจสอบ',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ประวัติกิจกรรม');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// สรุปผลภาพรวม (รายชั้นปี / รายสาขา / ทั้งหมด)
export function exportSummaryReport(
  students: Student[],
  records: AttendanceRecord[],
  title: string
) {
  const rows = students.map((s, index) => {
    const studentRecords = records.filter((r) => r.studentId === s.studentId);
    const totalHours = studentRecords.reduce((sum, r) => sum + r.hoursEarned, 0);
    const hoursUniv = studentRecords.filter((r) => r.category === 'มหาวิทยาลัย').reduce((sum, r) => sum + r.hoursEarned, 0);
    const hoursMajor = studentRecords.filter((r) => r.category === 'คณะ/สาขา').reduce((sum, r) => sum + r.hoursEarned, 0);
    const hoursVolun = studentRecords.filter((r) => r.category === 'บำเพ็ญประโยชน์/จิตอาสา').reduce((sum, r) => sum + r.hoursEarned, 0);
    const hoursAcad = studentRecords.filter((r) => r.category === 'ส่งเสริมวิชาการ/วิชาชีพ').reduce((sum, r) => sum + r.hoursEarned, 0);

    return [
      index + 1,
      s.studentId,
      s.name,
      s.gender || 'ไม่ระบุ',
      s.major,
      `ปี ${s.yearLevel}`,
      s.academicYear,
      hoursUniv,
      hoursMajor,
      hoursVolun,
      hoursAcad,
      totalHours,
      totalHours >= 60 ? 'ครบตามเกณฑ์' : 'ยังไม่ครบ',
    ];
  });

  const header = [
    [title],
    [`วันที่ส่งออก: ${new Date().toLocaleDateString('th-TH')} | จำนวนนักศึกษา: ${students.length} คน`],
    [],
    [
      'ลำดับ',
      'รหัสนักศึกษา',
      'ชื่อ-นามสกุล',
      'เพศ',
      'สาขาวิชา',
      'ชั้นปี',
      'ปีการศึกษา',
      'หมวดมหาวิทยาลัย (ชม.)',
      'หมวดคณะ/สาขา (ชม.)',
      'หมวดจิตอาสา (ชม.)',
      'หมวดวิชาการ (ชม.)',
      'ชั่วโมงรวม (ชม.)',
      'สถานะเกณฑ์สะสม',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([...header, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'รายงานสรุปผล');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
