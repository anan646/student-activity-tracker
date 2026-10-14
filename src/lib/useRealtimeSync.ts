'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { SyncEvent, ServerStoreState } from '@/lib/serverStore';
import { playSuccessBeep } from '@/lib/audioFeedback';

export interface UseRealtimeSyncOptions {
  enabled?: boolean;
  onEvent?: (event: SyncEvent) => void;
  onStateUpdate?: (state: ServerStoreState) => void;
  pollIntervalMs?: number;
}

export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const { enabled = true, onEvent, onStateUpdate, pollIntervalMs = 4000 } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const versionRef = useRef<number>(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleIncomingEvent = useCallback(
    (event: SyncEvent) => {
      versionRef.current = Math.max(versionRef.current, event.version);
      setLastSyncTime(new Date());

      if (onEvent) {
        onEvent(event);
      }
    },
    [onEvent]
  );

  // 1. Establish Server-Sent Events (SSE) connection
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let isSubscribed = true;

    function connectSSE() {
      try {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        const es = new EventSource('/api/sync?stream=true');
        eventSourceRef.current = es;

        es.onopen = () => {
          if (isSubscribed) {
            setIsConnected(true);
            setLastSyncTime(new Date());
          }
        };

        es.onmessage = (e) => {
          if (!isSubscribed) return;
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'INITIAL_STATE') {
              versionRef.current = data.version;
              if (onStateUpdate && data.state) {
                onStateUpdate(data.state);
              }
            } else if (data.type && data.version) {
              handleIncomingEvent(data as SyncEvent);
            }
          } catch (err) {
            console.warn('Failed to parse SSE payload:', err);
          }
        };

        es.onerror = () => {
          if (isSubscribed) {
            setIsConnected(false);
            es.close();
            // ลองเชื่อมต่อใหม่หลังจาก 3 วินาที
            setTimeout(() => {
              if (isSubscribed) connectSSE();
            }, 3000);
          }
        };
      } catch (err) {
        console.error('SSE initialization error:', err);
      }
    }

    connectSSE();

    return () => {
      isSubscribed = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [enabled, handleIncomingEvent, onStateUpdate]);

  // 2. High-speed Fallback Polling (สำรองข้อมูลกรณีหลุดการเชื่อมต่อ หรืออุปกรณ์พับหน้าจอ)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sync?sinceVersion=${versionRef.current}`);
        if (!res.ok) return;

        const data = await res.json();
        setIsConnected(true);

        if (!data.upToDate && data.state) {
          versionRef.current = data.version;
          setLastSyncTime(new Date());
          if (onStateUpdate) {
            onStateUpdate(data.state);
          }
        }
      } catch (err) {
        // เงียบไว้เพื่อไม่รบกวน console ระหว่าง offline
      }
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [enabled, onStateUpdate, pollIntervalMs]);

  return {
    isConnected,
    lastSyncTime,
    version: versionRef.current,
  };
}

// -------------------------------------------------------------------
// Hook สำหรับฝั่งนักศึกษาโดยเฉพาะ (ตรวจจับชั่วโมงที่เพิ่มขึ้นแบบเรียลไทม์)
// -------------------------------------------------------------------
export function useStudentRealtimeSync(
  studentId: string | undefined,
  onNewHoursEarned?: (activityTitle: string, hours: number) => void,
  onRefreshNeeded?: () => void
) {
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [notification, setNotification] = useState<{ title: string; hours: number } | null>(null);

  useRealtimeSync({
    enabled: !!studentId,
    pollIntervalMs: 5000,
    onEvent: (event: SyncEvent) => {
      setIsLiveConnected(true);

      // ตรวจสอบว่ามีการบันทึกกิจกรรม หรือเทียบโอนชั่วโมงให้นักศึกษาคนนี้หรือไม่
      if (event.type === 'RECORD_ATTENDANCE' || event.type === 'MANUAL_GRANT_CREDIT') {
        const records = event.payload?.records;
        if (Array.isArray(records)) {
          const match = records.find((r: any) => String(r.studentId).trim() === String(studentId).trim());
          if (match) {
            playSuccessBeep();
            setNotification({
              title: match.activityTitle,
              hours: match.hoursEarned,
            });

            if (onNewHoursEarned) {
              onNewHoursEarned(match.activityTitle, match.hoursEarned);
            }
            if (onRefreshNeeded) {
              onRefreshNeeded();
            }
          }
        }
      } else if (event.type === 'UPDATE_SETTINGS' || event.type === 'DELETE_ACTIVITY') {
        if (onRefreshNeeded) {
          onRefreshNeeded();
        }
      }
    },
    onStateUpdate: () => {
      setIsLiveConnected(true);
      if (onRefreshNeeded) {
        onRefreshNeeded();
      }
    },
  });

  return {
    isLiveConnected,
    notification,
    clearNotification: () => setNotification(null),
  };
}
