import { BarChart3, Download, PieChart as PieIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, SectionCard } from "../components/SectionCard";
import { EmptyState, ErrorState, LoadingBlock } from "../components/States";
import { useI18n } from "../i18n";
import { dashboardApi, getErrorMessage } from "../services/api";
import type { DashboardSummary, Trends } from "../types";

const COLORS = ["#081F26", "#356B8C", "#247A57", "#A96812", "#B33A3A", "#2D7884", "#5F6464"];

export function ReportsPage() {
  const { t, lang, pick } = useI18n();
  const [days, setDays] = useState(30);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [trendData, summaryData] = await Promise.all([
        dashboardApi.trends(days),
        dashboardApi.summary(),
      ]);
      setTrends(trendData);
      setSummary(summaryData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const totalCategories = (trends?.by_category ?? []).reduce((sum, item) => sum + item.value, 0);
  const rangeLabel = days === 7 ? t("reports.last7") : days === 90 ? t("reports.last90") : t("reports.last30");

  const exportCsv = () => {
    if (!trends) return;
    const rows = [
      ["Complaint category", "Complaints"],
      ...trends.by_category.map((item) => [item.name, String(item.value)]),
      [],
      ["Department", "Complaints"],
      ...trends.by_department.map((item) => [item.name, String(item.value)]),
      [],
      ["Status", "Complaints"],
      ...trends.by_status.map((item) => [item.name, String(item.value)]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `janaseva-report-${days}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title={t("reports.title")}
        lead={t("reports.lead")}
        actions={
          <>
            <label className="sr-only" htmlFor="report-range">
              {t("reports.range")}
            </label>
            <select
              id="report-range"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="field-input min-h-10 w-auto py-1.5 text-sm"
            >
              <option value={7}>{t("reports.last7")}</option>
              <option value={30}>{t("reports.last30")}</option>
              <option value={90}>{t("reports.last90")}</option>
            </select>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!trends || trends.by_category.length === 0}
              className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-line bg-white px-4 text-sm font-semibold text-brand disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              CSV
            </button>
          </>
        }
      />

      {loading && !trends && <LoadingBlock />}
      {error && !trends && <ErrorState message={error} onRetry={load} />}

      {trends && summary && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{t("reports.total")}</p>
              <p className="mt-1 text-2xl font-bold text-brand">{summary.total}</p>
            </div>
            <div className="card px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{t("reports.rate")}</p>
              <p className="mt-1 text-2xl font-bold text-success">{summary.resolved_rate}%</p>
              <p className="mt-0.5 text-[11px] text-ink-soft">{t("reports.notResolved")}</p>
            </div>
            <div className="card px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{t("reports.avg")}</p>
              <p className="mt-1 text-2xl font-bold text-brand">
                {summary.avg_resolution_hours !== null
                  ? `${summary.avg_resolution_hours} ${t("common.hours")}`
                  : t("common.notAvailable")}
              </p>
            </div>
          </div>

          {trends.by_category.length === 0 ? (
            <SectionCard>
              <EmptyState title={t("reports.empty")} text={t("reports.emptyText")} icon={<BarChart3 className="h-6 w-6" />} />
            </SectionCard>
          ) : (
            <>
              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title={t("reports.statusDist")} subtitle={t("reports.summarySub")}>
                  <div className="h-[280px] w-full" role="img" aria-label={t("reports.statusDist")}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={trends.by_status}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={2}
                        >
                          {trends.by_status.map((entry, index) => (
                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#ADBCCB", fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                    {trends.by_status.map((entry, index) => (
                      <li key={entry.name} className="flex items-center gap-2 text-xs text-ink-soft">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          aria-hidden="true"
                        />
                        <span className="flex-1">{entry.name}</span>
                        <span className="font-semibold text-brand">{entry.value}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>

                <SectionCard title={t("reports.categoryDist")} subtitle={`${t("reports.summarySub")} · ${totalCategories}`}>
                  <div className="h-[280px] w-full" role="img" aria-label={t("reports.categoryDist")}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={trends.by_category.map((item) => ({
                          name: pick(item.name, item.name_kn),
                          value: item.value,
                        }))}
                        margin={{ top: 4, right: 8, left: -20, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e9eb" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "#5F6464" }}
                          angle={-18}
                          textAnchor="end"
                          interval={0}
                          axisLine={false}
                          tickLine={false}
                          height={60}
                        />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5F6464" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#ADBCCB", fontSize: 12 }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={26}>
                          {trends.by_category.map((entry, index) => (
                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
                <SectionCard title={t("reports.categoryTable")} bodyClassName="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-line/60 bg-page/60 text-[11px] uppercase tracking-wide text-ink-soft">
                          <th className="px-4 py-2.5 font-semibold">{t("reports.categoryCol")}</th>
                          <th className="px-4 py-2.5 text-right font-semibold">{t("reports.countCol")}</th>
                          <th className="px-4 py-2.5 text-right font-semibold">{t("reports.shareCol")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trends.by_category.map((entry) => (
                          <tr key={entry.name} className="border-b border-line/40 last:border-0">
                            <td className="px-4 py-2.5 text-brand">{pick(entry.name, entry.name_kn)}</td>
                            <td className="px-4 py-2.5 text-right font-medium text-brand">{entry.value}</td>
                            <td className="px-4 py-2.5 text-right text-ink-soft">
                              {totalCategories ? Math.round((entry.value / totalCategories) * 100) : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>

                <SectionCard title={t("reports.deptDist")} subtitle={t("reports.summarySub")}>
                  <ul className="space-y-3">
                    {trends.by_department.map((entry) => {
                      const max = Math.max(...trends.by_department.map((item) => item.value), 1);
                      return (
                        <li key={entry.name}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-brand">{entry.name}</span>
                            <span className="font-semibold text-ink-soft">{entry.value}</span>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-page">
                            <div
                              className="h-full rounded-full bg-info"
                              style={{ width: `${(entry.value / max) * 100}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </SectionCard>
              </div>

              <p className="flex items-center gap-1.5 text-[11px] text-muted">
                <PieIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {t("reports.range")}: {rangeLabel} · {lang === "kn" ? "ಕನ್ನಡ" : "English"}
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
