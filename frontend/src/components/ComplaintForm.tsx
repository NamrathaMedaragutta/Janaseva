import { CheckCircle2, ClipboardCopy, FileText, Printer, SearchCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime, useI18n } from "../i18n";
import { complaintApi, getErrorMessage, publicApi } from "../services/api";
import type { PublicMeta, RegistrationResponse } from "../types";
import { Alert } from "./States";
import { Button } from "./Button";
import { Checkbox, Field, Select, TextArea, TextInput } from "./Field";
import { LoadingBlock } from "./States";
import { SectionCard } from "./SectionCard";

type Mode = "citizen" | "assisted";

interface FormState {
  hospitalId: string;
  language: string;
  categoryId: string;
  departmentId: string;
  description: string;
  name: string;
  phone: string;
  consent: boolean;
  emergency: boolean;
  readBack: boolean;
}

const initialState: FormState = {
  hospitalId: "",
  language: "en",
  categoryId: "",
  departmentId: "",
  description: "",
  name: "",
  phone: "",
  consent: false,
  emergency: false,
  readBack: false,
};

export function ComplaintForm({ mode }: { mode: Mode }) {
  const { t, pick, lang } = useI18n();
  const { user } = useAuth();
  const [meta, setMeta] = useState<PublicMeta | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<RegistrationResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const loadMeta = () => {
    setMetaError(null);
    publicApi
      .meta()
      .then((data) => {
        setMeta(data);
        setForm((current) => ({ ...current, hospitalId: data.hospital.id }));
      })
      .catch((err) => setMetaError(getErrorMessage(err)));
  };

  useEffect(loadMeta, []);

  const selectedCategory = useMemo(
    () => meta?.categories.find((category) => category.id === form.categoryId) ?? null,
    [meta, form.categoryId],
  );

  const departmentPreview = useMemo(() => {
    if (!meta) return null;
    if (form.departmentId) {
      return meta.departments.find((department) => department.id === form.departmentId) ?? null;
    }
    if (selectedCategory?.default_department_id) {
      return meta.departments.find((department) => department.id === selectedCategory.default_department_id) ?? null;
    }
    return null;
  }, [meta, form.departmentId, selectedCategory]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSubmitError(null);
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.categoryId) next.categoryId = t("register.categoryLabel");
    if (form.description.trim().length < 10) next.description = t("register.descriptionHint");
    if (form.phone.trim()) {
      const digits = form.phone.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 13) next.phone = t("register.phoneHint");
    }
    if (mode === "citizen" && !form.emergency) next.emergency = t("register.emergencyError");
    if (mode === "assisted" && !form.readBack) next.readBack = t("register.readBackError");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!meta || !validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await complaintApi.create({
        hospital_id: meta.hospital.id,
        category_id: form.categoryId,
        description: form.description.trim(),
        language_code: form.language,
        complainant_name: form.name.trim() || undefined,
        contact_number: form.phone.trim() || undefined,
        consent_to_contact: form.consent,
        department_id: form.departmentId || undefined,
        emergency_acknowledged: mode === "assisted" ? true : form.emergency,
      });
      setResult(response);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const copyReference = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.reference_id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const reset = () => {
    setResult(null);
    setForm({ ...initialState, hospitalId: meta?.hospital.id ?? "", language: form.language });
    setCopied(false);
  };

  if (metaError) {
    return (
      <Alert tone="danger">
        <p>{metaError}</p>
        <Button variant="secondary" size="sm" className="mt-3 no-print" onClick={loadMeta}>
          {t("common.retry")}
        </Button>
      </Alert>
    );
  }

  if (!meta) {
    return <LoadingBlock label={t("common.loading")} />;
  }

  if (result) {
    const isKannada = result.reference_id && form.language === "kn";
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card print-card overflow-hidden">
          <div className="bg-success px-5 py-6 text-white sm:px-7">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            <h2 className="mt-3 text-xl font-bold">{t("register.successTitle")}</h2>
            <p className="mt-1.5 text-sm text-white/85">{t("register.successLead")}</p>
          </div>

          <div className="p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
              {t("register.referenceLabel")}
            </p>
            <p className="mt-1.5 break-all font-mono text-2xl font-bold tracking-tight text-brand sm:text-3xl">
              {result.reference_id}
            </p>
            {isKannada && <p className="kannada mt-2 text-sm text-ink-soft">{result.acknowledgement}</p>}

            <dl className="mt-6 grid gap-3 border-t border-line/60 pt-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-ink-soft">{t("common.category")}</dt>
                <dd className="mt-0.5 font-medium text-brand">{result.category_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">{t("common.department")}</dt>
                <dd className="mt-0.5 font-medium text-brand">
                  {result.department_name ?? t("common.unassigned")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">{t("common.status")}</dt>
                <dd className="mt-0.5 font-medium text-brand">{t(`status.${result.status}`)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">{t("complaints.submitted")}</dt>
                <dd className="mt-0.5 font-medium text-brand">{formatDateTime(result.created_at, lang)}</dd>
              </div>
            </dl>

            <div className="mt-5 rounded-xl border border-line/70 bg-page p-3.5 text-xs leading-relaxed text-ink-soft">
              {t("register.ackNote")}
            </div>
            <p className="mt-2 text-[11px] text-muted">
              {mode === "assisted"
                ? `${t("common.demo")} · ${user?.full_name ?? ""} · ${pick("Assisted registration", "ಸಹಾಯದ ನೋಂದಣಿ")}`
                : `${t("common.demo")} · ${pick("Citizen registration", "ನಾಗರಿಕ ನೋಂದಣಿ")}`}
            </p>

            <div className="mt-6 flex flex-wrap gap-2 no-print">
              <Button onClick={copyReference} icon={<ClipboardCopy className="h-4 w-4" aria-hidden="true" />}>
                {copied ? t("common.copied") : t("register.copyId")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.print()}
                icon={<Printer className="h-4 w-4" aria-hidden="true" />}
              >
                {t("register.printAck")}
              </Button>
              <Link to={`/track?id=${encodeURIComponent(result.reference_id)}`}>
                <Button variant="secondary" icon={<SearchCheck className="h-4 w-4" aria-hidden="true" />}>
                  {t("register.trackNow")}
                </Button>
              </Link>
              <Button variant="ghost" onClick={reset}>
                {t("register.registerAnother")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
      <div className="space-y-5">
        <SectionCard title={mode === "assisted" ? t("register.assistedTitle") : t("register.title")} subtitle={t("register.lead")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("common.hospital")} htmlFor="hospital">
              <TextInput id="hospital" value={meta.hospital.name} readOnly disabled />
            </Field>

            <Field label={t("register.languageLabel")} htmlFor="language" required>
              <Select id="language" value={form.language} onChange={(event) => update("language", event.target.value)}>
                <option value="en">{t("common.english")}</option>
                <option value="kn">{t("common.kannada")}</option>
              </Select>
            </Field>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={t("register.categoryLabel")} htmlFor="category" required error={errors.categoryId}>
              <Select
                id="category"
                value={form.categoryId}
                onChange={(event) => update("categoryId", event.target.value)}
                aria-invalid={Boolean(errors.categoryId)}
                required
              >
                <option value="">{t("common.all")} —</option>
                {meta.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {pick(category.name_en, category.name_kn)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t("register.departmentLabel")} htmlFor="department">
              <Select
                id="department"
                value={form.departmentId}
                onChange={(event) => update("departmentId", event.target.value)}
              >
                <option value="">{t("register.departmentAuto")}</option>
                {meta.departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="mt-4">
            <Field
              label={t("register.descriptionLabel")}
              htmlFor="description"
              required
              error={errors.description}
              hint={t("register.descriptionHint")}
            >
              <TextArea
                id="description"
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder={t("register.descriptionPlaceholder")}
                aria-invalid={Boolean(errors.description)}
                className={form.language === "kn" ? "kannada" : undefined}
                lang={form.language === "kn" ? "kn" : "en"}
                maxLength={4000}
                required
              />
            </Field>
            <p className="mt-1 text-right text-[11px] text-muted">{form.description.length}/4000</p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={t("register.nameLabel")} htmlFor="name">
              <TextInput
                id="name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                autoComplete="name"
                maxLength={150}
              />
            </Field>
            <Field
              label={t("register.phoneLabel")}
              htmlFor="phone"
              error={errors.phone}
              hint={t("register.phoneHint")}
            >
              <TextInput
                id="phone"
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+91"
                aria-invalid={Boolean(errors.phone)}
                maxLength={20}
              />
            </Field>
          </div>

          <div className="mt-5 space-y-4 border-t border-line/60 pt-4">
            <Checkbox
              id="consent"
              checked={form.consent}
              onChange={(value) => update("consent", value)}
              label={t("register.consentLabel")}
              description={t("register.ackNote")}
            />
            {mode === "citizen" ? (
              <Checkbox
                id="emergency"
                checked={form.emergency}
                onChange={(value) => update("emergency", value)}
                label={t("register.emergencyLabel")}
                error={errors.emergency}
              />
            ) : (
              <Checkbox
                id="readback"
                checked={form.readBack}
                onChange={(value) => update("readBack", value)}
                label={t("register.readBack")}
                error={errors.readBack}
              />
            )}
          </div>

          {submitError && (
            <Alert tone="danger" className="mt-4">
              {submitError}
            </Alert>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              size="lg"
              loading={submitting}
              icon={<FileText className="h-[18px] w-[18px]" aria-hidden="true" />}
            >
              {submitting ? t("register.submitting") : t("register.submit")}
            </Button>
            <p className="text-xs text-ink-soft">{t("common.requiredMark")}</p>
          </div>
        </SectionCard>
      </div>

      <aside className="space-y-4">
        <SectionCard title={t("register.review")}>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-ink-soft">{t("common.category")}</dt>
              <dd className="mt-0.5 font-medium text-brand">
                {selectedCategory ? pick(selectedCategory.name_en, selectedCategory.name_kn) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">{t("common.department")}</dt>
              <dd className="mt-0.5 font-medium text-brand">
                {departmentPreview?.name ?? t("register.departmentAuto")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">{t("common.language")}</dt>
              <dd className="mt-0.5 font-medium text-brand">
                {form.language === "kn" ? t("common.kannada") : t("common.english")}
              </dd>
            </div>
          </dl>
          <div className="mt-4 rounded-lg border border-line/70 bg-page p-3 text-xs leading-relaxed text-ink-soft">
            {mode === "assisted" ? t("register.assistedLead") : t("register.ackNote")}
          </div>
        </SectionCard>

        <div className="rounded-xl border border-[#ecd6ae] bg-warning-soft p-4">
          <p className="text-sm font-semibold text-[#7c4c0d]">{t("landing.emergencyTitle")}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#7c4c0d]/90">{t("common.emergencyShort")}</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("landing.helplineLabel")}</p>
          <p className="mt-1 font-mono text-lg font-semibold text-brand">1800-000-000</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">{t("landing.helplineNote")}</p>
        </div>
      </aside>
    </form>
  );
}
