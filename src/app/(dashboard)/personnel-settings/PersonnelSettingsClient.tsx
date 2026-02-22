"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchDepartments,
  fetchTeams,
  ensureOrgSettings,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createTeam,
  updateTeam,
  deleteTeam,
  updateOrgSettings,
} from "@/lib/org/data";
import type { OrgDepartment, OrgTeam, OrgSettings } from "@/lib/org/types";
import { DEFAULT_ROLE_OPTIONS } from "@/lib/org/types";

const ADMIN_ROLES = ["system_owner", "ceo", "admin"];

type PersonnelSettingsClientProps = {
  /** When true, hide PageHeader (e.g. when embedded as a tab in Settings). */
  embedded?: boolean;
};

export default function PersonnelSettingsClient({ embedded }: PersonnelSettingsClientProps) {
  const toast = useToast();
  const { user } = useCurrentUser();
  const [departments, setDepartments] = useState<OrgDepartment[]>([]);
  const [teams, setTeams] = useState<OrgTeam[]>([]);
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingDept, setEditingDept] = useState<OrgDepartment | null>(null);
  const [editingTeam, setEditingTeam] = useState<OrgTeam | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "dept" | "team"; id: string; name: string } | null>(null);
  const [formDeptName, setFormDeptName] = useState("");
  const [formTeamName, setFormTeamName] = useState("");
  const [formTeamDeptId, setFormTeamDeptId] = useState<string>("");
  const [defaultsForm, setDefaultsForm] = useState({
    default_role: "staff",
    default_department_id: "",
    default_team_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);

  const isAdmin = user ? ADMIN_ROLES.includes(user.role) : false;

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [depts, teamsList, s] = await Promise.all([
        fetchDepartments(),
        fetchTeams(),
        ensureOrgSettings(),
      ]);
      setDepartments(depts);
      setTeams(teamsList);
      setSettings(s);
      if (s) {
        setDefaultsForm({
          default_role: s.default_role,
          default_department_id: s.default_department_id ?? "",
          default_team_id: s.default_team_id ?? "",
        });
      }
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Ayarlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredTeams = deptFilter === "all"
    ? teams
    : teams.filter((t) => t.department_id === deptFilter);

  const handleCreateDept = useCallback(async () => {
    if (!formDeptName.trim()) return;
    setSubmitting(true);
    try {
      const created = await createDepartment(formDeptName.trim());
      setDepartments((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)));
      setShowDeptModal(false);
      setFormDeptName("");
      toast.success("Tamamlandı", "Departman eklendi.");
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Departman eklenemedi.");
    } finally {
      setSubmitting(false);
    }
  }, [formDeptName, toast]);

  const handleUpdateDept = useCallback(
    async (id: string, payload: Partial<OrgDepartment>) => {
      try {
        await updateDepartment(id, payload);
        setDepartments((prev) =>
          prev.map((d) => (d.id === id ? { ...d, ...payload } : d))
        );
        setEditingDept(null);
        toast.success("Tamamlandı", "Departman güncellendi.");
      } catch (err) {
        toast.error("Hata", err instanceof Error ? err.message : "Güncellenemedi.");
      }
    },
    [toast]
  );

  const handleDeleteDept = useCallback(
    async (id: string) => {
      try {
        await deleteDepartment(id);
        setDepartments((prev) => prev.filter((d) => d.id !== id));
        setDeleteConfirm(null);
        toast.success("Tamamlandı", "Departman silindi.");
      } catch (err) {
        toast.error("Hata", err instanceof Error ? err.message : "Silinemedi.");
      }
    },
    [toast]
  );

  const handleCreateTeam = useCallback(async () => {
    if (!formTeamName.trim()) return;
    setSubmitting(true);
    try {
      const created = await createTeam(formTeamName.trim(), formTeamDeptId || null);
      setTeams((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)));
      setShowTeamModal(false);
      setFormTeamName("");
      setFormTeamDeptId("");
      toast.success("Tamamlandı", "Ekip eklendi.");
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Ekip eklenemedi.");
    } finally {
      setSubmitting(false);
    }
  }, [formTeamName, formTeamDeptId, toast]);

  const handleUpdateTeam = useCallback(
    async (id: string, payload: Partial<OrgTeam>) => {
      try {
        await updateTeam(id, payload);
        setTeams((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...payload } : t))
        );
        setEditingTeam(null);
        toast.success("Tamamlandı", "Ekip güncellendi.");
      } catch (err) {
        toast.error("Hata", err instanceof Error ? err.message : "Güncellenemedi.");
      }
    },
    [toast]
  );

  const handleDeleteTeam = useCallback(
    async (id: string) => {
      try {
        await deleteTeam(id);
        setTeams((prev) => prev.filter((t) => t.id !== id));
        setDeleteConfirm(null);
        toast.success("Tamamlandı", "Ekip silindi.");
      } catch (err) {
        toast.error("Hata", err instanceof Error ? err.message : "Silinemedi.");
      }
    },
    [toast]
  );

  const handleSaveDefaults = useCallback(async () => {
    setSavingDefaults(true);
    try {
      await updateOrgSettings({
        default_role: defaultsForm.default_role,
        default_department_id: defaultsForm.default_department_id || null,
        default_team_id: defaultsForm.default_team_id || null,
      });
      setSettings((prev) =>
        prev ? { ...prev, ...defaultsForm } : null
      );
      toast.success("Tamamlandı", "Varsayılanlar kaydedildi.");
    } catch (err) {
      toast.error("Hata", err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setSavingDefaults(false);
    }
  }, [defaultsForm, toast]);

  if (!isAdmin) {
    return (
      <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 text-center backdrop-blur-sm">
        <p className="text-sm ui-text-muted">Bu sayfayı görüntülemek için yetkiniz yok.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {!embedded && (
        <PageHeader
          title="Personel Ayarları"
          subtitle="Departman, ekip ve varsayılan personel ayarlarını yönet."
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-surface2)]" />
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Departmanlar */}
            <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
                <h2 className="font-semibold text-[var(--color-text)]">Departmanlar</h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditingDept(null);
                    setFormDeptName("");
                    setShowDeptModal(true);
                  }}
                  className="ui-button-primary rounded-lg px-3 py-2 text-sm font-semibold"
                >
                  Ekle
                </button>
              </div>
              <div className="divide-y divide-[var(--color-border)] max-h-64 overflow-y-auto">
                {departments.length === 0 ? (
                  <div className="p-4 text-sm ui-text-muted">Henüz departman yok.</div>
                ) : (
                  departments.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-2 p-4"
                    >
                      {editingDept?.id === d.id ? (
                        <input
                          type="text"
                          value={formDeptName}
                          onChange={(e) => setFormDeptName(e.target.value)}
                          className="ui-input flex-1 py-2 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateDept(d.id, { name: formDeptName.trim() });
                            if (e.key === "Escape") setEditingDept(null);
                          }}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--color-text)]">{d.name}</span>
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              d.is_active ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-500/20 text-slate-400"
                            }`}
                          >
                            {d.is_active ? "Aktif" : "Pasif"}
                          </span>
                        </div>
                      )}
                      <div className="flex gap-1">
                        {editingDept?.id === d.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateDept(d.id, { name: formDeptName.trim() })}
                              className="rounded px-2 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
                            >
                              Kaydet
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDept(null)}
                              className="rounded px-2 py-1 text-xs ui-text-muted hover:bg-[var(--color-surface-hover)]"
                            >
                              İptal
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDept(d);
                                setFormDeptName(d.name);
                              }}
                              className="rounded px-2 py-1 text-xs ui-text-muted hover:bg-[var(--color-surface-hover)]"
                            >
                              Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateDept(d.id, { is_active: !d.is_active })}
                              className="rounded px-2 py-1 text-xs ui-text-muted hover:bg-[var(--color-surface-hover)]"
                            >
                              {d.is_active ? "Pasif Yap" : "Aktif Yap"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm({ type: "dept", id: d.id, name: d.name })}
                              className="rounded px-2 py-1 text-xs text-red-200 hover:bg-red-500/20"
                            >
                              Sil
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Ekipler */}
            <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-[var(--color-text)]">Ekipler</h2>
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="ui-input w-36 py-1.5 text-sm"
                  >
                    <option value="all">Tümü</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTeam(null);
                    setFormTeamName("");
                    setFormTeamDeptId(deptFilter !== "all" ? deptFilter : "");
                    setShowTeamModal(true);
                  }}
                  className="ui-button-primary rounded-lg px-3 py-2 text-sm font-semibold"
                >
                  Ekle
                </button>
              </div>
              <div className="divide-y divide-[var(--color-border)] max-h-64 overflow-y-auto">
                {filteredTeams.length === 0 ? (
                  <div className="p-4 text-sm ui-text-muted">Henüz ekip yok.</div>
                ) : (
                  filteredTeams.map((t) => {
                    const dept = departments.find((d) => d.id === t.department_id);
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-2 p-4"
                      >
                        {editingTeam?.id === t.id ? (
                          <input
                            type="text"
                            value={formTeamName}
                            onChange={(e) => setFormTeamName(e.target.value)}
                            className="ui-input flex-1 py-2 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdateTeam(t.id, { name: formTeamName.trim() });
                              if (e.key === "Escape") setEditingTeam(null);
                            }}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--color-text)]">{t.name}</span>
                            <span className="text-xs ui-text-muted">{dept?.name ?? "—"}</span>
                            <span
                              className={`rounded px-2 py-0.5 text-xs font-medium ${
                                t.is_active ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-500/20 text-slate-400"
                              }`}
                            >
                              {t.is_active ? "Aktif" : "Pasif"}
                            </span>
                          </div>
                        )}
                        <div className="flex gap-1">
                          {editingTeam?.id === t.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateTeam(t.id, { name: formTeamName.trim() })}
                                className="rounded px-2 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
                              >
                                Kaydet
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingTeam(null)}
                                className="rounded px-2 py-1 text-xs ui-text-muted hover:bg-[var(--color-surface-hover)]"
                              >
                                İptal
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTeam(t);
                                  setFormTeamName(t.name);
                                }}
                                className="rounded px-2 py-1 text-xs ui-text-muted hover:bg-[var(--color-surface-hover)]"
                              >
                                Düzenle
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateTeam(t.id, { is_active: !t.is_active })}
                                className="rounded px-2 py-1 text-xs ui-text-muted hover:bg-[var(--color-surface-hover)]"
                              >
                                {t.is_active ? "Pasif Yap" : "Aktif Yap"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm({ type: "team", id: t.id, name: t.name })}
                                className="rounded px-2 py-1 text-xs text-red-200 hover:bg-red-500/20"
                              >
                                Sil
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Varsayılanlar */}
          <div className="ui-glass rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 backdrop-blur-sm">
            <h2 className="mb-4 font-semibold text-[var(--color-text)]">Varsayılanlar</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Varsayılan Rol</label>
                <select
                  value={defaultsForm.default_role}
                  onChange={(e) =>
                    setDefaultsForm((f) => ({ ...f, default_role: e.target.value }))
                  }
                  className="ui-input w-full"
                >
                  {DEFAULT_ROLE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Varsayılan Departman</label>
                <select
                  value={defaultsForm.default_department_id}
                  onChange={(e) =>
                    setDefaultsForm((f) => ({
                      ...f,
                      default_department_id: e.target.value,
                      default_team_id: "",
                    }))
                  }
                  className="ui-input w-full"
                >
                  <option value="">—</option>
                  {departments.filter((d) => d.is_active).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Varsayılan Ekip</label>
                <select
                  value={defaultsForm.default_team_id}
                  onChange={(e) =>
                    setDefaultsForm((f) => ({ ...f, default_team_id: e.target.value }))
                  }
                  className="ui-input w-full"
                >
                  <option value="">—</option>
                  {teams
                    .filter(
                      (t) =>
                        t.is_active &&
                        (!defaultsForm.default_department_id ||
                          t.department_id === defaultsForm.default_department_id)
                    )
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {departments.find((d) => d.id === t.department_id)?.name
                          ? ` (${departments.find((d) => d.id === t.department_id)?.name})`
                          : ""}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveDefaults}
              disabled={savingDefaults}
              className="mt-4 ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {savingDefaults ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </>
      )}

      {/* Add Department Modal */}
      {showDeptModal && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowDeptModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Yeni Departman</h2>
            <input
              type="text"
              value={formDeptName}
              onChange={(e) => setFormDeptName(e.target.value)}
              placeholder="Departman adı"
              className="ui-input mt-4 w-full"
              autoFocus
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeptModal(false)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleCreateDept}
                disabled={submitting || !formDeptName.trim()}
                className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? "Ekleniyor…" : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Team Modal */}
      {showTeamModal && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowTeamModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Yeni Ekip</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Departman</label>
                <select
                  value={formTeamDeptId}
                  onChange={(e) => setFormTeamDeptId(e.target.value)}
                  className="ui-input w-full"
                >
                  <option value="">—</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium ui-text-muted">Ekip adı</label>
                <input
                  type="text"
                  value={formTeamName}
                  onChange={(e) => setFormTeamName(e.target.value)}
                  placeholder="Ekip adı"
                  className="ui-input w-full"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowTeamModal(false)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleCreateTeam}
                disabled={submitting || !formTeamName.trim()}
                className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? "Ekleniyor…" : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Silme Onayı</h2>
            <p className="mt-2 text-sm ui-text-secondary">
              &quot;{deleteConfirm.name}&quot; silinsin mi?
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-4 py-2 text-sm font-medium ui-text-secondary"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() =>
                  deleteConfirm.type === "dept"
                    ? handleDeleteDept(deleteConfirm.id)
                    : handleDeleteTeam(deleteConfirm.id)
                }
                className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/30"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
