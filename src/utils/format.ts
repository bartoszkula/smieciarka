// Formatowanie dat zależne od języka. Używamy Intl.DateTimeFormat z locale
// (Hermes/RN i web mają pełne dane ICU), a gdy coś zawiedzie — wracamy do
// twardych polskich nazw, żeby nic się nie wysypało.

import { Lang, LOCALES, TFn } from '../i18n';

const MONTHS_PL = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
];
const MONTHS_PL_GEN = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];
const WEEKDAYS_SHORT_PL = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
const WEEKDAYS_LONG_PL = [
  'niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota',
];

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function fmt(lang: Lang, opts: Intl.DateTimeFormatOptions, date: Date): string | null {
  try {
    return new Intl.DateTimeFormat(LOCALES[lang], opts).format(date);
  } catch {
    return null;
  }
}

// --- Krótkie nazwy dni tygodnia (Pn..Nd), cache per język ---
const shortDayCache: Partial<Record<Lang, string[]>> = {};
export function weekdaysShort(lang: Lang): string[] {
  if (shortDayCache[lang]) return shortDayCache[lang]!;
  // 1–7 stycznia 2024 to poniedziałek…niedziela.
  const out: string[] = [];
  for (let d = 1; d <= 7; d++) {
    const r = fmt(lang, { weekday: 'short' }, new Date(2024, 0, d));
    out.push(r ? cap(r.replace('.', '')) : WEEKDAYS_SHORT_PL[d - 1]);
  }
  shortDayCache[lang] = out;
  return out;
}

/** Indeks kolumny (0 = poniedziałek ... 6 = niedziela) dla danego dnia. */
export function mondayIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

/** "Marzec 2026" / "March 2026" */
export function monthTitle(month0: number, year: number, lang: Lang): string {
  const r = fmt(lang, { month: 'long', year: 'numeric' }, new Date(year, month0, 1));
  return r ? cap(r) : `${cap(MONTHS_PL[month0])} ${year}`;
}

/** Pełna nazwa miesiąca, np. nagłówek sekcji listy. */
export function monthLong(month0: number, lang: Lang): string {
  const r = fmt(lang, { month: 'long' }, new Date(2024, month0, 1));
  return r ? cap(r) : cap(MONTHS_PL[month0]);
}

/** Skrót miesiąca (np. "mar"). */
export function monthShort(month0: number, lang: Lang): string {
  const r = fmt(lang, { month: 'short' }, new Date(2024, month0, 1));
  return r ? r.replace('.', '') : MONTHS_PL_GEN[month0].slice(0, 3);
}

/** "13 marca 2026" / "13 March 2026" */
export function longDate(d: Date, lang: Lang): string {
  const r = fmt(lang, { day: 'numeric', month: 'long', year: 'numeric' }, d);
  return r ?? `${d.getDate()} ${MONTHS_PL_GEN[d.getMonth()]} ${d.getFullYear()}`;
}

/** "wtorek, 13 marca" / "Tuesday, 13 March" */
export function weekdayDate(d: Date, lang: Lang): string {
  const r = fmt(lang, { weekday: 'long', day: 'numeric', month: 'long' }, d);
  return r ?? `${WEEKDAYS_LONG_PL[d.getDay()]}, ${d.getDate()} ${MONTHS_PL_GEN[d.getMonth()]}`;
}

/** Liczba pełnych dni między dwiema datami (ignoruje godziny). */
export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Etykieta odległości: "dziś", "jutro", "za 3 dni" — tłumaczona przez t(). */
export function relativeLabel(daysAway: number, t: TFn): string {
  if (daysAway <= 0) return t('rel.today');
  if (daysAway === 1) return t('rel.tomorrow');
  return t('rel.inDays', { n: daysAway });
}
