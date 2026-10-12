import { NextResponse } from 'next/server';
import { fetchStudentsFromFTU } from '@/lib/ftuCrawler';
import { importStudents } from '@/lib/googleSheets';

export async function POST(request: Request) {
  try {
    const { acadYears } = await request.json(); // Array of strings เช่น ['2565', '2566', '2567', '2568']

    if (!acadYears || !Array.isArray(acadYears) || acadYears.length === 0) {
      return NextResponse.json({ error: 'กรุณาระบุปีการศึกษาที่ต้องการดึงข้อมูล' }, { status: 400 });
    }

    const allCrawledStudents = [];

    for (const year of acadYears) {
      const yearStudents = await fetchStudentsFromFTU(String(year));
      allCrawledStudents.push(...yearStudents);
    }

    // กรองรหัสนักศึกษาซ้ำ
    const uniqueStudents = Array.from(
      new Map(allCrawledStudents.map((s) => [s.studentId, s])).values()
    );

    // บันทึกลง Google Sheet
    const result = await importStudents(uniqueStudents);

    return NextResponse.json({
      success: true,
      totalCrawled: uniqueStudents.length,
      savedCount: result.successCount,
      studentsPreview: uniqueStudents.slice(0, 50),
    });
  } catch (error: unknown) {
    console.error('Error crawling FTU registrar:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงข้อมูลจากเว็บสำนักทะเบียน';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
