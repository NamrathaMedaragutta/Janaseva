import { PhoneCall, ShieldCheck } from "lucide-react";
import { ComplaintForm } from "../components/ComplaintForm";
import { useI18n } from "../i18n";

export function PublicRegisterPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-info">{t("landing.eyebrow")}</p>
          <h1 className="mt-1.5 text-2xl font-bold text-brand sm:text-3xl">{t("register.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{t("register.lead")}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-ink-soft">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {t("common.emergencyShort")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5">
            <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
            1800-000-000
          </span>
        </div>
      </div>

      <ComplaintForm mode="citizen" />
    </div>
  );
}
