import { Languages } from "lucide-react";
import { useI18n, type LanguageCode } from "../i18n";
import { cn } from "../utils/cn";

export function LanguageSwitch({ light = false, className }: { light?: boolean; className?: string }) {
  const { lang, setLang, t } = useI18n();
  const options: { code: LanguageCode; label: string }[] = [
    { code: "en", label: "English" },
    { code: "kn", label: "ಕನ್ನಡ" },
  ];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border p-0.5",
        light ? "border-white/25 bg-white/10" : "border-line bg-white",
        className,
      )}
      role="group"
      aria-label={t("common.language")}
    >
      <Languages className={cn("ml-2 h-3.5 w-3.5", light ? "text-white/70" : "text-ink-soft")} aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.code}
          type="button"
          onClick={() => setLang(option.code)}
          aria-pressed={lang === option.code}
          lang={option.code === "kn" ? "kn" : "en"}
          className={cn(
            "min-h-8 rounded-full px-3 text-xs font-semibold transition-colors",
            lang === option.code
              ? light
                ? "bg-white text-brand"
                : "bg-brand text-white"
              : light
                ? "text-white/80 hover:bg-white/10"
                : "text-ink-soft hover:bg-page",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
