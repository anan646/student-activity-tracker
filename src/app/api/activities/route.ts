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

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET() {
  const store = getServerStore();
  return NextResponse.json(store.activities, { headers: NO_CACHE_HEADERS });
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

      return NextResponse.json({ success: true, activity: newActivity }, { headers: NO_CACHE_HEADERS });
    }

    if (action === 'delete_activity') {
      const { activityId } = body;
      if (!activityId) {
        return NextResponse.json({ error: 'ไม่ระบุรหัสกิจกรรมที่ต้องการลบ' }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      deleteActivityInStore(activityId);

      syncAppsScriptDeleteActivity(activityId).catch((e) =>
        console.warn('Background Sheets delete note:', e)
      );

      return NextResponse.json({ success: true, activityId }, { headers: NO_CACHE_HEADERS });
    }

    if (action === 'record_attendance') {
      const { records, studentIds, activity, checkInType, documentRef } = body;
      let recordsToSave = records;

      if (!recordsToSave && studentIds && Array.isArray(studentIds) && activity) {
        recordsToSave = studentIds.map((sid: string) => ({
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
      }

      if (!recordsToSave || !Array.isArray(recordsToSave) || recordsToSave.length === 0) {
        return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      recordAttendanceInStore(recordsToSave);

      if (studentIds && activity) {
        syncAppsScriptAttendance(studentIds, activity).catch((e) =>
          console.warn('Background Sheets attendance note:', e)
        );
      }

      return NextResponse.json({
        successCount: recordsToSave.length,
        records: recordsToSave,
        failed: [],
        checkInType: checkInType || 'SINGLE',
      }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ error: 'ไม่พบคำสั่ง action ที่ระบุ' }, { status: 400, headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('API activities error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
