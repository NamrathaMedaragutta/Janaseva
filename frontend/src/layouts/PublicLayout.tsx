import { Menu, Phone, ShieldCheck, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { Logo } from "../components/Logo";
import { useI18n } from "../i18n";

export function PublicLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const links = [
    { to: "/", label: t("nav.home"), end: true },
    { to: "/register", label: t("nav.report") },
    { to: "/track", label: t("nav.track") },
    { to: "/voice", label: t("nav.voice") },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      <div className="bg-brand text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-[11px] sm:px-6">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#9BD3C6]" aria-hidden="true" />
            {t("common.emergencyShort")}
          </p>
          <p className="hidden items-center gap-1.5 sm:flex">
            <Phone className="h-3.5 w-3.5 text-[#9BD3C6]" aria-hidden="true" />
            {t("landing.helplineLabel")}: 1800-000-000 (demo)
          </p>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-line/70 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" aria-label="JANASEVA home">
            <Logo />
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-brand-soft-bg text-brand" : "text-ink-soft hover:bg-page hover:text-brand"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitch className="hidden sm:inline-flex" />
            <Link
              to="/login"
              className="hidden min-h-10 items-center rounded-lg border border-brand px-3.5 text-sm font-semibold text-brand hover:bg-brand hover:text-white sm:inline-flex"
            >
              {t("nav.staffLogin")}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
              aria-controls="public-mobile-nav"
              aria-label={t("nav.menu")}
              className="grid h-10 w-10 place-items-center rounded-lg border border-line text-brand lg:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id="public-mobile-nav" aria-label="Mobile navigation" className="border-t border-line/70 bg-white px-4 py-3 lg:hidden">
            <ul className="flex flex-col gap-1">
              {links.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      `block rounded-lg px-3 py-2.5 text-sm font-medium ${
                        isActive ? "bg-brand-soft-bg text-brand" : "text-ink-soft"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
              <li>
                <Link to="/login" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-brand">
                  {t("nav.staffLogin")}
                </Link>
              </li>
              <li className="px-1 pt-2">
                <LanguageSwitch />
              </li>
            </ul>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="mt-16 border-t border-line/70 bg-brand text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo variant="light" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">{t("landing.footerAbout")}</p>
            <p className="mt-3 text-xs text-white/50">{t("common.tagline")}</p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
              {t("landing.footerQuickLinks")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link className="text-white/85 hover:text-white" to="/register">{t("nav.report")}</Link></li>
              <li><Link className="text-white/85 hover:text-white" to="/track">{t("nav.track")}</Link></li>
              <li><Link className="text-white/85 hover:text-white" to="/voice">{t("nav.voice")}</Link></li>
              <li><Link className="text-white/85 hover:text-white" to="/login">{t("nav.staffLogin")}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
              {t("landing.footerContact")}
            </h2>
            <address className="mt-3 space-y-1.5 text-sm not-italic text-white/80">
              <p>Chinnaswamy Government General Hospital</p>
              <p>Sampangi Rama Nagar, Bengaluru 560027</p>
              <p>+91 80 2222 1000</p>
              <p className="text-white/60">helpdesk@janaseva.gov.in</p>
            </address>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 text-[11px] text-white/50 sm:flex-row sm:items-center sm:justify-between">
            <p>{t("landing.footerDisclaimer")}</p>
            <p>© 2026 JANASEVA · SOLVATHON 2026 · PS1</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
