// Klient API miejskiego harmonogramu odpadów (Bydgoszcz / Pronatura).
// Ta sama usługa, z której korzysta https://d1jdxd94cgtram.cloudfront.net/
// Pobiera dane jako JSON (pewniejsze niż parsowanie PDF).

import { ApiSchedule } from './schedule';

const API_BASE = 'https://zs5cv4ng75.execute-api.eu-central-1.amazonaws.com/prod';

export interface Street { id: string; street: string }
export interface AddressPoint { id: string; buildingNumber: string; buildingType?: string; name?: string | null }

const REQUEST_TIMEOUT = 15000;

async function getJSON<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} dla ${path}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

function normalize(s: string): string {
  return (s ?? '').trim().toUpperCase();
}

// Pełna lista ulic bywa duża — cache'ujemy ją w pamięci na czas sesji.
let streetsCache: Street[] | null = null;

async function allStreets(): Promise<Street[]> {
  if (!streetsCache) {
    streetsCache = await getJSON<Street[]>('/streets');
  }
  return streetsCache;
}

/** Podpowiedzi ulic zawierających podany tekst (do autouzupełniania). */
export async function searchStreets(query: string, limit = 12): Promise<Street[]> {
  const q = normalize(query);
  const list = await allStreets();
  if (!q) return [];
  const starts = list.filter((s) => normalize(s.street).startsWith(q));
  const contains = list.filter((s) => !normalize(s.street).startsWith(q) && normalize(s.street).includes(q));
  return [...starts, ...contains].slice(0, limit);
}

/** Numery budynków (punkty adresowe) dla danej ulicy. */
export async function getNumbers(streetId: string): Promise<AddressPoint[]> {
  return getJSON<AddressPoint[]>(`/address-points/${streetId}`);
}

async function resolveStreet(street: string): Promise<Street> {
  const list = await allStreets();
  const exact = list.find((s) => normalize(s.street) === normalize(street));
  if (exact) return exact;
  // delikatne dopasowanie, gdyby brakło dokładnego (np. literówka w wielkości liter)
  const partial = list.find((s) => normalize(s.street).startsWith(normalize(street)));
  if (partial) return partial;
  throw new Error(`Nie znaleziono ulicy „${street}".`);
}

/** Pobiera harmonogram (JSON) dla wskazanej ulicy i numeru. Rzuca czytelny błąd. */
export async function fetchScheduleFor(street: string, number: string): Promise<ApiSchedule> {
  const s = await resolveStreet(street);
  const points = await getNumbers(s.id);
  const point = points.find((p) => normalize(p.buildingNumber) === normalize(number));
  if (!point) throw new Error(`Nie znaleziono numeru „${number}" przy ul. ${s.street}.`);
  const schedule = await getJSON<ApiSchedule>(`/trash-schedule/${point.id}`);
  if (!schedule?.trashSchedule?.length) throw new Error('API zwróciło pusty harmonogram dla tego adresu.');
  return schedule;
}
