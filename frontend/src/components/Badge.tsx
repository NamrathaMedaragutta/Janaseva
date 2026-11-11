import { AlertTriangle, CheckCircle2, CircleDot, Clock, FileClock, Info, RotateCcw } from "lucide-react";
import { useI18n } from "../i18n";
import type { ComplaintStatus, SubmissionChannel } from "../types";
import { cn } from "../utils/cn";

const statusStyles: Record<ComplaintStatus, string> = {
  submitted: "bg-brand-soft-bg text-brand border-[#c9d6da]",
  acknowledged: "bg-info-soft text-info border-[#c4d7e4]",
  assigned: "bg-info-soft text-info border-[#c4d7e4]",
  in_progress: "bg-[#eaf1f7] text-[#2a5f80] border-[#c4d7e4]",
  needs_review: "bg-warning-soft text-warning border-[#ecd6ae]",
  resolved: "bg-success-soft text-success border-[#bcdccb]",
  closed: "bg-[#eef2f0] text-[#2c5f4a] border-[#c2d6cb]",
  reopened: "bg-warning-soft text-warning border-[#ecd6ae]",
};

const statusIcons: Record<ComplaintStatus, typeof CircleDot> = {
  submitted: CircleDot,
  acknowledged: Info,
  assigned: Info,
  in_progress: Clock,
  needs_review: AlertTriangle,
  resolved: CheckCircle2,
  closed: CheckCircle2,
  reopened: RotateCcw,
};

export function StatusBadge({ status, className }: { status: ComplaintStatus; className?: string }) {
  const { t } = useI18n();
  const Icon = statusIcons[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold",
        statusStyles[status],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {t(`status.${status}`)}
    </span>
  );
}

export function ChannelBadge({ channel }: { channel: SubmissionChannel }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-line/70 bg-page px-2 py-0.5 text-xs font-medium text-ink-soft">
      {t(`channels.${channel}`)}
    </span>
  );
}

export function OverdueBadge({ hours }: { hours: number }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#e3bcbc] bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">
      <FileClock className="h-3 w-3" aria-hidden="true" />
      {t("complaints.overdueHours", { hours: Math.round(hours) })}
    </span>
  );
}
