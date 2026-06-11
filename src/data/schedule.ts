// Harmonogram odbioru odpadów komunalnych — Bydgoszcz, okręg 5,
// ul. Drzycimska 47 (nieruchomość mieszkalna), rok 2026.
// Źródło: docs/harmonogram.pdf (Pronatura / Czysta Bydgoszcz).

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

// Kolory zgodnie z wytycznymi:
// zmieszane - grafitowy, papier - niebieski, plastik - żółty,
// szkło - zielony, bio - brązowy, wielkogabarytowe - różowy.
export const WASTE_TYPES: Record<WasteTypeId, WasteType> = {
  zmieszane: { id: 'zmieszane', label: 'Odpady zmieszane', short: 'Zmieszane', color: '#37474F', emoji: '🗑️' },
  papier: { id: 'papier', label: 'Papier', short: 'Papier', color: '#1565C0', emoji: '📦' },
  plastik: { id: 'plastik', label: 'Plastik i metale', short: 'Plastik', color: '#F9A825', emoji: '♻️' },
  szklo: { id: 'szklo', label: 'Szkło', short: 'Szkło', color: '#2E7D32', emoji: '🍾' },
  bio: { id: 'bio', label: 'Odpady BIO', short: 'BIO', color: '#6D4C41', emoji: '🍂' },
  gabaryty: { id: 'gabaryty', label: 'Odpady wielkogabarytowe', short: 'Gabaryty', color: '#EC407A', emoji: '🛋️' },
};

export const WASTE_TYPE_ORDER: WasteTypeId[] = [
  'zmieszane',
  'papier',
  'plastik',
  'szklo',
  'bio',
  'gabaryty',
];

export const SCHEDULE_YEAR = 2026;

// Dni odbioru w poszczególnych miesiącach (indeks miesiąca 0-11 → dni).
// Dane przepisane 1:1 z tabeli w harmonogramie.
const RAW: Record<WasteTypeId, Record<number, number[]>> = {
  // odpady zmieszane (grafitowy)
  zmieszane: {
    0: [3, 16, 30], 1: [13, 27], 2: [13, 27], 3: [10, 24], 4: [8, 22], 5: [5, 19],
    6: [3, 17, 31], 7: [14, 28], 8: [11, 25], 9: [9, 23], 10: [6, 20], 11: [4, 18],
  },
  // papier (niebieski)
  papier: {
    0: [28], 1: [25], 2: [25], 3: [22], 4: [20], 5: [17],
    6: [15], 7: [12], 8: [9], 9: [7], 10: [4], 11: [2, 30],
  },
  // plastik i metale (żółty)
  plastik: {
    0: [28], 1: [25], 2: [25], 3: [22], 4: [20], 5: [17],
    6: [15], 7: [12], 8: [9], 9: [7], 10: [4], 11: [2, 30],
  },
  // szkło (zielony)
  szklo: {
    0: [28], 1: [25], 2: [25], 3: [22], 4: [20], 5: [17],
    6: [15], 7: [12], 8: [9], 9: [7], 10: [4], 11: [2, 30],
  },
  // odpady bio (brązowy)
  bio: {
    0: [9, 22], 1: [5], 2: [5, 19], 3: [2, 16, 30], 4: [14, 28], 5: [11, 25],
    6: [9, 23], 7: [6, 20], 8: [3, 17], 9: [1, 15, 29], 10: [13, 26], 11: [10],
  },
  // odpady wielkogabarytowe (różowy)
  gabaryty: {
    0: [22], 3: [16], 6: [23], 9: [15],
  },
};

export interface PickupEvent {
  /** Data w formacie YYYY-MM-DD (lokalnie). */
  date: string;
  month: number; // 0-11
  day: number;
  typeId: WasteTypeId;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toISO(year: number, month0: number, day: number): string {
  return `${year}-${pad(month0 + 1)}-${pad(day)}`;
}

/** Płaska, posortowana po dacie lista wszystkich wywozów w roku. */
export const EVENTS: PickupEvent[] = (() => {
  const out: PickupEvent[] = [];
  (Object.keys(RAW) as WasteTypeId[]).forEach((typeId) => {
    const byMonth = RAW[typeId];
    Object.keys(byMonth).forEach((mStr) => {
      const month = Number(mStr);
      byMonth[month].forEach((day) => {
        out.push({ date: toISO(SCHEDULE_YEAR, month, day), month, day, typeId });
      });
    });
  });
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return out;
})();

/** Mapa "YYYY-MM-DD" → lista frakcji tego dnia (w ustalonej kolejności). */
export const EVENTS_BY_DATE: Map<string, WasteTypeId[]> = (() => {
  const m = new Map<string, WasteTypeId[]>();
  for (const e of EVENTS) {
    const arr = m.get(e.date) ?? [];
    arr.push(e.typeId);
    m.set(e.date, arr);
  }
  // utrzymaj kolejność frakcji
  for (const [k, v] of m) {
    v.sort((a, b) => WASTE_TYPE_ORDER.indexOf(a) - WASTE_TYPE_ORDER.indexOf(b));
    m.set(k, v);
  }
  return m;
})();

/** Jeden wpis listy: data + wszystkie frakcje tego dnia. */
export interface PickupDay {
  date: string;
  dateObj: Date;
  types: WasteTypeId[];
}

export const PICKUP_DAYS: PickupDay[] = (() => {
  const days: PickupDay[] = [];
  for (const [date, types] of EVENTS_BY_DATE) {
    const [y, m, d] = date.split('-').map(Number);
    days.push({ date, dateObj: new Date(y, m - 1, d), types });
  }
  days.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  return days;
})();

/** Zwraca dni wywozu od podanej daty (włącznie) w przód. */
export function upcomingFrom(from: Date): PickupDay[] {
  const startISO = toISO(from.getFullYear(), from.getMonth(), from.getDate());
  return PICKUP_DAYS.filter((d) => d.date >= startISO);
}

export const ADDRESS = 'Bydgoszcz, ul. Drzycimska 47 (okręg 5)';
