import {
  AlarmClock,
  BarChart3,
  ChevronDown,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { Logo } from "../components/Logo";
import { NotificationBell } from "../components/NotificationBell";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../i18n";
import { cn } from "../utils/cn";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Array<"admin" | "officer" | "operator">;
}

export function StaffLayout() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const nav: NavItem[] = [
    { to: "/staff/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard, roles: ["admin"] },
    { to: "/staff/officer", label: t("nav.officerQueue"), icon: ShieldCheck, roles: ["admin", "officer"] },
    { to: "/staff/complaints", label: t("nav.complaints"), icon: FileText, roles: ["admin", "officer", "operator"] },
    { to: "/staff/register", label: t("nav.newComplaint"), icon: FilePlus2, roles: ["admin", "operator"] },
    { to: "/staff/follow-ups", label: t("nav.followUps"), icon: AlarmClock, roles: ["admin", "officer"] },
    { to: "/staff/reports", label: t("nav.reports"), icon: BarChart3, roles: ["admin"] },
    { to: "/staff/settings", label: t("nav.settings"), icon: Settings, roles: ["admin"] },
  ];

  const visible = nav.filter((item) => item.roles.includes(user.role));
  const initials = user.full_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col bg-brand text-white">
      <div className="flex items-center justify-between px-5 py-5">
        <Link to="/staff" aria-label="JANASEVA staff home">
          <Logo variant="light" />
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label={t("common.close")}
          className="grid h-9 w-9 place-items-center rounded-lg text-white/70 hover:bg-white/10 lg:hidden"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mx-4 mb-4 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">{t("common.hospital")}</p>
        <p className="mt-0.5 text-[13px] font-semibold leading-snug text-white">{user.hospital_name}</p>
      </div>

      <nav aria-label="Staff navigation" className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-0.5">
          {visible.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                      isActive ? "bg-white text-brand" : "text-white/75 hover:bg-white/10 hover:text-white",
                    )
                  }
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-xs font-bold text-white">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white">{user.full_name}</p>
            <p className="truncate text-[11px] text-white/60">{t(`roles.${user.role}`)}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            aria-label={t("nav.logout")}
            title={t("nav.logout")}
            className="grid h-9 w-9 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <Link
          to="/"
          className="mt-1 block rounded-lg px-3 py-2 text-[11px] font-medium text-white/55 hover:bg-white/10 hover:text-white"
        >
          {t("nav.backToSite")} ↗
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-page">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("common.close")}
            className="absolute inset-0 bg-brand/50"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[17rem] shadow-[var(--shadow-float)]">{sidebar}</div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line/70 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label={t("nav.menu")}
                aria-expanded={drawerOpen}
                className="grid h-10 w-10 place-items-center rounded-lg border border-line text-brand lg:hidden"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {t("common.hospital")} · {user.hospital_name}
                </p>
                <p className="truncate text-sm font-semibold text-brand">{t("common.tagline")}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LanguageSwitch className="hidden sm:inline-flex" />
              <NotificationBell />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((value) => !value)}
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-lg border border-line bg-white px-2 py-1.5 hover:bg-page"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-[11px] font-bold text-white">
                    {initials}
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block text-xs font-semibold text-brand">{user.full_name}</span>
                    <span className="block text-[10px] text-ink-soft">{t(`roles.${user.role}`)}</span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-ink-soft" aria-hidden="true" />
                </button>
                {profileOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-card shadow-[var(--shadow-float)]"
                  >
                    <div className="border-b border-line/60 px-4 py-3">
                      <p className="text-sm font-semibold text-brand">{user.full_name}</p>
                      <p className="break-all text-xs text-ink-soft">{user.email}</p>
                      <p className="mt-1 text-[11px] text-info">{t(`roles.${user.role}`)}</p>
                    </div>
                    <div className="px-2 py-1.5 sm:hidden">
                      <LanguageSwitch />
                    </div>
                    <Link
                      to="/"
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm text-ink-soft hover:bg-page"
                    >
                      {t("nav.backToSite")}
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        logout();
                        navigate("/login");
                      }}
                      className="flex w-full items-center gap-2 border-t border-line/60 px-4 py-2.5 text-left text-sm font-medium text-danger hover:bg-page"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      {t("nav.logout")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
