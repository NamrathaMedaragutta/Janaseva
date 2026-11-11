import { AlertCircle, CheckCircle2, ClipboardList, Clock, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../components/Button";
import { Field, TextInput } from "../components/Field";
import { SectionCard } from "../components/SectionCard";
import { Alert, LoadingBlock } from "../components/States";
import { StatusBadge } from "../components/Badge";
import { formatDateTime, useI18n } from "../i18n";
import { getErrorMessage, publicApi } from "../services/api";
import type { PublicTracking } from "../types";

export function TrackPage() {
  const { t, lang, pick } = useI18n();
  const [params, setParams] = useSearchParams();
  const [reference, setReference] = useState(params.get("id") ?? "");
  const [result, setResult] = useState<PublicTracking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(
    async (value: string) => {
      const cleaned = value.trim();
      if (!cleaned) {
        setError(t("track.idLabel"));
        setResult(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await publicApi.track(cleaned);
        setResult(data);
        setParams({ id: cleaned.toUpperCase() }, { replace: true });
      } catch (err) {
        setResult(null);
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [setParams, t],
  );

  useEffect(() => {
    const initial = params.get("id");
    if (initial) lookup(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    lookup(reference);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-info">{t("landing.eyebrow")}</p>
        <h1 className="mt-1.5 text-2xl font-bold text-brand sm:text-3xl">{t("track.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{t("track.lead")}</p>
      </div>

      <form onSubmit={onSubmit} className="card p-5 sm:p-6" noValidate>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label={t("track.idLabel")} htmlFor="reference" required className="flex-1">
            <TextInput
              id="reference"
              value={reference}
              onChange={(event) => {
                setReference(event.target.value);
                setError(null);
              }}
              placeholder={t("track.idPlaceholder")}
              className="font-mono uppercase tracking-wide"
              autoComplete="off"
              aria-invalid={Boolean(error)}
              required
            />
          </Field>
          <Button
            type="submit"
            size="lg"
            loading={loading}
            icon={<Search className="h-4 w-4" aria-hidden="true" />}
            className="sm:mb-0"
          >
            {loading ? t("track.checking") : t("track.button")}
          </Button>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-soft">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t("track.privacyNote")}
        </p>
      </form>

      {error && (
        <Alert tone="danger" className="mt-4 flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </Alert>
      )}

      {loading && <LoadingBlock />}

      {result && !loading && (
        <div className="mt-6 space-y-5" aria-live="polite">
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line/60 bg-[#f3f6f7] px-5 py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  {t("track.statusTitle")}
                </p>
                <p className="mt-1 break-all font-mono text-lg font-bold text-brand">{result.reference_id}</p>
                <p className="mt-1 text-xs text-ink-soft">{result.hospital_name}</p>
              </div>
              <StatusBadge status={result.status} />
            </div>

            <dl className="grid gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs text-ink-soft">{t("common.category")}</dt>
                <dd className="mt-0.5 text-sm font-medium text-brand">
                  {pick(result.category_name, result.category_name_kn)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">{t("track.departmentRouted")}</dt>
                <dd className="mt-0.5 text-sm font-medium text-brand">
                  {result.department_name ?? t("common.unassigned")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">{t("track.submittedOn")}</dt>
                <dd className="mt-0.5 text-sm font-medium text-brand">{formatDateTime(result.created_at, lang)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">{t("track.lastUpdated")}</dt>
                <dd className="mt-0.5 text-sm font-medium text-brand">{formatDateTime(result.updated_at, lang)}</dd>
              </div>
            </dl>
          </div>

          <SectionCard title={t("track.timelineTitle")} subtitle={t("track.timelineNote")}>
            <ol className="relative space-y-0">
              {result.timeline.map((entry, index) => (
                <li key={`${entry.created_at}-${index}`} className="relative flex gap-4 pb-5 last:pb-0">
                  {index < result.timeline.length - 1 && (
                    <span className="absolute left-[13px] top-7 h-full w-px bg-line" aria-hidden="true" />
                  )}
                  <span className="relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line bg-white text-ink-soft">
                    {index === result.timeline.length - 1 ? (
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={entry.new_status} />
                      <span className="text-xs text-muted">{formatDateTime(entry.created_at, lang)}</span>
                    </div>
                    {entry.action_note && (
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{entry.action_note}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-md text-xs text-ink-soft">{t("track.helpText")}</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => lookup(result.reference_id)}>
                {t("common.refresh")}
              </Button>
              <Link to="/track">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setResult(null);
                    setReference("");
                    setParams({}, { replace: true });
                  }}
                >
                  {t("track.trackAnother")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {!result && !loading && !error && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="card flex items-start gap-3 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft-bg">
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="text-sm leading-relaxed text-ink-soft">{t("track.helpText")}</p>
          </div>
          <div className="card flex items-start gap-3 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft-bg">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="text-sm leading-relaxed text-ink-soft">{t("track.privacyNote")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
