import {
  Activity,
  AlarmClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FilePlus2,
  Inbox,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "../components/Button";
import { ComplaintTable } from "../components/ComplaintTable";
import { KpiCard } from "../components/KpiCard";
import { PageHeader, SectionCard } from "../components/SectionCard";
import { EmptyState, ErrorState, LoadingBlock } from "../components/States";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime, useI18n } from "../i18n";
import { dashboardApi, getErrorMessage } from "../services/api";
import type { DashboardData } from "../types";

const CATEGORY_COLORS = ["#081F26", "#356B8C", "#247A57", "#A96812", "#5F6464", "#2D7884", "#B33A3A"];

export function DashboardPage() {
  const { t, lang, pick } = useI18n();
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await dashboardApi.all(days));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary;
  const trendPoints = (data?.trends.points ?? []).map((point) => ({
    ...point,
    label: new Intl.DateTimeFormat(lang === "kn" ? "kn-IN" : "en-IN", { day: "2-digit", month: "short" }).format(
      new Date(point.date),
    ),
  }));

  return (
    <>
      <PageHeader
        eyebrow={t("dashboard.title")}
        title={t("dashboard.greeting", {
          name: (() => {
            const parts = (user?.full_name ?? "").split(" ").filter(Boolean);
            const first = parts[0] ?? "";
            return first.endsWith(".") ? parts[1] ?? first : first;
          })(),
        })}
        lead={t("dashboard.greetingSub", { hospital: user?.hospital_name ?? "" })}
        actions={
          <>
            <label className="sr-only" htmlFor="range">
              {t("reports.range")}
            </label>
            <select
              id="range"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="field-input min-h-10 w-auto py-1.5 text-sm"
            >
              <option value={7}>{t("reports.last7")}</option>
              <option value={30}>{t("reports.last30")}</option>
              <option value={90}>{t("reports.last90")}</option>
            </select>
            <Button variant="secondary" size="md" onClick={load} icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}>
              {t("common.refresh")}
            </Button>
            <Link to="/staff/register">
              <Button icon={<FilePlus2 className="h-4 w-4" aria-hidden="true" />}>{t("complaints.newComplaint")}</Button>
            </Link>
          </>
        }
      />

      {loading && !data && <LoadingBlock />}
      {error && !data && <ErrorState message={error} onRetry={load} />}

      {data && summary && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard label={t("dashboard.total")} value={summary.total} icon={ClipboardList} tone="neutral" />
            <KpiCard label={t("dashboard.new")} value={summary.new} icon={Inbox} tone="info" />
            <KpiCard
              label={t("dashboard.inProgress")}
              value={summary.in_progress}
              icon={Clock3}
              tone="info"
              hint={`${summary.unassigned} ${t("common.unassigned").toLowerCase()}`}
            />
            <KpiCard
              label={t("dashboard.overdue")}
              value={summary.overdue}
              icon={AlarmClock}
              tone={summary.overdue > 0 ? "danger" : "success"}
              hint={`${summary.pending} ${t("dashboard.pending").toLowerCase()}`}
            />
            <KpiCard
              label={t("dashboard.resolved")}
              value={summary.resolved + summary.closed}
              icon={CheckCircle2}
              tone="success"
              hint={`${summary.resolved_rate}% ${t("dashboard.resolvedRate").toLowerCase()}`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                  {t("dashboard.resolvedRate")}
                </p>
                <p className="mt-0.5 text-lg font-bold text-brand">{summary.resolved_rate}%</p>
              </div>
              <TrendingUp className="h-5 w-5 text-success" aria-hidden="true" />
            </div>
            <div className="card flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                  {t("dashboard.avgResolution")}
                </p>
                <p className="mt-0.5 text-lg font-bold text-brand">
                  {summary.avg_resolution_hours !== null
                    ? `${summary.avg_resolution_hours} ${t("common.hours")}`
                    : t("common.notAvailable")}
                </p>
              </div>
              <Clock3 className="h-5 w-5 text-info" aria-hidden="true" />
            </div>
            <div className="card flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                  {t("dashboard.unassigned")}
                </p>
                <p className="mt-0.5 text-lg font-bold text-brand">{summary.unassigned}</p>
              </div>
              <Inbox className="h-5 w-5 text-warning" aria-hidden="true" />
            </div>
          </div>

          {summary.total === 0 ? (
            <SectionCard>
              <EmptyState
                title={t("dashboard.emptyTitle")}
                text={t("dashboard.emptyText")}
                action={
                  <Link to="/staff/register">
                    <Button size="sm">{t("dashboard.emptyCta")}</Button>
                  </Link>
                }
              />
            </SectionCard>
          ) : (
            <>
              <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
                <SectionCard title={t("dashboard.trendTitle")} subtitle={t("dashboard.trendSub", { days })}>
                  <div className="h-[260px] w-full" role="img" aria-label={t("dashboard.trendTitle")}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendPoints} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="received" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#081F26" stopOpacity={0.22} />
                            <stop offset="100%" stopColor="#081F26" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="resolved" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#247A57" stopOpacity={0.22} />
                            <stop offset="100%" stopColor="#247A57" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e9eb" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5F6464" }} tickLine={false} axisLine={false} minTickGap={24} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5F6464" }} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: 10, borderColor: "#ADBCCB", fontSize: 12 }}
                          formatter={(value: number, name: string) => [value, name]}
                        />
                        <Area type="monotone" dataKey="received" name={t("dashboard.received")} stroke="#081F26" strokeWidth={2} fill="url(#received)" />
                        <Area type="monotone" dataKey="resolved" name={t("dashboard.resolvedSeries")} stroke="#247A57" strokeWidth={2} fill="url(#resolved)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-soft">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-brand" aria-hidden="true" /> {t("dashboard.received")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" /> {t("dashboard.resolvedSeries")}
                    </span>
                  </div>
                </SectionCard>

                <SectionCard title={t("dashboard.categoryTitle")} subtitle={t("dashboard.categorySub")}>
                  {data.trends.by_category.length === 0 ? (
                    <p className="py-10 text-center text-sm text-ink-soft">{t("dashboard.chartsUnavailable")}</p>
                  ) : (
                    <div className="h-[260px] w-full" role="img" aria-label={t("dashboard.categoryTitle")}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={data.trends.by_category.map((item) => ({
                            name: pick(item.name, item.name_kn),
                            value: item.value,
                          }))}
                          layout="vertical"
                          margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e9eb" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#5F6464" }} axisLine={false} tickLine={false} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={118}
                            tick={{ fontSize: 11, fill: "#5F6464" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#ADBCCB", fontSize: 12 }} />
                          <Bar dataKey="value" name={t("dashboard.total")} radius={[0, 4, 4, 0]} barSize={16}>
                            {data.trends.by_category.map((_, index) => (
                              <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
                <SectionCard
                  title={t("dashboard.recentTitle")}
                  subtitle={t("dashboard.recentSub")}
                  action={
                    <Link to="/staff/complaints" className="text-xs font-semibold text-info link-underline">
                      {t("common.viewAll")}
                    </Link>
                  }
                  bodyClassName="p-0"
                >
                  <ComplaintTable
                    items={data.recent}
                    emptyTitle={t("dashboard.emptyTitle")}
                    emptyText={t("dashboard.emptyText")}
                  />
                </SectionCard>

                <div className="space-y-5">
                  <SectionCard
                    title={t("dashboard.overdueTitle")}
                    subtitle={t("dashboard.overdueSub", { hours: summary.followup_hours })}
                    action={
                      <Link to="/staff/follow-ups" className="text-xs font-semibold text-info link-underline">
                        {t("dashboard.viewQueue")}
                      </Link>
                    }
                  >
                    {data.overdue.length === 0 ? (
                      <p className="rounded-lg bg-success-soft px-3 py-4 text-xs leading-relaxed text-success">
                        {t("dashboard.noOverdue")}
                      </p>
                    ) : (
                      <ul className="space-y-2.5">
                        {data.overdue.slice(0, 4).map((item) => (
                          <li key={item.reference_id}>
                            <Link
                              to={`/staff/complaints/${item.reference_id}`}
                              className="flex items-center justify-between gap-3 rounded-lg border border-[#ecd6ae] bg-warning-soft/60 px-3 py-2.5 hover:border-warning"
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-mono text-xs font-semibold text-brand">
                                  {item.reference_id}
                                </span>
                                <span className="mt-0.5 block truncate text-[11px] text-ink-soft">
                                  {pick(item.category.name_en, item.category.name_kn)} · {Math.round(item.age_hours)}h
                                </span>
                              </span>
                              <AlarmClock className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>

                  <SectionCard
                    title={t("dashboard.activityTitle")}
                    bodyClassName="px-5 py-4"
                  >
                    {data.activity.length === 0 ? (
                      <p className="text-xs text-ink-soft">{t("dashboard.noPending")}</p>
                    ) : (
                      <ul className="space-y-3">
                        {data.activity.slice(0, 6).map((item, index) => (
                          <li key={`${item.reference_id}-${index}`} className="flex gap-2.5">
                            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft-bg">
                              <Activity className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[12px] leading-snug text-brand">
                                <Link to={`/staff/complaints/${item.reference_id}`} className="font-semibold link-underline">
                                  {item.reference_id}
                                </Link>{" "}
                                · {item.action}
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted">
                                {item.actor ?? "System"} · {formatDateTime(item.created_at, lang)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
