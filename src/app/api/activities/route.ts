import { NextResponse } from 'next/server';
import { getActivities, createActivity, deleteActivity, recordAttendance } from '@/lib/googleSheets';

export async function GET() {
  const activities = await getActivities();
  return NextResponse.json(activities);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create_activity') {
      const { title, category, activityType, hours, date, academicYear, location, description, capacity, checkInMode } = body;
      const newActivity = {
        id: body.id || `ACT-${Date.now().toString().slice(-4)}`,
        title,
        category: category || 'คณะ',
        activityType: activityType || 'เลือก',
        hours: Number(hours),
        date,
        academicYear: academicYear || '2569',
        location: location || 'คณะศึกษาศาสตร์ ม.ฟาฏอนี',
        description,
        capacity: capacity ? Number(capacity) : undefined,
        checkInMode: checkInMode || 'SINGLE',
      };

      const success = await createActivity(newActivity);
      if (!success) {
        return NextResponse.json({ error: 'ไม่สามารถบันทึกกิจกรรมได้' }, { status: 500 });
      }
      return NextResponse.json({ success: true, activity: newActivity });
    }

    if (action === 'delete_activity') {
      const { activityId } = body;
      if (!activityId) {
        return NextResponse.json({ error: 'ไม่ระบุรหัสกิจกรรมที่ต้องการลบ' }, { status: 400 });
      }
      const success = await deleteActivity(activityId);
      return NextResponse.json({ success, activityId });
    }

    if (action === 'record_attendance') {
      const { studentIds, activity, checkInType } = body;
      if (!studentIds || !Array.isArray(studentIds) || !activity) {
        return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
      }

      const result = await recordAttendance(studentIds, activity);
      return NextResponse.json({ ...result, checkInType: checkInType || 'SINGLE' });
    }

    return NextResponse.json({ error: 'ไม่พบคำสั่ง action ที่ระบุ' }, { status: 400 });
  } catch (error) {
    console.error('API activities error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500 });
  }
}
