// Wieloоperatorowy klient harmonogramów odpadów dla Bydgoszczy.
// - ProNatura: JSON API (zs5cv4ng75.execute-api...) — używa go strona miejska.
// - Remondis: formularz POST + wydruk HTML (harmonogramy.remondis.pl).
// - Corimp: e-harmonogram ichisystem (server5.ichisystem.eu/corimp) — raport HTML.
// Wszystkie mają otwarty CORS, więc wołamy je wprost z apki (web i natywnie).

import { ApiSchedule, API_MONTHS, typeIdFromLabel, WasteTypeId } from './schedule';

const PRONATURA = 'https://zs5cv4ng75.execute-api.eu-central-1.amazonaws.com/prod';
const REMONDIS = 'https://harmonogramy.remondis.pl';
const ICHI = 'https://server5.ichisystem.eu/corimp';
const REQUEST_TIMEOUT = 20000;

function norm(s: string): string {
  return (s ?? '').trim().toUpperCase();
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function getText(url: string, init?: RequestInit): Promise<string> {
  const res = await fetchWithTimeout(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ---------- Parser tabeli HTML (Remondis / Corimp) ----------

function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&#243;/g, 'ó')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRows(html: string): string[][] {
  const rows: string[][] = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = trRe.exec(html))) {
    const cells: string[] = [];
    const tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let c: RegExpExecArray | null;
    while ((c = tdRe.exec(m[1]))) cells.push(stripTags(c[1]));
    if (cells.length) rows.push(cells);
  }
  return rows;
}

const MONTH_KEYS: [string, number][] = [
  ['stycze', 0], ['luty', 1], ['marz', 2], ['kwie', 3], ['maj', 4], ['czerw', 5],
  ['lipi', 6], ['sierp', 7], ['wrze', 8], ['pa', 9], ['listop', 10], ['grud', 11],
];
function monthIndex(label: string): number {
  const s = (label ?? '').toLowerCase().trim();
  for (const [k, i] of MONTH_KEYS) if (s.startsWith(k)) return i;
  return -1;
}

interface ParsedTable {
  year: number | null;
  months: { monthIndex: number; schedule: { type: WasteTypeId; days: string[] }[] }[];
}

function parseScheduleTable(html: string): ParsedTable {
  const rows = parseRows(html);
  let headerIdx = -1;
  let colTypes: (WasteTypeId | null)[] = [];
  for (let i = 0; i < rows.length; i++) {
    const types = rows[i].map(typeIdFromLabel);
    if (types.filter(Boolean).length >= 3) { headerIdx = i; colTypes = types; break; }
  }
  if (headerIdx < 0) throw new Error('nie rozpoznano tabeli harmonogramu');
  const months: ParsedTable['months'] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const cells = rows[i];
    const mi = monthIndex(cells[0]);
    if (mi < 0) continue;
    const schedule: { type: WasteTypeId; days: string[] }[] = [];
    for (let c = 1; c < cells.length; c++) {
      const t = colTypes[c];
      if (!t) continue;
      const days = (cells[c].match(/\d{1,2}/g) || [])
        .map(Number).filter((d) => d >= 1 && d <= 31).map(String);
      if (days.length) schedule.push({ type: t, days });
    }
    if (schedule.length) months.push({ monthIndex: mi, schedule });
  }
  const ym = html.match(/20\d{2}/);
  return { year: ym ? +ym[0] : null, months };
}

function toApiSchedule(
  parsed: ParsedTable,
  meta: { street: string; number: string; city: string; operator: string },
): ApiSchedule {
  if (!parsed.months.length) throw new Error('pusty harmonogram');
  return {
    year: parsed.year ?? new Date().getFullYear(),
    street: meta.street,
    buildingNumber: meta.number,
    city: meta.city,
    operator: meta.operator,
    trashSchedule: parsed.months.map((mo) => ({
      month: API_MONTHS[mo.monthIndex],
      schedule: mo.schedule.map((s) => ({ type: s.type, days: s.days })),
    })),
  };
}

// ---------- ProNatura (JSON) ----------

interface ProStreet { id: string; street: string }
interface ProPoint { id: string; buildingNumber: string }

let proStreetsCache: ProStreet[] | null = null;
async function proStreets(): Promise<ProStreet[]> {
  if (!proStreetsCache) proStreetsCache = await getJSON<ProStreet[]>(`${PRONATURA}/streets`);
  return proStreetsCache;
}

