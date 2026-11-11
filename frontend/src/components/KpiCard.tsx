import type { LucideIcon } from "lucide-react";
import { cn } from "../utils/cn";

const toneStyles = {
  neutral: "bg-brand-soft-bg text-brand",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof toneStyles;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", toneStyles[tone])}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-[1.9rem] font-bold leading-none tracking-tight text-brand">{value}</p>
      {hint && <p className="mt-2 text-xs text-ink-soft">{hint}</p>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="card p-4 text-left transition hover:border-brand/40 hover:shadow-[var(--shadow-float)]"
      >
        {content}
      </button>
    );
  }

  return <div className="card p-4">{content}</div>;
}
