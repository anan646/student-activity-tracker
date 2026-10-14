import { NextResponse } from 'next/server';
import {
  getServerStore,
  createActivityInStore,
  deleteActivityInStore,
  recordAttendanceInStore,
} from '@/lib/serverStore';
import {
  createActivity as syncAppsScriptCreateActivity,
  deleteActivity as syncAppsScriptDeleteActivity,
  recordAttendance as syncAppsScriptAttendance,
} from '@/lib/googleSheets';

export async function GET() {
  const store = getServerStore();
  return NextResponse.json(store.activities);
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

      createActivityInStore(newActivity);

      // Async background sync to Google Apps Script
      syncAppsScriptCreateActivity(newActivity).catch((e) =>
        console.warn('Background Sheets create note:', e)
      );

      return NextResponse.json({ success: true, activity: newActivity });
    }

    if (action === 'delete_activity') {
      const { activityId } = body;
      if (!activityId) {
        return NextResponse.json({ error: 'ไม่ระบุรหัสกิจกรรมที่ต้องการลบ' }, { status: 400 });
      }

      deleteActivityInStore(activityId);

      syncAppsScriptDeleteActivity(activityId).catch((e) =>
        console.warn('Background Sheets delete note:', e)
      );

      return NextResponse.json({ success: true, activityId });
    }

    if (action === 'record_attendance') {
      const { studentIds, activity, checkInType, documentRef } = body;
      if (!studentIds || !Array.isArray(studentIds) || !activity) {
        return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
      }

      const newRecords = studentIds.map((sid: string) => ({
        id: `REC-${activity.id}-${sid}-${Date.now().toString().slice(-4)}`,
        studentId: sid,
        activityId: activity.id,
        activityTitle: activity.title,
        category: activity.category || 'คณะ',
        hoursEarned: Number(activity.hours || 0),
        dateRecorded: new Date().toLocaleString('th-TH'),
        status: 'APPROVED' as const,
        checkInType: checkInType || 'SINGLE',
        documentRef: documentRef || undefined,
      }));

      recordAttendanceInStore(newRecords);

      syncAppsScriptAttendance(studentIds, activity).catch((e) =>
        console.warn('Background Sheets attendance note:', e)
      );

      return NextResponse.json({
        successCount: studentIds.length,
        failed: [],
        checkInType: checkInType || 'SINGLE',
      });
    }

    return NextResponse.json({ error: 'ไม่พบคำสั่ง action ที่ระบุ' }, { status: 400 });
  } catch (error) {
    console.error('API activities error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500 });
  }
}
