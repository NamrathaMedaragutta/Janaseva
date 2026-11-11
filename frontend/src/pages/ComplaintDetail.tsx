import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileLock2,
  Globe2,
  Lock,
  MessageSquarePlus,
  Phone,
  RefreshCw,
  UserCheck,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StatusBadge } from "../components/Badge";
import { Button } from "../components/Button";
import { Checkbox, Field, Select, TextArea } from "../components/Field";
import { SectionCard } from "../components/SectionCard";
import { Alert, ErrorState, LoadingBlock } from "../components/States";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime, formatAge, useI18n } from "../i18n";
import { complaintApi, getErrorMessage } from "../services/api";
import type { ComplaintDetail, ComplaintStatus, FilterOptions } from "../types";

const TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  submitted: ["acknowledged", "assigned", "needs_review"],
  acknowledged: ["assigned", "in_progress", "needs_review"],
  assigned: ["in_progress", "needs_review"],
  in_progress: ["resolved", "needs_review"],
  needs_review: ["acknowledged", "assigned", "in_progress"],
  resolved: ["closed", "reopened"],
  closed: ["reopened"],
  reopened: ["assigned", "in_progress", "resolved"],
};

const OFFICER_ALLOWED: ComplaintStatus[] = ["acknowledged", "in_progress", "resolved", "needs_review"];

