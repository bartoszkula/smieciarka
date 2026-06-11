// Model danych harmonogramu wywozu odpadów.
// Źródłem prawdy jest API miejskie (patrz source.ts) zwracające JSON.
// Bundlujemy snapshot 2026 (schedule.2026.json) jako dane offline/domyślne.

import bundled2026 from './schedule.2026.json';

export type WasteTypeId =
  | 'zmieszane'
  | 'papier'
  | 'plastik'
  | 'szklo'
  | 'bio'
  | 'gabaryty';

export interface WasteType {
  id: WasteTypeId;
  label: string;
  short: string;
  color: string;
  emoji: string;
}

// Kolory: zmieszane - SZARY, papier - niebieski, plastik - żółty,
// szkło - zielony, bio - brązowy, wielkogabarytowe - różowy.
export const WASTE_TYPES: Record<WasteTypeId, WasteType> = {
  zmieszane: { id: 'zmieszane', label: 'Odpady zmieszane', short: 'Zmieszane', color: '#808080', emoji: '🗑️' },
  papier: { id: 'papier', label: 'Papier', short: 'Papier', color: '#1565C0', emoji: '📦' },
  plastik: { id: 'plastik', label: 'Plastik i metale', short: 'Plastik', color: '#F9A825', emoji: '♻️' },
  szklo: { id: 'szklo', label: 'Szkło', short: 'Szkło', color: '#2E7D32', emoji: '🍾' },
  bio: { id: 'bio', label: 'Odpady BIO', short: 'BIO', color: '#6D4C41', emoji: '🍂' },
  gabaryty: { id: 'gabaryty', label: 'Odpady wielkogabarytowe', short: 'Gabaryty', color: '#EC407A', emoji: '🛋️' },
};

export const WASTE_TYPE_ORDER: WasteTypeId[] = [
  'zmieszane', 'papier', 'plastik', 'szklo', 'bio', 'gabaryty',
];

// --- Kształt odpowiedzi API ---
export interface ApiSchedule {
  id?: string;
  year: number;
  street: string;
  buildingNumber: string;
  city: string;
  area?: string;
  operator?: string;
  buildingType?: string;
  trashSchedule: { month: string; schedule: { type: string; days: string[] }[] }[];
}

export const API_MONTHS = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
];

// Tolerancyjne rozpoznawanie frakcji po słowie kluczowym — różni operatorzy
// nazywają je inaczej ("Metale i tworzywa sztuczne", "Odpady Bio" itd.).
export function typeIdFromLabel(label: string): WasteTypeId | null {
  const s = (label ?? '').toLowerCase();
  if (s.includes('zmieszan')) return 'zmieszane';
  if (s.includes('papier')) return 'papier';
  if (s.includes('tworzyw') || s.includes('plastik') || s.includes('metal')) return 'plastik';
  if (s.includes('szk')) return 'szklo';
  if (s.includes('bio')) return 'bio';
  if (s.includes('gabaryt')) return 'gabaryty';
  return null;
}

// --- Struktury używane przez UI ---
export interface PickupEvent {
  date: string; // YYYY-MM-DD
  month: number;
  day: number;
  typeId: WasteTypeId;
}

export interface PickupDay {
  date: string;
  dateObj: Date;
  types: WasteTypeId[];
}

export interface ScheduleData {
  year: number;
  address: string;
  area: string;
  operator: string;
  events: PickupEvent[];
  byDate: Map<string, WasteTypeId[]>;
  days: PickupDay[];
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toISO(year: number, month0: number, day: number): string {
  return `${year}-${pad(month0 + 1)}-${pad(day)}`;
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|\s|-)\p{L}/gu, (m) => m.toUpperCase());
}

/** Przekształca surową odpowiedź API w gotowy model dla UI. */
export function buildSchedule(api: ApiSchedule): ScheduleData {
  const year = api.year;
  const events: PickupEvent[] = [];

  for (const m of api.trashSchedule ?? []) {
    const month = API_MONTHS.indexOf((m.month ?? '').toLowerCase().trim());
    if (month < 0) continue;
    for (const s of m.schedule ?? []) {
      const typeId = typeIdFromLabel(s.type ?? '');
      if (!typeId) continue;
      for (const dStr of s.days ?? []) {
        const day = Number(dStr);
        if (!day) continue;
        events.push({ date: toISO(year, month, day), month, day, typeId });
      }
    }
  }
  events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const byDate = new Map<string, WasteTypeId[]>();
  for (const e of events) {
    const arr = byDate.get(e.date) ?? [];
    arr.push(e.typeId);
    byDate.set(e.date, arr);
  }
  for (const [k, v] of byDate) {
    v.sort((a, b) => WASTE_TYPE_ORDER.indexOf(a) - WASTE_TYPE_ORDER.indexOf(b));
    byDate.set(k, v);
  }

  const days: PickupDay[] = [];
  for (const [date, types] of byDate) {
    const [y, mo, d] = date.split('-').map(Number);
    days.push({ date, dateObj: new Date(y, mo - 1, d), types });
  }
  days.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  const area = api.area ? String(api.area) : '';
  const okreg = area ? ` (okręg ${area})` : '';
  const address = `${titleCase(api.street)} ${api.buildingNumber}, ${titleCase(api.city)}${okreg}`;

  return { year, address, area, operator: api.operator ?? 'ProNatura', events, byDate, days };
}

/** Dni wywozu od podanej daty (włącznie) w przód. */
export function upcomingFrom(data: ScheduleData, from: Date): PickupDay[] {
  const startISO = toISO(from.getFullYear(), from.getMonth(), from.getDate());
  return data.days.filter((d) => d.date >= startISO);
}

// Domyślny, wbudowany harmonogram (offline).
export const DEFAULT_SCHEDULE: ScheduleData = buildSchedule(bundled2026 as ApiSchedule);
