/**
 * Pre-set SOS message template — stored in localStorage.
 * The placeholder {位置} is replaced with GPS coordinates (decimal degrees) at trigger time.
 * Recipients can paste the coordinates into any map app (Gaode, Baidu, Apple Maps, etc.)
 */
import { useCallback, useEffect, useState } from "react";
import type { AppLanguage } from "@/lib/locale";

const STORAGE_KEY = "unmuted_sos_message";

export const DEFAULT_TEMPLATE =
  `我需要帮助，现在处境不安全。\n位置：\n{位置}\n请立即联系我，5分钟内无回应请代我报警。\nI need help and I am not safe.\nLocation:\n{位置}\nCall me back. If no answer in 5 min, call police for me.`;

export const DEFAULT_TEMPLATE_DE =
  `Ich brauche Hilfe und bin nicht sicher.\nStandort:\n{Standort}\nBitte ruf mich sofort zurück. Wenn ich innerhalb von 5 Minuten nicht antworte, verständige bitte die Polizei unter 110.`;

export function defaultSosTemplate(language: AppLanguage): string {
  return language === "de" ? DEFAULT_TEMPLATE_DE : DEFAULT_TEMPLATE;
}

export function isDefaultSosTemplate(template: string): boolean {
  return template === DEFAULT_TEMPLATE || template === DEFAULT_TEMPLATE_DE;
}

export function loadSosTemplate(language: AppLanguage = "en"): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored || isDefaultSosTemplate(stored)) {
      return defaultSosTemplate(language);
    }
    return stored;
  } catch {
    return defaultSosTemplate(language);
  }
}

export function useSosMessage(language: AppLanguage) {
  const [template, setTemplateState] = useState<string>(() => loadSosTemplate(language));

  useEffect(() => {
    setTemplateState((current) =>
      isDefaultSosTemplate(current) ? defaultSosTemplate(language) : current
    );
  }, [language]);

  const setTemplate = useCallback((text: string) => {
    setTemplateState(text);
    localStorage.setItem(STORAGE_KEY, text);
  }, []);

  const reset = useCallback(() => {
    const localizedDefault = defaultSosTemplate(language);
    setTemplateState(localizedDefault);
    localStorage.setItem(STORAGE_KEY, localizedDefault);
  }, [language]);

  return {
    template,
    setTemplate,
    reset,
    isDefault: isDefaultSosTemplate(template),
  };
}
