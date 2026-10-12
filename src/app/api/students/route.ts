import { NextResponse } from 'next/server';
import { getStudents, getActivities, getAttendanceRecords } from '@/lib/googleSheets';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');

  const [students, activities, records] = await Promise.all([
    getStudents(),
    getActivities(),
    getAttendanceRecords(),
  ]);

  if (studentId) {
    const student = students.find((s) => s.studentId === studentId);
    if (!student) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลนักศึกษารหัสนี้' }, { status: 404 });
    }

    const studentRecords = records.filter((r) => r.studentId === studentId);
    const totalHours = studentRecords.reduce((sum, r) => sum + r.hoursEarned, 0);

    const hoursByCategory: Record<string, number> = {
      'มหาวิทยาลัย': 0,
      'คณะ/สาขา': 0,
      'บำเพ็ญประโยชน์/จิตอาสา': 0,
      'ส่งเสริมวิชาการ/วิชาชีพ': 0,
    };

    studentRecords.forEach((r) => {
      if (hoursByCategory[r.category] !== undefined) {
        hoursByCategory[r.category] += r.hoursEarned;
      } else {
        hoursByCategory[r.category] = r.hoursEarned;
      }
    });

    return NextResponse.json({
      student,
      totalHours,
      hoursByCategory,
      records: studentRecords,
    });
  }

  return NextResponse.json({
    students,
    activities,
    records,
  });
}
