import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en from "./locales/en.json";
import kn from "./locales/kn.json";

export type LanguageCode = "en" | "kn";

type Dictionary = Record<string, unknown>;

const dictionaries: Record<LanguageCode, Dictionary> = { en, kn };
const STORAGE_KEY = "janaseva.language";

function lookup(dictionary: Dictionary, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in (current as Dictionary)) {
      return (current as Dictionary)[part];
    }
    return undefined;
  }, dictionary);
  return typeof value === "string" ? value : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match,
  );
}

interface I18nValue {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  pick: (english: string, kannada?: string | null) => string;
  locale: string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    return stored === "kn" ? "kn" : "en";
  });

  const setLang = useCallback((next: LanguageCode) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const value = lookup(dictionaries[lang], key) ?? lookup(dictionaries.en, key) ?? key;
      return interpolate(value, vars);
    },
    [lang],
  );

  const pick = useCallback(
    (english: string, kannada?: string | null) => (lang === "kn" && kannada ? kannada : english),
    [lang],
  );

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t, pick, locale: lang === "kn" ? "kn-IN" : "en-IN" }),
    [lang, setLang, t, pick],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}

export function formatDateTime(value: string | null | undefined, lang: LanguageCode): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(lang === "kn" ? "kn-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(value: string | null | undefined, lang: LanguageCode): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(lang === "kn" ? "kn-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatAge(hours: number, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return t("complaints.overdueHours", { hours: Math.round(hours) });
  return `${Math.round(hours / 24)}d`;
}
