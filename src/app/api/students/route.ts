import { NextResponse } from 'next/server';
import { getServerStore } from '@/lib/serverStore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const store = getServerStore();

  const { students, activities, records, studentStatusMap, settings } = store;

  if (studentId) {
    const student = students.find((s) => s.studentId === studentId);
    if (!student) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลนักศึกษารหัสนี้' }, { status: 404 });
    }

    const studentRecords = records.filter((r) => r.studentId === studentId);
    const totalHours = studentRecords.reduce((sum, r) => sum + r.hoursEarned, 0);

    const hoursByCategory: Record<string, number> = {
      'คณะ': 0,
      'สาขาวิชา': 0,
      'สโมสรนักศึกษา': 0,
      'จิตอาสา/บำเพ็ญประโยชน์': 0,
      'เสริมทักษะวิชาชีพ': 0,
      'มหาวิทยาลัย': 0,
      'คณะ/สาขา': 0,
    };

    studentRecords.forEach((r) => {
      const cat = r.category || 'คณะ';
      if (hoursByCategory[cat] !== undefined) {
        hoursByCategory[cat] += r.hoursEarned;
      } else {
        hoursByCategory[cat] = r.hoursEarned;
      }
    });

    const status = studentStatusMap[studentId] || student.status || 'ACTIVE';

    return NextResponse.json({
      student: {
        ...student,
        status,
      },
      totalHours,
      requiredHours: settings.requiredHours || 60,
      hoursByCategory,
      records: studentRecords,
      version: store.version,
    });
  }

  return NextResponse.json({
    students,
    activities,
    records,
    studentStatusMap,
    settings,
    version: store.version,
  });
}
