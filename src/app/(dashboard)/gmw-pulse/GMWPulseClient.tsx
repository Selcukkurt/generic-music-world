"use client";

import { useState, useMemo } from "react";
import PageHeader from "@/components/shell/PageHeader";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { SINGLE_ADMIN_MODE } from "@/config/pulse";
import { type ModuleHealth } from "@/lib/pulse/data";
import {
  useModulePlansStore,
  computeHealth,
  computeEtaConfidenceBreakdown,
  computeProgressFromMilestones,
  getEffectiveEta,
  getEffectiveProgress,
  getGlobalHealthSummary,
  type ModulePlan,
  type ModulePlanStatus,
  type ModulePlanRiskLevel,
} from "@/lib/module-plans";

const today = new Date().toISOString().slice(0, 10);

/** Safe date parsing – returns null for invalid/missing dates */
function safeDate(d?: string | null): Date | null {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
}

const DATE_RANGES = [
  { id: "month", label: "Bu Ay" },
  { id: "quarter", label: "Bu Çeyrek" },
  { id: "year", label: "Bu Yıl" },
  { id: "custom", label: "Özel" },
];

const STATUS_OPTIONS: { id: ModulePlanStatus; label: string }[] = [
  { id: "planned", label: "Planlandı" },
  { id: "in_progress", label: "Devam Ediyor" },
  { id: "done", label: "Tamamlandı" },
  { id: "blocked", label: "Engellendi" },
];

const HEALTH_LABELS: Record<ModuleHealth, string> = {
  on_track: "Yolunda",
  behind: "Gecikmiş",
  overdue: "Süresi Geçti",
  blocked: "Engellendi",
};

const HEALTH_CLASS: Record<ModuleHealth, string> = {
  on_track: "bg-emerald-500/20 text-emerald-400",
  behind: "bg-amber-500/20 text-amber-400",
  overdue: "bg-red-500/20 text-red-400",
  blocked: "bg-red-600/20 text-red-300",
};

const VIEW_TABS = [
  { id: "roadmap", label: "Yol Haritası" },
  { id: "table", label: "Tablo" },
  { id: "cards", label: "Kartlar" },
];

const MODE_TABS = [
  { id: "takip", label: "Takip" },
  { id: "duzenle", label: "Düzenle" },
];

type PulseModuleView = ModulePlan & { health: ModuleHealth };

const RISK_OPTIONS: { id: ModulePlanRiskLevel; label: string }[] = [
  { id: "none", label: "Yok" },
  { id: "low", label: "Düşük" },
  { id: "medium", label: "Orta" },
  { id: "high", label: "Yüksek" },
  { id: "critical", label: "Kritik" },
];

const RISK_CLASS: Record<ModulePlanRiskLevel, string> = {
  none: "bg-zinc-500/20 text-zinc-400",
  low: "bg-emerald-500/20 text-emerald-400",
  medium: "bg-amber-500/20 text-amber-400",
  high: "bg-orange-500/20 text-orange-400",
  critical: "bg-red-500/20 text-red-400",
};

function OwnerAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/20 text-xs font-medium text-[var(--color-primary)]"
      title={name}
    >
      {initials}
    </div>
  );
}

function ShiftDatesModal({
  moduleCode,
  onClose,
  onApply,
}: {
  moduleCode: string;
  onClose: () => void;
  onApply: (days: number) => void;
}) {
  const [days, setDays] = useState(0);
  return (
    <Modal isOpen onClose={onClose} title="Tarih kaydır">
      <div className="space-y-4">
        <p className="text-sm ui-text-muted">Modül: {moduleCode}</p>
        <div>
          <label className="text-xs font-medium ui-text-muted">Gün sayısı (+ ileri, − geri)</label>
          <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value) || 0)} className="ui-input mt-1 w-full text-sm" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-surface-hover)]">İptal</button>
          <button type="button" onClick={() => onApply(days)} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-white hover:opacity-90">Uygula</button>
        </div>
      </div>
    </Modal>
  );
}

function BulkUpdateModal({
  isOpen,
  selectedIds,
  onClose,
  onApply,
}: {
  isOpen: boolean;
  selectedIds: Set<string>;
  onClose: () => void;
  onApply: (updates: { status?: ModulePlanStatus; owner?: string; shiftDays?: number }) => void;
}) {
  const [status, setStatus] = useState<ModulePlanStatus | "">("");
  const [owner, setOwner] = useState("");
  const [shiftDays, setShiftDays] = useState(0);

  const handleApply = () => {
    const updates: { status?: ModulePlanStatus; owner?: string; shiftDays?: number } = {};
    if (status) updates.status = status as ModulePlanStatus;
    if (owner.trim()) updates.owner = owner.trim();
    if (shiftDays !== 0) updates.shiftDays = shiftDays;
    onApply(updates);
    onClose();
  };

  return (
    <Modal isOpen={isOpen && selectedIds.size > 0} onClose={onClose} title="Toplu güncelle">
      <div className="space-y-4">
        <p className="text-sm ui-text-muted">{selectedIds.size} modül seçildi.</p>
        <div>
          <label className="text-xs font-medium ui-text-muted">Durum</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ModulePlanStatus | "")}
            className="ui-input mt-1 w-full text-sm"
          >
            <option value="">Değiştirme</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        {!SINGLE_ADMIN_MODE && (
          <div>
            <label className="text-xs font-medium ui-text-muted">Sahip</label>
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Yeni sahip (boş bırak = değiştirme)"
              className="ui-input mt-1 w-full text-sm"
            />
          </div>
        )}
        <div>
          <label className="text-xs font-medium ui-text-muted">Tarih kaydır (gün)</label>
          <input
            type="number"
            value={shiftDays}
            onChange={(e) => setShiftDays(Number(e.target.value) || 0)}
            placeholder="0 = değiştirme"
            className="ui-input mt-1 w-full text-sm"
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-surface-hover)]">
            İptal
          </button>
          <button type="button" onClick={handleApply} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-white hover:opacity-90">
            Uygula
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Accordion({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--color-border)]/40">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between py-3 text-left text-sm font-medium ui-text-secondary">
        {title}
        <span className="text-lg ui-text-muted">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

