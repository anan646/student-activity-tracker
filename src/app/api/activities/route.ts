import { NextResponse } from 'next/server';
import { getActivities, createActivity, recordAttendance } from '@/lib/googleSheets';

export async function GET() {
  const activities = await getActivities();
  return NextResponse.json(activities);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create_activity') {
      const { title, category, hours, date, academicYear, location, description } = body;
      const newActivity = {
        id: `ACT-${Date.now().toString().slice(-4)}`,
        title,
        category,
        hours: Number(hours),
        date,
        academicYear,
        location,
        description,
      };

      const success = await createActivity(newActivity);
      if (!success) {
        return NextResponse.json({ error: 'ไม่สามารถบันทึกกิจกรรมได้' }, { status: 500 });
      }
      return NextResponse.json({ success: true, activity: newActivity });
    }

    if (action === 'record_attendance') {
      const { studentIds, activity } = body;
      if (!studentIds || !Array.isArray(studentIds) || !activity) {
        return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
      }

      const result = await recordAttendance(studentIds, activity);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'ไม่พบคำสั่ง action ที่ระบุ' }, { status: 400 });
  } catch (error) {
    console.error('API activities error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500 });
  }
}
