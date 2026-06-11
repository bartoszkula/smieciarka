import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ScheduleData, ApiSchedule, DEFAULT_SCHEDULE, buildSchedule,
} from './schedule';
import { fetchScheduleFor } from './source';
import { AddressSel, DEFAULT_ADDRESS } from '../config';

const CACHE_KEY = 'schedule:api:v1';
const ADDR_KEY = 'address:v1';

export type SyncStatus = 'idle' | 'refreshing' | 'error';

interface ScheduleCtx {
  schedule: ScheduleData;
  address: AddressSel;
  status: SyncStatus;
  error: string | null;
  /** Dane są nieaktualne względem bieżącego roku (np. mamy 2027, dane 2026). */
  outdated: boolean;
  /** Zmień adres i pobierz dla niego harmonogram. Zwraca true przy sukcesie. */
  changeAddress: (street: string, number: string) => Promise<boolean>;
  /** Pobierz ponownie dla bieżącego adresu. */
  refresh: () => Promise<void>;
}

const Ctx = createContext<ScheduleCtx | null>(null);

export function useSchedule(): ScheduleCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSchedule poza ScheduleProvider');
  return c;
}

async function loadJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const [schedule, setSchedule] = useState<ScheduleData>(DEFAULT_SCHEDULE);
  const [address, setAddress] = useState<AddressSel>(DEFAULT_ADDRESS);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const didInit = useRef(false);

  const currentYear = new Date().getFullYear();
  const outdated = currentYear > schedule.year;

  const fetchAndApply = useCallback(async (street: string, number: string): Promise<boolean> => {
    setStatus('refreshing');
    setError(null);
    try {
      const api = await fetchScheduleFor(street, number);
      const built = buildSchedule(api);
      setSchedule(built);
      const addr: AddressSel = { street, number };
      setAddress(addr);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(api));
      await AsyncStorage.setItem(ADDR_KEY, JSON.stringify(addr));
      setStatus('idle');
      return true;
    } catch (e: any) {
      setStatus('error');
      setError(`Nie udało się pobrać harmonogramu. ${e?.message ?? ''}`.trim());
      return false;
    }
  }, []);

  const changeAddress = useCallback(
    (street: string, number: string) => fetchAndApply(street.trim(), number.trim()),
    [fetchAndApply],
  );

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    let active = true;

    (async () => {
      const savedAddr = (await loadJSON<AddressSel>(ADDR_KEY)) ?? DEFAULT_ADDRESS;
      if (active) setAddress(savedAddr);

      // Użyj zcache'owanego harmonogramu, jeśli jest sensowny.
      const cached = await loadJSON<ApiSchedule>(CACHE_KEY);
      let activeYear = DEFAULT_SCHEDULE.year;
      if (cached && cached.year >= DEFAULT_SCHEDULE.year) {
        try {
          const built = buildSchedule(cached);
          if (active) setSchedule(built);
          activeYear = built.year;
        } catch {
          /* uszkodzony cache */
        }
      }

      // Bieżący rok wykracza poza posiadane dane → dociągnij dla zapisanego adresu.
      if (new Date().getFullYear() > activeYear) {
        await fetchAndApply(savedAddr.street, savedAddr.number);
      }
    })();

    return () => { active = false; };
  }, [fetchAndApply]);

  const refresh = useCallback(() => fetchAndApply(address.street, address.number).then(() => {}), [address, fetchAndApply]);

  return (
    <Ctx.Provider value={{ schedule, address, status, error, outdated, changeAddress, refresh }}>
      {children}
    </Ctx.Provider>
  );
}
