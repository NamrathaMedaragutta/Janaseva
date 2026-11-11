import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line/60 px-5 py-4">
          <div>
            {title && <h2 className="text-[0.9375rem] font-semibold text-brand">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  lead,
  actions,
  eyebrow,
}: {
  title: string;
  lead?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-info">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-bold text-brand sm:text-[1.75rem]">{title}</h1>
        {lead && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-soft">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
