import { NextRequest, NextResponse } from 'next/server';
import {
  getServerStore,
  subscribeToStore,
  recordAttendanceInStore,
  createActivityInStore,
  deleteActivityInStore,
  addStudentInStore,
  importStudentsInStore,
  deleteStudentInStore,
  updateStudentStatusInStore,
  updateSettingsInStore,
  SyncEvent,
} from '@/lib/serverStore';
import { recordAttendance as syncAppsScriptAttendance, createActivity as syncAppsScriptCreateActivity, deleteActivity as syncAppsScriptDeleteActivity } from '@/lib/googleSheets';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isStream = searchParams.get('stream') === 'true';
  const sinceVersion = parseInt(searchParams.get('sinceVersion') || '0', 10);
  const store = getServerStore();

  // 1. Real-time Server-Sent Events (SSE) Push
  if (isStream) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        // ส่งข้อความยืนยันการเชื่อมต่อเริ่มต้นพร้อมเวอร์ชันล่าสุด
        const initData = `data: ${JSON.stringify({
          type: 'INITIAL_STATE',
          version: store.version,
          timestamp: store.lastUpdated,
          state: store,
        })}\n\n`;
        controller.enqueue(encoder.encode(initData));

        // สมัครรับ Event เมื่อเกิดการเปลี่ยนแปลงจากอุปกรณ์ใดๆ
        const unsubscribe = subscribeToStore((event: SyncEvent) => {
          try {
            const payload = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(payload));
          } catch (e) {
            console.error('SSE enqueue error:', e);
          }
        });

        // ส่ง Heartbeat Ping ทุก 15 วินาที เพื่อรักษาการเชื่อมต่อ
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch (e) {
            clearInterval(heartbeatInterval);
            unsubscribe();
          }
        }, 15000);

        req.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval);
          unsubscribe();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };

  // 2. High-speed Delta / Polling Check
  if (sinceVersion > 0 && sinceVersion === store.version) {
    return NextResponse.json({
      upToDate: true,
      version: store.version,
      lastUpdated: store.lastUpdated,
    }, { headers: noCacheHeaders });
  }

  return NextResponse.json({
    upToDate: false,
    version: store.version,
    lastUpdated: store.lastUpdated,
    state: store,
  }, { headers: noCacheHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'ไม่ระบุ action' }, { status: 400 });
    }

    let event: SyncEvent | null = null;

    switch (action) {
      case 'record_attendance': {
        const { records, studentIds, activity, checkInType, documentRef } = body;
        let recordsToSave = records;

        if (!recordsToSave && studentIds && activity) {
          recordsToSave = studentIds.map((sid: string) => ({
            id: `REC-${activity.id}-${sid}-${Date.now().toString().slice(-4)}`,
            studentId: sid,
            activityId: activity.id,
            activityTitle: activity.title,
            category: activity.category || 'คณะ',
            hoursEarned: Number(activity.hours || 0),
            dateRecorded: new Date().toLocaleString('th-TH'),
            status: 'APPROVED',
            checkInType: checkInType || 'SINGLE',
            documentRef: documentRef || undefined,
          }));
        }

        if (!recordsToSave || !Array.isArray(recordsToSave) || recordsToSave.length === 0) {
          return NextResponse.json({ error: 'ไม่มีข้อมูลบันทึกกิจกรรม' }, { status: 400 });
        }

        event = recordAttendanceInStore(recordsToSave);

        // Async Background Sync ไปยัง Google Sheets
        if (studentIds && activity) {
          syncAppsScriptAttendance(studentIds, activity).catch((e) =>
            console.warn('Background Sheets sync note:', e)
          );
        }
        break;
      }

      case 'manual_grant': {
        const { record } = body;
        if (!record || !record.studentId) {
          return NextResponse.json({ error: 'ข้อมูลเทียบโอนไม่ถูกต้อง' }, { status: 400 });
        }
        event = recordAttendanceInStore([record]);
        break;
      }

      case 'create_activity': {
        const { activity } = body;
        if (!activity || !activity.title) {
          return NextResponse.json({ error: 'ข้อมูลกิจกรรมไม่สมบูรณ์' }, { status: 400 });
        }
        event = createActivityInStore(activity);
        syncAppsScriptCreateActivity(activity).catch((e) =>
          console.warn('Background Sheets sync note:', e)
        );
        break;
      }

      case 'delete_activity': {
        const { activityId } = body;
        if (!activityId) {
          return NextResponse.json({ error: 'ไม่ระบุรหัสกิจกรรม' }, { status: 400 });
        }
        event = deleteActivityInStore(activityId);
        syncAppsScriptDeleteActivity(activityId).catch((e) =>
          console.warn('Background Sheets sync note:', e)
        );
        break;
      }

      case 'add_student': {
        const { student } = body;
        if (!student || !student.studentId) {
          return NextResponse.json({ error: 'ข้อมูลนักศึกษาไม่สมบูรณ์' }, { status: 400 });
        }
        event = addStudentInStore(student);
        break;
      }

      case 'import_students': {
        const { students } = body;
        if (!students || !Array.isArray(students)) {
          return NextResponse.json({ error: 'ข้อมูลนักศึกษาไม่ถูกต้อง' }, { status: 400 });
        }
        event = importStudentsInStore(students);
        break;
      }

      case 'delete_student': {
        const { studentId } = body;
        if (!studentId) {
          return NextResponse.json({ error: 'ไม่ระบุรหัสนักศึกษา' }, { status: 400 });
        }
        event = deleteStudentInStore(studentId);
        break;
      }

      case 'update_student_status': {
        const { studentId, status } = body;
        if (!studentId || !status) {
          return NextResponse.json({ error: 'ข้อมูลสถานะไม่ถูกต้อง' }, { status: 400 });
        }
        event = updateStudentStatusInStore(studentId, status);
        break;
      }

      case 'update_settings': {
        const { settings } = body;
        if (!settings) {
          return NextResponse.json({ error: 'ข้อมูลตั้งค่าไม่ถูกต้อง' }, { status: 400 });
        }
        event = updateSettingsInStore(settings);
        break;
      }

      default:
        return NextResponse.json({ error: `ไม่รู้จัก action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      event,
      version: getServerStore().version,
    });
  } catch (error) {
    console.error('Error in /api/sync POST:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการประมวลผล' }, { status: 500 });
  }
}
