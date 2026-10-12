import { NextResponse } from 'next/server';
import { getStudents, getAttendanceRecords } from '@/lib/googleSheets';
import { exportStudentTranscript, exportSummaryReport } from '@/lib/exportExcel';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'student' | 'year' | 'major' | 'all'
  const studentId = searchParams.get('studentId');
  const yearLevel = searchParams.get('yearLevel');
  const major = searchParams.get('major');

  const [students, records] = await Promise.all([
    getStudents(),
    getAttendanceRecords(),
  ]);

  if (type === 'student' && studentId) {
    const student = students.find((s) => s.studentId === studentId);
    if (!student) {
      return NextResponse.json({ error: 'ไม่พบนักศึกษา' }, { status: 404 });
    }
    const studentRecords = records.filter((r) => r.studentId === studentId);
    const buffer = exportStudentTranscript(student, studentRecords);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="activity_transcript_${studentId}.xlsx"`,
      },
    });
  }

  let filteredStudents = [...students];
  let reportTitle = 'รายงานสรุปผลการเข้าร่วมกิจกรรมพัฒนานักศึกษาทั้งหมด';

  if (type === 'year' && yearLevel) {
    filteredStudents = filteredStudents.filter((s) => String(s.yearLevel) === String(yearLevel));
    reportTitle = `รายงานสรุปผลการเข้าร่วมกิจกรรมพัฒนานักศึกษา ชั้นปีที่ ${yearLevel}`;
  } else if (type === 'major' && major) {
    filteredStudents = filteredStudents.filter((s) => s.major === major);
    reportTitle = `รายงานสรุปผลการเข้าร่วมกิจกรรมพัฒนานักศึกษา สาขาวิชา ${major}`;
  }

  const buffer = exportSummaryReport(filteredStudents, records, reportTitle);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="activity_summary_report.xlsx"`,
    },
  });
}
