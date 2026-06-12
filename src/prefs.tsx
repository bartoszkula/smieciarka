// Globalne preferencje: język + motyw (jasny/ciemny). Trwałe w AsyncStorage.
// usePrefs() daje aktywną paletę, język, związaną funkcję t() oraz settery.

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, ThemeMode, themeFor } from './theme';
import { Lang, DEFAULT_LANG, t as translate, TFn } from './i18n';

const LANG_KEY = 'prefs:lang:v1';
const THEME_KEY = 'prefs:theme:v1';

interface PrefsCtx {
  lang: Lang;
  themeMode: ThemeMode;
  palette: Theme;
  t: TFn;
  setLang: (l: Lang) => void;
  setThemeMode: (m: ThemeMode) => void;
  toggleTheme: () => void;
}

const Ctx = createContext<PrefsCtx | null>(null);

export function usePrefs(): PrefsCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePrefs poza PrefsProvider');
  return c;
}

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [themeMode, setThemeState] = useState<ThemeMode>('light');

  useEffect(() => {
    (async () => {
      try {
        const [l, m] = await Promise.all([
          AsyncStorage.getItem(LANG_KEY),
          AsyncStorage.getItem(THEME_KEY),
        ]);
        if (l) setLangState(l as Lang);
        if (m === 'dark' || m === 'light') setThemeState(m);
      } catch {
        /* zostają domyślne: pl + jasny */
      }
    })();
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(LANG_KEY, l).catch(() => {});
  }, []);

  const setThemeMode = useCallback((m: ThemeMode) => {
    setThemeState(m);
    AsyncStorage.setItem(THEME_KEY, m).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const palette = useMemo(() => themeFor(themeMode), [themeMode]);
  const t = useCallback<TFn>((key, params) => translate(lang, key, params), [lang]);

  const value = useMemo<PrefsCtx>(
    () => ({ lang, themeMode, palette, t, setLang, setThemeMode, toggleTheme }),
    [lang, themeMode, palette, t, setLang, setThemeMode, toggleTheme],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