async function fetchProNatura(street: string, number: string): Promise<ApiSchedule> {
  const streets = await proStreets();
  const s = streets.find((x) => norm(x.street) === norm(street))
    || streets.find((x) => norm(x.street).startsWith(norm(street)));
  if (!s) throw new Error('brak ulicy');
  const points = await getJSON<ProPoint[]>(`${PRONATURA}/address-points/${s.id}`);
  const p = points.find((x) => norm(x.buildingNumber) === norm(number));
  if (!p) throw new Error('brak numeru');
  const sched = await getJSON<ApiSchedule>(`${PRONATURA}/trash-schedule/${p.id}`);
  if (!sched?.trashSchedule?.length) throw new Error('pusty harmonogram');
  return { ...sched, operator: 'ProNatura' };
}

// ---------- Remondis (POST + wydruk HTML) ----------

async function fetchRemondis(street: string, number: string): Promise<ApiSchedule> {
  const ulica = `${street} ${number}`.trim();
  const body = `wojewodztwo=13&miasto=${encodeURIComponent('Bydgoszcz')}&ulica=${encodeURIComponent(ulica)}`;
  const resHtml = await getText(`${REMONDIS}/Home/Szukaj`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const m = resHtml.match(/\/Home\/Wydruk\?NumerKlienta=(\d+)&(?:amp;)?Ulica=([^&"]+)&(?:amp;)?Miejscowosc=([^&"'\s]+)/i);
  if (!m) throw new Error('nie znaleziono adresu');
  const [, numerKlienta, ulicaEnc, miejscEnc] = m;
  const wyd = await getText(`${REMONDIS}/Home/Wydruk?NumerKlienta=${numerKlienta}&Ulica=${ulicaEnc}&Miejscowosc=${miejscEnc}`);
  return toApiSchedule(parseScheduleTable(wyd), {
    street, number, city: 'BYDGOSZCZ', operator: 'Remondis',
  });
}

// ---------- Corimp (ichisystem) ----------

interface IchiItem { id: string | number; value: string }
const BYDGOSZCZ_CITY_ID = 508;

let corimpStreetsCache: IchiItem[] | null = null;
async function corimpStreets(): Promise<IchiItem[]> {
  if (!corimpStreetsCache) corimpStreetsCache = await getJSON<IchiItem[]>(`${ICHI}/addresses/streets/${BYDGOSZCZ_CITY_ID}`);
  return corimpStreetsCache;
}

async function fetchCorimp(street: string, number: string): Promise<ApiSchedule> {
  const streets = await corimpStreets();
  const st = streets.find((x) => norm(x.value) === norm(street))
    || streets.find((x) => norm(x.value).startsWith(norm(street)));
  if (!st) throw new Error('brak ulicy');
  const nums = await getJSON<IchiItem[]>(`${ICHI}/addresses/numbers/${BYDGOSZCZ_CITY_ID}/${st.id}`);
  const nu = nums.find((x) => norm(x.value) === norm(number));
  if (!nu) throw new Error('brak numeru');
  const rep = await getJSON<{ filePath?: string }>(`${ICHI}/reports?type=html&id=${nu.id}`);
  if (!rep?.filePath) throw new Error('brak raportu');
  const html = await getText(rep.filePath);
  return toApiSchedule(parseScheduleTable(html), {
    street: st.value, number: nu.value, city: 'BYDGOSZCZ', operator: 'Corimp',
  });
}

// ---------- API publiczne ----------

/** Podpowiedzi ulic (z baz ProNatury i Corimpu). Remondis nie udostępnia listy ulic. */
export async function searchStreets(query: string, limit = 12): Promise<string[]> {
  const q = norm(query);
  if (q.length < 2) return [];
  const [pro, cor] = await Promise.all([
    proStreets().catch(() => [] as ProStreet[]),
    corimpStreets().catch(() => [] as IchiItem[]),
  ]);
  const names = new Set<string>();
  for (const s of pro) names.add(norm(s.street));
  for (const s of cor) names.add(norm(s.value));
  const all = Array.from(names);
  const starts = all.filter((n) => n.startsWith(q));
  const contains = all.filter((n) => !n.startsWith(q) && n.includes(q));
  return [...starts.sort(), ...contains.sort()].slice(0, limit);
}

/**
 * Pobiera harmonogram dla adresu, próbując kolejno operatorów obsługujących Bydgoszcz.
 * Rzuca czytelny błąd, jeśli żaden nie zna adresu.
 */
export async function fetchScheduleFor(street: string, number: string): Promise<ApiSchedule> {
  const operators: [string, (s: string, n: string) => Promise<ApiSchedule>][] = [
    ['ProNatura', fetchProNatura],
    ['Remondis', fetchRemondis],
    ['Corimp', fetchCorimp],
  ];
  const errors: string[] = [];
  for (const [name, fn] of operators) {
    try {
      return await fn(street, number);
    } catch (e: any) {
      errors.push(`${name}: ${e?.message ?? e}`);
    }
  }
  throw new Error(`Nie znaleziono adresu u żadnego operatora (ProNatura / Remondis / Corimp).`);
}
