import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "../i18n";
import { Button } from "./Button";
import { cn } from "../utils/cn";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-ink-soft", className)} aria-hidden="true" />;
}

export function LoadingBlock({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-14 text-sm text-ink-soft">
      <Spinner />
      {label ?? t("common.loading")}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="card flex flex-col items-start gap-3 p-6">
      <div className="flex items-center gap-2 text-danger">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        <p className="text-sm font-semibold">{t("common.error")}</p>
      </div>
      <p className="text-sm text-ink-soft">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
  icon,
}: {
  title: string;
  text: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-soft-bg text-ink-soft">
        {icon ?? <Inbox className="h-6 w-6" aria-hidden="true" />}
      </span>
      <div>
        <p className="text-sm font-semibold text-brand">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">{text}</p>
      </div>
      {action}
    </div>
  );
}

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-[#c4d7e4] bg-info-soft text-[#274f66]",
    success: "border-[#bcdccb] bg-success-soft text-[#1c5c42]",
    warning: "border-[#ecd6ae] bg-warning-soft text-[#7c4c0d]",
    danger: "border-[#e3bcbc] bg-danger-soft text-[#8c2c2c]",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-xl border p-3.5 text-sm", tones[tone], className)}>
      {children}
    </div>
  );
}
