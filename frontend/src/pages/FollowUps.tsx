import { AlarmClock, BellRing, ArrowUpRight, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/Badge";
import { Button } from "../components/Button";
import { Field, TextArea } from "../components/Field";
import { Modal } from "../components/Modal";
import { PageHeader, SectionCard } from "../components/SectionCard";
import { Alert, EmptyState, ErrorState, LoadingBlock } from "../components/States";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime, formatAge, useI18n } from "../i18n";
import { followUpApi, getErrorMessage } from "../services/api";
import type { FollowUpItem, FollowUpResponse } from "../types";
import { cn } from "../utils/cn";

type Tab = "overdue" | "pending";
type ActionKind = "remind" | "escalate";

export function FollowUpsPage() {
  const { t, lang, pick } = useI18n();
  const { user } = useAuth();
  const [data, setData] = useState<FollowUpResponse | null>(null);
  const [tab, setTab] = useState<Tab>("overdue");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<{ item: FollowUpItem; kind: ActionKind } | null>(null);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await followUpApi.list());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitAction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!action) return;
    if (reason.trim().length < 3) {
      setActionError(t("followups.reasonLabel"));
      return;
    }
    setWorking(true);
    setActionError(null);
    try {
      if (action.kind === "remind") {
        await followUpApi.remind(action.item.reference_id, reason.trim());
        setMessage(t("followups.reminderSuccess"));
      } else {
        await followUpApi.escalate(action.item.reference_id, reason.trim());
        setMessage(t("followups.escalationSuccess"));
      }
      setAction(null);
      setReason("");
      await load();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  const items = tab === "overdue" ? data?.overdue ?? [] : data?.pending ?? [];

  return (
    <>
      <PageHeader
        title={t("followups.title")}
        lead={t("followups.lead")}
        actions={
          <Button onClick={load} icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}>
            {t("common.refresh")}
          </Button>
        }
      />

      {message && (
        <Alert tone="success" className="mb-4">
          {message}
        </Alert>
      )}
      {error && !data && <ErrorState message={error} onRetry={load} />}
      {loading && !data && <LoadingBlock />}

      {data && (
        <div className="space-y-5">
          <div className="rounded-xl border border-line/70 bg-white px-4 py-3 text-xs leading-relaxed text-ink-soft">
            {t("followups.thresholdNote", {
              followup: data.followup_hours,
              escalation: data.escalation_hours,
            })}
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("followups.title")}>
            {(
              [
                { key: "overdue" as Tab, label: t("followups.overdue"), count: data.counts.overdue },
                { key: "pending" as Tab, label: t("followups.pending"), count: data.counts.pending },
              ]
            ).map((item) => (
              <button
                key={item.key}
                role="tab"
                type="button"
                aria-selected={tab === item.key}
                onClick={() => setTab(item.key)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold",
                  tab === item.key
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-white text-ink-soft hover:border-brand/40",
                )}
              >
                {item.key === "overdue" ? (
                  <AlarmClock className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <BellRing className="h-4 w-4" aria-hidden="true" />
                )}
                {item.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px]",
                    tab === item.key ? "bg-white/15" : "bg-page",
                  )}
                >
                  {item.count}
                </span>
              </button>
            ))}
          </div>

          <SectionCard
            title={tab === "overdue" ? t("followups.overdue") : t("followups.pending")}
            subtitle={tab === "overdue" ? t("followups.overdueSub") : t("followups.pendingSub")}
            bodyClassName="p-0"
          >
            {items.length === 0 ? (
              <EmptyState title={t("followups.empty")} text={t("followups.emptyText")} />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[900px] text-left">
                    <thead>
                      <tr className="border-b border-line/60 bg-page/60 text-[11px] uppercase tracking-wide text-ink-soft">
                        <th className="px-4 py-2.5 font-semibold">{t("complaints.id")}</th>
                        <th className="px-4 py-2.5 font-semibold">{t("common.department")}</th>
                        <th className="px-4 py-2.5 font-semibold">{t("followups.assigned")}</th>
                        <th className="px-4 py-2.5 font-semibold">{t("followups.age")}</th>
                        <th className="px-4 py-2.5 font-semibold">{t("followups.lastUpdate")}</th>
                        <th className="px-4 py-2.5 font-semibold">{t("followups.escalation")}</th>
                        <th className="px-4 py-2.5 font-semibold">{t("common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.reference_id} className="border-b border-line/40 last:border-0 hover:bg-page/50">
                          <td className="px-4 py-3">
                            <Link
                              to={`/staff/complaints/${item.reference_id}`}
                              className="font-mono text-xs font-semibold text-brand link-underline"
                            >
                              {item.reference_id}
                            </Link>
                            <div className="mt-1 flex items-center gap-2">
                              <StatusBadge status={item.status} />
                            </div>
                            <p className="mt-1 text-[11px] text-ink-soft">
                              {pick(item.category_name, item.category_name_kn)}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-sm text-ink-soft">{item.department_name ?? "—"}</td>
                          <td className="px-4 py-3 text-sm text-ink-soft">
                            {item.assigned_officer_name ?? t("common.unassigned")}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-warning">
                            {formatAge(item.age_hours, t)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">
                            {formatDateTime(item.updated_at, lang)}
                          </td>
                          <td className="px-4 py-3">
                            {item.escalation_level > 0 ? (
                              <span className="inline-flex flex-col gap-0.5">
                                <span className="w-fit rounded-full border border-[#e3bcbc] bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">
                                  {t("followups.level", { level: item.escalation_level })}
                                </span>
                                <span className="text-[10px] text-muted">
                                  {item.escalation_status === "open" ? t("followups.open") : t("followups.resolvedEsc")}
                                </span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted">{t("followups.noEscalation")}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setAction({ item, kind: "remind" });
                                  setReason("");
                                  setActionError(null);
                                }}
                              >
                                {t("followups.remind")}
                              </Button>
                              {user?.role === "admin" && (
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => {
                                    setAction({ item, kind: "escalate" });
                                    setReason("");
                                    setActionError(null);
                                  }}
                                  icon={<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />}
                                >
                                  {t("followups.escalate")}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="divide-y divide-line/50 md:hidden">
                  {items.map((item) => (
                    <li key={item.reference_id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/staff/complaints/${item.reference_id}`}
                          className="font-mono text-xs font-semibold text-brand link-underline"
                        >
                          {item.reference_id}
                        </Link>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="mt-1 text-sm text-ink-soft">{pick(item.category_name, item.category_name_kn)}</p>
                      <p className="mt-1 text-xs text-ink-soft">
                        {item.department_name ?? "—"} · {item.assigned_officer_name ?? t("common.unassigned")}
                      </p>
                      <p className="mt-1 text-xs font-medium text-warning">
                        {formatAge(item.age_hours, t)} · {formatDateTime(item.updated_at, lang)}
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setAction({ item, kind: "remind" });
                            setReason("");
                            setActionError(null);
                          }}
                        >
                          {t("followups.remind")}
                        </Button>
                        {user?.role === "admin" && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setAction({ item, kind: "escalate" });
                              setReason("");
                              setActionError(null);
                            }}
                          >
                            {t("followups.escalate")}
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </SectionCard>
        </div>
      )}

      <Modal
        open={Boolean(action)}
        onClose={() => setAction(null)}
        title={action?.kind === "escalate" ? t("followups.confirmEscalate") : t("followups.remind")}
        description={action?.item.reference_id}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAction(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant={action?.kind === "escalate" ? "danger" : "primary"}
              onClick={submitAction}
              loading={working}
              type="submit"
              form="followup-action-form"
            >
              {action?.kind === "escalate" ? t("followups.confirmEscalate") : t("followups.sendReminder")}
            </Button>
          </>
        }
      >
        <form id="followup-action-form" onSubmit={submitAction} className="space-y-3">
          <Field label={t("followups.reasonLabel")} htmlFor="reason" required error={actionError ?? undefined}>
            <TextArea
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("followups.reasonPlaceholder")}
              maxLength={500}
            />
          </Field>
          <p className="text-[11px] text-ink-soft">{t("followups.thresholdNote", {
            followup: data?.followup_hours ?? 48,
            escalation: data?.escalation_hours ?? 96,
          })}</p>
        </form>
      </Modal>
    </>
  );
}
