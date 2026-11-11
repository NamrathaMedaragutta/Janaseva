import { AlarmClock, CheckCircle2, ClipboardList, Clock3, Inbox, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { ComplaintTable } from "../components/ComplaintTable";
import { KpiCard } from "../components/KpiCard";
import { PageHeader, SectionCard } from "../components/SectionCard";
import { EmptyState, ErrorState, LoadingBlock } from "../components/States";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../i18n";
import { complaintApi, dashboardApi, followUpApi, getErrorMessage } from "../services/api";
import type { ComplaintListItem, DashboardData, FollowUpResponse } from "../types";

export function OfficerPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [followups, setFollowups] = useState<FollowUpResponse | null>(null);
  const [queue, setQueue] = useState<ComplaintListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, follow, assigned] = await Promise.all([
        dashboardApi.all(30),
        followUpApi.list(),
        complaintApi.list({ assigned_to_me: true, sort: "oldest", page_size: 20 }),
      ]);
      setDashboard(dash);
      setFollowups(follow);
      setQueue(assigned.items);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = dashboard?.summary;

  return (
    <>
      <PageHeader
        title={t("officer.title")}
        lead={t("officer.lead", { department: user?.department_name ?? t("officer.departmentLabel") })}
        actions={
          <>
            <Link to="/staff/follow-ups">
              <Button variant="secondary" icon={<AlarmClock className="h-4 w-4" aria-hidden="true" />}>
                {t("nav.followUps")}
              </Button>
            </Link>
            <Button onClick={load} icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}>
              {t("common.refresh")}
            </Button>
          </>
        }
      />

      {loading && !dashboard && <LoadingBlock />}
      {error && !dashboard && <ErrorState message={error} onRetry={load} />}

      {dashboard && summary && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard label={t("officer.assigned")} value={queue.length} icon={ClipboardList} tone="neutral" />
            <KpiCard label={t("officer.new")} value={summary.new} icon={Inbox} tone="info" />
            <KpiCard label={t("officer.inProgress")} value={summary.in_progress} icon={Clock3} tone="info" />
            <KpiCard
              label={t("officer.followUp")}
              value={followups?.counts.pending ?? 0}
              icon={CheckCircle2}
              tone="warning"
            />
            <KpiCard
              label={t("officer.overdue")}
              value={summary.overdue}
              icon={AlarmClock}
              tone={summary.overdue > 0 ? "danger" : "success"}
              hint={`${summary.resolved} ${t("dashboard.resolved").toLowerCase()}`}
            />
          </div>

          {followups && followups.overdue.length > 0 && (
            <div className="rounded-xl border border-[#ecd6ae] bg-warning-soft px-4 py-3">
              <p className="text-sm font-semibold text-[#7c4c0d]">
                {t("dashboard.overdueTitle")} · {followups.overdue.length}
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {followups.overdue.slice(0, 5).map((item) => (
                  <li key={item.reference_id}>
                    <Link
                      to={`/staff/complaints/${item.reference_id}`}
                      className="inline-flex rounded-md border border-[#ecd6ae] bg-white px-2 py-1 font-mono text-[11px] font-semibold text-brand hover:border-warning"
                    >
                      {item.reference_id}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <SectionCard title={t("officer.queueTitle")} subtitle={t("officer.queueSub")} bodyClassName="p-0">
            {queue.length === 0 ? (
              <EmptyState
                title={t("officer.empty")}
                text={t("officer.emptyText")}
                action={<Link to="/staff/complaints"><Button size="sm" variant="secondary">{t("nav.complaints")}</Button></Link>}
              />
            ) : (
              <ComplaintTable items={queue} emptyTitle={t("officer.empty")} emptyText={t("officer.emptyText")} />
            )}
          </SectionCard>

          <SectionCard title={t("dashboard.recentTitle")} subtitle={t("dashboard.recentSub")} bodyClassName="p-0">
            <ComplaintTable
              items={dashboard.recent}
              emptyTitle={t("dashboard.emptyTitle")}
              emptyText={t("dashboard.emptyText")}
            />
          </SectionCard>
        </div>
      )}
    </>
  );
}
