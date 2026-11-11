import { Headset, Info } from "lucide-react";
import { ComplaintForm } from "../components/ComplaintForm";
import { PageHeader } from "../components/SectionCard";
import { useI18n } from "../i18n";

export function AssistedRegistrationPage() {
  const { t } = useI18n();

  return (
    <>
      <PageHeader title={t("register.assistedTitle")} lead={t("register.assistedLead")} />
      <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-line/70 bg-white px-4 py-3 text-xs leading-relaxed text-ink-soft">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
        {t("register.readBackError")} · {t("register.ackNote")}
      </div>
      <ComplaintForm mode="assisted" />
      <p className="mt-6 flex items-center gap-1.5 text-[11px] text-muted">
        <Headset className="h-3.5 w-3.5" aria-hidden="true" />
        {t("register.assistedLead")}
      </p>
    </>
  );
}
