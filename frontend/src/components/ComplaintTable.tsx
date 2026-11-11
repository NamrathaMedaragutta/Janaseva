import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDateTime, useI18n } from "../i18n";
import type { ComplaintListItem } from "../types";
import { ChannelBadge, OverdueBadge, StatusBadge } from "./Badge";
import { EmptyState } from "./States";

export function ComplaintTable({
  items,
  emptyTitle,
  emptyText,
}: {
  items: ComplaintListItem[];
  emptyTitle: string;
  emptyText: string;
}) {
  const { t, lang, pick } = useI18n();

  if (items.length === 0) {
    return <EmptyState title={emptyTitle} text={emptyText} />;
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line/60 bg-page/60 text-[11px] uppercase tracking-wide text-ink-soft">
              <th scope="col" className="px-4 py-2.5 font-semibold">{t("complaints.id")}</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">{t("common.category")}</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">{t("common.department")}</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">{t("common.channel")}</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">{t("common.status")}</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">{t("complaints.submitted")}</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                <span className="sr-only">{t("common.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.reference_id} className="border-b border-line/40 last:border-0 hover:bg-page/60">
                <td className="px-4 py-3">
                  <Link
                    to={`/staff/complaints/${item.reference_id}`}
                    className="font-semibold text-brand link-underline"
                  >
                    {item.reference_id}
                  </Link>
                  {item.is_overdue && (
                    <span className="mt-1 block">
                      <OverdueBadge hours={item.age_hours} />
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-brand">
                  {pick(item.category.name_en, item.category.name_kn)}
                </td>
                <td className="px-4 py-3 text-sm text-ink-soft">
                  {item.department?.name ?? t("common.unassigned")}
                </td>
                <td className="px-4 py-3">
                  <ChannelBadge channel={item.submission_channel} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">
                  {formatDateTime(item.created_at, lang)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/staff/complaints/${item.reference_id}`}
                    aria-label={`${t("complaints.view")} ${item.reference_id}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-brand hover:bg-brand hover:text-white"
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line/50 md:hidden">
        {items.map((item) => (
          <li key={item.reference_id}>
            <Link to={`/staff/complaints/${item.reference_id}`} className="block px-4 py-3.5 hover:bg-page/70">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-semibold text-brand">{item.reference_id}</span>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-1.5 text-sm text-ink-soft">{pick(item.category.name_en, item.category.name_kn)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ChannelBadge channel={item.submission_channel} />
                {item.is_overdue && <OverdueBadge hours={item.age_hours} />}
                <span className="text-xs text-muted">{formatDateTime(item.created_at, lang)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
