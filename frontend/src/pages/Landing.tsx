import {
  ArrowRight,
  BedDouble,
  Building2,
  CheckCircle2,
  ClipboardList,
  Droplets,
  HeartPulse,
  Languages,
  ListChecks,
  MessageSquareText,
  PhoneCall,
  Pill,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  SprayCan,
  UserRoundCheck,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { Alert } from "../components/States";
import { useI18n } from "../i18n";
import { publicApi } from "../services/api";
import type { Category } from "../types";

const categoryIcons: Record<string, typeof ClipboardList> = {
  "staff-availability": UserRoundCheck,
  "medicine-availability": Pill,
  "cleanliness-hygiene": SprayCan,
  "water-sanitation": Droplets,
  "beds-facilities": BedDouble,
  "infrastructure-maintenance": Wrench,
  other: MessageSquareText,
};

export function LandingPage() {
  const { t, pick } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    publicApi
      .meta()
      .then((meta) => {
        if (!cancelled) setCategories(meta.categories);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const steps = [
    { title: t("landing.step1Title"), text: t("landing.step1Text"), icon: PhoneCall },
    { title: t("landing.step2Title"), text: t("landing.step2Text"), icon: ClipboardList },
    { title: t("landing.step3Title"), text: t("landing.step3Text"), icon: Building2 },
    { title: t("landing.step4Title"), text: t("landing.step4Text"), icon: SearchCheck },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line/60 bg-gradient-to-b from-[#eef3f4] to-page">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-[#d6e5e4]/60 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              {t("landing.eyebrow")}
            </p>
            <h1 className="mt-5 max-w-xl text-4xl font-bold leading-[1.1] tracking-tight text-brand sm:text-5xl">
              {t("landing.heroTitle")}
            </h1>
            <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-ink-soft sm:text-base">
              {t("landing.heroLead")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register">
                <Button size="lg" icon={<ClipboardList className="h-[18px] w-[18px]" aria-hidden="true" />}>
                  {t("landing.heroCta")}
                </Button>
              </Link>
              <Link to="/track">
                <Button
                  size="lg"
                  variant="secondary"
                  icon={<SearchCheck className="h-[18px] w-[18px]" aria-hidden="true" />}
                >
                  {t("landing.heroSecondary")}
                </Button>
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                {t("landing.heroVoice")}: 1800-000-000
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5" aria-hidden="true" />
                ಕನ್ನಡ · English
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {t("landing.noSmartphoneTitle")}
              </span>
            </div>
          </div>

          {/* Illustration of the tracking view (static, not live data) */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-line/60 bg-brand px-4 py-3 text-white">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                  {t("track.statusTitle")}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold">{t("common.demo")}</span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted">ID</p>
                    <p className="font-mono text-sm font-semibold text-brand">JNS-CGGH-2026-00104</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#ecd6ae] bg-warning-soft px-2 py-1 text-[11px] font-semibold text-warning">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    {t("status.in_progress")}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted">{t("common.category")}</dt>
                    <dd className="mt-0.5 font-medium text-brand">
                      {pick("Medicine availability", "ಔಷಧ ಲಭ್ಯತೆ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t("common.department")}</dt>
                    <dd className="mt-0.5 font-medium text-brand">Pharmacy</dd>
                  </div>
                </dl>

                <ol className="mt-5 space-y-0">
                  {[
                    { label: t("status.submitted"), done: true },
                    { label: t("status.assigned"), done: true },
                    { label: t("status.in_progress"), done: true, active: true },
                    { label: t("status.resolved"), done: false },
                  ].map((step, index, all) => (
                    <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
                      {index < all.length - 1 && (
                        <span
                          aria-hidden="true"
                          className={`absolute left-[9px] top-5 h-full w-px ${step.done ? "bg-info/50" : "bg-line"}`}
                        />
                      )}
                      <span
                        className={`relative z-10 mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border ${
                          step.done ? "border-info bg-info text-white" : "border-line bg-white text-line"
                        }`}
                      >
                        {step.done ? (
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-line" aria-hidden="true" />
                        )}
                      </span>
                      <span className={`text-xs ${step.active ? "font-semibold text-brand" : "text-ink-soft"}`}>
                        {step.label}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="card absolute -bottom-6 -left-4 hidden w-52 gap-2 p-3 sm:flex">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-success-soft text-success">
                <HeartPulse className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[11px] font-semibold text-brand">{t("landing.noSmartphoneTitle")}</p>
                <p className="text-[10px] leading-snug text-ink-soft">{t("landing.noSmartphoneText")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency notice */}
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <Alert tone="danger" className="flex flex-wrap items-start gap-2">
          <span className="font-semibold">{t("landing.emergencyTitle")}</span>
          <span>{t("landing.emergencyText")}</span>
        </Alert>
      </div>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-brand sm:text-[1.75rem]">{t("landing.howTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t("landing.howLead")}</p>
        </div>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="card relative p-5">
                <span className="absolute right-4 top-4 text-[2.2rem] font-bold leading-none text-[#eef2f3]">
                  0{index + 1}
                </span>
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand text-white">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-brand">{step.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{step.text}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Categories */}
      <section className="border-y border-line/60 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold text-brand sm:text-[1.75rem]">{t("landing.categoriesTitle")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t("landing.categoriesLead")}</p>
            </div>
            <Link to="/register" className="text-sm font-semibold text-info link-underline">
              {t("landing.heroCta")} →
            </Link>
          </div>

          {loadError && (
            <p className="mt-6 rounded-lg border border-line bg-page px-4 py-3 text-sm text-ink-soft">
              {t("errors.network")}
            </p>
          )}

          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <li key={index} className="card h-24 animate-pulse bg-page" aria-hidden="true" />
                ))
              : categories.map((category) => {
                  const Icon = categoryIcons[category.slug] ?? ClipboardList;
                  return (
                    <li key={category.id} className="group flex items-start gap-3 rounded-xl border border-line/70 bg-card p-4 transition hover:border-brand/40">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft-bg text-brand">
                        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-brand">{pick(category.name_en, category.name_kn)}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{category.description}</p>
                      </div>
                    </li>
                  );
                })}
          </ul>
        </div>
      </section>

      {/* Voice + language */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card overflow-hidden">
            <div className="bg-brand p-6 text-white">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10">
                <PhoneCall className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-xl font-semibold">{t("landing.voiceTitle")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/75">{t("landing.voiceLead")}</p>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md bg-white/10 px-2.5 py-1.5">{t("landing.helplineLabel")}</span>
                <span className="font-mono text-sm font-semibold">1800-000-000</span>
              </div>
            </div>
            <ul className="divide-y divide-line/50 px-5">
              {[t("landing.voicePoint1"), t("landing.voicePoint2"), t("landing.voicePoint3"), t("landing.voicePoint4")].map(
                (point) => (
                  <li key={point} className="flex items-start gap-2.5 py-3 text-[13px] text-ink-soft">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                    {point}
                  </li>
                ),
              )}
            </ul>
            <div className="border-t border-line/60 px-5 py-4">
              <Link to="/voice" className="inline-flex items-center gap-1.5 text-sm font-semibold text-info">
                {t("nav.voice")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="card p-6">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef3f4] text-brand">
              <Languages className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-semibold text-brand">{t("landing.languageTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t("landing.languageLead")}</p>
            <div className="mt-5 rounded-xl border border-line/70 bg-page p-4">
              <p className="kannada text-sm font-semibold text-brand">ನಿಮ್ಮ ಆಸ್ಪತ್ರೆ ಸೇವಾ ಸಮಸ್ಯೆಯನ್ನು ಇಲ್ಲಿ ದಾಖಲಿಸಿ.</p>
              <p className="mt-1 text-xs text-ink-soft">Your hospital service issue, recorded here.</p>
            </div>
            <ul className="mt-5 space-y-2.5">
              {[t("landing.languagePoint1"), t("landing.languagePoint2"), t("landing.languagePoint3")].map((point) => (
                <li key={point} className="flex items-start gap-2 text-[13px] text-ink-soft">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Transparency */}
      <section className="border-y border-line/60 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-success-soft text-success">
              <ListChecks className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-2xl font-bold text-brand">{t("landing.transparencyTitle")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{t("landing.transparencyLead")}</p>
            <Link
              to="/track"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-info link-underline"
            >
              {t("track.title")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              t("landing.transparencyPoint1"),
              t("landing.transparencyPoint2"),
              t("landing.transparencyPoint3"),
              t("landing.transparencyPoint4"),
            ].map((point) => (
              <li key={point} className="rounded-xl border border-line/70 bg-page p-4">
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                <p className="mt-2 text-[13px] font-medium leading-relaxed text-brand">{point}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-2xl bg-brand px-6 py-10 text-center text-white sm:px-10">
          <h2 className="mx-auto max-w-2xl text-2xl font-bold sm:text-3xl">{t("landing.ctaTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/75">{t("landing.ctaLead")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/register">
              <Button size="lg" className="border-white bg-white text-brand hover:bg-white/90">
                {t("landing.heroCta")}
              </Button>
            </Link>
            <Link to="/track">
              <Button size="lg" variant="ghost" className="border-white/40 text-white hover:bg-white/10">
                {t("landing.heroSecondary")}
              </Button>
            </Link>
          </div>
          <p className="mt-5 text-[11px] text-white/50">{t("landing.helplineNote")}</p>
        </div>
      </section>
    </>
  );
}
