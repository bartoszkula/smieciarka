// Polskie formatowanie dat — bez zależności od Intl locale danych,
// żeby działało spójnie na Androidzie i w przeglądarce.

export const MONTHS_PL = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
];

export const MONTHS_PL_GEN = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];

// Tydzień zaczynamy od poniedziałku.
export const WEEKDAYS_SHORT = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

export const WEEKDAYS_LONG = [
  'niedziela', 'poniedziałek', 'wtorek', 'środa',
  'czwartek', 'piątek', 'sobota',
];

/** Indeks kolumny (0 = poniedziałek ... 6 = niedziela) dla danego dnia. */
export function mondayIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

/** "Marzec 2026" */
export function monthTitle(month0: number, year: number): string {
  const m = MONTHS_PL[month0];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${year}`;
}

/** "13 marca 2026" */
export function longDate(d: Date): string {
  return `${d.getDate()} ${MONTHS_PL_GEN[d.getMonth()]} ${d.getFullYear()}`;
}

/** "wtorek, 13 marca" */
export function weekdayDate(d: Date): string {
  return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_PL_GEN[d.getMonth()]}`;
}

/** Liczba pełnych dni między dwiema datami (ignoruje godziny). */
export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Etykieta odległości: "dziś", "jutro", "za 3 dni". */
export function relativeLabel(daysAway: number): string {
  if (daysAway <= 0) return 'dziś';
  if (daysAway === 1) return 'jutro';
  if (daysAway < 5) return `za ${daysAway} dni`;
  return `za ${daysAway} dni`;
}
