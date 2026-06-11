// Klient API miejskiego harmonogramu odpadów (Bydgoszcz / Pronatura).
// Ta sama usługa, z której korzysta https://d1jdxd94cgtram.cloudfront.net/
// Pobiera dane jako JSON (pewniejsze niż parsowanie PDF) — wykorzystywane
// do automatycznego odświeżenia harmonogramu na nowy rok.

import { ApiSchedule } from './schedule';

const API_BASE = 'https://zs5cv4ng75.execute-api.eu-central-1.amazonaws.com/prod';

// Adres zakodowany na stałe (tak jak wpisujemy na stronie miejskiej).
export const TARGET_STREET = 'DRZYCIMSKA';
export const TARGET_NUMBER = '47';

interface Street { id: string; street: string }
interface AddressPoint { id: string; buildingNumber: string; buildingType?: string; name?: string | null }

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
  return s.trim().toUpperCase();
}

/**
 * Pobiera aktualny harmonogram dla zakodowanego adresu (Drzycimska 47).
 * Rzuca wyjątek z czytelnym komunikatem przy każdym niepowodzeniu.
 */
export async function fetchSchedule(): Promise<ApiSchedule> {
  // 1) znajdź ulicę
  const streets = await getJSON<Street[]>('/streets');
  const street = streets.find((s) => normalize(s.street) === normalize(TARGET_STREET));
  if (!street) throw new Error(`Nie znaleziono ulicy „${TARGET_STREET}" w wykazie.`);

  // 2) znajdź punkt adresowy (numer budynku)
  const points = await getJSON<AddressPoint[]>(`/address-points/${street.id}`);
  const point = points.find((p) => normalize(p.buildingNumber) === normalize(TARGET_NUMBER));
  if (!point) throw new Error(`Nie znaleziono numeru „${TARGET_NUMBER}" przy ul. ${TARGET_STREET}.`);

  // 3) pobierz harmonogram (JSON)
  const schedule = await getJSON<ApiSchedule>(`/trash-schedule/${point.id}`);
  if (!schedule?.trashSchedule?.length) throw new Error('API zwróciło pusty harmonogram.');
  return schedule;
}

/** Link do PDF-a z harmonogramem (do podejrzenia / pobrania przez użytkownika). */
export async function fetchPdfUrl(): Promise<string> {
  const streets = await getJSON<Street[]>('/streets');
  const street = streets.find((s) => normalize(s.street) === normalize(TARGET_STREET));
  if (!street) throw new Error(`Nie znaleziono ulicy „${TARGET_STREET}".`);
  const points = await getJSON<AddressPoint[]>(`/address-points/${street.id}`);
  const point = points.find((p) => normalize(p.buildingNumber) === normalize(TARGET_NUMBER));
  if (!point) throw new Error(`Nie znaleziono numeru „${TARGET_NUMBER}".`);
  const r = await getJSON<{ url: string }>(`/trash-schedule/${point.id}/pdf`);
  if (!r?.url) throw new Error('Brak adresu PDF w odpowiedzi API.');
  return r.url;
}
