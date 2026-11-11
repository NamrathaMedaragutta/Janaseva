import { FilePlus2, Filter, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { ComplaintTable } from "../components/ComplaintTable";
import { Field, Select, TextInput } from "../components/Field";
import { Pagination } from "../components/Pagination";
import { PageHeader, SectionCard } from "../components/SectionCard";
import { ErrorState, LoadingBlock } from "../components/States";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../i18n";
import { complaintApi, getErrorMessage } from "../services/api";
import type { ComplaintListItem, ComplaintStatus, FilterOptions, SubmissionChannel } from "../types";

interface Filters {
  search: string;
  status: string;
  category_id: string;
  department_id: string;
  channel: string;
  overdue_only: boolean;
  date_from: string;
  date_to: string;
  sort: string;
}

const emptyFilters: Filters = {
  search: "",
  status: "",
  category_id: "",
  department_id: "",
  channel: "",
  overdue_only: false,
  date_from: "",
  date_to: "",
  sort: "newest",
};

const statuses: ComplaintStatus[] = [
  "submitted",
  "acknowledged",
  "assigned",
  "in_progress",
  "needs_review",
  "resolved",
  "closed",
  "reopened",
];

export function ComplaintsPage() {
  const { t, pick } = useI18n();
  const { user } = useAuth();
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ComplaintListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    complaintApi.filterOptions().then(setOptions).catch(() => setOptions(null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await complaintApi.list({
        search: applied.search.trim() || undefined,
        status: applied.status ? [applied.status as ComplaintStatus] : undefined,
        category_id: applied.category_id || undefined,
        department_id: applied.department_id || undefined,
        channel: applied.channel ? (applied.channel as SubmissionChannel) : undefined,
        overdue_only: applied.overdue_only || undefined,
        date_from: applied.date_from || undefined,
        date_to: applied.date_to || undefined,
        sort: applied.sort,
        page,
        page_size: pageSize,
      });
      setItems(response.items);
      setTotal(response.total);
      setPages(response.pages);
      setPageSize(response.page_size);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [applied, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setApplied(filters);
  };

  const reset = () => {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setPage(1);
  };

  const hasFilters = Object.entries(applied).some(([key, value]) =>
    key === "sort" ? value !== "newest" : Boolean(value),
  );

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  return (
    <>
      <PageHeader
        title={t("complaints.title")}
        lead={t("complaints.lead")}
        actions={
          (user?.role === "admin" || user?.role === "operator") && (
            <Link to="/staff/register">
              <Button icon={<FilePlus2 className="h-4 w-4" aria-hidden="true" />}>{t("complaints.newComplaint")}</Button>
            </Link>
          )
        }
      />

      <SectionCard className="mb-5">
        <form onSubmit={apply} className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Field label={t("common.search")} htmlFor="search">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <TextInput
                  id="search"
                  value={filters.search}
                  onChange={(event) => update("search", event.target.value)}
                  placeholder={t("complaints.searchPlaceholder")}
                  className="pl-9"
                />
              </div>
            </Field>
          </div>

          <div className="lg:col-span-2">
            <Field label={t("complaints.statusFilter")} htmlFor="status-filter">
              <Select id="status-filter" value={filters.status} onChange={(event) => update("status", event.target.value)}>
                <option value="">{t("common.all")}</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {t(`status.${status}`)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="lg:col-span-2">
            <Field label={t("complaints.categoryFilter")} htmlFor="category-filter">
              <Select
                id="category-filter"
                value={filters.category_id}
                onChange={(event) => update("category_id", event.target.value)}
              >
                <option value="">{t("common.all")}</option>
                {(options?.categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {pick(category.name_en, category.name_kn)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="lg:col-span-2">
            <Field label={t("complaints.departmentFilter")} htmlFor="department-filter">
              <Select
                id="department-filter"
                value={filters.department_id}
                onChange={(event) => update("department_id", event.target.value)}
              >
                <option value="">{t("common.all")}</option>
                {(options?.departments ?? []).map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="lg:col-span-2">
            <Field label={t("complaints.channelFilter")} htmlFor="channel-filter">
              <Select id="channel-filter" value={filters.channel} onChange={(event) => update("channel", event.target.value)}>
                <option value="">{t("common.all")}</option>
                <option value="voice">{t("channels.voice")}</option>
                <option value="assisted">{t("channels.assisted")}</option>
                <option value="web">{t("channels.web")}</option>
              </Select>
            </Field>
          </div>

          <div className="lg:col-span-2">
            <Field label={t("complaints.dateFrom")} htmlFor="date-from">
              <TextInput
                id="date-from"
                type="date"
                value={filters.date_from}
                onChange={(event) => update("date_from", event.target.value)}
              />
            </Field>
          </div>
          <div className="lg:col-span-2">
            <Field label={t("complaints.dateTo")} htmlFor="date-to">
              <TextInput
                id="date-to"
                type="date"
                value={filters.date_to}
                onChange={(event) => update("date_to", event.target.value)}
              />
            </Field>
          </div>
          <div className="lg:col-span-2">
            <Field label={t("complaints.sort")} htmlFor="sort">
              <Select id="sort" value={filters.sort} onChange={(event) => update("sort", event.target.value)}>
                <option value="newest">{t("complaints.sortNewest")}</option>
                <option value="oldest">{t("complaints.sortOldest")}</option>
                <option value="updated">{t("complaints.sortUpdated")}</option>
                <option value="age">{t("complaints.sortOldest")}</option>
              </Select>
            </Field>
          </div>

          <div className="flex flex-wrap items-end gap-3 lg:col-span-6">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-brand">
              <input
                type="checkbox"
                checked={filters.overdue_only}
                onChange={(event) => update("overdue_only", event.target.checked)}
                className="h-4 w-4 accent-[#081F26]"
              />
              {t("complaints.overdueOnly")}
            </label>
            <div className="ml-auto flex gap-2">
              <Button type="submit" icon={<Filter className="h-4 w-4" aria-hidden="true" />}>
                {t("complaints.apply")}
              </Button>
              <Button
                variant="ghost"
                onClick={reset}
                icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
              >
                {t("complaints.reset")}
              </Button>
            </div>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title={t("complaints.title")}
        subtitle={t("complaints.count", { count: total })}
        bodyClassName="p-0"
      >
        {loading ? (
          <LoadingBlock label={t("complaints.loading")} />
        ) : error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={load} />
          </div>
        ) : (
          <>
            <ComplaintTable
              items={items}
              emptyTitle={hasFilters ? t("complaints.empty") : t("complaints.emptyAll")}
              emptyText={hasFilters ? t("complaints.emptyText") : t("complaints.emptyAll")}
            />
            <Pagination page={page} pages={pages} total={total} pageSize={pageSize} onChange={setPage} />
          </>
        )}
      </SectionCard>
    </>
  );
}
