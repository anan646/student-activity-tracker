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
  const { enabled = true, onEvent, onStateUpdate, pollIntervalMs = 3500 } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const versionRef = useRef<number>(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store callbacks in refs to prevent tear-down/reconnect on every parent re-render
  const onEventRef = useRef(onEvent);
  const onStateUpdateRef = useRef(onStateUpdate);

  useEffect(() => {
    onEventRef.current = onEvent;
    onStateUpdateRef.current = onStateUpdate;
  });

  const handleIncomingEvent = useCallback((event: SyncEvent) => {
    versionRef.current = Math.max(versionRef.current, event.version);
    setLastSyncTime(new Date());

    if (onEventRef.current) {
      onEventRef.current(event);
    }
  }, []);

  // 1. Establish Server-Sent Events (SSE) connection
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let isSubscribed = true;

    function connectSSE() {
      if (!isSubscribed) return;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

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
              if (onStateUpdateRef.current && data.state) {
                onStateUpdateRef.current(data.state);
              }
            } else if (data.type && data.version) {
              handleIncomingEvent(data as SyncEvent);
            }
          } catch (err) {
            console.warn('Failed to parse SSE payload:', err);
          }
        };

        es.onerror = () => {
          if (!isSubscribed) return;
          setIsConnected(false);
          try {
            es.close();
          } catch (e) {}

          // Auto-reconnect after 3 seconds
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isSubscribed) connectSSE();
          }, 3000);
        };
      } catch (err) {
        console.error('SSE initialization error:', err);
      }
    }

    connectSSE();

    return () => {
      isSubscribed = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [enabled, handleIncomingEvent]);

  // 2. High-speed Fallback Polling (Ensures real-time sync when offline, behind university proxy, or on sleeping mobile devices)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sync?sinceVersion=${versionRef.current}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        });
        if (!res.ok) return;

        const data = await res.json();
        setIsConnected(true);

        if (!data.upToDate && data.state) {
          versionRef.current = data.version;
          setLastSyncTime(new Date());
          if (onStateUpdateRef.current) {
            onStateUpdateRef.current(data.state);
          }
        }
      } catch (err) {
        // Silent during offline transitions
      }
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [enabled, pollIntervalMs]);

  // 3. Mobile PWA Sleep/Wake & Tab Focus Listener: Instantly resync when returning to app
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const triggerImmediateSync = async () => {
      if (document.visibilityState === 'visible') {
        // Re-check SSE connection
        if (
          !eventSourceRef.current ||
          eventSourceRef.current.readyState === EventSource.CLOSED
        ) {
          try {
            if (eventSourceRef.current) eventSourceRef.current.close();
            const es = new EventSource('/api/sync?stream=true');
            eventSourceRef.current = es;
          } catch (e) {}
        }

        // Trigger immediate delta sync
        try {
          const res = await fetch(`/api/sync?sinceVersion=${versionRef.current}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
          });
          if (res.ok) {
            const data = await res.json();
            setIsConnected(true);
            if (!data.upToDate && data.state) {
              versionRef.current = data.version;
              setLastSyncTime(new Date());
              if (onStateUpdateRef.current) {
                onStateUpdateRef.current(data.state);
              }
            }
          }
        } catch (e) {}
      }
    };

    document.addEventListener('visibilitychange', triggerImmediateSync);
    window.addEventListener('focus', triggerImmediateSync);

    return () => {
      document.removeEventListener('visibilitychange', triggerImmediateSync);
      window.removeEventListener('focus', triggerImmediateSync);
    };
  }, [enabled]);

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

  const onNewHoursEarnedRef = useRef(onNewHoursEarned);
  const onRefreshNeededRef = useRef(onRefreshNeeded);

  useEffect(() => {
    onNewHoursEarnedRef.current = onNewHoursEarned;
    onRefreshNeededRef.current = onRefreshNeeded;
  });

  const handleRealtimeEvent = useCallback(
    (event: SyncEvent) => {
      setIsLiveConnected(true);

      // ตรวจสอบว่ามีการบันทึกกิจกรรม หรือเทียบโอนชั่วโมงให้นักศึกษาคนนี้หรือไม่
      if (event.type === 'RECORD_ATTENDANCE' || event.type === 'MANUAL_GRANT_CREDIT') {
        const records = event.payload?.records;
        if (Array.isArray(records)) {
          const match = records.find(
            (r: any) => String(r.studentId).trim() === String(studentId).trim()
          );
          if (match) {
            playSuccessBeep();
            setNotification({
              title: match.activityTitle,
              hours: match.hoursEarned,
            });

            if (onNewHoursEarnedRef.current) {
              onNewHoursEarnedRef.current(match.activityTitle, match.hoursEarned);
            }
            if (onRefreshNeededRef.current) {
              onRefreshNeededRef.current();
            }
          }
        }
      } else if (
        event.type === 'UPDATE_SETTINGS' ||
        event.type === 'DELETE_ACTIVITY' ||
        event.type === 'CREATE_ACTIVITY'
      ) {
        if (onRefreshNeededRef.current) {
          onRefreshNeededRef.current();
        }
      }
    },
    [studentId]
  );

  const handleRealtimeStateUpdate = useCallback(() => {
    setIsLiveConnected(true);
    if (onRefreshNeededRef.current) {
      onRefreshNeededRef.current();
    }
  }, []);

  useRealtimeSync({
    enabled: !!studentId,
    pollIntervalMs: 4000,
    onEvent: handleRealtimeEvent,
    onStateUpdate: handleRealtimeStateUpdate,
  });

  return {
    isLiveConnected,
    notification,
    clearNotification: () => setNotification(null),
  };
}
