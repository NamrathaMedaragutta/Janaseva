import { Bell, Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDateTime, useI18n } from "../i18n";
import { getErrorMessage, notificationApi } from "../services/api";
import type { NotificationItem } from "../types";
import { Spinner } from "./States";

export function NotificationBell() {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await notificationApi.list());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = items.filter((item) => !item.read_at).length;

  const markRead = async (item: NotificationItem) => {
    if (item.read_at) return;
    try {
      const updated = await notificationApi.markRead(item.id);
      setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
    } catch {
      /* keeps the unread dot if the request fails */
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={t("nav.notifications")}
        className="relative grid h-10 w-10 place-items-center rounded-lg border border-line bg-white text-brand hover:bg-page"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-card shadow-[var(--shadow-float)]">
          <div className="flex items-center justify-between border-b border-line/60 px-4 py-3">
            <p className="text-sm font-semibold text-brand">{t("nav.notifications")}</p>
            {unread > 0 && <span className="text-[11px] font-semibold text-info">{unread} unread</span>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            )}
            {error && <p className="px-4 py-6 text-sm text-danger">{error}</p>}
            {!loading && !error && items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-ink-soft">No notifications yet.</p>
            )}
            <ul className="divide-y divide-line/50">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => markRead(item)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-page/70"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read_at ? "bg-line" : "bg-info"}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-brand">
                        {item.subject ?? item.template.replace(/_/g, " ")}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{item.body}</span>
                      <span className="mt-1 block text-[11px] text-muted">{formatDateTime(item.created_at, lang)}</span>
                    </span>
                    {item.read_at && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
