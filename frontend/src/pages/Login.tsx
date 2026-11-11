import { ArrowLeft, KeyRound, Lock, LogIn, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { Alert } from "../components/States";
import { Field, TextInput } from "../components/Field";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { Logo } from "../components/Logo";
import { useAuth } from "../hooks/useAuth";
import { roleHome } from "../layouts/RequireAuth";
import { useI18n } from "../i18n";
import { getErrorMessage } from "../services/api";

const DEMO_PASSWORD = "Janaseva@123";

const demoAccounts = [
  { email: "admin@janaseva.gov.in", roleKey: "login.roleAdmin", name: "Dr. Ananya Rao" },
  { email: "pharmacy.officer@janaseva.gov.in", roleKey: "login.roleOfficer", name: "Shivakumar B. Gowda" },
  { email: "helpdesk@janaseva.gov.in", roleKey: "login.roleOperator", name: "Priya Shetty" },
];

export function LoginPage() {
  const { t } = useI18n();
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user && !loading) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? roleHome(user.role)} replace />;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const signedIn = await login(email.trim(), password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? roleHome(signedIn.role), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const useAccount = (accountEmail: string) => {
    setEmail(accountEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  return (
    <div className="grid min-h-screen bg-page lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden overflow-hidden bg-brand px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-[#123c46] blur-2xl"
        />
        <div className="relative">
          <Logo variant="light" />
          <h1 className="mt-14 max-w-sm text-3xl font-bold leading-tight">{t("landing.heroTitle")}</h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">{t("landing.footerAbout")}</p>

          <ul className="mt-10 space-y-4 text-sm">
            {[
              { icon: ShieldCheck, text: t("login.securityNote") },
              { icon: UserRound, text: t("settings.usersLead") },
              { icon: KeyRound, text: t("landing.transparencyPoint1") },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.text} className="flex items-start gap-3 text-white/80">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {item.text}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative">
          <p className="rounded-lg border border-white/15 bg-white/5 p-3 text-[11px] leading-relaxed text-white/60">
            {t("common.emergencyShort")}
          </p>
          <p className="mt-4 text-[11px] text-white/40">SOLVATHON 2026 · PS1 · Prototype</p>
        </div>
      </aside>

      <main className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-ink-soft hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("login.backToSite")}
          </Link>
          <LanguageSwitch />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-brand lg:mt-0">{t("login.title")}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{t("login.lead")}</p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <Field label={t("login.email")} htmlFor="email" required>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <TextInput
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-9"
                  autoComplete="username"
                  placeholder="admin@janaseva.gov.in"
                  required
                />
              </div>
            </Field>

            <Field label={t("login.password")} htmlFor="password" required>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <TextInput
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-9"
                  autoComplete="current-password"
                  required
                />
              </div>
            </Field>

            {error && (
              <Alert tone="danger" className="flex items-start gap-2">
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={submitting}
              icon={<LogIn className="h-[18px] w-[18px]" aria-hidden="true" />}
            >
              {submitting ? t("login.signingIn") : t("login.signIn")}
            </Button>
          </form>

          <div className="mt-7 rounded-xl border border-line/80 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-brand">{t("login.demoAccounts")}</p>
              <span className="rounded-full bg-brand-soft-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                {t("common.demo")}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{t("login.demoNote")}</p>
            <ul className="mt-3 space-y-1.5">
              {demoAccounts.map((account) => (
                <li key={account.email}>
                  <button
                    type="button"
                    onClick={() => useAccount(account.email)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-line/70 px-3 py-2 text-left transition hover:border-brand/50 hover:bg-page"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-brand">{account.name}</span>
                      <span className="block truncate text-[11px] text-ink-soft">{account.email}</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-info">
                      {t(account.roleKey)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-muted">
              Password for all demo accounts: <code className="font-mono text-brand">{DEMO_PASSWORD}</code>
            </p>
          </div>

          <p className="mt-6 text-center text-[11px] text-muted">{t("login.securityNote")}</p>
        </div>
      </main>
    </div>
  );
}
