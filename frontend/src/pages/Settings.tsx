import {
  Building2,
  Check,
  ClipboardList,
  Layers,
  Plus,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Users2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "../components/Button";
import { Checkbox, Field, Select, TextArea, TextInput } from "../components/Field";
import { Modal } from "../components/Modal";
import { PageHeader, SectionCard } from "../components/SectionCard";
import { Alert, EmptyState, ErrorState, LoadingBlock } from "../components/States";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime, useI18n } from "../i18n";
import { adminApi, getErrorMessage, notificationApi } from "../services/api";
import type { AuditEntry, Category, Department, Role, StaffAccount } from "../types";
import { cn } from "../utils/cn";

type Tab = "thresholds" | "departments" | "categories" | "users" | "audit" | "notifications";

interface Thresholds {
  followup_hours: number;
  escalation_hours: number;
}

interface CategoryDraft {
  name_en: string;
  name_kn: string;
  default_department_id: string;
  is_active: boolean;
}

const emptyUserForm = {
  full_name: "",
  email: "",
  password: "",
  role: "officer" as Role,
  phone: "",
  department_id: "",
};

export function SettingsPage() {
  const { t, lang, pick } = useI18n();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [tab, setTab] = useState<Tab>("thresholds");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const [thresholds, setThresholds] = useState<Thresholds>({ followup_hours: 48, escalation_hours: 96 });
  const [thresholdNote, setThresholdNote] = useState("");
  const [savingThresholds, setSavingThresholds] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<StaffAccount[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [systemStatus, setSystemStatus] = useState<{
    voice_mode: string;
    sms_mode: string;
    environment: string;
  } | null>(null);

  const [deptForm, setDeptForm] = useState({ name: "", code: "", description: "" });
  const [creatingDept, setCreatingDept] = useState(false);

  const [catDrafts, setCatDrafts] = useState<Record<string, CategoryDraft>>({});
  const [savingCategory, setSavingCategory] = useState<string | null>(null);

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [creatingUser, setCreatingUser] = useState(false);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState<string | null>(null);

  const [notifForm, setNotifForm] = useState({ channel: "sms", recipient: "", message: "" });
  const [notifSending, setNotifSending] = useState(false);
  const [notifResult, setNotifResult] = useState<{ status: string; detail: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [settings, deptData, catData, userData, auditData, status] = await Promise.all([
        adminApi.settings(),
        adminApi.departments(),
        adminApi.categories(),
        adminApi.users(),
        adminApi.auditLogs(),
        adminApi.systemStatus(),
      ]);
      setThresholds({
        followup_hours: settings.thresholds.followup_hours,
        escalation_hours: settings.thresholds.escalation_hours,
      });
      setThresholdNote(settings.note);
      setDepartments(deptData);
      setCategories(catData);
      setUsers(userData);
      setAudit(auditData);
      setSystemStatus(status);
      setCatDrafts(
        Object.fromEntries(
          catData.map((category) => [
            category.id,
            {
              name_en: category.name_en,
              name_kn: category.name_kn,
              default_department_id: category.default_department_id ?? "",
              is_active: category.is_active,
            },
          ]),
        ),
      );
    } catch (err) {
      setLoadError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
    else setLoading(false);
  }, [isAdmin, load]);

  const flash = (tone: "success" | "danger", text: string) => {
    setFeedback({ tone, text });
    window.setTimeout(() => setFeedback(null), 6000);
  };

  const saveThresholds = async (event: React.FormEvent) => {
    event.preventDefault();
    if (thresholds.escalation_hours < thresholds.followup_hours) {
      flash("danger", t("settings.thresholdError"));
      return;
    }
    setSavingThresholds(true);
    try {
      await adminApi.updateSettings(thresholds);
      flash("success", t("settings.saved"));
      await load();
    } catch (err) {
      flash("danger", getErrorMessage(err));
    } finally {
      setSavingThresholds(false);
    }
  };

  const createDepartment = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreatingDept(true);
    try {
      await adminApi.createDepartment({
        name: deptForm.name.trim(),
        code: deptForm.code.trim().toUpperCase(),
        description: deptForm.description.trim() || undefined,
      });
      setDeptForm({ name: "", code: "", description: "" });
      flash("success", t("settings.deptCreated"));
      setDepartments(await adminApi.departments());
    } catch (err) {
      flash("danger", getErrorMessage(err));
    } finally {
      setCreatingDept(false);
    }
  };

  const saveCategory = async (category: Category) => {
    const draft = catDrafts[category.id];
    if (!draft) return;
    if (!draft.name_en.trim() || !draft.name_kn.trim()) {
      flash("danger", t("settings.catLead"));
      return;
    }
    setSavingCategory(category.id);
    try {
      const updated = await adminApi.updateCategory(category.id, {
        name_en: draft.name_en.trim(),
        name_kn: draft.name_kn.trim(),
        default_department_id: draft.default_department_id || null,
        is_active: draft.is_active,
      });
      setCategories((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      flash("success", t("settings.catSaved"));
    } catch (err) {
      flash("danger", getErrorMessage(err));
    } finally {
      setSavingCategory(null);
    }
  };

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setUserFormError(null);
    if (userForm.password.length < 8) {
      setUserFormError(t("settings.passwordHint"));
      return;
    }
    setCreatingUser(true);
    try {
      await adminApi.createUser({
        full_name: userForm.full_name.trim(),
        email: userForm.email.trim(),
        password: userForm.password,
        role: userForm.role,
        phone: userForm.phone.trim() || undefined,
        department_id: userForm.department_id || null,
      });
      setUserModalOpen(false);
      setUserForm(emptyUserForm);
      flash("success", t("settings.userCreated"));
      setUsers(await adminApi.users());
    } catch (err) {
      setUserFormError(getErrorMessage(err));
    } finally {
      setCreatingUser(false);
    }
  };

  const toggleUser = async (account: StaffAccount) => {
    setSavingUser(account.id);
    try {
      const updated = await adminApi.updateUser(account.id, { is_active: !account.is_active });
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      flash("success", t("settings.userUpdated"));
    } catch (err) {
      flash("danger", getErrorMessage(err));
    } finally {
      setSavingUser(null);
    }
  };

  const sendTest = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotifSending(true);
    setNotifResult(null);
    try {
      const response = (await notificationApi.test({
        channel: notifForm.channel,
        recipient: notifForm.recipient.trim() || undefined,
        message: notifForm.message.trim() || undefined,
      })) as { status: string; detail?: string; note?: string; provider?: string };
      setNotifResult({
        status: response.status,
        detail: response.detail ?? response.note ?? response.provider ?? t("settings.notifResult"),
      });
      setAudit(await adminApi.auditLogs());
    } catch (err) {
      setNotifResult({ status: "failed", detail: getErrorMessage(err) });
    } finally {
      setNotifSending(false);
    }
  };

  const roleLabel = (role: Role) =>
    role === "admin" ? t("login.roleAdmin") : role === "officer" ? t("login.roleOfficer") : t("login.roleOperator");

  const tabs: { key: Tab; label: string; icon: typeof Building2 }[] = [
    { key: "thresholds", label: t("settings.tabsThresholds"), icon: SlidersHorizontal },
    { key: "departments", label: t("settings.tabsDepartments"), icon: Building2 },
    { key: "categories", label: t("settings.tabsCategories"), icon: Layers },
    { key: "users", label: t("settings.tabsUsers"), icon: Users2 },
    { key: "audit", label: t("settings.tabsAudit"), icon: ClipboardList },
    { key: "notifications", label: t("settings.tabsNotifications"), icon: ShieldCheck },
  ];

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg">
        <EmptyState title={t("settings.adminOnly")} text={t("detail.forbidden")} />
      </div>
    );
  }

  return (
    <>
      <PageHeader title={t("settings.title")} lead={t("settings.lead")} />

      {feedback && (
        <Alert tone={feedback.tone} className="mb-4">
          {feedback.text}
        </Alert>
      )}

      {loading ? (
        <LoadingBlock label={t("settings.loadingSettings")} />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
          <nav aria-label={t("settings.title")} className="lg:sticky lg:top-24 lg:self-start">
            <ul className="flex gap-1.5 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {tabs.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.key} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setTab(item.key)}
                      aria-current={tab === item.key ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 text-sm font-medium",
                        tab === item.key
                          ? "border-brand bg-brand text-white"
                          : "border-transparent bg-white text-ink-soft hover:border-line hover:text-brand",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="min-w-0 space-y-5">
            {tab === "thresholds" && (
              <SectionCard title={t("settings.thresholdTitle")} subtitle={t("settings.thresholdLead")}>
                <form onSubmit={saveThresholds} className="max-w-lg space-y-4">
                  <Field label={t("settings.followupHours")} htmlFor="followup-hours" required>
                    <TextInput
                      id="followup-hours"
                      type="number"
                      min={1}
                      max={720}
                      value={thresholds.followup_hours}
                      onChange={(event) =>
                        setThresholds((current) => ({ ...current, followup_hours: Number(event.target.value) }))
                      }
                      required
                    />
                  </Field>
                  <Field
                    label={t("settings.escalationHours")}
                    htmlFor="escalation-hours"
                    required
                    hint={t("settings.thresholdError")}
                  >
                    <TextInput
                      id="escalation-hours"
                      type="number"
                      min={thresholds.followup_hours}
                      max={1440}
                      value={thresholds.escalation_hours}
                      onChange={(event) =>
                        setThresholds((current) => ({ ...current, escalation_hours: Number(event.target.value) }))
                      }
                      required
                    />
                  </Field>
                  {thresholdNote && (
                    <p className="rounded-lg bg-page px-3 py-2.5 text-[11px] leading-relaxed text-ink-soft">
                      {thresholdNote}
                    </p>
                  )}
                  <Button
                    type="submit"
                    loading={savingThresholds}
                    icon={<Save className="h-4 w-4" aria-hidden="true" />}
                  >
                    {t("settings.saveThresholds")}
                  </Button>
                </form>
              </SectionCard>
            )}

            {tab === "departments" && (
              <>
                <SectionCard title={t("settings.deptTitle")} subtitle={t("settings.deptLead")} bodyClassName="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-line/60 bg-page/60 text-[11px] uppercase tracking-wide text-ink-soft">
                          <th className="px-4 py-2.5 font-semibold">{t("settings.deptName")}</th>
                          <th className="px-4 py-2.5 font-semibold">{t("settings.deptCode")}</th>
                          <th className="px-4 py-2.5 font-semibold">{t("settings.officers")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {departments.map((department) => (
                          <tr key={department.id} className="border-b border-line/40 last:border-0">
                            <td className="px-4 py-2.5 text-brand">{department.name}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-ink-soft">{department.code}</td>
                            <td className="px-4 py-2.5 text-ink-soft">{department.officer_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>

                <SectionCard title={t("settings.addDept")}>
                  <form onSubmit={createDepartment} className="grid gap-3 sm:grid-cols-2">
                    <Field label={t("settings.deptName")} htmlFor="dept-name" required>
                      <TextInput
                        id="dept-name"
                        value={deptForm.name}
                        onChange={(event) => setDeptForm((current) => ({ ...current, name: event.target.value }))}
                        maxLength={120}
                        required
                      />
                    </Field>
                    <Field label={t("settings.deptCode")} htmlFor="dept-code" required>
                      <TextInput
                        id="dept-code"
                        value={deptForm.code}
                        onChange={(event) => setDeptForm((current) => ({ ...current, code: event.target.value }))}
                        maxLength={12}
                        required
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label={t("settings.deptDescription")} htmlFor="dept-description">
                        <TextArea
                          id="dept-description"
                          value={deptForm.description}
                          onChange={(event) =>
                            setDeptForm((current) => ({ ...current, description: event.target.value }))
                          }
                          className="min-h-16"
                          maxLength={400}
                        />
                      </Field>
                    </div>
                    <div>
                      <Button
                        type="submit"
                        loading={creatingDept}
                        icon={<Plus className="h-4 w-4" aria-hidden="true" />}
                      >
                        {t("settings.addDept")}
                      </Button>
                    </div>
                  </form>
                </SectionCard>
              </>
            )}

            {tab === "categories" && (
              <SectionCard title={t("settings.catTitle")} subtitle={t("settings.catLead")} bodyClassName="p-5">
                <ul className="space-y-4">
                  {categories.map((category) => {
                    const draft = catDrafts[category.id];
                    if (!draft) return null;
                    return (
                      <li key={category.id} className="rounded-xl border border-line/70 p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label={t("settings.catEnglish")} htmlFor={`cat-en-${category.id}`} required>
                            <TextInput
                              id={`cat-en-${category.id}`}
                              value={draft.name_en}
                              onChange={(event) =>
                                setCatDrafts((current) => ({
                                  ...current,
                                  [category.id]: { ...draft, name_en: event.target.value },
                                }))
                              }
                              maxLength={120}
                            />
                          </Field>
                          <Field label={t("settings.catKannada")} htmlFor={`cat-kn-${category.id}`} required>
                            <TextInput
                              id={`cat-kn-${category.id}`}
                              value={draft.name_kn}
                              onChange={(event) =>
                                setCatDrafts((current) => ({
                                  ...current,
                                  [category.id]: { ...draft, name_kn: event.target.value },
                                }))
                              }
                              className="kannada"
                              lang="kn"
                              maxLength={160}
                            />
                          </Field>
                          <Field
                            label={t("settings.catDefaultDept")}
                            htmlFor={`cat-dept-${category.id}`}
                            required
                          >
                            <Select
                              id={`cat-dept-${category.id}`}
                              value={draft.default_department_id}
                              onChange={(event) =>
                                setCatDrafts((current) => ({
                                  ...current,
                                  [category.id]: { ...draft, default_department_id: event.target.value },
                                }))
                              }
                            >
                              <option value="">{t("settings.noDepartment")}</option>
                              {departments.map((department) => (
                                <option key={department.id} value={department.id}>
                                  {department.name}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <div className="flex items-end justify-between gap-3">
                            <Checkbox
                              id={`cat-active-${category.id}`}
                              checked={draft.is_active}
                              onChange={(checked) =>
                                setCatDrafts((current) => ({
                                  ...current,
                                  [category.id]: { ...draft, is_active: checked },
                                }))
                              }
                              label={t("settings.catActive")}
                            />
                            <Button
                              size="sm"
                              onClick={() => saveCategory(category)}
                              loading={savingCategory === category.id}
                              icon={<Check className="h-4 w-4" aria-hidden="true" />}
                            >
                              {t("common.save")}
                            </Button>
                          </div>
                        </div>
                        <p className="mt-2 text-[11px] text-muted">
                          {category.slug} · {pick(category.name_en, category.name_kn)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </SectionCard>
            )}

            {tab === "users" && (
              <SectionCard
                title={t("settings.usersTitle")}
                subtitle={t("settings.usersLead")}
                action={
                  <Button
                    size="sm"
                    onClick={() => {
                      setUserForm(emptyUserForm);
                      setUserFormError(null);
                      setUserModalOpen(true);
                    }}
                    icon={<Plus className="h-4 w-4" aria-hidden="true" />}
                  >
                    {t("settings.addUser")}
                  </Button>
                }
                bodyClassName="p-0"
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-line/60 bg-page/60 text-[11px] uppercase tracking-wide text-ink-soft">
                        <th className="px-4 py-2.5 font-semibold">{t("settings.fullName")}</th>
                        <th className="px-4 py-2.5 font-semibold">{t("settings.role")}</th>
                        <th className="px-4 py-2.5 font-semibold">{t("settings.department")}</th>
                        <th className="px-4 py-2.5 font-semibold">{t("common.status")}</th>
                        <th className="px-4 py-2.5 font-semibold">{t("common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((account) => (
                        <tr key={account.id} className="border-b border-line/40 last:border-0">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-brand">{account.full_name}</p>
                            <p className="text-[11px] text-muted">{account.email}</p>
                          </td>
                          <td className="px-4 py-2.5 text-ink-soft">{roleLabel(account.role)}</td>
                          <td className="px-4 py-2.5 text-ink-soft">{account.department_name ?? "—"}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                account.is_active
                                  ? "bg-success-soft text-success"
                                  : "bg-page text-muted",
                              )}
                            >
                              {account.is_active ? t("settings.active") : t("settings.inactive")}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <Button
                              size="sm"
                              variant={account.is_active ? "ghost" : "secondary"}
                              loading={savingUser === account.id}
                              onClick={() => toggleUser(account)}
                            >
                              {account.is_active ? t("settings.deactivate") : t("settings.activate")}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}

            {tab === "audit" && (
              <SectionCard title={t("settings.auditTitle")} subtitle={t("settings.auditLead")} bodyClassName="p-0">
                {audit.length === 0 ? (
                  <EmptyState title={t("settings.auditNone")} text={t("settings.auditLead")} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-line/60 bg-page/60 text-[11px] uppercase tracking-wide text-ink-soft">
                          <th className="px-4 py-2.5 font-semibold">{t("settings.auditAction")}</th>
                          <th className="px-4 py-2.5 font-semibold">{t("settings.auditActor")}</th>
                          <th className="px-4 py-2.5 font-semibold">{t("settings.auditEntity")}</th>
                          <th className="px-4 py-2.5 font-semibold">{t("settings.auditWhen")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {audit.map((entry) => (
                          <tr key={entry.id} className="border-b border-line/40 last:border-0">
                            <td className="px-4 py-2.5 text-brand">{entry.action.replace(/_/g, " ")}</td>
                            <td className="px-4 py-2.5 text-ink-soft">{entry.actor_name ?? "System"}</td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-ink-soft">
                              {entry.entity_type}
                              {entry.entity_id ? ` · ${entry.entity_id.slice(0, 8)}` : ""}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-xs text-ink-soft">
                              {formatDateTime(entry.created_at, lang)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            )}

            {tab === "notifications" && (
              <>
                <SectionCard title={t("settings.notifTitle")} subtitle={t("settings.notifLead")}>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-line/70 bg-page px-3 py-2.5">
                      <dt className="text-[11px] uppercase tracking-wide text-ink-soft">{t("settings.notifMode")}</dt>
                      <dd className="mt-1 text-sm font-semibold text-brand">
                        {systemStatus?.sms_mode === "live" ? t("settings.notifLive") : t("settings.notifSimulated")}
                      </dd>
                      <dd className="mt-0.5 text-[11px] text-muted">SMS · {systemStatus?.sms_mode ?? "—"}</dd>
                    </div>
                    <div className="rounded-lg border border-line/70 bg-page px-3 py-2.5">
                      <dt className="text-[11px] uppercase tracking-wide text-ink-soft">Voice / IVR</dt>
                      <dd className="mt-1 text-sm font-semibold text-brand">
                        {systemStatus?.voice_mode === "live" ? t("settings.notifLive") : t("settings.notifSimulated")}
                      </dd>
                      <dd className="mt-0.5 text-[11px] text-muted">
                        Voice · {systemStatus?.voice_mode ?? "—"} · {systemStatus?.environment ?? ""}
                      </dd>
                    </div>
                  </dl>

                  <form onSubmit={sendTest} className="mt-5 max-w-lg space-y-3">
                    <Field label={t("settings.notifChannel")} htmlFor="notif-channel" required>
                      <Select
                        id="notif-channel"
                        value={notifForm.channel}
                        onChange={(event) => setNotifForm((current) => ({ ...current, channel: event.target.value }))}
                      >
                        <option value="sms">SMS</option>
                        <option value="in_app">In-app</option>
                      </Select>
                    </Field>
                    <Field label={t("settings.notifRecipient")} htmlFor="notif-recipient" hint={t("common.optional")}>
                      <TextInput
                        id="notif-recipient"
                        value={notifForm.recipient}
                        onChange={(event) => setNotifForm((current) => ({ ...current, recipient: event.target.value }))}
                        placeholder="+91"
                        maxLength={20}
                      />
                    </Field>
                    <Field label={t("settings.notifMessage")} htmlFor="notif-message" hint={t("common.optional")}>
                      <TextArea
                        id="notif-message"
                        value={notifForm.message}
                        onChange={(event) => setNotifForm((current) => ({ ...current, message: event.target.value }))}
                        className="min-h-20"
                        maxLength={300}
                      />
                    </Field>
                    <Button type="submit" loading={notifSending}>
                      {t("settings.sendTest")}
                    </Button>
                  </form>

                  {notifResult && (
                    <Alert
                      tone={notifResult.status === "failed" ? "danger" : notifResult.status === "sent" ? "success" : "warning"}
                      className="mt-4"
                    >
                      <span className="font-semibold">{t("settings.notifResult")}: </span>
                      {notifResult.status} — {notifResult.detail}
                    </Alert>
                  )}
                </SectionCard>

                <div className="card p-4 text-xs leading-relaxed text-ink-soft">
                  {t("settings.notifSimulated")} — SMS delivery is simulated in this prototype. Configure a provider in
                  the backend environment to enable live messages; no message will be reported as sent unless the
                  provider confirms it.
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Modal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={t("settings.addUser")}
        description={t("settings.passwordHint")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setUserModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" form="create-user-form" loading={creatingUser}>
              {t("settings.createUser")}
            </Button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={createUser} className="space-y-3">
          <Field label={t("settings.fullName")} htmlFor="user-name" required>
            <TextInput
              id="user-name"
              value={userForm.full_name}
              onChange={(event) => setUserForm((current) => ({ ...current, full_name: event.target.value }))}
              required
            />
          </Field>
          <Field label={t("settings.email")} htmlFor="user-email" required>
            <TextInput
              id="user-email"
              type="email"
              value={userForm.email}
              onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </Field>
          <Field label={t("settings.password")} htmlFor="user-password" required hint={t("settings.passwordHint")}>
            <TextInput
              id="user-password"
              type="password"
              value={userForm.password}
              onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
              minLength={8}
              autoComplete="new-password"
              required
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("settings.role")} htmlFor="user-role" required>
              <Select
                id="user-role"
                value={userForm.role}
                onChange={(event) =>
                  setUserForm((current) => ({ ...current, role: event.target.value as Role }))
                }
              >
                <option value="officer">{t("login.roleOfficer")}</option>
                <option value="operator">{t("login.roleOperator")}</option>
                <option value="admin">{t("login.roleAdmin")}</option>
              </Select>
            </Field>
            <Field label={t("settings.department")} htmlFor="user-dept">
              <Select
                id="user-dept"
                value={userForm.department_id}
                onChange={(event) => setUserForm((current) => ({ ...current, department_id: event.target.value }))}
              >
                <option value="">{t("settings.noDepartment")}</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={t("register.phoneLabel")} htmlFor="user-phone" hint={t("common.optional")}>
            <TextInput
              id="user-phone"
              value={userForm.phone}
              onChange={(event) => setUserForm((current) => ({ ...current, phone: event.target.value }))}
              maxLength={20}
            />
          </Field>
          {userFormError && <Alert tone="danger">{userFormError}</Alert>}
        </form>
      </Modal>
    </>
  );
}
