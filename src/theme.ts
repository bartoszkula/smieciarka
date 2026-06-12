// Palety kolorów — jasna (domyślna) i ciemna. Przełączane w czasie działania
// przez PrefsProvider (patrz prefs.tsx). Komponenty budują style z aktywnej
// palety przez useMemo(() => makeStyles(palette), [palette]).

export interface Theme {
  bg: string;
  card: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  primary: string;
  todayBg: string;
  todayRing: string;
  shadow: string;
  // Dzień dzisiejszy w kalendarzu: czarna (jasny motyw) / jasna (ciemny) ramka
  // + delikatny highlight z tyłu, tło kratki przezroczyste.
  todayBorder: string;
  todayGlow: string;
}

export const lightTheme: Theme = {
  bg: '#F2F4F5',
  card: '#FFFFFF',
  text: '#1A2327',
  textMuted: '#6B7A80',
  textFaint: '#A9B4B9',
  border: '#E2E7E9',
  primary: '#2E7D32',
  todayBg: '#E8F5E9',
  todayRing: '#2E7D32',
  shadow: 'rgba(20, 40, 50, 0.08)',
  todayBorder: '#101517',
  todayGlow: 'rgba(0, 0, 0, 0.06)',
};

export const darkTheme: Theme = {
  bg: '#121617',
  card: '#1E2528',
  text: '#E7EDEF',
  textMuted: '#9AA7AD',
  textFaint: '#6B7A80',
  border: '#2C353A',
  primary: '#66BB6A',
  todayBg: '#1B3A22',
  todayRing: '#66BB6A',
  shadow: 'rgba(0, 0, 0, 0.5)',
  todayBorder: '#E7EDEF',
  todayGlow: 'rgba(255, 255, 255, 0.10)',
};

export type ThemeMode = 'light' | 'dark';

export const themeFor = (mode: ThemeMode): Theme => (mode === 'dark' ? darkTheme : lightTheme);

// Zachowane dla zgodności wstecz (statyczny import). Nowy kod używa palety z usePrefs().
export const theme = lightTheme;
