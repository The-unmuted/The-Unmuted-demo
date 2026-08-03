import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguage = "en" | "zh";

interface LocaleContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
}

const STORAGE_KEY = "the-unmuted-language";

// VITE_DEFAULT_LANG=zh for China/CloudBase build; =en for international/Vercel build.
const BUILD_DEFAULT: AppLanguage =
  import.meta.env.VITE_DEFAULT_LANG === "en" ? "en" : "zh";

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
