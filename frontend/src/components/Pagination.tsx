import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "../i18n";
import { Button } from "./Button";

export function Pagination({
  page,
  pages,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const { t } = useI18n();
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 px-5 py-3.5">
      <p className="text-xs text-ink-soft">
        {from}–{to} / {total} · {t("complaints.page", { page, pages })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          icon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
        >
          {t("complaints.previous")}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
        >
          {t("complaints.next")}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
