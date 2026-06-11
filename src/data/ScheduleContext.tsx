import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ScheduleData, ApiSchedule, DEFAULT_SCHEDULE, buildSchedule,
} from './schedule';
import { fetchSchedule } from './source';

const CACHE_KEY = 'schedule:api:v1';

export type SyncStatus = 'idle' | 'refreshing' | 'error';

interface ScheduleCtx {
  schedule: ScheduleData;
  status: SyncStatus;
  error: string | null;
  /** Czy dane są nieaktualne względem bieżącego roku (np. mamy 2027, dane 2026). */
  outdated: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<ScheduleCtx | null>(null);

export function useSchedule(): ScheduleCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSchedule poza ScheduleProvider');
  return c;
}

async function loadCached(): Promise<ApiSchedule | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as ApiSchedule) : null;
  } catch {
    return null;
  }
}

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const [schedule, setSchedule] = useState<ScheduleData>(DEFAULT_SCHEDULE);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const didInit = useRef(false);

  const currentYear = new Date().getFullYear();
  const outdated = currentYear > schedule.year;

  const doFetch = useCallback(async () => {
    setStatus('refreshing');
    setError(null);
    try {
      const api = await fetchSchedule();
      const built = buildSchedule(api);
      setSchedule(built);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(api));
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(
        `Nie udało się pobrać nowego harmonogramu. ${e?.message ?? ''}`.trim() +
          ' Sprawdź połączenie i spróbuj ponownie — do tego czasu pokazuję ostatnie znane dane.',
      );
    }
  }, []);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    let active = true;

    (async () => {
      // 1) załaduj nowszy harmonogram z cache, jeśli istnieje
      const cached = await loadCached();
      let active_year = DEFAULT_SCHEDULE.year;
      if (cached && cached.year >= DEFAULT_SCHEDULE.year) {
        try {
          const built = buildSchedule(cached);
          if (active) setSchedule(built);
          active_year = built.year;
        } catch {
          /* uszkodzony cache — ignorujemy */
        }
      }

      // 2) jeśli bieżący rok wykracza poza posiadane dane — dociągnij z API
      const now = new Date();
      if (now.getFullYear() > active_year) {
        await doFetch();
      }
    })();

    return () => { active = false; };
  }, [doFetch]);

  return (
    <Ctx.Provider value={{ schedule, status, error, outdated, refresh: doFetch }}>
      {children}
    </Ctx.Provider>
  );
}