function DeepDiveDrawer({
  module,
  onClose,
  onSave,
  defaultOwner = "",
}: {
  module: PulseModuleView | null;
  onClose: () => void;
  onSave: () => void;
  defaultOwner?: string;
}) {
  const updatePlan = useModulePlansStore((s) => s.updatePlan);
  const current = module ?? null;
  const isOpen = !!current;
  const [form, setForm] = useState<Partial<ModulePlan>>(() => (current ? { ...current } : {}));
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [accordionMilestones, setAccordionMilestones] = useState(true);
  const [accordionNotes, setAccordionNotes] = useState(false);
  const [accordionTechnical, setAccordionTechnical] = useState(false);
  const [blockedReasonOpen, setBlockedReasonOpen] = useState(false);
  const [blockedReason, setBlockedReason] = useState("");

  const doSave = (updates?: Partial<ModulePlan>) => {
    if (!current) return;
    setSaveStatus("saving");
    const merged = { ...form, ...updates };
    updatePlan(current.module_code, {
      status: merged.status ?? current.status,
      progress: merged.progress ?? current.progress,
      progress_mode: merged.progress_mode ?? current.progress_mode,
      preserve_progress_on_add: merged.preserve_progress_on_add ?? current.preserve_progress_on_add,
      plan_start: merged.plan_start === "" ? null : (merged.plan_start ?? current.plan_start),
      plan_end: merged.plan_end === "" ? null : (merged.plan_end ?? current.plan_end),
      eta: merged.eta === "" ? null : (merged.eta ?? current.eta),
      owner: merged.owner ?? current.owner,
      risk_level: merged.risk_level ?? current.risk_level,
      dependencies: merged.dependencies ?? current.dependencies ?? [],
      notes: merged.notes ?? current.notes,
      milestones: merged.milestones ?? current.milestones,
      next_step: merged.next_step ?? current.next_step,
      technical_health: merged.technical_health ?? current.technical_health,
    });
    if (updates) setForm((f) => ({ ...f, ...updates }));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const applyForm = (patch: Partial<ModulePlan>) => {
    setForm((f) => ({ ...f, ...patch }));
    doSave(patch);
  };

  const toggleMilestone = (milId: string) => {
    if (!current) return;
    const next = (form.milestones ?? current.milestones).map((m) =>
      m.id === milId ? { ...m, done: !m.done } : m
    );
    const isMilestoneMode = (form.progress_mode ?? current.progress_mode) === "milestone";
    const r = computeProgressFromMilestones(next);
    const progress = isMilestoneMode && next.length > 0 ? r.progress : (form.progress ?? current.progress);
    applyForm({ milestones: next, progress });
  };

  const updateMilestone = (milId: string, patch: Partial<{ title: string; due_date: string | null; owner: string | null }>) => {
    if (!current) return;
    const next = (form.milestones ?? current.milestones).map((m) =>
      m.id === milId ? { ...m, ...patch } : m
    );
    const isMilestoneMode = (form.progress_mode ?? current.progress_mode) === "milestone";
    const r = computeProgressFromMilestones(next);
    applyForm(isMilestoneMode && next.length > 0 ? { milestones: next, progress: r.progress } : { milestones: next });
  };

  const addMilestone = () => {
    if (!current) return;
    const list = form.milestones ?? current.milestones;
    const id = `mil-${Date.now()}`;
    const preserveOnAdd = form.preserve_progress_on_add ?? current.preserve_progress_on_add ?? false;
    const newDone = preserveOnAdd;
    const next = [...list, { id, title: "Yeni taş", done: newDone, owner: defaultOwner || null }];
    const isMilestoneMode = (form.progress_mode ?? current.progress_mode) === "milestone";
    const r = computeProgressFromMilestones(next);
    applyForm(isMilestoneMode && next.length > 0 ? { milestones: next, progress: r.progress } : { milestones: next });
  };

  const removeMilestone = (milId: string) => {
    if (!current) return;
    const next = (form.milestones ?? current.milestones).filter((m) => m.id !== milId);
    const isMilestoneMode = (form.progress_mode ?? current.progress_mode) === "milestone";
    const r = computeProgressFromMilestones(next);
    applyForm(isMilestoneMode && next.length > 0 ? { milestones: next, progress: r.progress } : { milestones: next });
  };

  const shiftEta = (days: number) => {
    if (!current) return;
    const eta = form.eta ?? current.eta ?? current.plan_end;
    if (!eta || !/^\d{4}-\d{2}-\d{2}$/.test(eta)) return;
    const d = new Date(eta);
    d.setDate(d.getDate() + days);
    applyForm({ eta: d.toISOString().slice(0, 10) });
  };

  const getMonthEnd = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().slice(0, 10);
  };

  if (!isOpen) return null;
  const m = current!;
  const f = { ...m, ...form };
  const milestones = f.milestones ?? [];
  const isMilestoneMode = (f.progress_mode ?? "manual") === "milestone";
  const progressInfo = isMilestoneMode && milestones.length > 0 ? computeProgressFromMilestones(milestones) : null;
  const displayProgress = progressInfo ? progressInfo.progress : (f.progress ?? 0);
  const progressLabel = progressInfo ? `${progressInfo.doneCount}/${progressInfo.totalCount} (%${progressInfo.progress})` : `%${displayProgress}`;
  const confidenceBreakdown = computeEtaConfidenceBreakdown(m);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${m.short_code ?? m.module_code} – ${m.name}`} size="lg">
      <div className="space-y-6">
        {/* Quick Update bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/50 p-4">
          <div className="flex items-center gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => applyForm({ status: s.id })}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  f.status === s.id ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-[var(--color-border)]/50" />
          <div className="flex items-center gap-2">
            <button type="button" disabled={isMilestoneMode} onClick={() => applyForm({ progress: Math.max(0, displayProgress - 10) })} className="rounded border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed">−10</button>
            <span className="min-w-[4ch] text-center text-sm font-semibold">{progressLabel}</span>
            <button type="button" disabled={isMilestoneMode} onClick={() => applyForm({ progress: Math.min(100, displayProgress + 10) })} className="rounded border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed">+10</button>
          </div>
          <div className="h-4 w-px bg-[var(--color-border)]/50" />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => shiftEta(7)} className="rounded border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-surface-hover)]">+7</button>
            <button type="button" onClick={() => shiftEta(14)} className="rounded border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-surface-hover)]">+14</button>
            <button type="button" onClick={() => applyForm({ eta: getMonthEnd() })} className="rounded border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-surface-hover)]">Ay sonu</button>
          </div>
          {saveStatus === "saved" && <span className="ml-auto text-xs font-medium text-emerald-500">Kaydedildi ✓</span>}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column */}
          <div className="space-y-4">
            <section>
              <h3 className="mb-3 text-sm font-semibold ui-text-muted">Genel Bakış</h3>
              {m.description && <p className="mb-3 text-sm ui-text-muted">{m.description}</p>}
              <div className="flex flex-wrap gap-2">
                <span className={`rounded px-2 py-0.5 text-xs ${HEALTH_CLASS[m.health]}`}>{HEALTH_LABELS[m.health]}</span>
                <span className="group relative rounded bg-zinc-500/20 px-2 py-0.5 text-xs">
                  ETA güveni: %{confidenceBreakdown.score}
                  <span className="absolute left-0 top-full z-10 mt-1 hidden min-w-[200px] rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-[10px] shadow-lg group-hover:block">
                    A Zaman: %{confidenceBreakdown.A_time} · B İlerleme: %{confidenceBreakdown.B_progress} · C Risk: %{confidenceBreakdown.C_risk}
                  </span>
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium ui-text-muted">Risk</label>
                  <select value={f.risk_level} onChange={(e) => applyForm({ risk_level: e.target.value as ModulePlanRiskLevel })} className="ui-input mt-1 w-full text-sm">
                    {RISK_OPTIONS.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
                {SINGLE_ADMIN_MODE ? (
                  <div>
                    <label className="text-xs font-medium ui-text-muted">Sahip</label>
                    <p className="mt-1 text-sm ui-text-muted">Sen{defaultOwner ? ` / ${defaultOwner}` : " / GMW Super Admin"}</p>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-medium ui-text-muted">Sahip</label>
                    <input type="text" value={f.owner} onChange={(e) => setForm((x) => ({ ...x, owner: e.target.value }))} onBlur={() => doSave({ owner: f.owner })} className="ui-input mt-1 w-full text-sm" />
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isMilestoneMode} onChange={(e) => applyForm({ progress_mode: e.target.checked ? "milestone" : "manual" })} className="rounded" />
                  İlerleme kilometre taşlarından
                </label>
                {isMilestoneMode && (
                  <label className="flex items-center gap-2 text-xs ui-text-muted">
                    <input type="checkbox" checked={f.preserve_progress_on_add ?? false} onChange={(e) => applyForm({ preserve_progress_on_add: e.target.checked })} className="rounded" />
                    Yeni taş eklerken ilerlemeyi koru
                  </label>
                )}
              </div>
              {!isMilestoneMode && (
                <div className="mt-3">
                  <label className="text-xs font-medium ui-text-muted">İlerleme %{displayProgress}</label>
                  <input type="range" min={0} max={100} value={displayProgress} onChange={(e) => applyForm({ progress: Number(e.target.value) })} className="mt-2 w-full" />
                </div>
              )}
              {isMilestoneMode && progressInfo && (
                <p className="mt-2 text-xs ui-text-muted">Progress: {progressInfo.doneCount}/{progressInfo.totalCount} (%{progressInfo.progress})</p>
              )}
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold ui-text-muted">ETA & Tarihler</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium ui-text-muted">Plan baş/bitiş</label>
                  <div className="mt-1 flex gap-2">
                    <input type="date" value={f.plan_start ?? ""} onChange={(e) => setForm((x) => ({ ...x, plan_start: e.target.value }))} onBlur={() => doSave({ plan_start: f.plan_start })} className="ui-input w-full text-sm" />
                    <input type="date" value={f.plan_end ?? ""} onChange={(e) => setForm((x) => ({ ...x, plan_end: e.target.value }))} onBlur={() => doSave({ plan_end: f.plan_end })} className="ui-input w-full text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium ui-text-muted">ETA</label>
                  <input type="date" value={f.eta ?? ""} onChange={(e) => applyForm({ eta: e.target.value || null })} className="ui-input mt-1 w-full text-sm" />
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold ui-text-muted">Sonraki Adım</h3>
              <input type="text" value={f.next_step ?? ""} onChange={(e) => setForm((x) => ({ ...x, next_step: e.target.value }))} onBlur={() => doSave({ next_step: f.next_step })} placeholder="Bir sonraki aksiyon..." className="ui-input w-full text-sm" />
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold ui-text-muted">Bağımlılıklar</h3>
              <input
                type="text"
                value={(f.dependencies ?? []).join(", ")}
                onChange={(e) => setForm((x) => ({ ...x, dependencies: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                onBlur={() => doSave({ dependencies: f.dependencies })}
                placeholder="m01, m02 (virgülle ayırın)"
                className="ui-input w-full text-sm"
              />
            </section>
          </div>

          {/* Right column – accordions */}
          <div className="space-y-0">
            <Accordion title="Kilometre Taşları" open={accordionMilestones} onToggle={() => setAccordionMilestones(!accordionMilestones)}>
              <div className="space-y-2">
                {milestones.map((mil) => (
                  <div key={mil.id} className="flex items-center gap-2 rounded-lg border border-[var(--color-border)]/40 bg-[var(--color-surface-elevated)]/30 p-2 text-sm">
                    <input type="checkbox" checked={mil.done} onChange={() => toggleMilestone(mil.id)} className="shrink-0 rounded" title="Tamamlandı" />
                    <input type="text" value={mil.title} onChange={(e) => updateMilestone(mil.id, { title: e.target.value })} className="min-w-0 flex-1 rounded border-0 bg-transparent px-2 py-1 text-sm focus:ring-1" />
                    <input type="date" value={mil.due_date ?? ""} onChange={(e) => updateMilestone(mil.id, { due_date: e.target.value || null })} className="ui-input w-28 text-xs" />
                    {!SINGLE_ADMIN_MODE && (
                      <input type="text" value={mil.owner ?? ""} onChange={(e) => updateMilestone(mil.id, { owner: e.target.value || null })} placeholder="Sahip" className="ui-input w-24 text-xs" />
                    )}
                    <button type="button" onClick={() => removeMilestone(mil.id)} className="shrink-0 rounded p-1 text-red-400 hover:bg-red-500/20" title="Kaldır">×</button>
                  </div>
                ))}
                <button type="button" onClick={addMilestone} className="w-full rounded-lg border border-dashed border-[var(--color-border)] py-2 text-xs ui-text-muted hover:bg-[var(--color-surface-hover)]">
                  + Taş ekle
                </button>
              </div>
            </Accordion>
            <Accordion title="Notlar" open={accordionNotes} onToggle={() => setAccordionNotes(!accordionNotes)}>
              <textarea value={f.notes ?? ""} onChange={(e) => setForm((x) => ({ ...x, notes: e.target.value }))} onBlur={() => doSave({ notes: f.notes })} className="ui-input w-full text-sm" rows={4} />
            </Accordion>
            <Accordion title="Teknik Sağlık" open={accordionTechnical} onToggle={() => setAccordionTechnical(!accordionTechnical)}>
              <input type="text" value={f.technical_health ?? ""} onChange={(e) => setForm((x) => ({ ...x, technical_health: e.target.value }))} onBlur={() => doSave({ technical_health: f.technical_health })} placeholder="Örn: API stabil, testler bekliyor" className="ui-input w-full text-sm" />
            </Accordion>
          </div>
        </div>

        {/* Footer quick actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border)] pt-6">
          <span className="text-xs ui-text-muted">Son güncelleme: {m.updated_at}</span>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => { applyForm({ status: "done", progress: 100 }); onSave(); }} className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30">
              Tamamla
            </button>
            <button type="button" onClick={() => setBlockedReasonOpen(true)} className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30">
              Engelle
            </button>
            <button type="button" onClick={() => shiftEta(7)} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-surface-hover)]">
              +7 gün
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-surface-hover)]">Kapat</button>
          </div>
        </div>
      </div>

      {/* Blocked reason modal */}
      {blockedReasonOpen && (
        <div className="fixed inset-0 z-[calc(var(--z-modal)+1)] flex items-center justify-center bg-black/50" onClick={() => { setBlockedReasonOpen(false); setBlockedReason(""); }}>
          <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-sm font-semibold">Engelleme nedeni</h3>
            <textarea value={blockedReason} onChange={(e) => setBlockedReason(e.target.value)} placeholder="Neden engellendi?" className="ui-input w-full text-sm" rows={3} />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setBlockedReasonOpen(false); setBlockedReason(""); }} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm">İptal</button>
              <button type="button" onClick={() => { applyForm({ status: "blocked", notes: [f.notes, blockedReason].filter(Boolean).join("\n\n") }); setBlockedReasonOpen(false); setBlockedReason(""); onSave(); }} className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white">Engelle</button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Modal({
  isOpen,
  onClose,
  title,
  children,
  size,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "md" | "lg";
}) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full max-h-[90vh] overflow-y-auto rounded-t-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl sm:rounded-xl ${size === "lg" ? "max-w-4xl" : "max-w-2xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 ui-text-muted hover:bg-[var(--color-surface-hover)]"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function getWeekEnd(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function GMWPulseClient() {
  const { user } = useCurrentUser();
  const defaultOwner = user?.fullName ?? "";
  const updatePlan = useModulePlansStore((s) => s.updatePlan);
  const bulkUpdatePlan = useModulePlansStore((s) => s.bulkUpdatePlan);
  const [editMode, setEditMode] = useState<"takip" | "duzenle">("takip");
  const [dateRange, setDateRange] = useState("quarter");
  const [statusFilter, setStatusFilter] = useState<ModulePlanStatus[]>([]);
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [ownerFilter, setOwnerFilter] = useState<string>("");
  const [onlyRisks, setOnlyRisks] = useState(false);
  const [onlyBehind, setOnlyBehind] = useState(false);
  const [viewTab, setViewTab] = useState<"roadmap" | "table" | "cards">("roadmap");
  const [selectedModule, setSelectedModule] = useState<PulseModuleView | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [shiftModuleId, setShiftModuleId] = useState<string | null>(null);

  // Single source of truth: derive plans ONLY from Zustand store (no PULSE_MODULES, no mock fallback)
  // Select plansMap (stable ref) then derive plans via useMemo to avoid infinite render loop
  const plansMap = useModulePlansStore((s) => s.plans);
  const plans = useMemo(() => Object.values(plansMap ?? {}), [plansMap]);
  const modules = useMemo(() => {
    return plans.map((p) => {
      try {
        const health = computeHealth(p);
        return { ...p, health } as PulseModuleView;
      } catch {
        return { ...p, health: "on_track" as ModuleHealth } as PulseModuleView;
      }
    });
  }, [plans]);

  const globalSummary = useMemo(
    () => getGlobalHealthSummary(plans),
    [plans]
  );

  const filtered = useMemo(() => {
    let list = modules ?? [];
    if (statusFilter.length > 0) {
      list = list.filter((m) => statusFilter.includes(m.status));
    }
    if (teamFilter) {
      list = list.filter((m) => m.team === teamFilter);
    }
    if (ownerFilter) {
      list = list.filter((m) => m.owner.toLowerCase().includes(ownerFilter.toLowerCase()));
    }
    if (onlyRisks) {
      list = list.filter((m) => m.risk_level !== "none" && m.risk_level !== "low");
    }
    if (onlyBehind) {
      list = list.filter((m) => m.health === "behind" || m.health === "overdue" || m.health === "blocked");
    }
    return list;
  }, [modules, statusFilter, teamFilter, ownerFilter, onlyRisks, onlyBehind]);

  const kpis = useMemo(() => {
    const list = modules ?? [];
    const active = list.filter((m) => m.status === "in_progress").length;
    const dueThisMonth = list.filter((m) => {
      const end = m.plan_end;
      if (!end || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return false;
      const parts = end.split("-").map(Number);
      const [y, mo] = parts;
      if (Number.isNaN(y) || Number.isNaN(mo)) return false;
      const now = new Date();
      return y === now.getFullYear() && mo === now.getMonth() + 1 && m.status !== "done";
    }).length;
    const behind = list.filter((m) => m.health === "behind").length;
    const blocked = list.filter((m) => m.health === "blocked").length;
    const avgProgress =
      list.length > 0
        ? Math.round(list.reduce((a, b) => a + b.progress, 0) / list.length)
        : 0;
    const criticalRisk = list.filter((m) => m.risk_level === "critical").length;

    return { active, dueThisMonth, behind, blocked, avgProgress, criticalRisk };
  }, [modules]);

  const applyKpiFilter = (type: "active" | "due" | "behind" | "blocked" | "risk") => {
    if (type === "active") setStatusFilter(["in_progress"]);
    else if (type === "due") setStatusFilter(["in_progress", "planned"]);
    else if (type === "behind") setOnlyBehind(true);
    else if (type === "blocked") setStatusFilter(["blocked"]);
    else if (type === "risk") setOnlyRisks(true);
  };

  const teams = useMemo(
    () => [...new Set((modules ?? []).map((m) => m.team).filter((t): t is string => !!t))].sort(),
    [modules]
  );

  const highlightsKritik = useMemo(() => {
    const list = modules ?? [];
    return list
      .filter((m) => m.health === "blocked" || m.health === "overdue")
      .slice(0, 5);
  }, [modules]);

  const weekEnd = useMemo(() => getWeekEnd(new Date()), []);
  const highlightsBuHafta = useMemo(() => {
    const list = modules ?? [];
    return list
      .filter((m) => {
        const end = m.eta ?? m.plan_end;
        if (!end || m.status === "done") return false;
        return end <= weekEnd && end >= today;
      })
      .slice(0, 5);
  }, [modules, weekEnd]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const list = filtered ?? [];
    if (selectedIds.size === list.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(list.map((m) => m.module_code)));
  };

  const ganttStart = useMemo(() => {
    const list = modules ?? [];
    const dates = list.flatMap((m) =>
      [m.plan_start, m.plan_end, m.actual_start, m.eta].filter((x): x is string => !!x && /^\d{4}-\d{2}-\d{2}$/.test(x))
    );
    return dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : today;
  }, [modules]);

  const ganttEnd = useMemo(() => {
    const list = modules ?? [];
    const dates = list.flatMap((m) =>
      [m.plan_end, m.eta, m.actual_end].filter((x): x is string => !!x && /^\d{4}-\d{2}-\d{2}$/.test(x))
    );
    return dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : today;
  }, [modules]);

  const ganttDays = useMemo(() => {
    const start = safeDate(ganttStart);
    const end = safeDate(ganttEnd);
    if (!start || !end) return 30;
    const ms = end.getTime() - start.getTime();
    const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
    return Math.max(days, 1);
  }, [ganttStart, ganttEnd]);

  const dateToX = (dateStr: string) => {
    const d = safeDate(dateStr);
    const start = safeDate(ganttStart);
    if (!d || !start || ganttDays <= 0) return 0;
    const msPerDay = 24 * 60 * 60 * 1000;
    const safeTotalDays = Math.max(ganttDays, 1);
    return ((d.getTime() - start.getTime()) / msPerDay / safeTotalDays) * 100;
  };

  const monthTicks = useMemo(() => {
    const start = safeDate(ganttStart);
    const end = safeDate(ganttEnd);
    if (!start || !end || ganttDays <= 0) return [];
    const msPerDay = 24 * 60 * 60 * 1000;
    const safeTotalDays = Math.max(ganttDays, 1);
    const toX = (d: Date) => ((d.getTime() - start.getTime()) / msPerDay / safeTotalDays) * 100;
    const ticks: { label: string; x: number }[] = [];
    const cur = new Date(start);
    cur.setDate(1);
    const endMonth = new Date(end);
    endMonth.setDate(1);
    while (cur <= endMonth) {
      const str = cur.toISOString().slice(0, 7);
      ticks.push({ label: str, x: toX(new Date(cur.getTime())) });
      cur.setMonth(cur.getMonth() + 1);
    }
    return ticks;
  }, [ganttStart, ganttEnd, ganttDays]);

  const resetToTemplate = useModulePlansStore((s) => s.resetToTemplate);
  const isSuperAdmin = user?.role === "system_owner";

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader
        title="GMW Pulse V1"
        subtitle="Stratejik kontrol merkezi"
      >
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => {
              if (!window.confirm("Tüm modülleri planlama başlangıç durumuna sıfırlamak istediğinize emin misiniz? (status=planned, progress=0, milestones boş)")) return;
              resetToTemplate(defaultOwner || "GMW Super Admin");
              setSelectedModule(null);
              setSelectedIds(new Set());
            }}
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20"
          >
            Sıfırla (Reset)
          </button>
        )}
      </PageHeader>

      {/* ─── Executive Layer (sticky) ─── */}
      <section className="sticky top-0 z-30 -mx-4 -mt-2 space-y-6 bg-[var(--color-bg)]/95 px-4 pb-6 pt-2 backdrop-blur-md">
        {/* Ultra premium Executive Header */}
        <div className="ui-glass rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/70 p-6 shadow-lg backdrop-blur-xl transition-all">
          <div className="flex flex-wrap items-start justify-between gap-8">
            {/* Donut + large progress */}
            <div className="flex items-center gap-6">
              <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <defs>
                    <linearGradient id="pulseProgressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="var(--color-primary)" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M18 2.084a 15.916 15.916 0 0 1 0 31.832a 15.916 15.916 0 0 1 0 -31.832"
                    fill="none"
                    stroke="var(--color-surface-elevated)"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.084a 15.916 15.916 0 0 1 0 31.832a 15.916 15.916 0 0 1 0 -31.832"
                    fill="none"
                    stroke="url(#pulseProgressGrad)"
                    strokeWidth="3"
                    strokeDasharray={`${globalSummary.avgProgress}, 100`}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-[var(--color-text)]">%{globalSummary.avgProgress}</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text)]">Genel İlerleme</h2>
                <p className="mt-1 text-sm ui-text-muted">{globalSummary.total} modül</p>
                {/* Health distribution mini bar */}
                <div className="mt-3 flex h-2 w-40 overflow-hidden rounded-full bg-[var(--color-surface-elevated)]/80">
                  {globalSummary.total > 0 && (
                    <>
                      <div className="bg-emerald-500 transition-all" style={{ width: `${(globalSummary.on_track / globalSummary.total) * 100}%` }} title="Yolunda" />
                      <div className="bg-amber-500 transition-all" style={{ width: `${((globalSummary.behind + globalSummary.risk) / globalSummary.total) * 100}%` }} title="Risk/Gecikmiş" />
                      <div className="bg-red-500 transition-all" style={{ width: `${(globalSummary.overdue / globalSummary.total) * 100}%` }} title="Süresi geçti" />
                      <div className="bg-red-600 transition-all" style={{ width: `${(globalSummary.blocked / globalSummary.total) * 100}%` }} title="Engelli" />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Final ETA + Trend + Confidence */}
            <div className="flex flex-wrap items-center gap-8">
              <div>
                <p className="text-xs font-medium ui-text-muted">Final ETA</p>
                <p className="mt-0.5 text-lg font-bold">{globalSummary.finalEta ?? "—"}</p>
                {globalSummary.etaTrendDays != null && globalSummary.etaTrendDays !== 0 && (
                  <span className={`mt-1 inline-block text-xs font-medium ${globalSummary.etaTrendDays > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {globalSummary.etaTrendDays > 0 ? `+${globalSummary.etaTrendDays} gün` : `${globalSummary.etaTrendDays} gün`}
                  </span>
                )}
              </div>
              <div className="group relative">
                <p className="text-xs font-medium ui-text-muted">Güven</p>
                <p className={`mt-0.5 text-lg font-bold transition-colors ${globalSummary.confidence >= 70 ? "text-emerald-400" : globalSummary.confidence >= 50 ? "text-amber-400" : "text-red-400"}`}>
                  %{globalSummary.confidence}
                </p>
                <div className="absolute left-0 top-full z-50 mt-1 hidden min-w-[220px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xl group-hover:block">
                  <p className="mb-2 text-xs font-semibold ui-text-muted">Güven dağılımı (A/B/C)</p>
                  <p className="text-xs">A Zaman performansı: %{globalSummary.confidenceBreakdown.A_time}</p>
                  <p className="text-xs">B İlerleme vs plan: %{globalSummary.confidenceBreakdown.B_progress}</p>
                  <p className="text-xs">C Risk/Engel cezaları: %{globalSummary.confidenceBreakdown.C_risk}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-8 border-t border-[var(--color-border)]/50 pt-5">
            <span className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm" />
              Yolunda: {globalSummary.on_track}
            </span>
            <span className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shadow-sm" />
              Risk: {globalSummary.risk}
            </span>
            <span className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-sm" />
              Gecikmiş: {globalSummary.behind}
            </span>
            <span className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm" />
              Süresi geçti: {globalSummary.overdue}
            </span>
            <span className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600 shadow-sm" />
              Engelli: {globalSummary.blocked}
            </span>
          </div>
        </div>

        {/* KPI card grid (clickable filters) */}
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
          <button type="button" onClick={() => applyKpiFilter("active")} className="ui-glass rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/50 p-5 text-left shadow-sm backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] hover:border-[var(--color-primary)]/30 hover:shadow-md">
            <p className="text-2xl font-bold text-[var(--color-text)]">{kpis.active}</p>
            <p className="mt-1 text-xs ui-text-muted">Aktif modül</p>
          </button>
          <button type="button" onClick={() => applyKpiFilter("due")} className="ui-glass rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/50 p-5 text-left shadow-sm backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] hover:border-[var(--color-primary)]/30 hover:shadow-md">
            <p className="text-2xl font-bold text-[var(--color-text)]">{kpis.dueThisMonth}</p>
            <p className="mt-1 text-xs ui-text-muted">Bu ay bitiş</p>
          </button>
          <button type="button" onClick={() => applyKpiFilter("behind")} className="ui-glass rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/50 p-5 text-left shadow-sm backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] hover:border-amber-500/30 hover:shadow-md">
            <p className="text-2xl font-bold text-amber-400">{kpis.behind}</p>
            <p className="mt-1 text-xs ui-text-muted">Gecikmiş</p>
          </button>
          <button type="button" onClick={() => applyKpiFilter("blocked")} className="ui-glass rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/50 p-5 text-left shadow-sm backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] hover:border-red-500/30 hover:shadow-md">
            <p className="text-2xl font-bold text-red-400">{kpis.blocked}</p>
            <p className="mt-1 text-xs ui-text-muted">Engelli</p>
          </button>
          <div className="ui-glass rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/50 p-5 shadow-sm backdrop-blur-xl">
            <p className="text-2xl font-bold text-[var(--color-text)]">%{kpis.avgProgress}</p>
            <p className="mt-1 text-xs ui-text-muted">Ort. ilerleme</p>
          </div>
          <button type="button" onClick={() => applyKpiFilter("risk")} className="ui-glass rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/50 p-5 text-left shadow-sm backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] hover:border-red-500/30 hover:shadow-md">
            <p className="text-2xl font-bold text-red-400">{kpis.criticalRisk}</p>
            <p className="mt-1 text-xs ui-text-muted">Kritik risk</p>
          </button>
        </div>

        {/* Highlights: Critical top 5 + Due this week top 5 */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="ui-glass rounded-2xl border border-red-500/20 bg-[var(--color-surface)]/50 p-5 shadow-sm backdrop-blur-xl transition-all duration-200">
            <h3 className="mb-4 text-sm font-semibold text-red-400">Kritik (Engelli / Süresi Geçti)</h3>
            {highlightsKritik.length === 0 ? (
              <p className="text-sm ui-text-muted">Kritik modül yok.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {highlightsKritik.map((m) => (
                  <button
                    key={m.module_code}
                    type="button"
                    onClick={() => setSelectedModule(m)}
                    className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-left text-sm transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/10"
                  >
                    {!SINGLE_ADMIN_MODE && <OwnerAvatar name={m.owner} />}
                    <span className="font-medium">{m.short_code ?? m.module_code}</span>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${m.health === "blocked" ? "bg-red-600" : "bg-red-500"}`} />
                    <span className="text-xs ui-text-muted">{m.eta ?? m.plan_end ?? "—"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="ui-glass rounded-2xl border border-amber-500/20 bg-[var(--color-surface)]/50 p-5 shadow-sm backdrop-blur-xl transition-all duration-200">
            <h3 className="mb-4 text-sm font-semibold text-amber-400">Bu hafta bitecek</h3>
            {highlightsBuHafta.length === 0 ? (
              <p className="text-sm ui-text-muted">Bu hafta bitiş planlanan modül yok.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {highlightsBuHafta.map((m) => (
                  <button
                    key={m.module_code}
                    type="button"
                    onClick={() => setSelectedModule(m)}
                    className="flex items-center gap-2 rounded-lg border border-[var(--color-border)]/50 bg-[var(--color-surface)]/40 px-3 py-2 text-left text-sm transition-all duration-200 hover:border-amber-500/30 hover:bg-[var(--color-surface-hover)]"
                  >
                    {!SINGLE_ADMIN_MODE && <OwnerAvatar name={m.owner} />}
                    <span className="font-medium">{m.short_code ?? m.module_code}</span>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                    <span className="text-xs ui-text-muted">{m.eta ?? m.plan_end ?? "—"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Operational View ─── */}
      <section className="space-y-6">

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-4 py-3">
          <span className="text-sm font-medium">{selectedIds.size} modül seçili</span>
          <button
            type="button"
            onClick={() => setBulkModalOpen(true)}
            className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white hover:opacity-90"
          >
            Toplu güncelle
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-hover)]"
          >
            Seçimi kaldır
          </button>
        </div>
      )}

        {/* Command bar: filters + edit mode toggle */}
        <div className="ui-glass flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-2">
              {DATE_RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setDateRange(r.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    dateRange === r.id ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs ui-text-muted">Durum:</span>
              {STATUS_OPTIONS.map((s) => (
                <label key={s.id} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={statusFilter.includes(s.id)} onChange={(e) => setStatusFilter((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)))} className="rounded" />
                  {s.label}
                </label>
              ))}
            </div>
            {!SINGLE_ADMIN_MODE && (
              <>
                <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="ui-input w-32 text-sm">
                  <option value="">Tüm ekipler</option>
                  {teams.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input type="text" placeholder="Sahip ara..." value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="ui-input w-32 text-sm" />
              </>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyRisks} onChange={(e) => setOnlyRisks(e.target.checked)} className="rounded" />
              Riskler
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyBehind} onChange={(e) => setOnlyBehind(e.target.checked)} className="rounded" />
              Gecikmiş
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs ui-text-muted">Mod:</span>
            {MODE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setEditMode(tab.id as "takip" | "duzenle")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  editMode === tab.id ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

      {/* View tabs */}
      <div className="flex gap-2 border-b border-[var(--color-border)]">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setViewTab(tab.id as typeof viewTab)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              viewTab === tab.id
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent ui-text-muted hover:ui-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Premium Roadmap */}
      {viewTab === "roadmap" && (
        <section className="ui-glass overflow-hidden rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/50 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 px-5 py-4">
            <div className="flex items-center gap-4 text-xs ui-text-muted">
              <span className="inline-block h-3 w-20 rounded bg-gradient-to-r from-blue-500/40 to-blue-600/30" /> Plan
              <span className="inline-block h-3 w-20 rounded bg-gradient-to-r from-emerald-500/50 to-emerald-600/40" /> Gerçekleşen
            </div>
            <div className="flex items-center gap-4">
              {editMode === "duzenle" && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selectedIds.size === (filtered ?? []).length && (filtered ?? []).length > 0} onChange={selectAll} className="rounded" />
                  Tümünü seç
                </label>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[940px]">
              {/* Timeline header: month labels + vertical grid */}
              <div className="flex border-b border-[var(--color-border)]/40">
                <div className="w-[300px] shrink-0 border-r border-[var(--color-border)]/30 px-4 py-2" />
                <div className="relative flex-1 min-w-[200px] px-4 py-2">
                  <div className="absolute inset-0 left-4 right-4 top-0 flex">
                    {monthTicks.map((t) => (
                      <div key={t.label} className="absolute top-0 h-full w-px bg-[var(--color-border)]/30" style={{ left: `${t.x}%` }} />
                    ))}
                  </div>
                  <div className="relative flex gap-0 text-[10px] font-medium ui-text-muted">
                    {monthTicks.map((t) => (
                      <span key={t.label} className="absolute -translate-x-1/2" style={{ left: `${t.x}%` }}>{t.label}</span>
                    ))}
                  </div>
                </div>
              </div>
              {(filtered ?? []).map((m) => {
                const planStart = safeDate(m.plan_start);
                const planEnd = safeDate(m.plan_end);
                const hasValidPlanDates = !!(planStart && planEnd);
                const planLeft = hasValidPlanDates && m.plan_start ? Math.max(0, dateToX(m.plan_start)) : 0;
                const safeTotalDays = Math.max(ganttDays, 1);
                const planSpanMs = planStart && planEnd ? planEnd.getTime() - planStart.getTime() : 0;
                const planSpan = planSpanMs >= 0 ? planSpanMs / (24 * 60 * 60 * 1000) / safeTotalDays : 0;
                const planWidth = hasValidPlanDates ? Math.min(100 - planLeft, Math.max(0, planSpan * 100)) : 0;

                const actualStartDate = safeDate(m.actual_start || (hasValidPlanDates ? m.plan_start : null));
                const actualEndDate = safeDate(m.eta || m.actual_end || (hasValidPlanDates ? m.plan_end : null));
                const hasValidActualDates = !!(actualStartDate && actualEndDate);
                const actualLeft = hasValidActualDates ? Math.max(0, dateToX(m.actual_start || m.plan_start || "")) : 0;
                const actualSpanMs = actualStartDate && actualEndDate ? actualEndDate.getTime() - actualStartDate.getTime() : 0;
                const actualSpan = actualSpanMs >= 0 ? actualSpanMs / (24 * 60 * 60 * 1000) / safeTotalDays : 0;
                const actualWidth = hasValidActualDates ? Math.min(100 - actualLeft, Math.max(0, actualSpan * 100)) : 0;

                const isSelected = selectedIds.has(m.module_code);
                const effectiveEta = getEffectiveEta(m);
                const { label: progressLabel, doneCount: milestoneDone, totalCount: milestoneTotal } = getEffectiveProgress(m);
                const showHealthBadge = hasValidPlanDates;

                return (
                  <div
                    key={m.module_code}
                    className={`group relative flex items-center gap-0 border-b border-[var(--color-border)]/30 transition-all duration-300 last:border-b-0 ${
                      isSelected ? "bg-[var(--color-primary)]/5" : "hover:bg-[var(--color-surface-hover)]/50"
                    }`}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("[data-no-row-click]")) return;
                      setSelectedModule(m);
                    }}
                  >
                    {/* Left fixed column */}
                    <div className="flex w-[300px] shrink-0 items-center gap-3 border-r border-[var(--color-border)]/30 px-4 py-3">
                      {editMode === "duzenle" && (
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(m.module_code)} onClick={(e) => e.stopPropagation()} data-no-row-click className="shrink-0 rounded" />
                      )}
                      {!SINGLE_ADMIN_MODE && <OwnerAvatar name={m.owner} />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{m.short_code ?? m.module_code}</span>
                          {showHealthBadge && (
                            <span className={`h-2 w-2 shrink-0 rounded-full shadow-sm ${m.health === "on_track" ? "bg-emerald-500" : m.health === "behind" ? "bg-amber-500" : m.health === "overdue" ? "bg-red-500" : "bg-red-600"}`} title={HEALTH_LABELS[m.health]} />
                          )}
                          {editMode === "duzenle" ? (
                            <select value={m.status} onChange={(e) => updatePlan(m.module_code, { status: e.target.value as ModulePlanStatus })} onClick={(e) => e.stopPropagation()} data-no-row-click className="h-6 rounded border border-[var(--color-border)] bg-transparent px-2 text-[10px]">
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${showHealthBadge ? HEALTH_CLASS[m.health] : "bg-[var(--color-surface-elevated)] ui-text-muted"}`}>
                              {showHealthBadge ? HEALTH_LABELS[m.health] : "Planlandı"}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs ui-text-muted">
                          {!SINGLE_ADMIN_MODE && <>{m.owner}{milestoneTotal > 0 && <span className="ml-1">· {milestoneDone}/{milestoneTotal}</span>}</>}
                          {SINGLE_ADMIN_MODE && milestoneTotal > 0 && <span>{milestoneDone}/{milestoneTotal}</span>}
                          {SINGLE_ADMIN_MODE && milestoneTotal === 0 && <span>&nbsp;</span>}
                        </p>
                      </div>
                    </div>

                    {/* Right timeline */}
                    <div className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3">
                      <div className="relative h-8 flex-1 min-w-[200px]">
                        <div className="absolute inset-0 rounded-lg bg-[var(--color-surface-elevated)]/50" />
                        {monthTicks.map((t) => (
                          <div key={t.label} className="absolute top-0 h-full w-px bg-[var(--color-border)]/20" style={{ left: `${t.x}%` }} />
                        ))}
                        {hasValidPlanDates && (
                          <div className="absolute top-1/2 h-5 -translate-y-1/2 rounded-md bg-gradient-to-r from-blue-500/35 to-blue-600/25 transition-all duration-300" style={{ left: `${planLeft}%`, width: `${Math.max(3, planWidth)}%` }} />
                        )}
                        {hasValidActualDates && (
                          <div className="absolute top-1/2 h-5 -translate-y-1/2 rounded-md bg-gradient-to-r from-emerald-500/50 to-emerald-600/40 transition-all duration-300" style={{ left: `${actualLeft}%`, width: `${Math.max(3, actualWidth)}%` }} />
                        )}
                        <div className="absolute top-0 h-full w-0.5 -translate-x-px rounded-full bg-amber-400/90 transition-opacity duration-300" style={{ left: `${dateToX(today)}%` }} title="Bugün" />
                      </div>
                      <span className="w-16 shrink-0 text-right text-sm font-semibold">{progressLabel}</span>
                      <span className="w-24 shrink-0 rounded-md bg-[var(--color-surface-elevated)]/60 px-2 py-1 text-center text-xs font-medium">{effectiveEta ?? "—"}</span>

                      {/* Row hover quick actions */}
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100" data-no-row-click>
                        <button type="button" onClick={(e) => { e.stopPropagation(); updatePlan(m.module_code, { status: "done", progress: 100 }); }} className="rounded-md bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/30" title="Tamamla">✓</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); updatePlan(m.module_code, { status: "blocked" }); }} className="rounded-md bg-red-500/20 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/30" title="Engelle">⊗</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); const p = useModulePlansStore.getState().plans[m.module_code]; if (p) { const sh = (d: string | null) => { if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return d; const dt = new Date(d); dt.setDate(dt.getDate() + 7); return dt.toISOString().slice(0, 10); }; updatePlan(m.module_code, { plan_start: sh(p.plan_start) ?? p.plan_start, plan_end: sh(p.plan_end) ?? p.plan_end, eta: p.eta ? sh(p.eta) : null }); } }} className="rounded-md bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/30" title="+7 gün">+7</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedModule(m); }} className="rounded-md bg-[var(--color-surface-elevated)] px-2 py-1 text-xs font-medium ui-text-muted hover:bg-[var(--color-surface-hover)]" title="Not ekle">📝</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Table view */}
      {viewTab === "table" && (
        <section className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {editMode === "duzenle" && (
                  <th className="w-10 px-2 py-3">
                    <input type="checkbox" checked={selectedIds.size === (filtered ?? []).length && (filtered ?? []).length > 0} onChange={selectAll} className="rounded" />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Modül</th>
                <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">İlerleme</th>
                <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Plan Baş/Bitiş</th>
                <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">ETA</th>
                <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Sağlık</th>
                {!SINGLE_ADMIN_MODE && <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Sahip</th>}
                <th className="px-4 py-3 text-left text-xs font-medium ui-text-muted">Risk</th>
                <th className="px-4 py-3 text-right text-xs font-medium ui-text-muted">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {(filtered ?? []).map((m) => (
                <tr
                  key={m.module_code}
                  className={`border-b border-[var(--color-border)]/50 transition hover:bg-[var(--color-surface-hover)]/30 ${selectedIds.has(m.module_code) ? "bg-[var(--color-primary)]/5" : ""}`}
                  onClick={() => setSelectedModule(m)}
                >
                  {editMode === "duzenle" && (
                    <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(m.module_code)} onChange={() => toggleSelect(m.module_code)} className="rounded" />
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium">{m.short_code ?? m.module_code}</td>
                  <td className="px-4 py-3">
                    {editMode === "duzenle" ? (
                      <select
                        value={m.status}
                        onChange={(e) => updatePlan(m.module_code, { status: e.target.value as ModulePlanStatus })}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-sm"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm">{STATUS_OPTIONS.find((s) => s.id === m.status)?.label ?? m.status}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editMode === "duzenle" && m.progress_mode !== "milestone" ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => updatePlan(m.module_code, { progress: Math.max(0, getEffectiveProgress(m).progress - 10) })} className="rounded px-1.5 py-0.5 text-xs hover:bg-[var(--color-surface-hover)]">−10</button>
                        <span className="w-12 text-center text-sm">{getEffectiveProgress(m).label}</span>
                        <button type="button" onClick={() => updatePlan(m.module_code, { progress: Math.min(100, getEffectiveProgress(m).progress + 10) })} className="rounded px-1.5 py-0.5 text-xs hover:bg-[var(--color-surface-hover)]">+10</button>
                      </div>
                    ) : (
                      <span className="text-sm">{getEffectiveProgress(m).label}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{m.plan_start ?? "—"} / {m.plan_end ?? "—"}</td>
                  <td className="px-4 py-3">
                    {editMode === "duzenle" ? (
                      <input
                        type="date"
                        value={m.eta ?? ""}
                        onChange={(e) => updatePlan(m.module_code, { eta: e.target.value || null })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-32 rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-sm"
                      />
                    ) : (
                      <span className="text-sm">{m.eta ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs ${HEALTH_CLASS[m.health]}`}>
                      {HEALTH_LABELS[m.health]}
                    </span>
                  </td>
                  {!SINGLE_ADMIN_MODE && <td className="px-4 py-3 text-sm">{m.owner}</td>}
                  <td className="px-4 py-3">
                    {editMode === "duzenle" ? (
                      <select
                        value={m.risk_level}
                        onChange={(e) => updatePlan(m.module_code, { risk_level: e.target.value as ModulePlanRiskLevel })}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-sm"
                      >
                        {RISK_OPTIONS.map((r) => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`rounded px-2 py-0.5 text-xs ${RISK_CLASS[m.risk_level]}`}>{m.risk_level}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-[var(--color-primary)] hover:underline">Detay</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Cards view */}
      {viewTab === "cards" && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(filtered ?? []).map((m) => (
            <div
              key={m.module_code}
              className={`ui-glass relative rounded-xl border p-4 backdrop-blur-sm transition ${
                selectedIds.has(m.module_code) ? "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5" : "border-[var(--color-border)] bg-[var(--color-surface)]/60 hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              {editMode === "duzenle" && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(m.module_code)}
                  onChange={() => toggleSelect(m.module_code)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-3 top-3 rounded"
                />
              )}
              <button
                type="button"
                onClick={() => setSelectedModule(m)}
                className="w-full text-left"
              >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{m.short_code ?? m.module_code}</span>
                <span className={`rounded px-2 py-0.5 text-xs ${HEALTH_CLASS[m.health]}`}>
                  {HEALTH_LABELS[m.health]}
                </span>
              </div>
              <p className="mt-1 text-sm ui-text-muted">{m.name}</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-elevated)]">
                  <div
                    className="h-full bg-[var(--color-primary)]"
                    style={{ width: `${getEffectiveProgress(m).progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{getEffectiveProgress(m).label}</span>
              </div>
              <p className="mt-2 text-xs ui-text-muted">{!SINGLE_ADMIN_MODE && <>{m.owner} · </>}{m.plan_end ?? "—"}</p>
              </button>
            </div>
          ))}
        </section>
      )}

      </section>

      {/* Bulk update modal */}
      <BulkUpdateModal
        isOpen={bulkModalOpen}
        selectedIds={selectedIds}
        onClose={() => setBulkModalOpen(false)}
        onApply={(updates) => {
          const ids = Array.from(selectedIds);
          if (updates.status) bulkUpdatePlan(ids, { status: updates.status });
          if (updates.owner) bulkUpdatePlan(ids, { owner: updates.owner });
          if (updates.shiftDays !== 0) {
            const plansMap = useModulePlansStore.getState().plans;
            const shift = (d: string | null, days: number) => {
              if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
              const dt = new Date(d);
              dt.setDate(dt.getDate() + days);
              return dt.toISOString().slice(0, 10);
            };
            for (const id of ids) {
              const p = plansMap[id];
              if (!p) continue;
              updatePlan(id, {
                plan_start: shift(p.plan_start, updates.shiftDays!) ?? p.plan_start,
                plan_end: shift(p.plan_end, updates.shiftDays!) ?? p.plan_end,
                eta: p.eta ? shift(p.eta, updates.shiftDays!) : null,
                actual_start: p.actual_start ? shift(p.actual_start, updates.shiftDays!) : null,
                actual_end: p.actual_end ? shift(p.actual_end, updates.shiftDays!) : null,
              });
            }
          }
          setSelectedIds(new Set());
          setBulkModalOpen(false);
        }}
      />

      {/* Deep Dive Drawer */}
      <DeepDiveDrawer key={selectedModule?.module_code ?? "closed"} module={selectedModule} onClose={() => setSelectedModule(null)} onSave={() => setSelectedModule(null)} defaultOwner={defaultOwner} />

      {/* Single-module shift dates modal */}
      {shiftModuleId && (
        <ShiftDatesModal
          moduleCode={shiftModuleId}
          onClose={() => setShiftModuleId(null)}
          onApply={(days) => {
            const p = useModulePlansStore.getState().plans[shiftModuleId];
            if (p && days !== 0) {
              const shift = (d: string | null) => {
                if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
                const dt = new Date(d);
                dt.setDate(dt.getDate() + days);
                return dt.toISOString().slice(0, 10);
              };
              updatePlan(shiftModuleId, {
                plan_start: shift(p.plan_start) ?? p.plan_start,
                plan_end: shift(p.plan_end) ?? p.plan_end,
                eta: p.eta ? shift(p.eta) : null,
                actual_start: p.actual_start ? shift(p.actual_start) : null,
                actual_end: p.actual_end ? shift(p.actual_end) : null,
              });
            }
            setShiftModuleId(null);
          }}
        />
      )}
    </div>
  );
}
