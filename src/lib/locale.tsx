import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguage = "en" | "zh";

interface LocaleContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
}

const STORAGE_KEY = "the-unmuted-language";

// CloudBase CI injects VITE_DEFAULT_LANG=zh to force Chinese.
// Otherwise auto-detect from the browser locale so the Vercel international
// build shows English to non-Chinese users without needing a dashboard env var.
const BUILD_DEFAULT: AppLanguage =
  import.meta.env.VITE_DEFAULT_LANG === "zh" ? "zh" :
  import.meta.env.VITE_DEFAULT_LANG === "en" ? "en" :
  (navigator.language.startsWith("zh") ? "zh" : "en");

/** True only for the CloudBase China build (VITE_DEFAULT_LANG=zh injected by CI). */
export const IS_CHINA_BUILD = import.meta.env.VITE_DEFAULT_LANG === "zh";

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "zh" || saved === "en" ? saved : BUILD_DEFAULT;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      toggleLanguage: () =>
        setLanguageState((current) => (current === "en" ? "zh" : "en")),
    }),
    [language]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return value;
}

export function copyFor(language: AppLanguage, english: string, chinese: string) {
  return language === "zh" ? chinese : english;
}