export function ComplaintDetailPage() {
  const { referenceId = "" } = useParams();
  const { t, lang, pick } = useI18n();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [officerId, setOfficerId] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  const [nextStatus, setNextStatus] = useState<ComplaintStatus | "">("");
  const [statusNote, setStatusNote] = useState("");
  const [resolution, setResolution] = useState("");
  const [updating, setUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [notePublic, setNotePublic] = useState(true);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteMessage, setNoteMessage] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await complaintApi.get(referenceId);
      setComplaint(data);
      setOfficerId(data.assigned_officer?.id ?? "");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [referenceId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (user?.role === "admin") {
      complaintApi.filterOptions().then(setOptions).catch(() => setOptions(null));
    }
  }, [user?.role]);

  const availableStatuses = useMemo(() => {
    if (!complaint || !user) return [];
    const candidates = TRANSITIONS[complaint.status] ?? [];
    if (user.role === "admin") return candidates;
    if (user.role === "officer") return candidates.filter((status) => OFFICER_ALLOWED.includes(status));
    return [];
  }, [complaint, user]);

  useEffect(() => {
    if (availableStatuses.length > 0 && !availableStatuses.includes(nextStatus as ComplaintStatus)) {
      setNextStatus(availableStatuses[0]);
    }
  }, [availableStatuses, nextStatus]);

  if (loading && !complaint) return <LoadingBlock />;
  if (error) {
    return (
      <div className="mx-auto max-w-xl">
        <ErrorState message={error} onRetry={load} />
        <Link to="/staff/complaints" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-info">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("detail.back")}
        </Link>
      </div>
    );
  }
  if (!complaint) return null;

  const canManage = user?.role === "admin" || user?.role === "officer";

  const submitAssignment = async (event: React.FormEvent) => {
    event.preventDefault();
    setAssigning(true);
    setAssignMessage(null);
    setAssignError(null);
    try {
      const updated = await complaintApi.assign(referenceId, officerId || null, assignNote.trim() || undefined);
      setComplaint(updated);
      setOfficerId(updated.assigned_officer?.id ?? "");
      setAssignNote("");
      setAssignMessage(t("detail.assignSuccess"));
    } catch (err) {
      setAssignError(getErrorMessage(err));
    } finally {
      setAssigning(false);
    }
  };

  const submitStatus = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nextStatus) return;
    setUpdating(true);
    setStatusMessage(null);
    setStatusError(null);
    try {
      const updated = await complaintApi.updateStatus(referenceId, {
        status: nextStatus,
        note: statusNote.trim() || undefined,
        resolution_summary: resolution.trim() || undefined,
      });
      setComplaint(updated);
      setStatusNote("");
      setResolution("");
      setStatusMessage(t("detail.statusSuccess"));
    } catch (err) {
      setStatusError(getErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  const submitNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (note.trim().length < 3) {
      setNoteError(t("detail.noteLabel"));
      return;
    }
    setNoteSaving(true);
    setNoteMessage(null);
    setNoteError(null);
    try {
      const updated = await complaintApi.addNote(referenceId, note.trim(), notePublic);
      setComplaint(updated);
      setNote("");
      setNoteMessage(t("detail.noteSuccess"));
    } catch (err) {
      setNoteError(getErrorMessage(err));
    } finally {
      setNoteSaving(false);
    }
  };

  const resolvedOrClosed = nextStatus === "resolved" || nextStatus === "closed";

  return (
    <>
      <div className="mb-5">
        <Link
          to="/staff/complaints"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("detail.back")}
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="break-all font-mono text-xl font-bold tracking-tight text-brand sm:text-2xl">
              {complaint.reference_id}
            </h1>
            <StatusBadge status={complaint.status} />
            {complaint.is_overdue && (
              <span className="rounded-full border border-[#e3bcbc] bg-danger-soft px-2.5 py-1 text-[11px] font-semibold text-danger">
                {t("complaints.overdue")} · {formatAge(complaint.age_hours, t)}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-ink-soft">
            {pick(complaint.category.name_en, complaint.category.name_kn)} ·{" "}
            {complaint.department?.name ?? t("common.unassigned")} · {t(`channels.${complaint.submission_channel}`)}
          </p>
        </div>
        <Button variant="secondary" onClick={load} icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}>
          {t("common.refresh")}
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <SectionCard title={t("detail.description")}>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-soft">
              <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t("detail.originalLanguage", { lang: complaint.language_code === "kn" ? "ಕನ್ನಡ" : "English" })}
              <span className="rounded-full bg-page px-2 py-0.5 font-medium">{t(`channels.${complaint.submission_channel}`)}</span>
            </div>
            <p
              className={`mt-3 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-brand ${
                complaint.language_code === "kn" ? "kannada" : ""
              }`}
              lang={complaint.language_code}
            >
              {complaint.description_original}
            </p>

            {complaint.description_translated && (
              <div className="mt-4 rounded-lg border border-dashed border-line bg-page p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                  {t("detail.translation")}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-brand">{complaint.description_translated}</p>
                <p className="mt-1.5 text-[11px] text-muted">{t("detail.translationNote")}</p>
              </div>
            )}

            {complaint.resolution_summary && (
              <div className="mt-4 rounded-lg border border-[#bcdccb] bg-success-soft p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-success">
                  {t("detail.resolution")}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#1c5c42]">{complaint.resolution_summary}</p>
              </div>
            )}

            <div className="mt-5 grid gap-3 border-t border-line/60 pt-4 text-sm sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
                <div>
                  <p className="text-[11px] text-ink-soft">{t("detail.contact")}</p>
                  <p className="font-medium text-brand">{complaint.contact_number ?? t("common.notAvailable")}</p>
                  <p className="text-[11px] text-muted">
                    {t("detail.consent")}: {complaint.consent_to_contact ? t("common.yes") : t("common.no")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
                <div>
                  <p className="text-[11px] text-ink-soft">{t("detail.complainant")}</p>
                  <p className="font-medium text-brand">{complaint.complainant_name ?? t("common.notAvailable")}</p>
                  {complaint.created_by_name && (
                    <p className="text-[11px] text-muted">
                      {t("common.officer")}: {complaint.created_by_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t("detail.timeline")} subtitle={t("detail.timelineSub")} bodyClassName="p-5">
            <ol className="relative">
              {complaint.history.map((entry, index) => (
                <li key={entry.id} className="relative flex gap-3.5 pb-5 last:pb-0">
                  {index < complaint.history.length - 1 && (
                    <span className="absolute left-[13px] top-8 h-full w-px bg-line" aria-hidden="true" />
                  )}
                  <span className="relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line bg-white">
                    {entry.event_type === "status_change" || entry.event_type === "created" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                    ) : entry.is_public === false ? (
                      <Lock className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                    ) : (
                      <MessageSquarePlus className="h-3.5 w-3.5 text-info" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={entry.new_status} />
                      <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                        {entry.event_type.replace(/_/g, " ")}
                      </span>
                      {!entry.is_public && (
                        <span className="rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                          {t("detail.internal")}
                        </span>
                      )}
                    </div>
                    {entry.action_note && (
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{entry.action_note}</p>
                    )}
                    <p className="mt-1 text-[11px] text-muted">
                      {entry.updated_by_name ?? "System"} · {formatDateTime(entry.created_at, lang)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <SectionCard title={t("detail.overview")}>
            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-ink-soft">{t("common.status")}</dt>
                <dd><StatusBadge status={complaint.status} /></dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-ink-soft">{t("common.category")}</dt>
                <dd className="text-right font-medium text-brand">
                  {pick(complaint.category.name_en, complaint.category.name_kn)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-ink-soft">{t("common.department")}</dt>
                <dd className="text-right font-medium text-brand">{complaint.department?.name ?? "—"}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-ink-soft">{t("detail.assigned")}</dt>
                <dd className="text-right font-medium text-brand">
                  {complaint.assigned_officer?.full_name ?? t("common.unassigned")}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-ink-soft">{t("detail.created")}</dt>
                <dd className="text-right text-xs text-brand">{formatDateTime(complaint.created_at, lang)}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-ink-soft">{t("detail.updated")}</dt>
                <dd className="text-right text-xs text-brand">{formatDateTime(complaint.updated_at, lang)}</dd>
              </div>
              {complaint.resolved_at && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-ink-soft">{t("detail.resolvedAt")}</dt>
                  <dd className="text-right text-xs text-brand">{formatDateTime(complaint.resolved_at, lang)}</dd>
                </div>
              )}
              {complaint.closed_at && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-ink-soft">{t("detail.closedAt")}</dt>
                  <dd className="text-right text-xs text-brand">{formatDateTime(complaint.closed_at, lang)}</dd>
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <dt className="text-ink-soft">{t("common.hospital")}</dt>
                <dd className="text-right text-xs text-brand">{complaint.hospital.name}</dd>
              </div>
            </dl>
            {complaint.category_confidence !== null && (
              <p className="mt-3 border-t border-line/60 pt-3 text-[11px] text-muted">
                Rule-based category confidence: {Math.round(complaint.category_confidence * 100)}%
              </p>
            )}
          </SectionCard>

          {user?.role === "admin" && (
            <SectionCard title={t("detail.assignTitle")}>
              <form onSubmit={submitAssignment} className="space-y-3">
                <Field label={t("detail.assignLabel")} htmlFor="officer">
                  <Select id="officer" value={officerId} onChange={(event) => setOfficerId(event.target.value)}>
                    <option value="">{t("common.unassigned")}</option>
                    {(options?.officers ?? []).map((officer) => (
                      <option key={officer.id} value={officer.id}>
                        {officer.name}
                        {officer.department_id
                          ? ` · ${options?.departments.find((d) => d.id === officer.department_id)?.code ?? ""}`
                          : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("detail.assignNote")} htmlFor="assign-note">
                  <TextArea
                    id="assign-note"
                    value={assignNote}
                    onChange={(event) => setAssignNote(event.target.value)}
                    className="min-h-20"
                    maxLength={1000}
                  />
                </Field>
                {assignMessage && <Alert tone="success">{assignMessage}</Alert>}
                {assignError && <Alert tone="danger">{assignError}</Alert>}
                <Button
                  type="submit"
                  loading={assigning}
                  fullWidth
                  icon={<UserCheck className="h-4 w-4" aria-hidden="true" />}
                >
                  {assigning ? t("detail.assigning") : t("detail.assign")}
                </Button>
              </form>
            </SectionCard>
          )}

          <SectionCard title={t("detail.statusTitle")}>
            {availableStatuses.length === 0 ? (
              <p className="text-sm leading-relaxed text-ink-soft">
                {t("detail.noTransitions")} {canManage ? "" : t("detail.forbidden")}
              </p>
            ) : (
              <form onSubmit={submitStatus} className="space-y-3">
                <Field label={t("detail.statusLabel")} htmlFor="next-status">
                  <Select
                    id="next-status"
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value as ComplaintStatus)}
                  >
                    {availableStatuses.map((status) => (
                      <option key={status} value={status}>
                        {t(`status.${status}`)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <p className="text-[11px] text-ink-soft">
                  {t("detail.allowedNext")}:{" "}
                  {availableStatuses.map((status) => t(`status.${status}`)).join(", ")}
                </p>
                <Field
                  label={t("detail.statusNote")}
                  htmlFor="status-note"
                  required
                  hint={t("detail.statusNoteHint")}
                >
                  <TextArea
                    id="status-note"
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    className="min-h-24"
                    maxLength={2000}
                    placeholder={t("detail.notePlaceholder")}
                  />
                </Field>
                <Field
                  label={t("detail.resolutionLabel")}
                  htmlFor="resolution"
                  required={resolvedOrClosed}
                  hint={t("detail.resolutionHint")}
                >
                  <TextArea
                    id="resolution"
                    value={resolution}
                    onChange={(event) => setResolution(event.target.value)}
                    className="min-h-20"
                    maxLength={2000}
                  />
                </Field>
                {statusMessage && <Alert tone="success">{statusMessage}</Alert>}
                {statusError && <Alert tone="danger">{statusError}</Alert>}
                <Button
                  type="submit"
                  loading={updating}
                  fullWidth
                  icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
                >
                  {updating ? t("detail.updating") : t("detail.updateStatus")}
                </Button>
              </form>
            )}
          </SectionCard>

          {canManage && (
            <SectionCard title={t("detail.noteTitle")}>
              <form onSubmit={submitNote} className="space-y-3">
                <Field label={t("detail.noteLabel")} htmlFor="note" required>
                  <TextArea
                    id="note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="min-h-20"
                    placeholder={t("detail.notePlaceholder")}
                    maxLength={2000}
                  />
                </Field>
                <Checkbox
                  id="note-public"
                  checked={notePublic}
                  onChange={setNotePublic}
                  label={t("detail.noteVisibility")}
                  description={t("track.timelineNote")}
                />
                {noteMessage && <Alert tone="success">{noteMessage}</Alert>}
                {noteError && <Alert tone="danger">{noteError}</Alert>}
                <Button
                  type="submit"
                  variant="secondary"
                  loading={noteSaving}
                  fullWidth
                  icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />}
                >
                  {t("detail.addNote")}
                </Button>
              </form>
            </SectionCard>
          )}

          {user?.role === "operator" && (
            <div className="card flex items-start gap-2.5 p-4 text-xs leading-relaxed text-ink-soft">
              <FileLock2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {t("detail.noTransitions")}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
