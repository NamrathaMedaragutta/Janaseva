import { cn } from "../utils/cn";

export function Logo({ variant = "dark", compact = false }: { variant?: "dark" | "light"; compact?: boolean }) {
  const light = variant === "light";
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl border",
          light ? "border-white/25 bg-white/10" : "border-brand bg-brand",
        )}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
          <path
            d="M12 20.5s-6.4-3.9-6.4-8.6a3.9 3.9 0 0 1 6.4-3 3.9 3.9 0 0 1 6.4 3c0 4.7-6.4 8.6-6.4 8.6Z"
            stroke={light ? "#F7F9FA" : "#F7F9FA"}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M12 10.4v4.2M9.9 12.5h4.2" stroke="#9BD3C6" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-tight">
          <span
            className={cn(
              "block text-[1.0625rem] font-bold tracking-[0.14em]",
              light ? "text-white" : "text-brand",
            )}
          >
            JANASEVA
          </span>
          <span className={cn("block text-[10px] font-medium tracking-wide", light ? "text-white/70" : "text-ink-soft")}>
            Hospital Grievance Monitoring
          </span>
        </span>
      )}
    </span>
  );
}
